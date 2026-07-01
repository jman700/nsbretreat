# Pool & Spa Heater Usage Logging — Design Spec

## Goal

Automatically log every pool-heating and spa-heating episode at the property — regardless of where it was started (iPad pad page, the iAqualink app, or the physical panel) — and surface historical usage plus rough gas-cost metrics in the admin panel.

The system is **observation-only**: it watches hardware state reported by iAqualink and records usage. It issues no hardware commands and adds no new controls. Accuracy target is "within a few minutes," which the existing one-minute cron already satisfies.

## Why this is small

The data is already being fetched and discarded. The `pool-health` cron runs every minute and calls `fetchStatus()`, which already parses **both** `spa_heater` and `pool_heater` as separate flags (see `FIELD_MAP` in `api/_pool.js`). The RS-4 Combo reports them distinctly, so pool-heating and spa-heating are directly distinguishable — no inference needed for the type. We simply persist and sessionize what the cron already sees.

## Architecture

Observation-only logging bolted onto the existing every-minute cron.

- **`api/_heater_log.js`** (new) — pure logic. `recordHeaterSample({ status, now, heaterStore, spaSource })` decides, from the current heater state, whether to open / touch / close a heating session. No iAqualink calls, no hardware commands.
- **`api/_store.js`** (modify) — add `makeHeaterStore(sb)` next to the existing `makePoolStore`, exposing `getOpenSession()`, `openSession()`, `touchSession()`, `closeSession()`.
- **`api/pool-health.js`** (modify) — the cron. `runHealthCheck()` is changed to **return the live `status` it already fetched**; the cron then passes that same object into `recordHeaterSample()`, so usage logging costs **zero extra iAqualink calls**. The `recordHeaterSample()` call is wrapped in its own `try/catch` so a logging error can never disturb spa control or the health check.
- **`admin.html`** (modify) — add a "Pool & Spa Heating" section that reads sessions + bills and renders usage and cost metrics.

The spa control state machine (`reconcile` and friends) is untouched. Logging is a separate concern in a separate module.

### Single-fetch reuse

`runHealthCheck` currently returns `{ action, anomaly }`. It will be extended to also return the fetched `status` (and the prior `spa_timer` row it already read, whose `source`/`state` feed spa source inference). `pool-health.js` uses that returned `status` for `recordHeaterSample` — the iAqualink API is hit once per cron run, as today.

## Data Model

Migration: `supabase/migrations/005_heater_usage.sql`

### Table `heater_sessions` — one row per heating episode

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity primary key` | |
| `heater_type` | `text` | `'pool'` or `'spa'` |
| `started_at` | `timestamptz` | first cron run that observed it on |
| `last_seen_at` | `timestamptz` | most recent run confirming still on (heartbeat) |
| `ended_at` | `timestamptz` null | set on close = `last_seen_at` |
| `duration_seconds` | `integer` null | filled on close |
| `source` | `text` | best-effort: `'pad'` or `'external'` |
| `is_active` | `boolean default true` | true while open |
| `created_at` | `timestamptz default now()` | |

Index: `create index on public.heater_sessions (is_active) where is_active;` (fast lookup of the single open session) and `create index on public.heater_sessions (started_at);` (monthly rollups).

### Table `heating_bills` — one row per month, entered from the admin panel

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity primary key` | |
| `period_month` | `text` unique | `'YYYY-MM'`, e.g. `'2026-07'` |
| `therms` | `numeric` | from the gas bill |
| `cost_usd` | `numeric` | from the gas bill |
| `baseline_therms` | `numeric default 0` | non-heater therms to subtract (e.g. seasonal grill) |
| `created_at` | `timestamptz default now()` | |
| `updated_at` | `timestamptz default now()` | |

Unique constraint on `period_month` so the panel upserts one bill per month.

### RLS

- `heater_sessions`: enable RLS; policy `authenticated` **SELECT** only. The cron writes with the service-role key (`getSupabase()`), which bypasses RLS — same pattern as `pool_health_log`. No anon access.
- `heating_bills`: enable RLS; policy `authenticated` **full access** (SELECT/INSERT/UPDATE/DELETE) so the admin panel can enter and edit bills using the logged-in session.

Retention: indefinite. Volume is tiny (a handful of sessions per day at most).

## Sessionizer Logic (`recordHeaterSample`)

**Current type** is derived from the live status each run: `spa` if `spa_heater === 'on'`, else `pool` if `pool_heater === 'on'`, else none. The heater is a single burner redirecting water, so the two are never on simultaneously; if both ever read on, `spa` wins (spa implies active guest use).

Given the open session (the one row with `is_active = true`, if any) and the current type:

| Open session | Currently heating | Action |
|---|---|---|
| none | none | no-op |
| none | yes | **open**: insert session with `started_at = last_seen_at = now`, `heater_type = current`, `source = inferred`, `is_active = true` |
| same type | yes | **touch**: `last_seen_at = now` |
| different type | yes | **close** old (see below) + **open** new of current type |
| exists | no | **close**: `ended_at = last_seen_at`, `duration_seconds = last_seen_at − started_at`, `is_active = false` |

**Robustness — close always uses `last_seen_at`, never `now`:**
- If cron skips minutes, the session ends at the last minute the heater was actually confirmed on — never over-counts.
- If logging errors for a stretch and leaves a session open while the heater is already off, the next healthy run hits the "exists / not heating" row and closes it at its last confirmed time. Self-healing; only ever slightly under-counts the tail, never inflates.

**Source inference (best-effort, at open time):**
- `pool` → always `'external'` (the website never controls pool heat).
- `spa` → `'pad'` if `spaSource` indicates a pad-initiated timer (from the `spa_timer` row the cron already read: `state === 'active'` with `source === 'pad'`), else `'external'`.

Source is explicitly best-effort and non-critical; a wrong guess never affects usage totals or cost.

## Admin Panel + Metrics

New **"Pool & Spa Heating"** section in `admin.html`, following the existing `dash-section` pattern and using the authenticated Supabase client already present in the file. Three parts:

1. **Summary cards (current month):** Pool hrs · Spa hrs · Total hrs · Estimated cost (shown once a bill exists for the month, otherwise a prompt to add one).
2. **Sessions log (table):** Date · Type badge (Pool/Spa) · Start · End · Duration · Source. Newest first, recent 50 with a "Load more" control. An ongoing (`is_active`) session displays "in progress" with a live-ticking duration.
3. **Monthly rollup + bill entry (table):** one row per month — Month · Pool hrs · Spa hrs · Total hrs · Therms · Cost · Therms/hr · $/hr. `Therms` and `Cost` are inline-editable inputs that upsert a `heating_bills` row for that month; the computed columns populate once both are entered. `baseline_therms` is editable in an "advanced"/expandable spot per row.

### Metrics math (computed at read-time in panel JS)

Group `heater_sessions` by the calendar month of `started_at`; sum `duration_seconds` split by `heater_type` → `pool_hrs`, `spa_hrs`, `total_hrs`. For a month that has a `heating_bills` row:

- `net_therms = therms − baseline_therms`
- `therms_per_hr = total_hrs > 0 ? net_therms / total_hrs : null`
- `cost_per_therm = therms > 0 ? cost_usd / therms : null`
- `cost_per_hr = therms_per_hr × cost_per_therm`
- `month_est_cost = total_hrs × cost_per_hr` (the heater's share of the bill)
- Pool vs spa cost split by hours share (`pool_hrs / total_hrs`, etc.), assuming a uniform burner rate across pool and spa heating.

An in-progress session may be included in the current month's totals using its live duration (`now − started_at`); closed sessions use stored `duration_seconds`.

## Testing

`api/_heater_log.test.js` (`node:test` + `node:assert/strict`, with a fake `heaterStore` and status objects, mirroring `api/_pool.test.js`). Covers every transition-table row:

- idle + no open session → no-op, no writes
- heating + no open session → opens a session of the correct type with inferred source
- heating + same-type open session → touches `last_seen_at`, no new row
- not heating + open session → closes with `ended_at = last_seen_at` and correct `duration_seconds`
- pool→spa switch → closes the pool session, opens a spa session
- pool heating → `source = 'external'` regardless of `spaSource`
- spa heating with pad source → `source = 'pad'`
- missed-run case → close uses `last_seen_at`, not `now`

The sessionizer is pure with an injected store, so it is unit-testable exactly like the reconcile logic. No frontend tests for the admin JS — consistent with the rest of the project (no existing frontend test harness).

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/005_heater_usage.sql` | Create — `heater_sessions` + `heating_bills` tables, indexes, RLS |
| `api/_heater_log.js` | Create — `recordHeaterSample` sessionizer logic |
| `api/_heater_log.test.js` | Create — unit tests for the sessionizer |
| `api/_store.js` | Modify — add `makeHeaterStore(sb)` |
| `api/_pool.js` | Modify — `runHealthCheck` returns the fetched `status` (+ prior row) |
| `api/pool-health.js` | Modify — call `recordHeaterSample` with the returned status, in its own try/catch |
| `admin.html` | Modify — add "Pool & Spa Heating" section (sessions log, summary, monthly rollup + bill entry) |

## What Does NOT Change

- `api/pool-command.js`, `api/spa-timer.js`, `api/pool-status.js` — untouched.
- The spa control state machine (`reconcile`, `handleActive`, `handleShuttingOff`, `handleIdle`) — untouched.
- `pad/` frontend — untouched.
- The Vercel cron schedule — already every minute; no change.

## Verification Note

Before relying on pool-heat logging, confirm the `pool_heater` flag actually reads `'1'` when pool heat runs (it read `'0'`/off in the snapshot taken during design, which is expected when idle). If for any reason the flag never lights, the fallback is to infer pool heating from pool-mode + heater on; the session model is unchanged either way. This is a first-run check, not a code dependency.
