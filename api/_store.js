// api/_store.js — persistence adapter over the spa_timer state row + pool_health_log.
const ROW_ID = 1;

export function makePoolStore(sb) {
  return {
    async getState() {
      const { data } = await sb.from('spa_timer').select('*').eq('id', ROW_ID).maybeSingle();
      if (data) return data;
      const def = {
        id: ROW_ID, end_time: 0, started_at: 0, source: 'init',
        state: 'idle', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0,
        heater_on_since: 0, alerted: false,
      };
      await sb.from('spa_timer').upsert(def, { onConflict: 'id' });
      return def;
    },
    async saveState(patch) {
      const { error } = await sb.from('spa_timer').upsert(
        { id: ROW_ID, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
      if (error) console.error('[store] saveState failed:', error.message);
    },
    async log(entry) {
      const { error } = await sb.from('pool_health_log').insert(entry);
      if (error) console.error('[store] log insert failed:', error.message);
    },
  };
}

export function makeHeaterStore(sb) {
  return {
    // The single open heating episode, or null.
    async getOpenSession() {
      const { data, error } = await sb
        .from('heater_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error('[store] getOpenSession failed:', error.message);
      return data || null;
    },
    async openSession({ heater_type, at, source }) {
      const { error } = await sb.from('heater_sessions').insert({
        heater_type, started_at: at, last_seen_at: at, source, is_active: true,
      });
      if (error) console.error('[store] openSession failed:', error.message);
    },
    async touchSession(id, at) {
      const { error } = await sb.from('heater_sessions').update({ last_seen_at: at }).eq('id', id);
      if (error) console.error('[store] touchSession failed:', error.message);
    },
    async closeSession(session, endedAt) {
      const duration = Math.max(0, Math.round((endedAt - session.started_at) / 1000));
      const { error } = await sb.from('heater_sessions')
        .update({ ended_at: endedAt, duration_seconds: duration, is_active: false })
        .eq('id', session.id);
      if (error) console.error('[store] closeSession failed:', error.message);
    },
  };
}
