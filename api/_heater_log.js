// api/_heater_log.js — pool/spa heater usage sessionizer.
// Pure logic: persistence (heaterStore) is injected. No hardware calls, no commands.
// Timestamps are Unix ms integers, matching spa_timer / _pool.js.

// The heater is a single burner redirecting water, so spa and pool heating are
// never both on. If both ever read on, spa wins (spa implies active guest use).
function currentType(status) {
  if (status.spa_heater === 'on') return 'spa';
  if (status.pool_heater === 'on') return 'pool';
  return null;
}

// Observe one sample of heater state and update the open session accordingly.
// heaterStore: { getOpenSession, openSession, touchSession, closeSession }
// spaSource:   'pad' | 'external' — best-effort attribution for spa sessions.
export async function recordHeaterSample({ status, now, heaterStore, spaSource = 'external' }) {
  const type = currentType(status);
  const open = await heaterStore.getOpenSession();

  // Nothing heating right now.
  if (!type) {
    if (open) {
      await heaterStore.closeSession(open, open.last_seen_at);
      return { action: 'closed', type: open.heater_type };
    }
    return { action: 'none' };
  }

  // Heating, but no open session → open a new one.
  if (!open) {
    await heaterStore.openSession({ heater_type: type, at: now, source: type === 'spa' ? spaSource : 'external' });
    return { action: 'opened', type };
  }

  // Heating, open session of the same type → heartbeat.
  if (open.heater_type === type) {
    await heaterStore.touchSession(open.id, now);
    return { action: 'touched', type };
  }

  // Heating, open session of a different type → close old, open new.
  await heaterStore.closeSession(open, open.last_seen_at);
  await heaterStore.openSession({ heater_type: type, at: now, source: type === 'spa' ? spaSource : 'external' });
  return { action: 'switched', type };
}
