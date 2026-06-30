# Pool Control State Machine Hardening — Design Spec

## Goal

Make the pool/spa control system reliable when the Jandy/iAqualink app and the website are used together. Remove all side effects from the status-polling endpoint. Fix three specific state machine bugs that cause spurious shutoffs.

## Architecture Change

`pool-status.js` becomes read-only. It fetches live hardware state from iAqualink and reads the `spa_timer` row from Supabase to return the remaining countdown, but never writes to Supabase and never issues hardware commands.

`pool-health.js` (the Vercel cron) is the only place `reconcile()` runs. It fires every minute via Vercel cron config. Multiple devices can poll the pad page simultaneously with zero interference.

The frontend (`pad/js/pad.js`) is unchanged — it still polls every 30 seconds; it just gets a read-only response each time.

## State Machine Fixes (`api/_pool.js`)

### Fix 1 — `handleShuttingOff` timeout

**Problem:** When the website stops the spa, it sets `state = 'shutting_off'`. On each cron run, if the heater is still on, the code re-issues `set_spa_heater` (a toggle). If the user then turns the spa back on via the Jandy app, the cron immediately toggles it off again — indefinitely.

**Fix:** Record a `shutting_off_since` timestamp (Unix ms) when entering `shutting_off` state. In `handleShuttingOff`, if the heater is still on AND `now - shutting_off_since > 5 minutes`, stop retrying: transition to `idle`. The idle handler then sees `heaterOn = true` and adopts it as a fresh 3-hour session on the same cron run.

The normal fast path (heater confirms off within a minute) is unchanged.

### Fix 2 — `handleActive` early-end debounce

**Problem:** `handleActive` calls `fullShutdown()` the moment the heater reads as off while a timer is active, assuming the guest ended the session early. A single API blip triggers a full shutdown.

**Fix:** Add an `early_end_count` integer field. Each cron run where the heater reads as off during an active timer increments the counter. The counter resets to 0 the moment the heater reads as on again. `fullShutdown` only fires when `early_end_count >= 2` (two consecutive cron runs ≈ 2 minutes of confirmed off). Single blips never cause shutdowns.

### Fix 3 — `shutting_off_since` set on stop command

`spa-timer.js` DELETE handler (Stop button) sets `state = 'shutting_off'`. It must also set `shutting_off_since = Date.now()` so the Fix 1 timeout has its reference point.

## Data Model

**New columns on `spa_timer` table:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `shutting_off_since` | `bigint` | `0` | Unix ms when `shutting_off` state was entered |
| `early_end_count` | `int` | `0` | Consecutive cron runs with heater off during active timer |

Migration: `supabase/migrations/004_spa_timer_hardening.sql`

## Vercel Cron

Add to `vercel.json`:
```json
"crons": [{ "path": "/api/pool-health", "schedule": "* * * * *" }]
```

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron-triggered requests. Update `pool-health.js` to check this header (using `process.env.CRON_SECRET`) instead of the legacy `x-cron-secret` / `POOL_HEALTH_SECRET` pattern.

`CRON_SECRET` is an environment variable that must be set in the Vercel dashboard for the cron protection to work.

## Files Changed

| File | Change |
|------|--------|
| `vercel.json` | Add `crons` config |
| `api/pool-status.js` | Remove `reconcile()` call; add direct `spa_timer` row read for countdown |
| `api/pool-health.js` | Update auth to check `Authorization: Bearer` header via `CRON_SECRET` |
| `api/_pool.js` | Fix 1 (shutting_off timeout), Fix 2 (early_end_count debounce) |
| `api/spa-timer.js` | Set `shutting_off_since` in DELETE handler |
| `supabase/migrations/004_spa_timer_hardening.sql` | Add two new columns |

## What Does NOT Change

- `api/pool-command.js` — explicit user commands unaffected
- `pad/js/pad.js` — frontend polling unchanged
- `admin.html`, `guest.html` — unchanged
- Guest token system — unchanged
- All other API routes — unchanged
