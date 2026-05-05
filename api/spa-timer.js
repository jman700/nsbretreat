// api/spa-timer.js
// POST /api/spa-timer  { hours }  — upsert the spa timer (pad-initiated)
// DELETE /api/spa-timer           — clear the spa timer (pad stop button)

import { getSupabase } from './_supabase.js';

const ROW_ID = 1;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb = getSupabase();

  // ── DELETE — clear timer ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await sb.from('spa_timer').delete().eq('id', ROW_ID);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // ── POST — create / update timer ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { hours = 3, source = 'pad' } = req.body || {};
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 12) {
      return res.status(400).json({ error: 'hours must be between 0.1 and 12' });
    }
    const now    = Date.now();
    const end_time = now + Math.round(h * 3600 * 1000);

    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time, started_at: now, source },
      { onConflict: 'id' }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, end_time });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
