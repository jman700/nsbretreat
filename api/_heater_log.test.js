import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordHeaterSample } from './_heater_log.js';

// Fake store: records calls, returns a preset open session (or null).
function makeFakeHeaterStore(open = null) {
  const calls = [];
  return {
    _calls: () => calls,
    async getOpenSession() { return open ? { ...open } : null; },
    async openSession(s) { calls.push({ fn: 'open', ...s }); },
    async touchSession(id, at) { calls.push({ fn: 'touch', id, at }); },
    async closeSession(session, endedAt) { calls.push({ fn: 'close', id: session.id, endedAt, started_at: session.started_at }); },
  };
}
const status = (over = {}) => ({ online: true, spa_heater: 'off', pool_heater: 'off', ...over });

test('idle + no open session → no-op, no writes', async () => {
  const store = makeFakeHeaterStore(null);
  const r = await recordHeaterSample({ status: status(), now: 1000, heaterStore: store });
  assert.equal(r.action, 'none');
  assert.equal(store._calls().length, 0);
});

test('spa heater on + no open session → opens a spa session with given source', async () => {
  const store = makeFakeHeaterStore(null);
  const r = await recordHeaterSample({ status: status({ spa_heater: 'on' }), now: 1000, heaterStore: store, spaSource: 'pad' });
  assert.equal(r.action, 'opened');
  assert.equal(r.type, 'spa');
  assert.deepEqual(store._calls(), [{ fn: 'open', heater_type: 'spa', at: 1000, source: 'pad' }]);
});

test('pool heater on + no open session → opens a pool session, source external even if spaSource is pad', async () => {
  const store = makeFakeHeaterStore(null);
  const r = await recordHeaterSample({ status: status({ pool_heater: 'on' }), now: 1000, heaterStore: store, spaSource: 'pad' });
  assert.equal(r.action, 'opened');
  assert.equal(r.type, 'pool');
  assert.deepEqual(store._calls(), [{ fn: 'open', heater_type: 'pool', at: 1000, source: 'external' }]);
});

test('spa on + open spa session → touches last_seen_at', async () => {
  const open = { id: 7, heater_type: 'spa', started_at: 500, last_seen_at: 900 };
  const store = makeFakeHeaterStore(open);
  const r = await recordHeaterSample({ status: status({ spa_heater: 'on' }), now: 1000, heaterStore: store });
  assert.equal(r.action, 'touched');
  assert.deepEqual(store._calls(), [{ fn: 'touch', id: 7, at: 1000 }]);
});

test('heater off + open session → closes at last_seen_at (not now)', async () => {
  const open = { id: 7, heater_type: 'spa', started_at: 500, last_seen_at: 900 };
  const store = makeFakeHeaterStore(open);
  const r = await recordHeaterSample({ status: status(), now: 1000, heaterStore: store });
  assert.equal(r.action, 'closed');
  assert.equal(r.type, 'spa');
  assert.deepEqual(store._calls(), [{ fn: 'close', id: 7, endedAt: 900, started_at: 500 }]);
});

test('pool on + open spa session → closes spa, opens pool', async () => {
  const open = { id: 7, heater_type: 'spa', started_at: 500, last_seen_at: 900 };
  const store = makeFakeHeaterStore(open);
  const r = await recordHeaterSample({ status: status({ pool_heater: 'on' }), now: 1000, heaterStore: store });
  assert.equal(r.action, 'switched');
  assert.equal(r.type, 'pool');
  assert.deepEqual(store._calls(), [
    { fn: 'close', id: 7, endedAt: 900, started_at: 500 },
    { fn: 'open', heater_type: 'pool', at: 1000, source: 'external' },
  ]);
});

test('both heaters read on → spa wins', async () => {
  const store = makeFakeHeaterStore(null);
  const r = await recordHeaterSample({ status: status({ spa_heater: 'on', pool_heater: 'on' }), now: 1000, heaterStore: store, spaSource: 'external' });
  assert.equal(r.type, 'spa');
});
