// api/pool-status.js
// GET /api/pool-status — live pool/spa state + durable spa timer (reconciled on every poll).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { fetchStatus, reconcile } from './_pool.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const auth = await authenticate();
    const iaqua = { command: (cmd, params = {}) => deviceRequest(auth, cmd, params) };
    const status = await fetchStatus(iaqua);

    if (status.online === false) return res.status(200).json(status);

    try {
      const store = makePoolStore(getSupabase());
      await reconcile({ status, now: Date.now(), store, iaqua, source: 'poll' });
    } catch (sbErr) {
      console.error('[pool-status] reconcile error:', sbErr.message);
      status.spa_end_time = status.spa_end_time ?? null;
      status.spa_seconds_remaining = status.spa_seconds_remaining ?? 0;
    }

    return res.status(200).json(status);
  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
