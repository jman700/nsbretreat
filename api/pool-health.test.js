import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from './pool-health.js';

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() {},
    end() { return this; },
  };
}

test('rejects requests without the correct cron secret', async () => {
  process.env.POOL_HEALTH_SECRET = 'right';
  const res = mockRes();
  await handler({ method: 'POST', headers: { 'x-cron-secret': 'wrong' } }, res);
  assert.equal(res.statusCode, 401);
});

test('rejects requests with no secret header', async () => {
  process.env.POOL_HEALTH_SECRET = 'right';
  const res = mockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});
