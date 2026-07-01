# Pool & Spa Heater Usage Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically log every pool-heating and spa-heating episode (no matter where it was started) from the existing one-minute cron, and surface historical usage plus rough gas-cost metrics in the admin panel.

**Architecture:** Observation-only. A new pure module `api/_heater_log.js` turns each minute's live heater state into open/touch/close operations on a `heater_sessions` table (via an injected store). It runs inside the existing `pool-health` cron, reusing the status that `runHealthCheck` already fetched — zero extra iAqualink calls — and wrapped in its own try/catch so it can never disturb spa control. The admin panel reads sessions + monthly gas bills and computes therms/hr and $/hr at read-time.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict`, Supabase REST (`@supabase/supabase-js`), Vercel serverless + crons, vanilla-JS admin page.

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/005_heater_usage.sql` | Create — `heater_sessions` + `heating_bills` tables, indexes, RLS |
| `api/_heater_log.js` | Create — `recordHeaterSample` sessionizer (pure logic) |
| `api/_heater_log.test.js` | Create — unit tests for the sessionizer |
| `api/_store.js` | Modify — add `makeHeaterStore(sb)` adapter |
| `api/_pool.js` | Modify — `runHealthCheck` returns the fetched `status` + `prior` row |
| `api/_pool.test.js` | Modify — assert `runHealthCheck` returns `status` |
| `api/pool-health.js` | Modify — call `recordHeaterSample` with the returned status, in its own try/catch |
| `admin.html` | Modify — add "Pool & Spa Heating" section (cards, monthly table + bill entry, sessions log) |

---

### Task 1: SQL migration — `heater_sessions` + `heating_bills`

**Files:**
- Create: `supabase/migrations/005_heater_usage.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/005_heater_usage.sql` with exactly:

```sql
-- 005_heater_usage.sql — pool/spa heater usage logging (observation-only)

-- One row per heating episode. Timestamps are Unix ms (bigint), matching spa_timer.
create table if not exists public.heater_sessions (
  id               bigint generated always as identity primary key,
  heater_type      text    not null,           -- 'pool' | 'spa'
  started_at       bigint  not null,           -- Unix ms, first observed on
  last_seen_at     bigint  not null,           -- Unix ms, most recent confirmed on
  ended_at         bigint,                      -- Unix ms, set on close = last_seen_at
  duration_seconds integer,                     -- filled on close
  source           text    default 'external', -- 'pad' | 'external' (best-effort)
  is_active        boolean default true,
  created_at       timestamptz default now()
);

create index if not exists heater_sessions_active_idx  on public.heater_sessions (is_active) where is_active;
create index if not exists heater_sessions_started_idx on public.heater_sessions (started_at);

alter table public.heater_sessions enable row level security;
drop policy if exists "admin read heater sessions" on public.heater_sessions;
create policy "admin read heater sessions" on public.heater_sessions
  for select to authenticated using (true);

-- One row per month, entered from the admin panel.
create table if not exists public.heating_bills (
  id              bigint generated always as identity primary key,
  period_month    text unique not null,        -- 'YYYY-MM'
  therms          numeric default 0,
  cost_usd        numeric default 0,
  baseline_therms numeric default 0,           -- non-heater therms to subtract
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.heating_bills enable row level security;
drop policy if exists "admin all heating bills" on public.heating_bills;
create policy "admin all heating bills" on public.heating_bills
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply in Supabase dashboard**

Go to Supabase → SQL Editor (project `xittuxwilxmzzawjdivd`) → paste and run the migration. Confirm no error and both tables appear under Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_heater_usage.sql
git commit -m "feat: add heater_sessions and heating_bills tables"
```

---

### Task 2: `_heater_log.js` — the sessionizer (TDD)

**Files:**
- Create: `api/_heater_log.js`
- Create: `api/_heater_log.test.js`

**Context:** `recordHeaterSample` observes one minute's heater state and updates the single open session. The heater is one burner redirecting water, so spa and pool heating are never both on; if both ever read on, `spa` wins. Close always uses the session's `last_seen_at` (never `now`) so a skipped cron run never over-counts. Timestamps are Unix ms integers throughout, so the logic and tests are plain integer math.

- [ ] **Step 1: Write the failing tests**

Create `api/_heater_log.test.js` with exactly:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_heater_log.test.js`
Expected: FAIL — `Cannot find module './_heater_log.js'` (module not created yet).

- [ ] **Step 3: Write the implementation**

Create `api/_heater_log.js` with exactly:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test api/_heater_log.test.js`
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/_heater_log.js api/_heater_log.test.js
git commit -m "feat: heater usage sessionizer (recordHeaterSample)"
```

---

### Task 3: `_store.js` — add `makeHeaterStore(sb)`

**Files:**
- Modify: `api/_store.js`

**Context:** The real persistence adapter for `heater_sessions`. It mirrors the existing `makePoolStore` style in the same file. `getOpenSession` returns the single active row (bigint columns come back as JS numbers — ms values are well within `Number.MAX_SAFE_INTEGER`). `closeSession` computes `duration_seconds` from the session's `started_at`.

- [ ] **Step 1: Read the current file**

The file currently ends with the `makePoolStore` export (a `getState`/`saveState`/`log` adapter). You will append a second export below it. Do not modify `makePoolStore`.

- [ ] **Step 2: Append `makeHeaterStore`**

Add this export to the end of `api/_store.js` (after the closing `}` of `makePoolStore`):

```js
export function makeHeaterStore(sb) {
  return {
    // The single open heating episode, or null.
    async getOpenSession() {
      const { data } = await sb
        .from('heater_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
    async openSession({ heater_type, at, source }) {
      const { error } = await sb.from('heater_sessions').insert({
        heater_type, started_at: at, last_seen_at: at, source, is_active: true,
      });
      if (error) console.error('[store] openSession failed:', error.message);
    },
    async touchSession(id, at) {
      const { error } = await sb.from('heater_sessions').update({ last_seen_at: at }).eq('id', id);
      if (error) console.error('[store] touchSession failed:', error.message);
    },
    async closeSession(session, endedAt) {
      const duration = Math.max(0, Math.round((endedAt - session.started_at) / 1000));
      const { error } = await sb.from('heater_sessions')
        .update({ ended_at: endedAt, duration_seconds: duration, is_active: false })
        .eq('id', session.id);
      if (error) console.error('[store] closeSession failed:', error.message);
    },
  };
}
```

- [ ] **Step 3: Run tests to confirm nothing broke**

Run: `node --test api/_pool.test.js api/_heater_log.test.js`
Expected: PASS — all existing tests still pass (this file has no unit tests of its own; `makePoolStore` is unchanged).

- [ ] **Step 4: Commit**

```bash
git add api/_store.js
git commit -m "feat: makeHeaterStore adapter for heater_sessions"
```

---

### Task 4: Wire logging into the cron

**Files:**
- Modify: `api/_pool.js`
- Modify: `api/_pool.test.js`
- Modify: `api/pool-health.js`

**Context:** `runHealthCheck` already fetches the live `status` and reads the prior `spa_timer` row. Return both so `pool-health.js` can log heater usage from the same fetch (no extra iAqualink call). The `spa_timer` row's `state`/`source` feed spa-session source attribution. Heater logging is wrapped in its own try/catch and skipped when the system is offline, so it can never disturb spa control.

- [ ] **Step 1: Add a failing test for the new return shape**

In `api/_pool.test.js`, append this test at the end of the file:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test api/_pool.test.js`
Expected: FAIL — `out.status` is undefined (runHealthCheck currently returns only `{ action, anomaly }`).

- [ ] **Step 3: Update `runHealthCheck` return value**

In `api/_pool.js`, find the end of `runHealthCheck`:

```js
  return { action: result.action, anomaly: result.anomaly };
}
```

Replace with:

```js
  return { action: result.action, anomaly: result.anomaly, status, prior };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test api/_pool.test.js`
Expected: PASS — all tests pass including the new one.

- [ ] **Step 5: Update `pool-health.js` to log heater usage**

Replace the entire contents of `api/pool-health.js` with:

```js
// api/pool-health.js
// POST /api/pool-health — cron-triggered reconciliation heartbeat (Vercel CRON_SECRET-gated).
// Also records pool/spa heater usage from the same status read (observation-only).

import { authenticate, deviceRequest } from './_iaqualink.js';
import { getSupabase } from './_supabase.js';
import { makePoolStore, makeHeaterStore } from './_store.js';
import { runHealthCheck } from './_pool.js';
import { recordHeaterSample } from './_heater_log.js';
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
    const sb = getSupabase();
    const store = makePoolStore(sb);
    const mailer = makeMailer();
    const now = Date.now();
    const out = await runHealthCheck({ store, iaqua, now, sendAlert: mailer.sendAlert, source: 'cron' });

    // Log heater usage from the status runHealthCheck already fetched.
    // Observation-only and fully isolated: a failure here must never affect pool control.
    if (out.status && out.status.online !== false) {
      try {
        const heaterStore = makeHeaterStore(sb);
        const prior = out.prior || {};
        const spaSource = (prior.state === 'active' && prior.source === 'pad') ? 'pad' : 'external';
        await recordHeaterSample({ status: out.status, now, heaterStore, spaSource });
      } catch (logErr) {
        console.error('[pool-health] heater log error:', logErr.message);
      }
    }

    return res.status(200).json({ ok: true, action: out.action, anomaly: out.anomaly });
  } catch (err) {
    console.error('[pool-health]', err.message);
    try { await makeMailer().sendAlert('NSB Retreat — pool health check error', err.message); } catch {}
    return res.status(500).json({ ok: false, error: err.message });
  }
}
```

- [ ] **Step 6: Run the full test suite**

Run: `node --test api/_pool.test.js api/_heater_log.test.js`
Expected: PASS — all tests pass.

- [ ] **Step 7: Commit**

```bash
git add api/_pool.js api/_pool.test.js api/pool-health.js
git commit -m "feat: record heater usage from pool-health cron"
```

---

### Task 5: Admin panel — "Pool & Spa Heating" section

**Files:**
- Modify: `admin.html`

**Context:** Add a new dashboard section that reads `heater_sessions` + `heating_bills` and renders (1) current-month summary cards, (2) a monthly usage + cost table with inline bill entry, (3) a recent-sessions log. All grouping and cost math happens in JS at read-time. It uses the authenticated Supabase client (`sb`) already defined in the file and follows the existing `dash-section` / card / table patterns. A 60-second interval refreshes it so an in-progress session's duration stays current.

- [ ] **Step 1: Add CSS for the heating section**

In `admin.html`, inside the `<style>` block, immediately before the closing `</style>` tag, add:

```css
    /* ── Pool & Spa Heating ── */
    .heat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.875rem; margin-top: 0.875rem; }
    .heat-card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1.1rem 1.25rem; }
    .heat-card-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--charcoal-light); }
    .heat-card-value { font-family: var(--font-serif); font-size: 1.7rem; margin-top: 0.25rem; }
    .heat-card-sub { font-size: 0.72rem; color: var(--charcoal-light); margin-top: 0.15rem; }
    .heat-subtitle { font-family: var(--font-serif); font-size: 1.05rem; margin: 1.75rem 0 0.6rem; }
    .heat-table { width: 100%; border-collapse: collapse; background: var(--white); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); font-size: 0.82rem; }
    .heat-table th, .heat-table td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--sand); white-space: nowrap; }
    .heat-table th { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--charcoal-light); background: var(--blush); }
    .heat-table tr:last-child td { border-bottom: none; }
    .heat-badge { display: inline-block; padding: 0.12rem 0.5rem; border-radius: 999px; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .heat-badge.spa { background: #e7d3c8; color: #7a4a2c; }
    .heat-badge.pool { background: #cfe0e8; color: #2c5a72; }
    .heat-bill-input { width: 5.5rem; border: 1.5px solid var(--tan); border-radius: var(--radius-sm); padding: 0.3rem 0.45rem; font-family: var(--font-sans); font-size: 0.8rem; color: var(--charcoal); background: var(--white); }
    .heat-bill-input:focus { outline: none; border-color: var(--accent); }
    .heat-live { color: var(--accent); font-weight: 600; }
    .heat-scroll { overflow-x: auto; }
```

- [ ] **Step 2: Add the section markup**

In `admin.html`, find the Photo Booth section opener:

```html
    <!-- Photo Booth -->
    <div class="dash-section">
      <h2 class="dash-section-title">Photo Booth</h2>
    </div>
```

Insert this block immediately **before** it:

```html
    <!-- Pool & Spa Heating -->
    <div class="dash-section">
      <h2 class="dash-section-title">Pool &amp; Spa Heating</h2>
    </div>
    <div class="heat-cards" id="heat-cards"><div class="dash-loading">Loading&hellip;</div></div>
    <h3 class="heat-subtitle">Monthly Usage &amp; Cost</h3>
    <div class="heat-scroll"><div id="heat-monthly"><div class="dash-loading">Loading&hellip;</div></div></div>
    <h3 class="heat-subtitle">Recent Sessions</h3>
    <div class="heat-scroll"><div id="heat-sessions"><div class="dash-loading">Loading&hellip;</div></div></div>
```

- [ ] **Step 3: Register the loader on dashboard show**

In `admin.html`, find `showDashboard`:

```js
    function showDashboard() {
      document.getElementById('login-wrap').style.display = 'none';
      document.getElementById('dashboard').classList.add('visible');
      document.getElementById('btn-logout').style.display = 'block';
      loadFeedback();
      loadGuestbook();
      loadTokens();
      loadPhotobooth();
    }
```

Replace with:

```js
    var heatTimer = null;
    function showDashboard() {
      document.getElementById('login-wrap').style.display = 'none';
      document.getElementById('dashboard').classList.add('visible');
      document.getElementById('btn-logout').style.display = 'block';
      loadFeedback();
      loadGuestbook();
      loadTokens();
      loadPhotobooth();
      loadHeating();
      if (heatTimer) clearInterval(heatTimer);
      heatTimer = setInterval(loadHeating, 60000);
    }
```

- [ ] **Step 4: Add the heating logic**

In `admin.html`, find the Supabase client definition:

```js
    var sb = supabase.createClient(
      'https://xittuxwilxmzzawjdivd.supabase.co',
      'sb_publishable_AxzdizEiC3FOPYdzS3lPWA_H1aH9hSV'
    );
```

Immediately **after** that statement, insert:

```js
    // ── Pool & Spa Heating ──────────────────────────────────────────────
    function heatMonthKey(ms) {
      var d = new Date(ms);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    function heatFmtDuration(sec) {
      sec = Math.max(0, Math.round(sec));
      var h = Math.floor(sec / 3600);
      var m = Math.floor((sec % 3600) / 60);
      if (h > 0) return h + 'h ' + m + 'm';
      if (m > 0) return m + 'm';
      return sec + 's';
    }
    function heatFmtHrs(sec) { return (sec / 3600).toFixed(1); }
    function heatFmtTime(ms) {
      return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    function heatSessionSeconds(s) {
      if (s.duration_seconds != null) return s.duration_seconds;
      return Math.max(0, Math.round((Date.now() - s.started_at) / 1000)); // in-progress
    }

    async function loadHeating() {
      var sess = await sb.from('heater_sessions').select('*').order('started_at', { ascending: false });
      var bills = await sb.from('heating_bills').select('*');
      if (sess.error) { document.getElementById('heat-cards').innerHTML = '<p style="color:#b91c1c;font-size:0.85rem">Failed to load heating data.</p>'; return; }
      var sessions = sess.data || [];
      var billMap = {};
      (bills.data || []).forEach(function (b) { billMap[b.period_month] = b; });
      renderHeatCards(sessions, billMap);
      renderHeatMonthly(sessions, billMap);
      renderHeatSessions(sessions);
    }

    // Aggregate one month's sessions + optional bill into usage & cost numbers.
    function heatComputeMonth(sessions, bill) {
      var poolSec = 0, spaSec = 0;
      sessions.forEach(function (s) {
        var d = heatSessionSeconds(s);
        if (s.heater_type === 'pool') poolSec += d; else if (s.heater_type === 'spa') spaSec += d;
      });
      var totalSec = poolSec + spaSec;
      var totalHrs = totalSec / 3600;
      var out = { poolSec: poolSec, spaSec: spaSec, totalSec: totalSec, totalHrs: totalHrs,
                  thermsPerHr: null, costPerHr: null, estCost: null, poolCost: null, spaCost: null };
      if (bill && bill.therms > 0 && totalHrs > 0) {
        var net = Math.max(0, bill.therms - (bill.baseline_therms || 0));
        var costPerTherm = bill.cost_usd / bill.therms;
        out.thermsPerHr = net / totalHrs;
        out.costPerHr = out.thermsPerHr * costPerTherm;
        out.estCost = totalHrs * out.costPerHr;
        out.poolCost = totalSec > 0 ? (poolSec / totalSec) * out.estCost : 0;
        out.spaCost = totalSec > 0 ? (spaSec / totalSec) * out.estCost : 0;
      }
      return out;
    }

    function renderHeatCards(sessions, billMap) {
      var key = heatMonthKey(Date.now());
      var thisMonth = sessions.filter(function (s) { return heatMonthKey(s.started_at) === key; });
      var m = heatComputeMonth(thisMonth, billMap[key]);
      var active = sessions.find(function (s) { return s.is_active; });
      var cost = m.estCost != null ? '$' + m.estCost.toFixed(2) : '—';
      var costSub = m.estCost != null ? 'from this month’s bill' : 'add a bill below';
      var activeHtml = active
        ? '<span class="heat-live">' + (active.heater_type === 'spa' ? 'Spa' : 'Pool') + ' heating now</span>'
        : 'Idle';
      document.getElementById('heat-cards').innerHTML =
        heatCard('Pool heat (this month)', heatFmtHrs(m.poolSec) + ' h', '') +
        heatCard('Spa heat (this month)', heatFmtHrs(m.spaSec) + ' h', '') +
        heatCard('Total heat (this month)', heatFmtHrs(m.totalSec) + ' h', activeHtml) +
        heatCard('Est. cost (this month)', cost, costSub);
    }
    function heatCard(label, value, sub) {
      return '<div class="heat-card"><div class="heat-card-label">' + label + '</div>' +
             '<div class="heat-card-value">' + value + '</div>' +
             (sub ? '<div class="heat-card-sub">' + sub + '</div>' : '') + '</div>';
    }

    function renderHeatMonthly(sessions, billMap) {
      // Union of months that have sessions or a bill, newest first.
      var months = {};
      sessions.forEach(function (s) { months[heatMonthKey(s.started_at)] = true; });
      Object.keys(billMap).forEach(function (k) { months[k] = true; });
      var keys = Object.keys(months).sort().reverse();
      if (keys.length === 0) { document.getElementById('heat-monthly').innerHTML = '<p class="dash-count">No usage recorded yet.</p>'; return; }

      var rows = keys.map(function (key) {
        var monthSessions = sessions.filter(function (s) { return heatMonthKey(s.started_at) === key; });
        var bill = billMap[key] || { therms: '', cost_usd: '', baseline_therms: 0 };
        var m = heatComputeMonth(monthSessions, billMap[key]);
        var label = new Date(key + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return '<tr>' +
          '<td>' + label + '</td>' +
          '<td>' + heatFmtHrs(m.poolSec) + '</td>' +
          '<td>' + heatFmtHrs(m.spaSec) + '</td>' +
          '<td>' + heatFmtHrs(m.totalSec) + '</td>' +
          '<td><input class="heat-bill-input" id="bill-therms-' + key + '" type="number" step="0.1" placeholder="—" value="' + (bill.therms === '' ? '' : bill.therms) + '"></td>' +
          '<td><input class="heat-bill-input" id="bill-cost-' + key + '" type="number" step="0.01" placeholder="—" value="' + (bill.cost_usd === '' ? '' : bill.cost_usd) + '"></td>' +
          '<td><input class="heat-bill-input" id="bill-base-' + key + '" type="number" step="0.1" value="' + (bill.baseline_therms || 0) + '"></td>' +
          '<td>' + (m.thermsPerHr != null ? m.thermsPerHr.toFixed(2) : '—') + '</td>' +
          '<td>' + (m.costPerHr != null ? '$' + m.costPerHr.toFixed(2) : '—') + '</td>' +
          '<td><button class="btn-primary" style="margin:0;padding:0.35rem 0.7rem;font-size:0.72rem" onclick="saveHeatBill(\'' + key + '\')">Save</button></td>' +
          '</tr>';
      }).join('');

      document.getElementById('heat-monthly').innerHTML =
        '<table class="heat-table"><thead><tr>' +
        '<th>Month</th><th>Pool h</th><th>Spa h</th><th>Total h</th>' +
        '<th>Therms</th><th>Cost $</th><th>Base therms</th><th>Therms/h</th><th>$/h</th><th></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    async function saveHeatBill(month) {
      var therms = parseFloat(document.getElementById('bill-therms-' + month).value) || 0;
      var cost = parseFloat(document.getElementById('bill-cost-' + month).value) || 0;
      var baseline = parseFloat(document.getElementById('bill-base-' + month).value) || 0;
      var _a = await sb.from('heating_bills').upsert(
        { period_month: month, therms: therms, cost_usd: cost, baseline_therms: baseline, updated_at: new Date().toISOString() },
        { onConflict: 'period_month' }
      );
      if (_a.error) { alert('Failed to save bill: ' + _a.error.message); return; }
      loadHeating();
    }

    var heatShowAll = false;
    function toggleHeatSessions() { heatShowAll = !heatShowAll; loadHeating(); }
    function renderHeatSessions(sessions) {
      if (sessions.length === 0) { document.getElementById('heat-sessions').innerHTML = '<p class="dash-count">No sessions yet.</p>'; return; }
      var LIMIT = 50;
      var shown = heatShowAll ? sessions : sessions.slice(0, LIMIT);
      var rows = shown.map(function (s) {
        var badge = '<span class="heat-badge ' + s.heater_type + '">' + s.heater_type + '</span>';
        var end = s.is_active ? '<span class="heat-live">in progress</span>' : heatFmtTime(s.ended_at);
        var dur = s.is_active ? '<span class="heat-live">' + heatFmtDuration(heatSessionSeconds(s)) + '</span>' : heatFmtDuration(s.duration_seconds || 0);
        return '<tr>' +
          '<td>' + badge + '</td>' +
          '<td>' + heatFmtTime(s.started_at) + '</td>' +
          '<td>' + end + '</td>' +
          '<td>' + dur + '</td>' +
          '<td>' + (s.source || 'external') + '</td>' +
          '</tr>';
      }).join('');
      var more = '';
      if (sessions.length > LIMIT) {
        more = heatShowAll
          ? '<button class="btn-pb-refresh" style="margin-top:0.6rem" onclick="toggleHeatSessions()">Show latest 50</button>'
          : '<button class="btn-pb-refresh" style="margin-top:0.6rem" onclick="toggleHeatSessions()">Show all ' + sessions.length + ' sessions</button>';
      }
      document.getElementById('heat-sessions').innerHTML =
        '<table class="heat-table"><thead><tr><th>Type</th><th>Started</th><th>Ended</th><th>Duration</th><th>Source</th></tr></thead><tbody>' +
        rows + '</tbody></table>' + more;
    }
```

- [ ] **Step 5: Verify locally in the browser preview**

Start the site with the preview tool (or `vercel dev` if configured) and open `admin.html`. Because heating data needs authentication + live Supabase tables, the goal of this step is only to confirm **no JavaScript errors** and that the section renders its "No usage recorded yet." / "No sessions yet." empty states. Check the browser console for errors from `loadHeating`.

Expected: The "Pool & Spa Heating" heading, four summary cards, an empty monthly table area, and the empty sessions area all render with no console errors.

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat: admin Pool & Spa Heating section — usage log, monthly cost, bill entry"
```

---

### Task 6: Deploy and verify end-to-end

**Files:** none (deployment + verification)

**Context:** Push to `main` (Vercel auto-deploys). Then confirm the cron writes sessions and the admin panel shows them. Also confirm the `pool_heater` flag behaves as expected (the one design assumption to validate live).

- [ ] **Step 1: Push**

```bash
git push
```

- [ ] **Step 2: Confirm the cron is still green**

In the Vercel dashboard → project → Cron Jobs, confirm `/api/pool-health` continues to show successful (green) runs after the deploy. A failing run here would indicate the heater-logging change regressed the cron — investigate before proceeding.

- [ ] **Step 3: Generate a spa session and confirm it logs**

Turn the spa heater on (via the iPad pad page or the iAqualink app). Wait ~2 minutes (two cron runs), then open `admin.html` → Pool & Spa Heating. Expected: a session with type **spa** appears, showing "in progress" with a live duration; the "Spa heating now" indicator shows on the Total card. Turn the spa off, wait ~2 minutes, and confirm the session closes with an end time and a duration within ~1–2 minutes of the real usage.

- [ ] **Step 4: Confirm pool-heater detection (the design assumption)**

Turn on **pool** heat via the iAqualink app. Wait ~2 minutes, then check the admin panel for a session with type **pool**. Expected: it appears. If it does NOT appear while pool heat is genuinely running, capture the raw status from `https://www.nsbretreat.com/api/pool-status` (the `_raw` block) to see how the controller reports pool heating, and open a follow-up to adjust `currentType()` accordingly (fallback: infer pool heating from pool-mode + heater). This is the one live-verification checkpoint from the spec.

- [ ] **Step 5: Enter a bill and confirm metrics**

In the monthly table, enter a `Therms` and `Cost $` value for the current month and click Save. Expected: the row's Therms/h and $/h columns populate, and the "Est. cost (this month)" card updates on the next render.
