// api/pool-health.js
// POST /api/pool-health — cron-triggered reconciliation heartbeat (secret-gated).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { runHealthCheck } from './_pool.js';
import { makeMailer } from './_email.js';

// KILL SWITCH — set to false to re-enable pool health checks
const CONTROLS_DISABLED = true;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if ((req.headers['x-cron-secret'] || '') !== process.env.POOL_HEALTH_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (CONTROLS_DISABLED) return res.status(200).json({ ok: true, disabled: true });

  try {
    const auth = await authenticate();
    const iaqua = { command: (cmd, params = {}) => deviceRequest(auth, cmd, params) };
    const store = makePoolStore(getSupabase());
    const mailer = makeMailer();
    const out = await runHealthCheck({ store, iaqua, now: Date.now(), sendAlert: mailer.sendAlert, source: 'cron' });
    return res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('[pool-health]', err.message);
    try { await makeMailer().sendAlert('NSB Retreat — pool health check error', err.message); } catch {}
    return res.status(500).json({ ok: false, error: err.message });
  }
}
