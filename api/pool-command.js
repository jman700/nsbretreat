// api/pool-command.js
// POST /api/pool-command — dispatch a control command to iAqualink

import { authenticate, deviceRequest } from './_iaqualink.js';

// Adjust these if your installation uses different aux slot names.
// Check _raw from /api/pool-status to discover your device's aux names.
const AUX_LIGHT = 'aux_1';
const AUX_JETS  = 'aux_2';

const LIGHT_COLOR_INDEX = {
  blue:    2,
  green:   3,
  red:     4,
  white:   5,
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
 * Returns { iaqualinkCommand, extraParams } ready to pass to deviceRequest().
 */
function translateCommand(command, value) {
  switch (command) {
    case 'spa_heater':
      return {
        iaqualinkCommand: 'set_spa_heater',
        extraParams: { level: value === 'on' ? 1 : 0 },
      };

    case 'spa_setpoint': {
      const temp = parseInt(value, 10);
      if (isNaN(temp) || temp < 98 || temp > 104) {
        throw new Error('spa_setpoint must be 98–104');
      }
      return {
        iaqualinkCommand: 'set_spa_temp',
        extraParams: { level: temp },
      };
    }

    case 'spa_jets':
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_JETS, level: value === 'on' ? 1 : 0 },
      };

    case 'pool_light':
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_LIGHT, level: value === 'on' ? 1 : 0 },
      };

    case 'pool_light_color': {
      const idx = LIGHT_COLOR_INDEX[value];
      if (!idx) throw new Error(`Unknown color: ${value}`);
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_LIGHT, level: idx },
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
    const token = await authenticate();
    await deviceRequest(token, iaqualinkCommand, extraParams);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[pool-command]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
