import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, fullShutdown, AUTO_TIMER_HRS } from './_pool.js';
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

test('active + heater off before expiry → early-end shutdown to idle', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'active', end_time: now + 60000, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'off', spa_pump: 'on' }), now, store, iaqua });
  assert.equal(r.action, 'early_end_shutoff');
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump']);
  assert.equal(store._state().state, 'idle');
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
