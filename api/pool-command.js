// api/pool-command.js
// POST /api/pool-command — dispatch a control command to iAqualink

import { authenticate, deviceRequest } from './_iaqualink.js';

// Aux slot numbers for pool light and spa jets.
// Check _raw from /api/pool-status to verify your device's aux numbers.
// Confirmed via get_devices: aux_2 = Pool Light, aux_1 = Air Blower (spa jets)
const AUX_LIGHT_NUM = '2';  // aux_2 = Pool Light
const AUX_JETS_NUM  = '1';  // aux_1 = Air Blower

const LIGHT_COLOR_INDEX = {
  white:   1,
  blue:    2,
  green:   3,
  red:     4,
  magenta: 6,
  party:   7,
};

// Server-side command whitelist — pool pump is intentionally excluded.
const ALLOWED_COMMANDS = new Set([
  'spa_heater',
  'spa_setpoint',
  'spa_jets',
  'pool_light',
  'pool_light_color',
]);

/**
 * Translates our normalized command + value into an iAqualink API call.
 * New API: toggle commands use set_aux_N (no level param), set_spa_heater toggles,
 * set_temps uses temp1 for spa setpoint, set_light uses aux+light+subtype params.
 */
function translateCommand(command, value) {
  switch (command) {
    case 'spa_heater':
      // Toggles the spa heater — iAqualink toggles on each call, so we send regardless.
      return { iaqualinkCommand: 'set_spa_heater', extraParams: {} };

    case 'spa_setpoint': {
      const temp = parseInt(value, 10);
      if (isNaN(temp) || temp < 98 || temp > 104) {
        throw new Error('spa_setpoint must be 98–104');
      }
      // set_temps with temp1 = spa target temperature
      return { iaqualinkCommand: 'set_temps', extraParams: { temp1: temp } };
    }

    case 'spa_jets':
      // Toggles aux_2 (spa jets/blower)
      return { iaqualinkCommand: `set_aux_${AUX_JETS_NUM}`, extraParams: {} };

    case 'pool_light':
      // Toggles aux_1 (pool light)
      return { iaqualinkCommand: `set_aux_${AUX_LIGHT_NUM}`, extraParams: {} };

    case 'pool_light_color': {
      const idx = LIGHT_COLOR_INDEX[value];
      if (!idx) throw new Error(`Unknown color: ${value}`);
      // set_light with aux slot, effect index, and subtype 1 (IntelliBrite/generic color)
      return {
        iaqualinkCommand: 'set_light',
        extraParams: { aux: AUX_LIGHT_NUM, light: idx, subtype: 1 },
      };
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { command, value } = req.body || {};

  if (!command || value === undefined) {
    return res.status(400).json({ error: 'Missing command or value' });
  }

  if (!ALLOWED_COMMANDS.has(command)) {
    return res.status(400).json({ error: `Command not allowed: ${command}` });
  }

  try {
    const { iaqualinkCommand, extraParams } = translateCommand(command, value);
    const auth = await authenticate();
    await deviceRequest(auth, iaqualinkCommand, extraParams);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[pool-command]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
