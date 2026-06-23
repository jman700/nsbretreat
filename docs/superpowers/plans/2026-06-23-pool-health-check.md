# Pool/Spa Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the spa reconciliation on a 5-minute server-side heartbeat so an expired or abandoned hot-tub session is always shut down and returned to pool mode, emailing the owner only on failure.

**Architecture:** Extract the reconciliation buried in `pool-status.js` into a pure, dependency-injected state machine (`reconcile`) in a shared `api/_pool.js`. Both the existing iPad poll and a new secret-gated `/api/pool-health` endpoint call it. Persistence and iAquaLink are injected behind tiny `store` / `iaqua` interfaces so the logic is unit-tested with fakes — no hardware or network in tests. Supabase `pg_cron` pings the endpoint; failures email via Resend.

**Tech Stack:** Vercel serverless (Node 20 ESM), Supabase (Postgres + `pg_cron` + `pg_net` + Vault), iAquaLink REST, Resend, `node --test` for tests.

---

## Shared interfaces (used by every task — names are fixed)

**`iaqua`** — built in endpoints, faked in tests:
```js
{ command: (cmd, params = {}) => Promise<any> }   // wraps deviceRequest(auth, cmd, params)
```

**`store`** — built by `makePoolStore(sb)` in `api/_store.js`, faked in tests:
```js
{
  getState() => Promise<stateRow>,   // the spa_timer row (id=1); creates a default idle row if missing
  saveState(patch) => Promise<void>, // upsert {id:1, ...patch, updated_at}; partial patches merge
  log(entry) => Promise<void>,       // insert into pool_health_log
}
```

**`stateRow`** (the single `spa_timer` row, `id = 1`):
`{ id, end_time, started_at, source, state, shutoff_attempts, spa_mode_since, alerted, updated_at }`
- `state`: `'idle' | 'active' | 'shutting_off'`
- `end_time` / `started_at` / `spa_mode_since`: epoch **ms** (bigint); `0` = unset

**`status`** (from `fetchStatus`): includes `spa_heater`, `spa_pump`, `spa_jets` each `'on' | 'off'`, plus temps/light fields, plus `spa_end_time` / `spa_seconds_remaining` added by `reconcile`.

**iAquaLink command strings:** heater toggle `set_spa_heater`; spa-mode (pump) toggle `set_spa_pump`; jets/blower toggle `set_aux_1`.

**`action` vocabulary (log + return):** `none`, `expired_shutoff`, `early_end_shutoff`, `shutoff_confirmed`, `retry_shutoff`, `created_auto_timer`, `reverted_spa_mode`, `command_error`.

**Constants (exported from `_pool.js`):** `AUTO_TIMER_HRS = 3`, `GRACE_MS = 30*60*1000`, `SHUTOFF_ALERT_THRESHOLD = 2`.

---

### Task 1: Test harness + database migration

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/002_pool_health.sql`

- [ ] **Step 1: Add a test script to `package.json`**

Replace the file contents with:
```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "sharp": "^0.34.5",
    "@supabase/supabase-js": "^2.105.3"
  }
}
```

- [ ] **Step 2: Verify the runner works (no tests yet = pass)**

Run: `npm test`
Expected: exits 0 with "tests 0" (no test files found yet).

- [ ] **Step 3: Write the migration SQL**

Create `supabase/migrations/002_pool_health.sql`:
```sql
-- 002_pool_health.sql — server-side pool/spa health check
-- spa_timer was created via the dashboard; back-fill its shape and add columns.
create table if not exists public.spa_timer (
  id         bigint primary key,
  end_time   bigint  default 0,
  started_at bigint  default 0,
  source     text    default 'init'
);

alter table public.spa_timer add column if not exists state            text        default 'idle';
alter table public.spa_timer add column if not exists shutoff_attempts integer     default 0;
alter table public.spa_timer add column if not exists spa_mode_since   bigint      default 0;
alter table public.spa_timer add column if not exists alerted          boolean     default false;
alter table public.spa_timer add column if not exists updated_at       timestamptz default now();

-- ensure the single control row exists and has a state
insert into public.spa_timer (id, end_time, started_at, source, state)
values (1, 0, 0, 'init', 'idle')
on conflict (id) do update set state = coalesce(public.spa_timer.state, 'idle');

create table if not exists public.pool_health_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  source     text,
  found      jsonb,
  action     text,
  success    boolean,
  detail     text
);

alter table public.pool_health_log enable row level security;
drop policy if exists "admin read health log" on public.pool_health_log;
create policy "admin read health log" on public.pool_health_log
  for select to authenticated using (true);
```

- [ ] **Step 4: Apply the migration to Supabase**

Apply via the Supabase MCP `apply_migration` tool (name: `002_pool_health`, the SQL above) against project `xittuxwilxmzzawjdivd`, OR paste it into the Supabase SQL editor and run.
Verify: `select state, shutoff_attempts, spa_mode_since, alerted from public.spa_timer where id = 1;` returns one row; `select * from public.pool_health_log;` returns the (empty) table without error.

- [ ] **Step 5: Commit**

```bash
git add package.json supabase/migrations/002_pool_health.sql
git commit -m "chore: test runner + pool health migration (spa_timer columns, pool_health_log)"
```

---

### Task 2: Resend email wrapper (`_email.js`)

**Files:**
- Create: `api/_email.js`
- Test: `api/_email.test.js`

- [ ] **Step 1: Write the failing test**

Create `api/_email.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMailer } from './_email.js';

test('sendAlert posts to Resend with bearer auth and a json body', async () => {
  process.env.RESEND_API_KEY  = 'test_key';
  process.env.ALERT_EMAIL_FROM = 'from@example.com';
  process.env.ALERT_EMAIL_TO   = 'to@example.com';

  const calls = [];
  const fakeFetch = async (url, opts) => { calls.push({ url, opts }); return { ok: true, async text() { return ''; } }; };

  const mailer = makeMailer(fakeFetch);
  await mailer.sendAlert('Subj', 'Body');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer test_key');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.subject, 'Subj');
  assert.equal(body.to, 'to@example.com');
  assert.equal(body.from, 'from@example.com');
});

test('sendAlert is a no-op (no throw) when RESEND_API_KEY is missing', async () => {
  delete process.env.RESEND_API_KEY;
  let called = false;
  const mailer = makeMailer(async () => { called = true; return { ok: true, async text() { return ''; } }; });
  await mailer.sendAlert('S', 'B');
  assert.equal(called, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_email.test.js`
Expected: FAIL — cannot find module `./_email.js`.

- [ ] **Step 3: Write the implementation**

Create `api/_email.js`:
```js
// api/_email.js — minimal Resend transactional email wrapper.
// fetchImpl is injectable for tests; defaults to global fetch.
export function makeMailer(fetchImpl = fetch) {
  return {
    async sendAlert(subject, text) {
      const key = process.env.RESEND_API_KEY;
      if (!key) { console.error('[email] RESEND_API_KEY not set — skipping alert'); return; }
      try {
        const res = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.ALERT_EMAIL_FROM,
            to:   process.env.ALERT_EMAIL_TO,
            subject,
            text,
          }),
        });
        if (!res.ok) console.error('[email] send failed', res.status, await res.text().catch(() => ''));
      } catch (e) {
        console.error('[email] error', e.message);
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_email.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_email.js api/_email.test.js
git commit -m "feat: Resend email wrapper for health-check alerts"
```

---

### Task 3: Supabase-backed store (`_store.js`)

**Files:**
- Create: `api/_store.js`

This is a thin Postgres adapter (I/O only); it is exercised by the live integration test in Task 12, not unit-tested in isolation (mocking the Supabase query builder adds no real coverage). The in-memory fake used by the logic tests lives in Task 4's test file.

- [ ] **Step 1: Write the implementation**

Create `api/_store.js`:
```js
// api/_store.js — persistence adapter over the spa_timer state row + pool_health_log.
const ROW_ID = 1;

export function makePoolStore(sb) {
  return {
    async getState() {
      const { data } = await sb.from('spa_timer').select('*').eq('id', ROW_ID).maybeSingle();
      if (data) return data;
      const def = {
        id: ROW_ID, end_time: 0, started_at: 0, source: 'init',
        state: 'idle', shutoff_attempts: 0, spa_mode_since: 0, alerted: false,
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
```

- [ ] **Step 2: Sanity-check it imports**

Run: `node -e "import('./api/_store.js').then(m => console.log(typeof m.makePoolStore))"`
Expected: prints `function`.

- [ ] **Step 3: Commit**

```bash
git add api/_store.js
git commit -m "feat: Supabase store adapter for pool state + health log"
```

---

### Task 4: `_pool.js` scaffold + `fullShutdown` + `reconcile` active branches

**Files:**
- Create: `api/_pool.js`
- Test: `api/_pool.test.js`

- [ ] **Step 1: Write the failing tests (active branches + fullShutdown)**

Create `api/_pool.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, fullShutdown, AUTO_TIMER_HRS } from './_pool.js';

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
  assert.equal(store._logs()[0].found.heater, 'on'); // snapshot taken before shutdown
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_pool.test.js`
Expected: FAIL — cannot find module `./_pool.js`.

- [ ] **Step 3: Write the scaffold + fullShutdown + active handler**

Create `api/_pool.js`:
```js
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

// Replaced with real bodies in Tasks 5 and 6.
async function handleShuttingOff(ctx) { return ok(ctx.status); }
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test api/_pool.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: reconcile state machine — fullShutdown + active branches"
```

---

### Task 5: `reconcile` shutting_off branches

**Files:**
- Modify: `api/_pool.js` (replace the `handleShuttingOff` stub)
- Test: `api/_pool.test.js` (append tests)

- [ ] **Step 1: Append failing tests**

Add to `api/_pool.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test api/_pool.test.js`
Expected: the three new tests FAIL (stub returns `none`); earlier tests still PASS.

- [ ] **Step 3: Replace the `handleShuttingOff` stub**

In `api/_pool.js`, replace `async function handleShuttingOff(ctx) { return ok(ctx.status); }` with:
```js
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
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test api/_pool.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: reconcile shutting_off branches with retry + anomaly threshold"
```

---

### Task 6: `reconcile` idle branches (auto-timer, stuck-spa grace/revert) + command-error path

**Files:**
- Modify: `api/_pool.js` (replace the `handleIdle` stub)
- Test: `api/_pool.test.js` (append tests)

- [ ] **Step 1: Append failing tests**

Add to `api/_pool.test.js`:
```js
test('idle + heater on (external Jandy turn-on) → create 3hr timer + ensure spa mode', async () => {
  const now = 5_000_000;
  const store = makeFakeStore({ id: 1, state: 'idle', end_time: 0, shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const r = await reconcile({ status: baseStatus({ spa_heater: 'on', spa_pump: 'off' }), now, store, iaqua });
  assert.equal(r.action, 'created_auto_timer');
  assert.equal(store._state().state, 'active');
  assert.equal(store._state().end_time, now + AUTO_TIMER_HRS * 3600 * 1000);
  assert.deepEqual(iaqua._calls().map(c => c.cmd), ['set_spa_pump']); // route water to spa
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
```

Add this import line at the top of `api/_pool.test.js` (alongside the existing import) so the grace test can reference the constant:
```js
import { GRACE_MS as GRACE_MS_TEST } from './_pool.js';
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test api/_pool.test.js`
Expected: new idle tests FAIL (stub returns `none` and never sets `spa_mode_since`/commands); earlier tests PASS.

- [ ] **Step 3: Replace the `handleIdle` stub**

In `api/_pool.js`, replace `async function handleIdle(ctx) { return ok(ctx.status); }` with:
```js
async function handleIdle(ctx) {
  const { status, now, store, iaqua, source } = ctx;
  const found = snapshot(ctx);
  const heaterOn = status.spa_heater === 'on';
  const spaPumpOn = status.spa_pump === 'on';

  if (heaterOn) {
    // turned on via the Jandy app with no timer — adopt it as a 3hr session
    const end_time = now + AUTO_TIMER_HRS * 3600 * 1000;
    if (!spaPumpOn) await iaqua.command('set_spa_pump');
    await store.saveState({ state: 'active', end_time, started_at: now, source: 'iaqualink', shutoff_attempts: 0, spa_mode_since: 0, alerted: false });
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
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test api/_pool.test.js`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: reconcile idle branches — auto-timer, stuck-spa grace/revert, error path"
```

---

### Task 7: `fetchStatus` + parse helpers (move from pool-status, add spa_pump)

**Files:**
- Modify: `api/_pool.js` (add `parseHomeScreen`, `parseDevicesScreen`, `fetchStatus`)
- Test: `api/_pool.test.js` (append tests)

> **VERIFY FIRST (Open Question #1):** Before trusting `spa_pump`, confirm iAquaLink's `get_home` actually reports it for this RS-4 Combo. Hit the live `https://nsbretreat.com/api/pool-status`, read `_raw`, toggle the spa in the Jandy app, and confirm which key flips between `"0"`/`"1"`. The fixture key below (`spa_pump`) matches the existing `FIELD_MAP`; adjust the parse + fixture if the live key differs. If `get_home` does not expose spa-mode at all, source it from `get_devices` instead (same pattern as jets/light) before relying on it.

- [ ] **Step 1: Append failing tests**

Add to `api/_pool.test.js`:
```js
import { parseHomeScreen, parseDevicesScreen } from './_pool.js';

test('parseHomeScreen normalizes heater, spa_pump, and temps', () => {
  const home = [{ spa_heater: '1' }, { spa_pump: '1' }, { pool_temp: '80' }, { spa_temp: '102' }, { spa_set_point: '102' }];
  const s = parseHomeScreen(home);
  assert.equal(s.spa_heater, 'on');
  assert.equal(s.spa_pump, 'on');   // <-- the field the health check depends on
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_pool.test.js`
Expected: new tests FAIL — `parseHomeScreen`/`fetchStatus` not exported.

- [ ] **Step 3: Add parse + fetch to `api/_pool.js`**

Append to `api/_pool.js` (these move the logic out of `pool-status.js`, adding `spa_pump` to the result init):
```js
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
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test api/_pool.test.js`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: fetchStatus + parse helpers in _pool.js (adds spa_pump)"
```

---

### Task 8: `runHealthCheck` orchestrator + email gating

**Files:**
- Modify: `api/_pool.js` (add `runHealthCheck`)
- Test: `api/_pool.test.js` (append tests)

- [ ] **Step 1: Append failing tests**

Add to `api/_pool.test.js`:
```js
test('runHealthCheck emails once on a new anomaly and sets alerted', async () => {
  const now = 100000;
  const store = makeFakeStore({ id: 1, state: 'shutting_off', end_time: 0, shutoff_attempts: 1, spa_mode_since: 0, alerted: false });
  const iaqua = makeFakeIaqua();
  const sent = [];
  const { runHealthCheck } = await import('./_pool.js');
  const out = await runHealthCheck({
    store, iaqua, now,
    sendAlert: async (s, t) => sent.push({ s, t }),
    fetchStatusFn: async () => ({ spa_heater: 'on', spa_pump: 'off', spa_jets: 'off' }), // still on → 2nd attempt → anomaly
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_pool.test.js`
Expected: new tests FAIL — `runHealthCheck` not exported.

- [ ] **Step 3: Add `runHealthCheck` to `api/_pool.js`**

Append to `api/_pool.js`:
```js
// Orchestrates one health check: read prior state, fetch live status, reconcile, alert once per episode.
// fetchStatusFn is injectable for tests; defaults to the real fetchStatus.
export async function runHealthCheck({ store, iaqua, now, sendAlert, source = 'cron', fetchStatusFn = fetchStatus }) {
  const prior = await store.getState();
  const status = await fetchStatusFn(iaqua);
  const result = await reconcile({ status, now, store, iaqua, source, row: prior });

  if (result.anomaly && !prior.alerted) {
    await sendAlert(
      'NSB Retreat — pool health check needs attention',
      `Action: ${result.action}\n${result.detail}\n` +
      `heater=${status.spa_heater} spa_pump=${status.spa_pump} jets=${status.spa_jets}\n` +
      `See pool_health_log in Supabase for details.`,
    );
    await store.saveState({ alerted: true });
  }
  return { action: result.action, anomaly: result.anomaly };
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test api/_pool.test.js`
Expected: PASS (20 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_pool.js api/_pool.test.js
git commit -m "feat: runHealthCheck orchestrator with once-per-episode email gating"
```

---

### Task 9: Refactor `pool-status.js` onto the shared module

**Files:**
- Modify: `api/pool-status.js` (full rewrite — slim handler)

- [ ] **Step 1: Rewrite `api/pool-status.js`**

Replace the entire file with:
```js
// api/pool-status.js
// GET /api/pool-status — live pool/spa state + durable spa timer (reconciled on every poll).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { fetchStatus, reconcile } from './_pool.js';

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
      const store = makePoolStore(getSupabase());
      await reconcile({ status, now: Date.now(), store, iaqua, source: 'poll' });
    } catch (sbErr) {
      console.error('[pool-status] reconcile error:', sbErr.message);
      status.spa_end_time = status.spa_end_time ?? null;
      status.spa_seconds_remaining = status.spa_seconds_remaining ?? 0;
    }

    return res.status(200).json(status);
  } catch (err) {
    const cause = err.cause?.message || err.cause?.toString() || '';
    console.error('[pool-status]', err.message, cause);
    return res.status(200).json({ online: false, error: err.message, cause });
  }
}
```

- [ ] **Step 2: Verify the whole suite still passes (no regressions in shared module)**

Run: `npm test`
Expected: PASS (22 tests — 20 in `_pool.test.js`, 2 in `_email.test.js`).

- [ ] **Step 3: Verify the iPad response contract is intact (manual, against deployed preview or prod)**

After deploy, run:
```bash
curl -s https://nsbretreat.com/api/pool-status | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('has spa_end_time:', 'spa_end_time' in j, '| spa_seconds_remaining:', 'spa_seconds_remaining' in j, '| spa_pump:', j.spa_pump);})"
```
Expected: `has spa_end_time: true | spa_seconds_remaining: <num> | spa_pump: on|off`. The iPad (`pad/js/pad.js`) reads `spa_end_time`; this confirms the contract is unchanged.

- [ ] **Step 4: Commit**

```bash
git add api/pool-status.js
git commit -m "refactor: pool-status uses shared _pool.js (one reconcile source of truth)"
```

---

### Task 10: Update `spa-timer.js` to set explicit state

**Files:**
- Modify: `api/spa-timer.js`

- [ ] **Step 1: Update the POST and DELETE handlers**

In `api/spa-timer.js`, change the DELETE upsert to set `state: 'shutting_off'`:
```js
  if (req.method === 'DELETE') {
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time: 0, started_at: 0, source: 'stop', state: 'shutting_off' },
      { onConflict: 'id' }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
```

And change the POST upsert to set `state: 'active'` and reset episode flags:
```js
    const { error } = await sb.from('spa_timer').upsert(
      { id: ROW_ID, end_time, started_at: now, source, state: 'active', shutoff_attempts: 0, spa_mode_since: 0, alerted: false },
      { onConflict: 'id' }
    );
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `node -e "import('./api/spa-timer.js').then(()=>console.log('ok'))"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add api/spa-timer.js
git commit -m "feat: spa-timer endpoints set explicit state (active / shutting_off)"
```

---

### Task 11: Create the `/api/pool-health` endpoint

**Files:**
- Create: `api/pool-health.js`
- Test: `api/pool-health.test.js`

- [ ] **Step 1: Write the failing test (secret gate)**

Create `api/pool-health.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/pool-health.test.js`
Expected: FAIL — cannot find module `./pool-health.js`.

- [ ] **Step 3: Write the endpoint**

Create `api/pool-health.js`:
```js
// api/pool-health.js
// POST /api/pool-health — cron-triggered reconciliation heartbeat (secret-gated).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore } from './_store.js';
import { runHealthCheck } from './_pool.js';
import { makeMailer } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if ((req.headers['x-cron-secret'] || '') !== process.env.POOL_HEALTH_SECRET) {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/pool-health.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (24 tests total — 20 in `_pool.test.js`, 2 in `_email.test.js`, 2 in `pool-health.test.js`).

- [ ] **Step 6: Commit**

```bash
git add api/pool-health.js api/pool-health.test.js
git commit -m "feat: /api/pool-health cron endpoint (secret-gated reconciliation)"
```

---

### Task 12: Infrastructure — env vars, Vault secret, pg_cron schedule

**Files:** none (configuration only)

- [ ] **Step 1: Generate a strong shared secret**

Run: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
Record the value as `<SECRET>` for the next steps.

- [ ] **Step 2: Add the four environment variables to the NSBretreat Vercel project**

In the Vercel dashboard → the `nsbretreat` project → Settings → Environment Variables (Production), add:
- `POOL_HEALTH_SECRET` = `<SECRET>`
- `RESEND_API_KEY` = (from resend.com → API Keys)
- `ALERT_EMAIL_TO` = `antoniofconcha@gmail.com`
- `ALERT_EMAIL_FROM` = `onboarding@resend.dev` (test sender; switch to `alerts@nsbretreat.com` after verifying the domain in Resend)

Then redeploy (push any commit, or use the dashboard "Redeploy") so the new vars load.

- [ ] **Step 3: Enable extensions + store the secret in Supabase Vault**

In the Supabase SQL editor (project `xittuxwilxmzzawjdivd`):
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret('<SECRET>', 'pool_health_secret', 'x-cron-secret for /api/pool-health');
```

- [ ] **Step 4: Schedule the 5-minute heartbeat**

```sql
select cron.schedule(
  'pool-health-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://nsbretreat.com/api/pool-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pool_health_secret')
    )
  );
  $$
);
```

- [ ] **Step 5: Verify the job is registered**

```sql
select jobname, schedule, active from cron.job where jobname = 'pool-health-5min';
```
Expected: one row, `active = true`, schedule `*/5 * * * *`.

---

### Task 13: Live integration verification (acceptance)

**Files:** none (manual verification against production)

- [ ] **Step 1: Endpoint rejects without the secret**

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://nsbretreat.com/api/pool-health`
Expected: `401`.

- [ ] **Step 2: Endpoint runs with the secret**

Run: `curl -s -X POST -H "x-cron-secret: <SECRET>" https://nsbretreat.com/api/pool-health`
Expected: `{"ok":true,"action":"...","anomaly":false}`.

- [ ] **Step 3: Confirm spa-pump detection (Open Question #1)**

Toggle the spa on/off in the Jandy app; after each, run:
```bash
curl -s https://nsbretreat.com/api/pool-status | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('spa_pump:',JSON.parse(d).spa_pump))"
```
Expected: `spa_pump` flips `on`/`off` accordingly. If it does not, revisit Task 7's parse source before trusting the revert rule.

- [ ] **Step 4: Simulate an expired timer (the yesterday bug)**

With the spa heater physically ON, set the timer into the past:
```sql
update public.spa_timer set state = 'active', end_time = (extract(epoch from now())*1000)::bigint - 1000 where id = 1;
```
Trigger: `curl -s -X POST -H "x-cron-secret: <SECRET>" https://nsbretreat.com/api/pool-health`
Expected: heater **and** spa mode go off (verify in the Jandy app — system is in **pool** mode, not stuck in spa); `select action, success from pool_health_log order by created_at desc limit 1;` shows `expired_shutoff, true`.

- [ ] **Step 5: Simulate stuck spa mode past grace**

Put the system in spa mode with the heater OFF (Jandy app), then backdate the grace marker:
```sql
update public.spa_timer set state='idle', end_time=0, spa_mode_since = (extract(epoch from now())*1000)::bigint - (31*60*1000) where id = 1;
```
Trigger the endpoint. Expected: reverts to pool mode; log shows `reverted_spa_mode, true`.

- [ ] **Step 6: Simulate a failure → one email**

Temporarily set a bad iAquaLink password env var in Vercel (or point `IAQUALINK_EMAIL` at a wrong value), redeploy, trigger the endpoint twice.
Expected: a failure email arrives at `antoniofconcha@gmail.com` and does **not** repeat on the second trigger (gated by `alerted`). Restore the correct credentials and redeploy afterward.

- [ ] **Step 7: Confirm the cron is firing on its own**

Wait ~10 minutes, then:
```sql
select status, return_message, start_time from cron.job_run_details
  where jobid = (select jobid from cron.job where jobname='pool-health-5min')
  order by start_time desc limit 3;
```
Expected: recent rows with `status = 'succeeded'`.

- [ ] **Step 8: Reset state to clean idle**

```sql
update public.spa_timer set state='idle', end_time=0, started_at=0, shutoff_attempts=0, spa_mode_since=0, alerted=false where id = 1;
```

- [ ] **Step 9: Final commit (any doc/notes updates)**

```bash
git add -A
git commit -m "chore: pool health check verified live"
```

---

## Notes for the implementer

- **Tests never hit the network or hardware.** Everything in `_pool.js` is driven through the injected `store`/`iaqua`/`fetchStatusFn`. Keep it that way — if a new rule needs a new dependency, inject it.
- **Toggles are stateful.** `set_spa_heater`/`set_spa_pump`/`set_aux_1` flip current state. Always guard a toggle behind a current-state read (as `fullShutdown` does) so a "shut off" never accidentally turns something on.
- **`now` is always injected** into `reconcile`/`runHealthCheck` (`Date.now()` in the handlers) so time-based branches are deterministic in tests.
- **Sparse logging:** only branches that take an action (or fail) write to `pool_health_log`; the healthy/no-op path stays silent so the table stays readable.
```
