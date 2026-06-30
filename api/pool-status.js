// api/pool-status.js
// GET /api/pool-status — live pool/spa state + durable spa timer. Read-only.

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { fetchStatus } from './_pool.js';

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
      const now = Date.now();
      const store = makePoolStore(getSupabase());
      const row = await store.getState();
      const endTime = (row.state === 'active' && row.end_time > now) ? row.end_time : 0;
      status.spa_end_time = endTime || null;
      status.spa_seconds_remaining = endTime ? Math.max(0, Math.round((endTime - now) / 1000)) : 0;
    } catch (sbErr) {
      console.error('[pool-status] timer read error:', sbErr.message);
      status.spa_end_time = null;
      status.spa_seconds_remaining = 0;
    }

    return res.status(200).json(status);
  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
