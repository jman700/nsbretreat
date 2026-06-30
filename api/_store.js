// api/_store.js — persistence adapter over the spa_timer state row + pool_health_log.
const ROW_ID = 1;

export function makePoolStore(sb) {
  return {
    async getState() {
      const { data } = await sb.from('spa_timer').select('*').eq('id', ROW_ID).maybeSingle();
      if (data) return data;
      const def = {
        id: ROW_ID, end_time: 0, started_at: 0, source: 'init',
        state: 'idle', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false,
      };
      await sb.from('spa_timer').upsert(def, { onConflict: 'id' });
      return def;
    },
    async saveState(patch) {
      await sb.from('spa_timer').upsert(
        { id: ROW_ID, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
    },
    async log(entry) {
      const { error } = await sb.from('pool_health_log').insert(entry);
      if (error) console.error('[store] log insert failed:', error.message);
    },
  };
}
