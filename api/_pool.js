// api/_pool.js — pool/spa state parsing + reconciliation state machine.
// Pure logic: persistence (store) and hardware (iaqua) are injected.

export const AUTO_TIMER_HRS = 3;
export const GRACE_MS = 30 * 60 * 1000;
export const SHUTOFF_ALERT_THRESHOLD = 2;

const ok = (status) => ({ status, action: 'none', anomaly: false, detail: '' });

function snapshot(ctx) {
  return {
    heater:   ctx.status.spa_heater,
    spa_pump: ctx.status.spa_pump,
    jets:     ctx.status.spa_jets,
    state:    ctx.row.state,
    end_time: ctx.row.end_time,
  };
}

function setTimerFields(status, endTime, now) {
  status.spa_end_time = endTime || null;
  status.spa_seconds_remaining = endTime ? Math.max(0, Math.round((endTime - now) / 1000)) : 0;
}

// Send only the toggles needed to return to pool mode; mutate status to the post-state.
export async function fullShutdown(status, iaqua) {
  if (status.spa_heater === 'on') { await iaqua.command('set_spa_heater'); status.spa_heater = 'off'; }
  if (status.spa_pump   === 'on') { await iaqua.command('set_spa_pump');   status.spa_pump   = 'off'; }
  if (status.spa_jets   === 'on') { await iaqua.command('set_aux_1');      status.spa_jets   = 'off'; }
}

async function handleActive(ctx) {
  const { status, now, store, iaqua, source } = ctx;
  const found = snapshot(ctx);
  const heaterOn = status.spa_heater === 'on';

  if (now < ctx.row.end_time) {
    if (heaterOn) { setTimerFields(status, ctx.row.end_time, now); return ok(status); }
    // heater off before expiry — guest ended early; ensure pool mode
    await fullShutdown(status, iaqua);
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'early_end_shutoff', success: true, detail: '' });
    return { status, action: 'early_end_shutoff', anomaly: false, detail: '' };
  }

  // expired
  await fullShutdown(status, iaqua);
  await store.saveState({ state: 'shutting_off', shutoff_attempts: 1 });
  setTimerFields(status, 0, now);
  await store.log({ source, found, action: 'expired_shutoff', success: true, detail: '' });
  return { status, action: 'expired_shutoff', anomaly: false, detail: '' };
}

async function handleShuttingOff(ctx) {
  const { status, now, store, iaqua, source } = ctx;
  const found = snapshot(ctx);

  if (status.spa_heater !== 'on') {
    // hardware confirmed off — clear any lingering pump/jets, settle to idle
    await fullShutdown(status, iaqua);
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'shutoff_confirmed', success: true, detail: '' });
    return { status, action: 'shutoff_confirmed', anomaly: false, detail: '' };
  }

  // still on — re-issue heater off and count the attempt
  await iaqua.command('set_spa_heater');
  const attempts = (ctx.row.shutoff_attempts || 0) + 1;
  await store.saveState({ shutoff_attempts: attempts });
  const anomaly = attempts >= SHUTOFF_ALERT_THRESHOLD;
  const detail = anomaly ? `Spa heater still on after ${attempts} shut-off attempts` : '';
  setTimerFields(status, 0, now);
  await store.log({ source, found, action: 'retry_shutoff', success: !anomaly, detail });
  return { status, action: 'retry_shutoff', anomaly, detail };
}

// Replaced with real body in Task 6.
async function handleIdle(ctx) { return ok(ctx.status); }

export async function reconcile({ status, now, store, iaqua, source = 'cron', row }) {
  row = row || await store.getState();
  const ctx = { status, now, store, iaqua, source, row };
  try {
    if (row.state === 'active')       return await handleActive(ctx);
    if (row.state === 'shutting_off') return await handleShuttingOff(ctx);
    return await handleIdle(ctx);
  } catch (err) {
    await store.log({ source, found: snapshot(ctx), action: 'command_error', success: false, detail: err.message })
      .catch(() => {});
    return { status, action: 'command_error', anomaly: true, detail: err.message };
  }
}
