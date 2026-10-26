// api/forecast.js
// GET /api/forecast?src=weather|marine|tide[&date=YYYYMMDD]
//
// Server-side proxy for the beach-conditions widgets. The browser only ever talks to
// this site; Open-Meteo and NOAA see Vercel's address, never the guest's. The upstream
// URLs are fixed here (only the tide date is taken from the request, and it must be
// 8 digits), so this cannot be used as an open proxy.

const LAT = '29.026';
const LON = '-80.926';

const SOURCES = {
  weather: () =>
    'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
    '&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,uv_index' +
    '&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=7' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code,sunrise,sunset' +
    '&timezone=America%2FNew_York',
  marine: () =>
    'https://marine-api.open-meteo.com/v1/marine?latitude=' + LAT + '&longitude=' + LON +
    '&current=wave_height,sea_surface_temperature',
  tide: (date) =>
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8721147&product=predictions' +
    '&datum=MLLW&time_zone=lst_ldt&interval=h&units=english&application=nsbretreat&format=json' +
    '&begin_date=' + date + '&end_date=' + date,
};

function easternToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const src = String(req.query.src || '');
  const build = SOURCES[src];
  if (!build) return res.status(400).json({ error: 'Unknown source' });

  const date = /^\d{8}$/.test(String(req.query.date || '')) ? String(req.query.date) : easternToday();

  try {
    const upstream = await fetch(build(date), { headers: { Accept: 'application/json' } });
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream ' + upstream.status });
    const data = await upstream.json();
    // Cache 10 min on Vercel's CDN, serve stale for 5 min while revalidating
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream unavailable' });
  }
}
