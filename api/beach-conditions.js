// api/beach-conditions.js
// GET /api/beach-conditions — live weather + tides for New Smyrna Beach

// NWS observation station KDAB (Daytona Beach Airport, ~20mi from NSB)
const NWS_OBS_URL = 'https://api.weather.gov/stations/KDAB/observations/latest';
const NWS_HEADERS = {
  'User-Agent': 'NSBRetreat/1.0 (antoniofconcha@gmail.com)',
  'Accept':     'application/geo+json',
};

// NOAA CO-OPS station 8721147 — Ponce de Leon Inlet (2mi from property)
const TIDE_STATION = '8721147';
const NOAA_BASE    = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

function celsiusToF(c) {
  return c != null ? Math.round(c * 9 / 5 + 32) : null;
}
function kmhToMph(k) {
  return k != null ? Math.round(k * 0.621371) : null;
}
function degToCardinal(deg) {
  if (deg == null) return null;
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
function easternDateStr(offsetDays = 0) {
  // Returns YYYYMMDD in Eastern time
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
}
function fmt12h(noaaTimeStr) {
  // "2024-05-04 14:23" → "2:23 PM"
  const match = noaaTimeStr.match(/(\d{2}):(\d{2})$/);
  if (!match) return noaaTimeStr;
  const hr = parseInt(match[1], 10);
  return `${hr % 12 || 12}:${match[2]} ${hr < 12 ? 'AM' : 'PM'}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 10 min on CDN, serve stale for 5 min while revalidating
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');

  const tidesUrl = `${NOAA_BASE}?station=${TIDE_STATION}&product=predictions` +
    `&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english` +
    `&application=nsbretreat&format=json` +
    `&begin_date=${easternDateStr()}&end_date=${easternDateStr(1)}`;

  const waterTempUrl = `${NOAA_BASE}?station=${TIDE_STATION}&product=water_temperature` +
    `&time_zone=lst_ldt&units=english&application=nsbretreat&format=json&date=latest`;

  // Fire all three calls in parallel
  const [weatherResult, tidesResult, waterResult] = await Promise.allSettled([
    fetch(NWS_OBS_URL, { headers: NWS_HEADERS }).then(r => r.json()),
    fetch(tidesUrl).then(r => r.json()),
    fetch(waterTempUrl).then(r => r.json()),
  ]);

  const out = {};

  // ── Weather ──────────────────────────────────────────────────────────────
  if (weatherResult.status === 'fulfilled') {
    const obs = weatherResult.value?.properties || {};
    out.air_temp   = celsiusToF(obs.temperature?.value);
    out.conditions = obs.textDescription || null;
    out.wind_speed = kmhToMph(obs.windSpeed?.value);
    out.wind_dir   = degToCardinal(obs.windDirection?.value);
  }

  // ── Tides ─────────────────────────────────────────────────────────────────
  if (tidesResult.status === 'fulfilled') {
    const preds = tidesResult.value?.predictions || [];
    // Include raw datetime string so client can filter to upcoming events
    out.tides = preds.map(p => ({
      type:   p.type === 'H' ? 'High' : 'Low',
      t:      p.t,            // "2024-05-04 14:23" Eastern — used for client-side filtering
      time:   fmt12h(p.t),   // "2:23 PM" for display
      height: parseFloat(p.v).toFixed(1) + ' ft',
    }));
  }

  // ── Ocean water temp ──────────────────────────────────────────────────────
  if (waterResult.status === 'fulfilled') {
    const val = waterResult.value?.data?.[0]?.v;
    out.water_temp = val ? Math.round(parseFloat(val)) : null;
  }

  out.updated_at = new Date().toISOString();
  return res.status(200).json(out);
}
