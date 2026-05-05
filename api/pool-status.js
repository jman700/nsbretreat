// api/pool-status.js
// GET /api/pool-status — returns live pool/spa state

import { authenticate, deviceRequest } from './_iaqualink.js';

// Maps raw iAqualink key names to our normalized field names.
// Add entries here if the device returns unexpected keys.
const FIELD_MAP = {
  pool_temp:         'pool_temp',
  spa_temp:          'spa_temp',
  spa_heater:        'spa_heater',
  pool_heater:       'pool_heater',
  pool_pump:         'pool_pump',
  spa_pump:          'spa_pump',
  pool_set_point:    'pool_set_point',
  spa_set_point:     'spa_set_point',
  // Light — iAqualink may call this aux_1, pool_light, or a named aux
  aux_1:             'pool_light',
  pool_light:        'pool_light',
  // Jets / air blower — varies by installation
  aux_2:             'spa_jets',
  air_blower:        'spa_jets',
};

/**
 * Parses the home_screen array into a flat key→value map.
 * Raw values are strings like "0"/"1" for booleans and "82" for temps.
 */
function parseHomeScreen(homeScreenArray) {
  const raw = {};
  for (const item of homeScreenArray) {
    const key = Object.keys(item)[0];
    raw[key] = item[key];
  }

  const result = {
    online:           true,
    pool_temp:        null,
    spa_temp:         null,
    spa_heater:       'off',
    pool_pump:        'off',
    pool_light:       'off',
    pool_light_color: 'white',
    spa_jets:         'off',
    spa_set_point:    102,
    _raw:             raw, // included for debugging — remove in prod if desired
  };

  for (const [rawKey, val] of Object.entries(raw)) {
    const mapped = FIELD_MAP[rawKey];
    if (!mapped) continue;

    if (mapped === 'pool_temp' || mapped === 'spa_temp' || mapped === 'spa_set_point' || mapped === 'pool_set_point') {
      result[mapped] = parseInt(val, 10) || null;
    } else {
      // "0" = off, "1" = on; some return "true"/"false"
      result[mapped] = (val === '1' || val === 'true' || val === 'on') ? 'on' : 'off';
    }
  }

  // Light color: if aux_1 or pool_light has a numeric value > 1, it's a color mode index.
  // iAqualink color mode indices (IntelliBrite/ColorLogic):
  // 2=blue, 3=green, 4=red, 5=white, 6=magenta, 7=party
  const lightRaw = raw['aux_1'] || raw['pool_light'];
  if (lightRaw && parseInt(lightRaw, 10) > 1) {
    const colorMap = { 2: 'blue', 3: 'green', 4: 'red', 5: 'white', 6: 'magenta', 7: 'party' };
    result.pool_light       = 'on';
    result.pool_light_color = colorMap[parseInt(lightRaw, 10)] || 'white';
  }

  return result;
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers (requests come from pad.nsbretreat.com, same project)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const token      = await authenticate();
    const data       = await deviceRequest(token, 'get_home_screen');
    const homeScreen = data.home_screen || data.data || [];

    if (!Array.isArray(homeScreen)) {
      // Device returned unexpected shape — return offline
      return res.status(200).json({ online: false, _raw: data });
    }

    const status = parseHomeScreen(homeScreen);
    return res.status(200).json(status);

  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
