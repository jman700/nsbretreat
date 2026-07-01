import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, fullShutdown, AUTO_TIMER_HRS, SHUTOFF_TIMEOUT_MS, SPA_MAX_RUNTIME_MS } from './_pool.js';
import { GRACE_MS as GRACE_MS_TEST } from './_pool.js';

// ── shared fakes ──
export function makeFakeStore(row) {
  const state = { ...row };
  const logs = [];
  return {
    _state: () => state,
    _logs: () => logs,
    async getState() { return { ...state }; },
    async saveState(patch) { Object.assign(state, patch); },
    async log(entry) { logs.push(entry); },
  };
}
export function makeFakeIaqua() {
  const calls = [];
  return { _calls: () => calls, async command(cmd, params = {}) { calls.push({ cmd, params }); return {}; } };
}
const baseStatus = (over = {}) => ({ spa_heater: 'off', spa_pump: 'off', spa_jets: 'off', ...over });

test('fullShutdown sends only the toggles needed, in order, and mutates status off', async () => {
  const iaqua = makeFakeIaqua();
  const status = baseStatus({ spa_heater: 'on', spa_pump: 'on', spa_jets: 'on' });
  await fullShutdown(status, iaqua);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater', 'set_spa_pump', 'set_aux_1']);
  assert.equal(status.spa_heater, 'off');
  assert.equal(status.spa_pump, 'off');
});

test('fullShutdown skips toggles for already-off devices', async () => {
  const iaqua = makeFakeIaqua();
  await fullShutdown(baseStatus({ spa_heater: 'on' }), iaqua);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater']);
});

test('active + heater on + not expired → no action, reports remaining seconds', async () => {
  const now = 1000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'none');
  assert.equal(iaqua._calls().length, 0);
  assert.equal(r.status.spa_seconds_remaining, 60);
});

test('active + expired → full shutdown, state shutting_off, attempts 1, logged', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now - 1, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on', spa_pump: 'on', spa_jets: 'on' }), now, store, iaqua, source: 'cron' });
  assert.equal(r.action, 'expired_shutoff');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater', 'set_spa_pump', 'set_aux_1']);
  assert.equal(store._state().state, 'shutting_off');
  assert.equal(store._state().shutoff_attempts, 1);
  assert.equal(store._logs().length, 1);
  assert.equal(store._logs()[0].success, true);
  assert.equal(store._logs()[0].found.heater, 'on');
});

test('active + heater off before expiry, first reading → early_end_pending, no shutdown', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, early_end_count: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'early_end_pending');
  assert.equal(iaqua._calls().length, 0);
  assert.equal(store._state().state, 'active');
  assert.equal(store._state().early_end_count, 1);
});

test('active + heater off before expiry, second reading → early_end_shutoff, transitions to idle', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, early_end_count: 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'early_end_shutoff');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump']);
  assert.equal(store._state().state, 'idle');
  assert.equal(store._state().early_end_count, 0);
});

test('active + heater comes back on → resets early_end_count to 0', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, early_end_count: 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'none');
  assert.equal(iaqua._calls().length, 0);
  assert.equal(store._state().early_end_count, 0);
});

test('shutting_off + heater confirmed off → idle, clears lingering pump, resets flags', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 2, spa_mode_since: 0, alerted: true });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'shutoff_confirmed');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump']);
  assert.equal(store._state().state, 'idle');
  assert.equal(store._state().shutoff_attempts, 0);
  assert.equal(store._state().alerted, false);
});

test('shutting_off + heater still on, first retry (0→1) → no anomaly', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'retry_shutoff');
  assert.equal(r.anomaly, false);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater']);
  assert.equal(store._state().shutoff_attempts, 1);
});

test('shutting_off + heater still on, second retry (1→2) → anomaly at threshold', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 1, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'retry_shutoff');
  assert.equal(r.anomaly, true);
  assert.match(r.detail, /still on after 2/);
  assert.equal(store._state().shutoff_attempts, 2);
  assert.equal(store._logs()[0].success, false);
});

test('idle + heater on (external Jandy turn-on) → create 3hr timer + ensure spa mode', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on', spa_pump: 'off' }), now, store, iaqua });
  assert.equal(r.action, 'created_auto_timer');
  assert.equal(store._state().state, 'active');
  assert.equal(store._state().end_time, now + AUTO_TIMER_HRS * 3600 * 1000);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump']);
});

test('idle + stuck spa mode, within grace → record spa_mode_since, no command', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'none');
  assert.equal(iaqua._calls().length, 0);
  assert.equal(store._state().spa_mode_since, now);
});

test('idle + stuck spa mode, past 30-min grace → revert to pool mode + jets off', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: now - GRACE_MS_TEST - 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on', spa_jets: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'reverted_spa_mode');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump', 'set_aux_1']);
  assert.equal(store._state().spa_mode_since, 0);
});

test('idle + fully off → clears any stale spa_mode_since, no action', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 123, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus(), now, store, iaqua });
  assert.equal(r.action, 'none');
  assert.equal(store._state().spa_mode_since, 0);
});

test('command failure during shutdown → anomaly + failed log', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now - 1, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = { _calls: () => [], async command() { throw new Error('iAqualink 500'); } };
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua, source: 'cron' });
  assert.equal(r.anomaly, true);
  assert.equal(r.action, 'command_error');
  assert.match(r.detail, /iAqualink 500/);
  assert.equal(store._logs()[0].success, false);
});

import { parseHomeScreen, parseDevicesScreen } from './_pool.js';

test('parseHomeScreen normalizes heater, spa_pump, and temps', () => {
  const home = [{ spa_heater: '1' }, { spa_pump: '1' }, { pool_temp: '80' }, { spa_temp: '102' }, { spa_set_point: '102' }];
  const s = parseHomeScreen(home);
  assert.equal(s.spa_heater, 'on');
  assert.equal(s.spa_pump, 'on');
  assert.equal(s.pool_temp, 80);
  assert.equal(s.spa_temp, 102);
  assert.equal(s.online, true);
});

test('parseHomeScreen defaults spa_pump to off when absent', () => {
  const s = parseHomeScreen([{ spa_heater: '0' }]);
  assert.equal(s.spa_pump, 'off');
});

test('parseDevicesScreen flattens aux states', () => {
  const dev = [{ aux_1: [{ state: '1' }, { label: 'Air Blower' }] }, { aux_2: [{ state: '0' }] }];
  const m = parseDevicesScreen(dev);
  assert.equal(m.aux_1, '1');
  assert.equal(m.aux_2, '0');
});

test('fetchStatus reads heater/pump from get_home and jets from get_devices', async () => {
  const iaqua = {
    async command(cmd) {
      if (cmd === 'get_home')    return { home_screen: [{ spa_heater: '1' }, { spa_pump: '1' }, { pool_temp: '79' }] };
      if (cmd === 'get_devices') return { devices_screen: [{ aux_1: [{ state: '1' }] }, { aux_2: [{ state: '0' }] }] };
      return {};
    },
  };
  const { fetchStatus } = await import('./_pool.js');
  const s = await fetchStatus(iaqua);
  assert.equal(s.spa_heater, 'on');
  assert.equal(s.spa_pump, 'on');
  assert.equal(s.spa_jets, 'on');
  assert.equal(s.pool_light, 'off');
});

test('runHealthCheck emails once on a new anomaly and sets alerted', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 1, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const sent = [];
  const { runHealthCheck } = await import('./_pool.js');
  const out = await runHealthCheck({
    store, iaqua, now,
    sendAlert: async (s, t) => sent.push({ s, t }),
    fetchStatusFn: async () => ({ spa_heater: 'on', spa_pump: 'off', spa_jets: 'off' }),
  });
  assert.equal(out.anomaly, true);
  assert.equal(sent.length, 1);
  assert.equal(store._state().alerted, true);
});

test('runHealthCheck does not re-alert when already alerted', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 2, spa_mode_since: 0, alerted: true });
  const iaqua = makeFakeIaqua();
  const sent = [];
  const { runHealthCheck } = await import('./_pool.js');
  await runHealthCheck({
    store, iaqua, now,
    sendAlert: async (s, t) => sent.push({ s, t }),
    fetchStatusFn: async () => ({ spa_heater: 'on', spa_pump: 'off', spa_jets: 'off' }),
  });
  assert.equal(sent.length, 0);
});

test('runHealthCheck stays silent on a healthy system', async () => {
  const now = 1000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const sent = [];
  const { runHealthCheck } = await import('./_pool.js');
  const out = await runHealthCheck({
    store, iaqua, now,
    sendAlert: async (s, t) => sent.push({ s, t }),
    fetchStatusFn: async () => ({ spa_heater: 'on', spa_pump: 'on', spa_jets: 'off' }),
  });
  assert.equal(out.action, 'none');
  assert.equal(sent.length, 0);
});

test('shutting_off + heater on past 5-min timeout → reset to idle, no hardware command', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({
    id: 1, state: 'shutting_off', end_time: 0,
    shutoff_attempts: 2, spa_mode_since: 0,
    shutting_off_since: now - SHUTOFF_TIMEOUT_MS - 1,
    early_end_count: 0, alerted: false,
  });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'shutoff_timeout_reset');
  assert.equal(iaqua._calls().length, 0);
  assert.equal(store._state().state, 'idle');
  assert.equal(store._state().shutting_off_since, 0);
  assert.equal(store._logs().length, 1);
  assert.equal(store._logs()[0].action, 'shutoff_timeout_reset');
});

test('shutting_off + heater on within 5-min timeout → retry as before', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({
    id: 1, state: 'shutting_off', end_time: 0,
    shutoff_attempts: 0, spa_mode_since: 0,
    shutting_off_since: now - 60_000,
    early_end_count: 0, alerted: false,
  });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'retry_shutoff');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater']);
});

test('runHealthCheck returns the fetched status and prior row', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, alerted: false, source: 'pad' });
  const iaqua = makeFakeIaqua();
  const { runHealthCheck } = await import('./_pool.js');
  const out = await runHealthCheck({
    store, iaqua, now,
    sendAlert: async () => {},
    fetchStatusFn: async () => ({ online: true, spa_heater: 'on', pool_heater: 'off', spa_pump: 'on', spa_jets: 'off' }),
  });
  assert.equal(out.status.spa_heater, 'on');
  assert.equal(out.status.online, true);
  assert.equal(out.prior.source, 'pad');
});

// ── Runtime-cap safety backstop ──
test('idle + spa heater stuck on past runtime cap → safety shutoff + notify', async () => {
  const now = 10_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, heater_on_since: now - SPA_MAX_RUNTIME_MS - 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'runtime_cap_shutoff');
  assert.equal(r.safetyNotify, true);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_heater', 'set_spa_pump']);
  assert.equal(store._state().state, 'shutting_off');
  assert.equal(store._state().heater_on_since, 0);
  assert.equal(store._logs()[0].action, 'runtime_cap_shutoff');
});

test('idle + spa heater on within runtime cap → adopts timer, records heater_on_since', async () => {
  const now = 10_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on', spa_pump: 'off' }), now, store, iaqua });
  assert.equal(r.action, 'created_auto_timer');
  assert.equal(store._state().heater_on_since, now);
});

test('active + heater on (covered by timer) → runtime cap does not fire even when on-time is long', async () => {
  const now = 10_000_000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, heater_on_since: now - SPA_MAX_RUNTIME_MS - 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'none');
  assert.equal(iaqua._calls().length, 0);
});

test('spa heater off → clears heater_on_since', async () => {
  const now = 10_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, heater_on_since: 123, alerted: false });
  const iaqua = makeFakeIaqua();
  await reconcile({ status: baseStatus({ spa_heater: 'off' }), now, store, iaqua });
  assert.equal(store._state().heater_on_since, 0);
});

test('runHealthCheck emails the safety recipient on runtime_cap_shutoff', async () => {
  const now = 10_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, heater_on_since: now - SPA_MAX_RUNTIME_MS - 1, alerted: false });
  const iaqua = makeFakeIaqua();
  const sent = [];
  const { runHealthCheck } = await import('./_pool.js');
  const out = await runHealthCheck({
    store, iaqua, now,
    sendAlert: async (s, t, to) => sent.push({ s, t, to }),
    fetchStatusFn: async () => ({ online: true, spa_heater: 'on', pool_heater: 'off', spa_pump: 'on', spa_jets: 'off' }),
  });
  assert.equal(out.action, 'runtime_cap_shutoff');
  assert.equal(sent.length, 1);
  assert.equal(store._state().alerted, true);
});
