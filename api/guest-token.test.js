// api/guest-token.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateToken } from './guest-token.js';

function makeFakeSb(row) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => row
            ? { data: row, error: null }
            : { data: null, error: { message: 'not found' } },
        }),
      }),
    }),
  };
}

test('valid token returns valid=true and label', async () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const sb = makeFakeSb({ label: 'Smith Family', expires_at: future });
  const result = await validateToken('abc123', sb);
  assert.deepEqual(result, { valid: true, label: 'Smith Family' });
});

test('expired token returns valid=false reason=expired', async () => {
  const past = new Date(Date.now() - 3_600_000).toISOString();
  const sb = makeFakeSb({ label: 'Old Guest', expires_at: past });
  const result = await validateToken('abc123', sb);
  assert.deepEqual(result, { valid: false, reason: 'expired' });
});

test('unknown token returns valid=false reason=not_found', async () => {
  const sb = makeFakeSb(null);
  const result = await validateToken('badtoken', sb);
  assert.deepEqual(result, { valid: false, reason: 'not_found' });
});

test('missing token (undefined) returns valid=false reason=not_found', async () => {
  const sb = makeFakeSb(null);
  const result = await validateToken(undefined, sb);
  assert.deepEqual(result, { valid: false, reason: 'not_found' });
});
