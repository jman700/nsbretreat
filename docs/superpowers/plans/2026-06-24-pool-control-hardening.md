# Pool Control State Machine Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pool/spa controls reliable when the Jandy app and the website are used together, by making the status endpoint read-only and fixing three state machine bugs.

**Architecture:** `pool-status.js` becomes a pure read endpoint (no Supabase writes, no hardware commands). All reconcile logic moves exclusively to the `pool-health.js` cron, which fires every minute via Vercel cron. Three bug fixes in `_pool.js` close specific failure modes: stuck `shutting_off` state, aggressive early-end detection, and missing timestamps.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict`, Supabase REST, Vercel serverless + crons

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/004_spa_timer_hardening.sql` | Create — two new columns |
| `api/_pool.js` | Modify — new constants + two state machine fixes |
| `api/_pool.test.js` | Modify — update 1 existing test, add 5 new tests |
| `api/spa-timer.js` | Modify — set `shutting_off_since` + reset `early_end_count` |
| `api/pool-status.js` | Modify — remove `reconcile()`, add direct timer read |
| `api/pool-health.js` | Modify — remove kill-switch flag, update auth to `CRON_SECRET` |
| `vercel.json` | Modify — add `crons` array |

---

### Task 1: SQL Migration — add `shutting_off_since` and `early_end_count`

**Files:**
- Create: `supabase/migrations/004_spa_timer_hardening.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 004_spa_timer_hardening.sql
alter table public.spa_timer
  add column if not exists shutting_off_since bigint default 0,
  add column if not exists early_end_count    int    default 0;
```

- [ ] **Step 2: Apply in Supabase dashboard**

Go to Supabase → SQL Editor → paste and run the migration. Confirm no error and the two columns appear in the `spa_timer` table schema.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_spa_timer_hardening.sql
git commit -m "feat: add shutting_off_since and early_end_count to spa_timer"
```

---

### Task 2: Fix 1 — `handleShuttingOff` 5-minute timeout

**Files:**
- Modify: `api/_pool.js`
- Modify: `api/_pool.test.js`

**Context:** When the website stops the spa, `state` is set to `shutting_off`. Currently, if the heater is still on, reconcile re-issues `set_spa_heater` (a toggle) on every cron run — forever. If the user then turns the spa back on via the Jandy app, the cron immediately kills it. Fix: after 5 minutes in `shutting_off` with the heater still on, stop retrying and reset to `idle`. The idle handler will then adopt it as a new session on the same or next cron run.

- [ ] **Step 1: Add failing tests to `api/_pool.test.js`**

First, add `SHUTOFF_TIMEOUT_MS` to the existing `_pool.js` import at the top of the file. Change:

```js
import { reconcile, fullShutdown, AUTO_TIMER_HRS } from './_pool.js';
```

to:

```js
import { reconcile, fullShutdown, AUTO_TIMER_HRS, SHUTOFF_TIMEOUT_MS } from './_pool.js';
```

Then append these two tests at the end of the file:

```js
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```
node --test api/_pool.test.js
```

Expected: the two new tests fail with errors about `SHUTOFF_TIMEOUT_MS` not exported and wrong action.

- [ ] **Step 3: Implement Fix 1 in `api/_pool.js`**

At the top of the file, add the new constant alongside the existing ones:

```js
export const AUTO_TIMER_HRS = 3;
export const GRACE_MS = 30 * 60 * 1000;
export const SHUTOFF_TIMEOUT_MS = 5 * 60 * 1000;
export const SHUTOFF_ALERT_THRESHOLD = 2;
```

Replace the entire `handleShuttingOff` function with:

```js
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

  // heater still on after timeout — assume external restart, reset to idle
  const since = ctx.row.shutting_off_since || 0;
  if (since > 0 && now - since > SHUTOFF_TIMEOUT_MS) {
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false });
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
```

Also update `handleActive`'s expired-shutoff path to record `shutting_off_since`. Find this block inside `handleActive`:

```js
  // expired
  await fullShutdown(status, iaqua);
  await store.saveState({ state: 'shutting_off', shutoff_attempts: 1 });
```

Replace with:

```js
  // expired
  await fullShutdown(status, iaqua);
  await store.saveState({ state: 'shutting_off', shutoff_attempts: 1, shutting_off_since: now, early_end_count: 0 });
```

- [ ] **Step 4: Run tests to confirm all pass**

```
node --test api/_pool.test.js
```

Expected: all tests pass including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: handleShuttingOff 5-minute timeout resets to idle on external restart"
```

---

### Task 3: Fix 2 — `handleActive` early-end debounce

**Files:**
- Modify: `api/_pool.js`
- Modify: `api/_pool.test.js`

**Context:** Currently, if the spa heater reads as `off` for one single cron run while a timer is active, `handleActive` immediately calls `fullShutdown`. An API blip causes a full shutdown. Fix: require 2 consecutive cron runs showing `heater=off` before shutting down, tracked via the `early_end_count` field.

- [ ] **Step 1: Update existing test and add new tests in `api/_pool.test.js`**

**Replace** the existing test named `'active + heater off before expiry → early-end shutdown to idle'` with these three tests:

```js
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
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```
node --test api/_pool.test.js
```

Expected: the three new tests fail (current code has no debounce).

- [ ] **Step 3: Implement Fix 2 in `api/_pool.js`**

Inside `handleActive`, replace the entire `if (now < ctx.row.end_time)` block:

**Current:**
```js
  if (now < ctx.row.end_time) {
    if (heaterOn) { setTimerFields(status, ctx.row.end_time, now); return ok(status); }
    // heater off before expiry — guest ended early; ensure pool mode
    await fullShutdown(status, iaqua);
    await store.saveState({ state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
    setTimerFields(status, 0, now);
    await store.log({ source, found, action: 'early_end_shutoff', success: true, detail: '' });
    return { status, action: 'early_end_shutoff', anomaly: false, detail: '' };
  }
```

**Replace with:**
```js
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
```

Also update `handleIdle`'s `created_auto_timer` saveState to initialize the new fields. Find:

```js
    await store.saveState({ state: 'active', end_time, started_at: now, source: 'iaqualink', shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
```

Replace with:

```js
    await store.saveState({ state: 'active', end_time, started_at: now, source: 'iaqualink', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false });
```

- [ ] **Step 4: Run all tests**

```
node --test api/_pool.test.js
```

Expected: all tests pass including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: handleActive requires 2 consecutive off readings before early-end shutdown"
```

---

### Task 4: `spa-timer.js` — set `shutting_off_since` and reset `early_end_count`

**Files:**
- Modify: `api/spa-timer.js`

**Context:** When the Stop button is pressed, the DELETE handler sets `state='shutting_off'` but does not set `shutting_off_since`. Without this timestamp, Fix 1's 5-minute timeout in `handleShuttingOff` will never fire (it guards on `since > 0`). Also reset `early_end_count` on both DELETE (entering shutting_off) and POST (creating a new timer).

- [ ] **Step 1: Update DELETE handler in `api/spa-timer.js`**

Find the DELETE block:

```js
  if (req.method === 'DELETE') {
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time: 0, started_at: 0, source: 'stop', state: 'shutting_off' },
      { onConflict: 'id' }
    );
```

Replace with:

```js
  if (req.method === 'DELETE') {
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time: 0, started_at: 0, source: 'stop', state: 'shutting_off', shutting_off_since: Date.now(), early_end_count: 0 },
      { onConflict: 'id' }
    );
```

- [ ] **Step 2: Update POST handler in `api/spa-timer.js`**

Find the POST upsert:

```js
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time, started_at: now, source, state: 'active', shutoff_attempts: 0, spa_mode_since: 0, alerted: false },
      { onConflict: 'id' }
    );
```

Replace with:

```js
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time, started_at: now, source, state: 'active', shutoff_attempts: 0, spa_mode_since: 0, shutting_off_since: 0, early_end_count: 0, alerted: false },
      { onConflict: 'id' }
    );
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```
node --test api/_pool.test.js
```

Expected: all tests still pass (spa-timer.js has no unit tests; this just confirms no regressions in pool logic).

- [ ] **Step 4: Commit**

```bash
git add api/spa-timer.js
git commit -m "feat: set shutting_off_since and reset early_end_count in spa-timer handlers"
```

---

### Task 5: `pool-status.js` — make read-only

**Files:**
- Modify: `api/pool-status.js`

**Context:** The status endpoint currently calls `reconcile()` on every poll, issuing hardware commands from a read endpoint. Replace with a direct Supabase read of the `spa_timer` row to populate `spa_end_time` and `spa_seconds_remaining` — no writes, no hardware calls.

- [ ] **Step 1: Rewrite `api/pool-status.js`**

Replace the entire file content with:

```js
// api/pool-status.js
// GET /api/pool-status — live pool/spa state + durable spa timer. Read-only.

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { fetchStatus } from './_pool.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const auth = await authenticate();
    const iaqua = { command: (cmd, params = {}) => deviceRequest(auth, cmd, params) };
    const status = await fetchStatus(iaqua);

    if (status.online === false) return res.status(200).json(status);

    try {
      const now = Date.now();
      const store = makePoolStore(getSupabase());
      const row = await store.getState();
      const endTime = (row.state === 'active' && row.end_time > now) ? row.end_time : 0;
      status.spa_end_time = endTime || null;
      status.spa_seconds_remaining = endTime ? Math.max(0, Math.round((endTime - now) / 1000)) : 0;
    } catch (sbErr) {
      console.error('[pool-status] timer read error:', sbErr.message);
      status.spa_end_time = null;
      status.spa_seconds_remaining = 0;
    }

    return res.status(200).json(status);
  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
```

- [ ] **Step 2: Verify the import list shrank correctly**

The new file imports `fetchStatus` (not `reconcile`) from `_pool.js`. Confirm the import line reads:

```js
import { fetchStatus } from './_pool.js';
```

- [ ] **Step 3: Run tests (no regressions)**

```
node --test api/_pool.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add api/pool-status.js
git commit -m "feat: pool-status is now read-only — reconcile removed from status endpoint"
```

---

### Task 6: `pool-health.js` — update auth to Vercel `CRON_SECRET`

**Files:**
- Modify: `api/pool-health.js`

**Context:** The current handler checks a legacy `x-cron-secret` header against `POOL_HEALTH_SECRET`. Vercel's built-in cron system sends `Authorization: Bearer <CRON_SECRET>` where `CRON_SECRET` is auto-generated by Vercel when crons are enabled. Switching to this standard header lets the Vercel cron fire correctly without any manual secret configuration. Also remove the `CONTROLS_DISABLED` kill-switch flag added as a temporary workaround.

- [ ] **Step 1: Rewrite `api/pool-health.js`**

Replace the entire file content with:

```js
// api/pool-health.js
// POST /api/pool-health — cron-triggered reconciliation heartbeat (Vercel CRON_SECRET-gated).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { runHealthCheck } from './_pool.js';
import { makeMailer } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers['authorization'] || '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const auth = await authenticate();
    const iaqua = { command: (cmd, params = {}) => deviceRequest(auth, cmd, params) };
    const store = makePoolStore(getSupabase());
    const mailer = makeMailer();
    const out = await runHealthCheck({ store, iaqua, now: Date.now(), sendAlert: mailer.sendAlert, source: 'cron' });
    return res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('[pool-health]', err.message);
    try { await makeMailer().sendAlert('NSB Retreat — pool health check error', err.message); } catch {}
    return res.status(500).json({ ok: false, error: err.message });
  }
}
```

- [ ] **Step 2: Run tests (no regressions)**

```
node --test api/_pool.test.js
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add api/pool-health.js
git commit -m "feat: pool-health uses Vercel CRON_SECRET auth, removes kill-switch flag"
```

---

### Task 7: `vercel.json` — add Vercel cron config

**Files:**
- Modify: `vercel.json`

**Context:** This is the final piece. Adding `"crons"` to vercel.json tells Vercel to fire `/api/pool-health` every minute. Vercel auto-generates `CRON_SECRET` and injects it into the `Authorization: Bearer` header on each cron request. The handler from Task 6 will accept it.

- [ ] **Step 1: Update `vercel.json`**

Replace the entire file with:

```json
{
  "cleanUrls": true,
  "redirects": [
    { "source": "/guest/:token", "destination": "/guest?t=:token", "permanent": false }
  ],
  "rewrites": [
    { "source": "/api/ical",         "destination": "/api/ical.js" },
    { "source": "/api/ical-vrbo",    "destination": "/api/ical-vrbo.js" }
  ],
  "crons": [
    { "path": "/api/pool-health", "schedule": "* * * * *" }
  ]
}
```

- [ ] **Step 2: Commit and push**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron to fire pool-health every minute"
git push
```

- [ ] **Step 3: Verify deploy and cron in Vercel dashboard**

After push, go to Vercel dashboard → your project → Settings → Cron Jobs. Confirm `/api/pool-health` appears with schedule `* * * * *`. Wait ~2 minutes and confirm it shows a successful run (green checkmark).

- [ ] **Step 4: Verify pool-status is now read-only**

```bash
curl -s https://www.nsbretreat.com/api/pool-status | jq '{online, spa_end_time, spa_seconds_remaining}'
```

Expected: returns `online: true` (or `false` if iAqualink is offline) with `spa_end_time` and `spa_seconds_remaining` populated from Supabase — no errors.
