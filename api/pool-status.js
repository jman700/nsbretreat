// api/pool-status.js
// GET /api/pool-status — returns live pool/spa state

import { authenticate, deviceRequest } from './_iaqualink.js';

// Maps raw iAqualink get_home key names to our normalized field names.
const FIELD_MAP = {
  pool_temp:         'pool_temp',
  spa_temp:          'spa_temp',
  spa_heater:        'spa_heater',
  pool_heater:       'pool_heater',
  pool_pump:         'pool_pump',
  spa_pump:          'spa_pump',
  pool_set_point:    'pool_set_point',
  spa_set_point:     'spa_set_point',
};

// Confirmed aux slot assignments for this RS-4 Combo via get_devices:
//   aux_1 = Air Blower (spa jets)
//   aux_2 = Pool Light
const AUX_JETS  = 'aux_1';
const AUX_LIGHT = 'aux_2';

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
      // "0" = off; "1"/"true"/"on" = on; numeric > 0 (e.g. "3" = RS-4 heating mode) = on
      const numVal = parseInt(val, 10);
      result[mapped] = (val === '1' || val === 'true' || val === 'on' || (!isNaN(numVal) && numVal > 0))
        ? 'on' : 'off';
    }
  }

  return result;
}

/**
 * Extracts aux device states from the devices_screen array returned by get_devices.
 * Each aux item is: { aux_N: [{state}, {label}, {icon}, {type}, {subtype}] }
 * Returns a flat map: { aux_1: '0', aux_2: '1', ... }
 */
function parseDevicesScreen(devicesScreenArray) {
  const states = {};
  for (const item of devicesScreenArray) {
    const key = Object.keys(item)[0];
    if (!key || !key.startsWith('aux_')) continue;
    const fields   = item[key];
    const stateObj = Array.isArray(fields) ? fields.find(f => f.state !== undefined) : null;
    if (stateObj) states[key] = stateObj.state;
  }
  return states;
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
    const auth       = await authenticate();
    const data       = await deviceRequest(auth, 'get_home');
    const homeScreen = data.home_screen || data.data || [];

    if (!Array.isArray(homeScreen)) {
      // Device returned unexpected shape — return offline
      return res.status(200).json({ online: false, _raw: data });
    }

    const status = parseHomeScreen(homeScreen);

    // Pull aux states (light, jets) from get_devices — RS-4 doesn't include them in get_home.
    try {
      const devData    = await deviceRequest(auth, 'get_devices');
      const devScreen  = devData.devices_screen || [];
      const auxStates  = Array.isArray(devScreen) ? parseDevicesScreen(devScreen) : {};

      // Air Blower (spa jets) — aux_1
      if (AUX_JETS in auxStates) {
        status.spa_jets = parseInt(auxStates[AUX_JETS], 10) > 0 ? 'on' : 'off';
      }

      // Pool Light — aux_2; state > 1 encodes color mode index
      if (AUX_LIGHT in auxStates) {
        const lightVal = parseInt(auxStates[AUX_LIGHT], 10);
        status.pool_light = lightVal > 0 ? 'on' : 'off';
        if (lightVal > 1) {
          const colorMap = { 2: 'blue', 3: 'green', 4: 'red', 5: 'white', 6: 'magenta', 7: 'party' };
          status.pool_light_color = colorMap[lightVal] || 'white';
        }
      }
    } catch (devErr) {
      console.error('[pool-status] get_devices failed:', devErr.message);
      // Non-fatal — home screen data still returned
    }

    return res.status(200).json(status);

  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
