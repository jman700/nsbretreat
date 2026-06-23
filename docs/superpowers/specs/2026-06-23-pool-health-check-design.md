# Pool/Spa Health Check — Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the spa safety logic run on its own server-side heartbeat — independent of whether any iPad or phone is connected — so an expired/abandoned hot-tub session is always shut down and returned to pool mode, with the owner emailed only when something fails.

**Architecture:** A new `/api/pool-health` endpoint, triggered every 5 minutes by Supabase `pg_cron`, runs the same reconciliation the iPad poll already triggers. The reconciliation logic currently inline in `pool-status.js:141-206` is extracted into a shared module so the live poll and the cron share one source of truth. Corrective actions are logged to a new `pool_health_log` table; failures/anomalies send one email via Resend.

**Tech Stack:** Vercel serverless functions (Node ESM), Supabase (Postgres + `pg_cron` + `pg_net`), iAquaLink REST, Resend (transactional email).

---

## Background — why this is needed

Two gaps in the current system explain the failure observed 2026-06-22:

1. **The safety check only runs while someone is watching.** The reconciliation in `pool-status.js` executes *only* when `GET /api/pool-status` is called, and the sole caller is the iPad polling every 30 s (`pad/js/pad.js:460`). With no client connected (iPad asleep, tab dropped, wifi blip), nothing runs and the heater can run indefinitely.
2. **The automatic shut-off is incomplete.** When the timer expires it sends only `set_spa_heater` (`pool-status.js:160`) — it never sends `set_spa_pump` to leave spa mode. The system can be left "stuck in spa mode" with the pump still routing to the spa circuit. The manual Stop button (`pad/js/pad.js:408-409`) already does both correctly; the automatic path does not.

This project closes both gaps and adds owner alerting + an audit log.

## Components

### 1. `api/_pool.js` (new shared module)

Holds the iAquaLink-domain logic that pool-status and pool-health both need:

- `parseHomeScreen(arr)` / `parseDevicesScreen(arr)` — moved verbatim from `pool-status.js`.
- `fetchStatus(auth)` — runs `get_home` + `get_devices`, returns the normalized `status` object (must include **`spa_pump`** / spa-mode state — see Open Questions).
- `reconcile({ status, auth, sb, now, source })` — the state machine below. Performs corrective iAquaLink commands, updates the `spa_timer` state row, inserts a `pool_health_log` row when it acts, and returns `{ status, action, anomaly, detail }`. Does **not** send email (the caller decides).

### 2. `api/pool-status.js` (refactor)

Becomes thin: `authenticate()` → `fetchStatus()` → `reconcile({ source: 'poll' })` → return `status`. Behavior for the iPad is unchanged. **Does not email** (too frequent; the cron owns alerting).

### 3. `api/pool-health.js` (new endpoint)

1. Reject unless header `x-cron-secret` equals `process.env.POOL_HEALTH_SECRET` → `401`.
2. `authenticate()` → `fetchStatus()` → `reconcile({ source: 'cron' })`.
3. If `result.anomaly` **and** the state row isn't already flagged `alerted` → send one email via `_email.js`, set `alerted = true`.
4. Return `200` with a short JSON summary (`{ action, anomaly }`).

### 4. `api/_email.js` (new helper)

Thin wrapper over the Resend API (`POST https://api.resend.com/emails`) using `RESEND_API_KEY`. One export: `sendAlert(subject, text)` → sends to `ALERT_EMAIL_TO` from `ALERT_EMAIL_FROM`. Non-fatal on failure (logs, never throws into the health check).

### 5. Supabase `pg_cron` job

Enable `pg_cron` + `pg_net`. Schedule every 5 min:

```sql
select cron.schedule(
  'pool-health-5min',
  '*/5 * * * *',
  $$ select net.http_post(
       url     := 'https://nsbretreat.com/api/pool-health',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pool_health_secret')
       )
     ); $$
);
```

The secret is stored in **Supabase Vault** (`pool_health_secret`) rather than inline in the job definition.

## Reconciliation state machine

The `spa_timer` row (single row, `id = 1`) is **never deleted** — it always exists and carries an explicit `state`. `activeSession := end_time > now`.

**`state = 'active'`** (a heated session is supposed to be running):
- `now < end_time` and heater **on** → healthy. Report `spa_seconds_remaining`. No action.
- `now < end_time` and heater **off** (guest/app ended it early) → run **Full shut-down**, set `state = 'idle'`.
- `now >= end_time` → **timer expired** → run **Full shut-down**, set `state = 'shutting_off'`, `shutoff_attempts = 1`.

**`state = 'shutting_off'`** (we issued a shutdown, verifying it took):
- heater now **off** → ensure spa pump + jets off (Full shut-down idempotent tail), set `state = 'idle'`, `shutoff_attempts = 0`, `alerted = false`. Log success.
- heater still **on** → re-issue heater-off, `shutoff_attempts++`. If `shutoff_attempts >= 2` → `anomaly = true`. Stay `shutting_off`.

**`state = 'idle'`** (expect pool mode):
- heater **on** → turned on externally via the Jandy app → create a 3-hr timer (`source = 'iaqualink'`), ensure spa mode on, set `state = 'active'`. *(Preserves existing auto-timer behavior.)*
- heater **off**, spa pump **on** (stuck in spa mode) → apply **30-min grace**: if `spa_mode_since == 0` set it to `now`; once `now - spa_mode_since >= 30 min` run **Full shut-down** (reverts to pool mode + jets off), reset `spa_mode_since = 0`. Log `reverted_spa_mode`.
- heater **off**, spa pump **off** → fully idle. Reset `spa_mode_since = 0`. No action.

**Full shut-down** (the complete fix for Gap 2) — read state, then send only what's needed, in order: heater off (if on) → spa pump off / pool mode (if on) → spa jets/blower off (if on). Each command is a toggle, so guard every one with a current-state read. Any `deviceRequest` throw → `anomaly = true`, `detail` set, logged.

**This supersedes** the `heaterStopPending` soft-expire hack from commit `58a1423`: the `shutting_off` state now cleanly prevents a new timer being auto-created while the hardware confirms off. The `DELETE /api/spa-timer` handler (manual Stop) should set `state = 'shutting_off'`, `end_time = 0` so the manual path also gets verified shutoff.

## Anomaly → email rules

`anomaly = true` triggers exactly when: (a) any corrective `deviceRequest` throws (API/auth failure), or (b) `shutoff_attempts >= 2` (issued shutdown, the spa still reports on). Email is sent **once per episode** — gated by the `alerted` flag, which resets to `false` when the system settles to `idle`. With a 5-min cron this means the owner hears within ~5–10 min of a genuine failure, and not at all when things self-correct.

Email (to `antoniofconcha@gmail.com`): subject e.g. `NSB Retreat — spa won't shut off`, body with what was found, what was attempted, attempt count, and a link to the admin/Supabase log.

## Data model

**Alter `spa_timer`** (add columns; keep `id`, `end_time`, `started_at`, `source`):

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `state` | text | `'idle'` | `idle` \| `active` \| `shutting_off` |
| `shutoff_attempts` | int | `0` | consecutive failed shut-off runs |
| `spa_mode_since` | bigint | `0` | epoch ms first observed stuck in spa mode (grace timer) |
| `alerted` | boolean | `false` | email already sent for current episode |
| `updated_at` | timestamptz | `now()` | last reconcile touch |

**New `pool_health_log`** (sparse — one row only when an action is taken or a failure occurs):

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint identity PK | |
| `created_at` | timestamptz default now() | |
| `source` | text | `cron` \| `poll` |
| `found` | jsonb | snapshot: heater, spa_pump, jets, state, end_time |
| `action` | text | `expired_shutoff` \| `reverted_spa_mode` \| `created_auto_timer` \| `retry_shutoff` \| `early_end_shutoff` |
| `success` | boolean | |
| `detail` | text | error message / context |

RLS: service-role writes (the endpoints use the existing service client in `_supabase.js`); authenticated admin read for a future log view.

## Environment variables (add to Vercel)

| Var | Purpose |
|-----|---------|
| `POOL_HEALTH_SECRET` | shared secret the cron sends in `x-cron-secret` |
| `RESEND_API_KEY` | Resend transactional email |
| `ALERT_EMAIL_TO` | `antoniofconcha@gmail.com` |
| `ALERT_EMAIL_FROM` | a verified Resend sender (see setup) |

`IAQUALINK_*` and the Supabase vars already exist.

## Open implementation questions (verify FIRST, before coding the rules)

1. **Does `get_home` reliably report spa-pump / spa-mode state for this RS-4 Combo?** The whole "detect stuck spa mode" rule depends on it. `FIELD_MAP` maps `spa_pump` but `pad.js` never uses it and the result object doesn't initialize it. Hit a live `/api/pool-status`, inspect `_raw`, toggle the spa in the Jandy app, and confirm which key flips. If `get_home` doesn't expose it, find the right `get_devices`/command source before relying on it.
2. **Does `set_spa_pump` toggle spa↔pool as expected, and is toggling when already in pool mode a no-op/safe?** Confirm with a live test; always read-before-toggle.
3. **Resend sender:** sending from `@nsbretreat.com` needs DNS domain verification in Resend. For first ship, `onboarding@resend.dev` works to a verified owner address; domain verification can follow.

## Testing

- **Unit-ish (logic):** drive `reconcile()` with synthetic `status` + `spa_timer` rows for each state-machine branch; assert the commands issued, the row transition, and the log row.
- **Live, manual:**
  - Trigger `POST /api/pool-health` with the correct secret → expect `200` + log row; wrong/no secret → `401`.
  - Set `spa_timer.end_time` to the past with the heater physically on → run health check → confirm full shut-down (heater + pump + jets) and a `expired_shutoff` log row.
  - Put the system in spa mode with heater off, backdate `spa_mode_since` > 30 min → confirm revert to pool mode.
  - Break iAquaLink creds temporarily → confirm one anomaly email, and that it does **not** repeat on the next run.
  - Confirm the iPad (`/api/pool-status`) still behaves identically.

## Files

- **Create:** `api/_pool.js` — `parseHomeScreen`, `parseDevicesScreen`, `fetchStatus`, `reconcile`.
- **Create:** `api/pool-health.js` — cron endpoint (secret-gated) + email-on-anomaly.
- **Create:** `api/_email.js` — Resend wrapper.
- **Create:** `supabase/migrations/002_pool_health.sql` — alter `spa_timer`, create `pool_health_log`. *(Note: the live `spa_timer` table was created directly via the Supabase dashboard/MCP, not a migration — this migration both back-fills its definition and adds the new columns.)*
- **Modify:** `api/pool-status.js` — slim down to use `_pool.js`; remove the inline timer block; no email.
- **Modify:** `api/spa-timer.js` — `DELETE` sets `state = 'shutting_off'`, `end_time = 0`; `POST` sets `state = 'active'`.
- **Setup (not a repo file):** enable `pg_cron`/`pg_net`, store `pool_health_secret` in Vault, schedule the job; add the four env vars in Vercel.

## Out of scope

- **Guest access links / token auth** — the separate next project. Command endpoints (`pool-command`, `spa-timer`) keep their current access for now.
- **SMS alerts** — email only. SMS (Twilio) is a later upgrade.
- **Checkout sweep** tied to the iCal booking feeds (force-everything-off at checkout) — a later add-on.
- **Admin-panel log viewer** — optional/stretch; the `pool_health_log` is reviewable via Supabase directly. A read-only view can be added to `admin.html` later.
- **Any change to the pad UI** — the countdown already renders from the server-provided `spa_end_time`; the server is authoritative.
