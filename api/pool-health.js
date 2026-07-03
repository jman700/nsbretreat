// api/pool-health.js
// POST /api/pool-health — cron-triggered reconciliation heartbeat (Vercel CRON_SECRET-gated).
// Also records pool/spa heater usage from the same status read (observation-only).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore, makeHeaterStore } from './_store.js';
import { runHealthCheck } from './_pool.js';
import { recordHeaterSample } from './_heater_log.js';
import { makeMailer } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers['authorization'] || '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const auth = await authenticate();
    const iaqua = { command: (cmd, params = {}) => deviceRequest(auth, cmd, params) };
    const sb = getSupabase();
    const store = makePoolStore(sb);
    const mailer = makeMailer();
    const now = Date.now();
    const out = await runHealthCheck({ store, iaqua, now, sendAlert: mailer.sendAlert, source: 'cron' });

    // Log heater usage from the status runHealthCheck already fetched.
    // Observation-only and fully isolated: a failure here must never affect pool control.
    if (out.status && out.status.online !== false) {
      try {
        const heaterStore = makeHeaterStore(sb);
        const prior = out.prior || {};
        const spaSource = (prior.state === 'active' && prior.source === 'pad') ? 'pad' : 'external';
        await recordHeaterSample({ status: out.status, now, heaterStore, spaSource });
      } catch (logErr) {
        console.error('[pool-health] heater log error:', logErr.message);
      }
    }

    return res.status(200).json({ ok: true, action: out.action, anomaly: out.anomaly });
  } catch (err) {
    console.error('[pool-health]', err.message);
    try { await makeMailer().sendAlert('NSB Retreat — pool health check error', err.message); } catch {}
    return res.status(500).json({ ok: false, error: err.message });
  }
}
