// api/spa-timer.js
// POST /api/spa-timer  { hours }  — upsert the spa timer (pad-initiated)
// DELETE /api/spa-timer           — clear the spa timer (pad stop button)

import { getSupabase } from './_supabase.js';

const ROW_ID = 1;

// KILL SWITCH — set to false to re-enable spa timer
const CONTROLS_DISABLED = false;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (CONTROLS_DISABLED) return res.status(503).json({ error: 'Controls temporarily disabled' });

  const sb = getSupabase();

  // ── DELETE — soft-expire timer (manual Stop button) ───────────────────────
  // Set state='shutting_off' and end_time=0 instead of hard-deleting the row.
  // The reconcile state machine (api/_pool.js, handleShuttingOff) then verifies
  // the hardware actually turned off on subsequent polls/cron runs: it re-issues
  // set_spa_heater while the heater still reports 'on', and only settles to
  // 'idle' once it confirms off. Keeping the row (vs. deleting) prevents the
  // idle branch from misreading a still-'on' heater as an external Jandy turn-on
  // and auto-creating a fresh 3-hr timer during command propagation.
  if (req.method === 'DELETE') {
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time: 0, started_at: 0, source: 'stop', state: 'shutting_off', shutting_off_since: Date.now(), early_end_count: 0 },
      { onConflict: 'id' }
    );
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
      { id: ROW_ID, end_time, started_at: now, source, state: 'active', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false },
      { onConflict: 'id' }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, end_time });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
