// api/_pool.js — pool/spa state parsing + reconciliation state machine.
// Pure logic: persistence (store) and hardware (iaqua) are injected.

export const AUTO_TIMER_HRS = 3;
export const GRACE_MS = 30 * 60 * 1000;
export const SHUTOFF_TIMEOUT_MS = 5 * 60 * 1000;
export const SHUTOFF_ALERT_THRESHOLD = 2;
// Absolute safety backstop: if the spa heater is physically on while the state
// machine is NOT tracking it as an active session (state stuck at 'idle') for
// this long, force it off and raise a safety alert. Independent of the timer
// bookkeeping, so it catches the "heater on, no timer set" runaway even when the
// normal 3-hour auto-timer path has failed.
export const SPA_MAX_RUNTIME_MS = 60 * 60 * 1000;

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
    if (heaterOn) {
      if ((ctx.row.early_end_count || 0) > 0) await store.saveState({ early_end_count: 0 });
      setTimerFields(status, ctx.row.end_time, now);
      return ok(status);
    }
    // heater off — require 2 consecutive readings before shutting down
    const count = (ctx.row.early_end_count || 0) + 1;
    if (count < 2) {
      await store.saveState({ early_end_count: count });
      setTimerFields(status, ctx.row.end_time, now);
      await store.log({ source, found, action: 'early_end_pending', success: true, detail: `off reading ${count}/2` });
      return { status, action: 'early_end_pending', anomaly: false, detail: '' };
    }
    // confirmed off on 2nd consecutive reading — shut down
    await fullShutdown(status, iaqua);
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'early_end_shutoff', success: true, detail: '' });
    return { status, action: 'early_end_shutoff', anomaly: false, detail: '' };
  }

  // expired
  await fullShutdown(status, iaqua);
  await store.saveState({ state: 'shutting_off', shutoff_attempts: 1, shutting_off_since: now, early_end_count: 0 });
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
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'shutoff_confirmed', success: true, detail: '' });
    return { status, action: 'shutoff_confirmed', anomaly: false, detail: '' };
  }

  // heater still on after timeout — assume external restart, reset to idle.
  // Re-stamp heater_on_since so this reset starts a fresh observation window:
  // handleIdle re-adopts the heater as a new session on the next tick, and the
  // runtime-cap backstop must not immediately fire on the (now-stale) original
  // on-time and kill a session the guest just restarted.
  const since = ctx.row.shutting_off_since || 0;
  if (since > 0 && now - since > SHUTOFF_TIMEOUT_MS) {
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, heater_on_since: now, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'shutoff_timeout_reset', success: true, detail: 'Heater on after timeout — resetting to idle for re-adoption' });
    return { status, action: 'shutoff_timeout_reset', anomaly: false, detail: '' };
  }

  // still on and within timeout — re-issue heater off and count the attempt
  await iaqua.command('set_spa_heater');
  const attempts = (ctx.row.shutoff_attempts || 0) + 1;
  await store.saveState({ shutoff_attempts: attempts });
  const anomaly = attempts >= SHUTOFF_ALERT_THRESHOLD;
  const detail = anomaly ? `Spa heater still on after ${attempts} shut-off attempts` : '';
  setTimerFields(status, 0, now);
  await store.log({ source, found, action: 'retry_shutoff', success: !anomaly, detail });
  return { status, action: 'retry_shutoff', anomaly, detail };
}

async function handleIdle(ctx) {
  const { status, now, store, iaqua, source } = ctx;
  const found = snapshot(ctx);
  const heaterOn = status.spa_heater === 'on';
  const spaPumpOn = status.spa_pump === 'on';

  if (heaterOn) {
    // turned on via the Jandy app with no timer — adopt it as a 3hr session
    const end_time = now + AUTO_TIMER_HRS * 3600 * 1000;
    if (!spaPumpOn) await iaqua.command('set_spa_pump');
    await store.saveState({ state: 'active', end_time, started_at: now, source: 'iaqualink', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false });
    setTimerFields(status, end_time, now);
    await store.log({ source, found, action: 'created_auto_timer', success: true, detail: '' });
    return { status, action: 'created_auto_timer', anomaly: false, detail: '' };
  }

  if (spaPumpOn) {
    // stuck in spa mode with heater off — revert after the grace period
    const since = (ctx.row.spa_mode_since && ctx.row.spa_mode_since > 0) ? ctx.row.spa_mode_since : now;
    if (now - since >= GRACE_MS) {
      await fullShutdown(status, iaqua);
      await store.saveState({ state: 'idle', spa_mode_since: 0 });
      setTimerFields(status, 0, now);
      await store.log({ source, found, action: 'reverted_spa_mode', success: true, detail: '' });
      return { status, action: 'reverted_spa_mode', anomaly: false, detail: '' };
    }
    if (!ctx.row.spa_mode_since) await store.saveState({ spa_mode_since: since });
    setTimerFields(status, 0, now);
    return ok(status);
  }

  // fully idle — clear any stale grace marker
  if (ctx.row.spa_mode_since) await store.saveState({ spa_mode_since: 0 });
  setTimerFields(status, 0, now);
  return ok(status);
}

// Safety backstop for the spa heater. Tracks how long the spa heater has been
// continuously on (heater_on_since) and force-shuts it off (with a safety alert)
// if it stays on while the state is stuck at 'idle' — i.e. the heater is running
// but no session is tracking it (the "heater on, no timer set" runaway).
//
// Scope: this only covers the SPA and only the 'idle' state. 'active' is owned by
// the timer (handleActive) and 'shutting_off' by handleShuttingOff, so a heater
// on under a valid — or even a corrupted far-future — active timer is NOT caught
// here; the spa-timer API caps timers at 12h (api/spa-timer.js) which bounds that.
// The pool heater is intentionally excluded: it is a paid, legitimately long
// amenity and is tracked separately in heater_sessions. Returns a reconcile
// result when it acts, otherwise null so the normal handlers run.
async function enforceHeaterSafety(ctx) {
  const { status, now, store, row, iaqua, source } = ctx;

  // Heater off: clear the on-since marker so the next on-episode starts fresh.
  if (status.spa_heater !== 'on') {
    if (row.heater_on_since) { await store.saveState({ heater_on_since: 0 }); row.heater_on_since = 0; }
    return null;
  }

  // Heater on: stamp when the continuous on-episode began.
  if (!row.heater_on_since) { await store.saveState({ heater_on_since: now }); row.heater_on_since = now; }

  // Capture before any mutation so the elapsed calc never depends on ordering.
  const onSince = row.heater_on_since;

  // Only the 'idle' state means "heater on but nothing is tracking it". 'active'
  // is owned by the timer (handleActive) and 'shutting_off' by handleShuttingOff.
  if (row.state === 'idle' && (now - onSince) >= SPA_MAX_RUNTIME_MS) {
    const found = snapshot(ctx);
    await fullShutdown(status, iaqua);
    await store.saveState({
      state: 'shutting_off', end_time: 0, shutoff_attempts: 1,
      shutting_off_since: now, early_end_count: 0, heater_on_since: 0,
    });
    setTimerFields(status, 0, now);
    const mins = Math.round((now - onSince) / 60000);
    const detail = `Spa heater on ${mins} min with no active timer — safety shutoff.`;
    await store.log({ source, found, action: 'runtime_cap_shutoff', success: true, detail });
    return { status, action: 'runtime_cap_shutoff', anomaly: true, detail, safetyNotify: true };
  }

  return null;
}

export async function reconcile({ status, now, store, iaqua, source = 'cron', row }) {
  row = row || await store.getState();
  const ctx = { status, now, store, iaqua, source, row };
  try {
    const safety = await enforceHeaterSafety(ctx);
    if (safety) return safety;
    if (row.state === 'active')       return await handleActive(ctx);
    if (row.state === 'shutting_off') return await handleShuttingOff(ctx);
    return await handleIdle(ctx);
  } catch (err) {
    await store.log({ source, found: snapshot(ctx), action: 'command_error', success: false, detail: err.message })
      .catch(() => {});
    return { status, action: 'command_error', anomaly: true, detail: err.message };
  }
}

const FIELD_MAP = {
  pool_temp: 'pool_temp', spa_temp: 'spa_temp', spa_heater: 'spa_heater', pool_heater: 'pool_heater',
  pool_pump: 'pool_pump', spa_pump: 'spa_pump', pool_set_point: 'pool_set_point', spa_set_point: 'spa_set_point',
};

export function parseHomeScreen(homeScreenArray) {
  const raw = {};
  for (const item of homeScreenArray) { const k = Object.keys(item)[0]; raw[k] = item[k]; }

  const result = {
    online: true, pool_temp: null, spa_temp: null,
    spa_heater: 'off', spa_pump: 'off', pool_pump: 'off',
    pool_light: 'off', pool_light_color: 'white', spa_jets: 'off',
    spa_set_point: 102, _raw: raw,
  };

  for (const [rawKey, val] of Object.entries(raw)) {
    const mapped = FIELD_MAP[rawKey];
    if (!mapped) continue;
    if (['pool_temp', 'spa_temp', 'spa_set_point', 'pool_set_point'].includes(mapped)) {
      result[mapped] = parseInt(val, 10) || null;
    } else {
      const n = parseInt(val, 10);
      result[mapped] = (val === '1' || val === 'true' || val === 'on' || (!isNaN(n) && n > 0)) ? 'on' : 'off';
    }
  }
  return result;
}

export function parseDevicesScreen(devicesScreenArray) {
  const states = {};
  for (const item of devicesScreenArray) {
    const key = Object.keys(item)[0];
    if (!key || !key.startsWith('aux_')) continue;
    const fields = item[key];
    const stateObj = Array.isArray(fields) ? fields.find(f => f.state !== undefined) : null;
    if (stateObj) states[key] = stateObj.state;
  }
  return states;
}

const AUX_JETS = 'aux_1';
const AUX_LIGHT = 'aux_2';
const LIGHT_COLOR_MAP = {
  2: 'sky_blue', 3: 'cobalt_blue', 4: 'caribbean_blue', 5: 'spring_green', 6: 'emerald_green',
  7: 'emerald_rose', 8: 'magenta', 9: 'violet', 10: 'slow_splash', 11: 'fast_splash',
  12: 'america', 13: 'fat_tuesday', 14: 'disco_tech',
};

export async function fetchStatus(iaqua) {
  const data = await iaqua.command('get_home');
  const homeScreen = data.home_screen || data.data || [];
  if (!Array.isArray(homeScreen)) return { online: false, _raw: data };

  const status = parseHomeScreen(homeScreen);
  try {
    const devData = await iaqua.command('get_devices');
    const devScreen = devData.devices_screen || [];
    const aux = Array.isArray(devScreen) ? parseDevicesScreen(devScreen) : {};
    if (AUX_JETS in aux) status.spa_jets = parseInt(aux[AUX_JETS], 10) > 0 ? 'on' : 'off';
    if (AUX_LIGHT in aux) {
      const v = parseInt(aux[AUX_LIGHT], 10);
      status.pool_light = v > 0 ? 'on' : 'off';
      status.pool_light_color = v >= 2 ? (LIGHT_COLOR_MAP[v] || null) : null;
    }
  } catch (e) {
    console.error('[fetchStatus] get_devices failed:', e.message);
  }
  return status;
}

// Orchestrates one health check: read prior state, fetch live status, reconcile, alert once per episode.
// fetchStatusFn is injectable for tests; defaults to the real fetchStatus.
export async function runHealthCheck({ store, iaqua, now, sendAlert, source = 'cron', fetchStatusFn = fetchStatus }) {
  const prior = await store.getState();
  const status = await fetchStatusFn(iaqua);
  const result = await reconcile({ status, now, store, iaqua, source, row: prior });

  // Alert once per episode on any heater problem — the won't-shut-off anomaly or
  // the runtime-cap safety shutoff. Safety alerts go to SAFETY_ALERT_TO
  // (antonio@jetsetusa.com), falling back to the default recipient.
  if ((result.anomaly || result.safetyNotify) && !prior.alerted) {
    const to = process.env.SAFETY_ALERT_TO || process.env.ALERT_EMAIL_TO;
    const subject = result.safetyNotify
      ? 'NSB Retreat — spa heater safety shutoff'
      : 'NSB Retreat — pool health check needs attention';
    await sendAlert(
      subject,
      `Action: ${result.action}\n${result.detail}\n` +
      `heater=${status.spa_heater} spa_pump=${status.spa_pump} jets=${status.spa_jets}\n` +
      `See the Heater Health Log in the admin panel for details.`,
      to,
    );
    await store.saveState({ alerted: true });
  }
  return { action: result.action, anomaly: result.anomaly, status, prior };
}
