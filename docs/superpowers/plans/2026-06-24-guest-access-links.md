# Guest Access Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add time-limited guest access links (`nsbretreat.com/guest/TOKEN`) that show the full pad page while valid and a dead-end message when expired, with a token management UI in the existing admin dashboard.

**Architecture:** A new Supabase table `guest_tokens` stores tokens with expiry timestamps. A new serverless endpoint `GET /api/guest-token?token=TOKEN` validates tokens (public, anon-accessible). A new `guest/index.html` reads the token from the URL path, calls the validation endpoint, and either shows the full pad content or a "no longer active" screen. Admins create/manage tokens directly via Supabase from a new section in `admin.html` — no extra server-side endpoint needed for CRUD.

**Tech Stack:** Static HTML + vanilla JS, Vercel serverless functions (Node 20 ESM), Supabase (PostgreSQL + anon SDK), `node:test` + `node:assert/strict` for tests.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/003_guest_tokens.sql` | Create | Table + RLS |
| `api/guest-token.js` | Create | GET validation endpoint (exports `validateToken`) |
| `api/guest-token.test.js` | Create | 4 unit tests for `validateToken` |
| `guest/index.html` | Create | Token-gated guest page (full pad content) |
| `vercel.json` | Modify | Add `/guest/:token` rewrite |
| `admin.html` | Modify | Add Guest Links section (CSS + HTML + JS) |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/003_guest_tokens.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/003_guest_tokens.sql
create table if not exists public.guest_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  label text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.guest_tokens enable row level security;

create policy "anon select" on public.guest_tokens
  for select to anon using (true);

create policy "authenticated full" on public.guest_tokens
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply the migration via Supabase Management API**

Run in PowerShell (use the PAT from `~/.claude/settings.json` via `$env:SUPABASE_PAT` or as you have it saved):

```powershell
$pat = $env:SUPABASE_PAT  # or paste your PAT here
$ref = "xittuxwilxmzzawjdivd"
$headers = @{ Authorization = "Bearer $pat"; "Content-Type" = "application/json" }
$sql = Get-Content "supabase/migrations/003_guest_tokens.sql" -Raw
$body = @{ query = $sql } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Headers $headers -Body $body
Write-Host ($r | ConvertTo-Json)
```

Expected: no `error` field in response.

- [ ] **Step 3: Verify table exists**

```powershell
$pat = $env:SUPABASE_PAT  # or paste your PAT here
$ref = "xittuxwilxmzzawjdivd"
$headers = @{ Authorization = "Bearer $pat"; "Content-Type" = "application/json" }
$body = @{ query = "select column_name, data_type from information_schema.columns where table_name = 'guest_tokens' order by ordinal_position;" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Headers $headers -Body $body
$r | ConvertTo-Json
```

Expected: rows for `id`, `token`, `label`, `expires_at`, `created_at`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_guest_tokens.sql
git commit -m "feat: guest_tokens migration"
```

---

## Task 2: Token Validation API + Tests

**Files:**
- Create: `api/guest-token.js`
- Create: `api/guest-token.test.js`

- [ ] **Step 1: Write the failing tests**

Create `api/guest-token.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test api/guest-token.test.js 2>&1
```

Expected: 4 failures with `Cannot find module` or similar.

- [ ] **Step 3: Implement `api/guest-token.js`**

```js
// api/guest-token.js
// GET /api/guest-token?token=TOKEN — validate a guest access token (public endpoint).

import { getSupabase } from './_supabase.js';

export async function validateToken(token, sb) {
  if (!token) return { valid: false, reason: 'not_found' };
  const { data, error } = await sb
    .from('guest_tokens')
    .select('label, expires_at')
    .eq('token', token)
    .single();
  if (error || !data) return { valid: false, reason: 'not_found' };
  if (new Date(data.expires_at) <= new Date()) return { valid: false, reason: 'expired' };
  return { valid: true, label: data.label };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const result = await validateToken(req.query.token, getSupabase());
  return res.status(200).json(result);
}
```

- [ ] **Step 4: Run tests — verify all 4 pass**

```bash
node --test api/guest-token.test.js 2>&1
```

Expected output includes: `pass 4`, `fail 0`.

- [ ] **Step 5: Run full test suite — no regressions**

```bash
npm test 2>&1
```

Expected: `pass 28`, `fail 0` (24 existing + 4 new).

- [ ] **Step 6: Commit**

```bash
git add api/guest-token.js api/guest-token.test.js
git commit -m "feat: guest-token validation endpoint + tests"
```

---

## Task 3: Vercel Rewrite

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the guest rewrite**

Current `vercel.json`:
```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/ical",      "destination": "/api/ical.js" },
    { "source": "/api/ical-vrbo", "destination": "/api/ical-vrbo.js" }
  ]
}
```

New `vercel.json`:
```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/ical",         "destination": "/api/ical.js" },
    { "source": "/api/ical-vrbo",    "destination": "/api/ical-vrbo.js" },
    { "source": "/guest/:token",     "destination": "/guest/index.html" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: vercel rewrite for /guest/:token"
```

---

## Task 4: Guest Page

**Files:**
- Create: `guest/index.html`

This page is identical in content to `pad/index.html` but wraps everything in a token gate. The gate overlay displays a loading state, then either hides (token valid) or shows "This link is no longer active." (expired/invalid).

- [ ] **Step 1: Create `guest/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>NSB Retreat — House Guide</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/pad/css/pad.css">
  <style>
    #guest-gate {
      position: fixed; inset: 0; z-index: 9999;
      background: #f9ece8;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', 'Georgia', serif;
    }
    .gate-inner { text-align: center; padding: 2rem; }
    .gate-title {
      font-size: 1.5rem; font-weight: 400; color: #2d2926;
      letter-spacing: 0.02em; margin-bottom: 0.5rem;
    }
    .gate-sub { font-size: 0.9rem; color: #6b6460; font-family: 'Inter', sans-serif; }
    .gate-spinner {
      width: 32px; height: 32px; margin: 0 auto 1.25rem;
      border: 3px solid #d4c4b0; border-top-color: #b8967e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <!-- Gate overlay: visible while validating or on expired/invalid token -->
  <div id="guest-gate">
    <div class="gate-inner">
      <div class="gate-spinner" id="gate-spinner"></div>
      <p class="gate-title" id="gate-title">NSB Retreat</p>
      <p class="gate-sub" id="gate-sub"></p>
    </div>
  </div>

  <!-- Content: hidden until token validated -->
  <div id="guest-content" style="display:none">

    <!-- ── Nav ── -->
    <nav class="pad-nav" id="pad-nav">
      <div class="pad-nav-inner" id="pad-tabs">
        <span class="pad-logo">NSB Retreat</span>
        <a href="#pool"       class="pad-tab active">Pool &amp; Spa</a>
        <a href="#beach"      class="pad-tab">Beach</a>
        <a href="#wifi"       class="pad-tab">WiFi &amp; Tech</a>
        <a href="#checkin"    class="pad-tab">Check-In</a>
        <a href="#rules"      class="pad-tab">House Rules</a>
        <a href="#local"      class="pad-tab">Local Guide</a>
        <a href="#emergency"  class="pad-tab">Emergency</a>
      </div>
    </nav>

    <main class="pad-main">

      <!-- ── 1. Pool & Spa Controls ── -->
      <section class="pad-section" id="pool">
        <h2 class="pad-section-title">Pool &amp; Spa Controls</h2>
        <div class="pool-widget" id="pool-widget">
          <div class="pool-status-header">
            <h3 class="pool-widget-title">Live Controls</h3>
            <span class="pool-online-badge offline" id="pool-badge">Loading…</span>
          </div>
          <div class="pool-temps">
            <div class="temp-card">
              <span class="temp-label">Pool Temp</span>
              <span class="temp-value" id="pool-temp-val"><span class="temp-loading">–</span></span>
            </div>
            <div class="temp-card">
              <span class="temp-label">Spa Temp</span>
              <span class="temp-value" id="spa-temp-val"><span class="temp-loading">–</span></span>
            </div>
          </div>
          <div class="pool-controls">
            <div class="pool-control-row heater-row">
              <div class="control-label">
                Spa Heater
                <span class="control-sub" id="heater-sub">Select a duration to start</span>
              </div>
              <div class="heater-controls">
                <div id="heater-off-ui" class="heater-dur-btns">
                  <button class="heater-dur-btn" data-hours="1" disabled>1 hr</button>
                  <button class="heater-dur-btn" data-hours="2" disabled>2 hr</button>
                  <button class="heater-dur-btn" data-hours="3" disabled>3 hr</button>
                </div>
                <div id="heater-on-ui" class="heater-on-controls" style="display:none">
                  <span class="heater-countdown" id="heater-countdown">–</span>
                  <button class="heater-stop-btn" id="heater-stop-btn" disabled>Stop</button>
                </div>
              </div>
            </div>
            <div class="pool-control-row setpoint-row">
              <div class="setpoint-header">
                <div class="control-label">
                  Spa Temperature
                  <span class="control-sub">Set target temperature (98–104°F)</span>
                </div>
                <span class="setpoint-display" id="setpoint-display">102°F</span>
              </div>
              <input type="range" class="pool-slider" id="slider-spa-setpoint"
                min="98" max="104" step="1" value="102" disabled>
            </div>
            <div class="pool-control-row" id="row-spa-jets" style="display:none">
              <div class="control-label">
                Spa Jets
                <span class="control-sub">Air blower / jets</span>
              </div>
              <button class="pool-toggle" id="btn-spa-jets" data-command="spa_jets" data-state="off" disabled>Off</button>
            </div>
            <div class="pool-control-row">
              <div class="control-label">
                Pool Light
                <span class="control-sub">Main pool light</span>
              </div>
              <button class="pool-toggle" id="btn-pool-light" data-command="pool_light" data-state="off" disabled>Off</button>
            </div>
            <div class="pool-control-row" style="flex-direction:column; align-items:flex-start; gap:0.5rem">
              <div class="control-label">
                Light Color
                <span class="control-sub">Tap a color — light must be on</span>
              </div>
              <div class="light-colors" id="light-colors">
                <button class="color-swatch swatch-alpine-white   disabled" data-color="alpine_white"   title="Alpine White"          aria-label="Alpine White"></button>
                <button class="color-swatch swatch-sky-blue       disabled" data-color="sky_blue"       title="Sky Blue"              aria-label="Sky Blue"></button>
                <button class="color-swatch swatch-cobalt-blue    disabled" data-color="cobalt_blue"    title="Cobalt Blue"           aria-label="Cobalt Blue"></button>
                <button class="color-swatch swatch-caribbean-blue disabled" data-color="caribbean_blue" title="Caribbean Blue"        aria-label="Caribbean Blue"></button>
                <button class="color-swatch swatch-spring-green   disabled" data-color="spring_green"   title="Spring Green"          aria-label="Spring Green"></button>
                <button class="color-swatch swatch-emerald-green  disabled" data-color="emerald_green"  title="Emerald Green"         aria-label="Emerald Green"></button>
                <button class="color-swatch swatch-emerald-rose   disabled" data-color="emerald_rose"   title="Emerald Rose"          aria-label="Emerald Rose"></button>
                <button class="color-swatch swatch-magenta        disabled" data-color="magenta"        title="Magenta"               aria-label="Magenta"></button>
                <button class="color-swatch swatch-violet         disabled" data-color="violet"         title="Violet"                aria-label="Violet"></button>
                <button class="color-swatch swatch-slow-splash    disabled" data-color="slow_splash"    title="Slow Color Splash"     aria-label="Slow Color Splash"></button>
                <button class="color-swatch swatch-fast-splash    disabled" data-color="fast_splash"    title="Fast Color Splash"     aria-label="Fast Color Splash"></button>
                <button class="color-swatch swatch-america        disabled" data-color="america"        title="America The Beautiful" aria-label="America The Beautiful"></button>
                <button class="color-swatch swatch-fat-tuesday    disabled" data-color="fat_tuesday"    title="Fat Tuesday"           aria-label="Fat Tuesday"></button>
                <button class="color-swatch swatch-disco-tech     disabled" data-color="disco_tech"     title="Disco Tech"            aria-label="Disco Tech"></button>
              </div>
            </div>
            <div class="pool-control-row">
              <div class="control-label">
                Pool Pump
                <span class="control-sub">Read-only</span>
              </div>
              <span class="pool-pump-status" id="pool-pump-status">–</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── 2. Beach Conditions ── -->
      <section class="pad-section" id="beach">
        <h2 class="pad-section-title">Current Beach Conditions</h2>
        <div class="beach-cond-widget" id="beach-cond-widget"></div>
      </section>

      <!-- ── 3. WiFi & Tech ── -->
      <section class="pad-section" id="wifi">
        <h2 class="pad-section-title">WiFi &amp; Tech</h2>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">WiFi Network</span>
            <span class="info-value" id="pad-wifi-name">NSB Retreat</span>
          </div>
          <div class="info-card copyable" id="pad-wifi-pass-card">
            <span class="info-label">WiFi Password</span>
            <span class="info-value" id="pad-wifi-pass">seashells815!</span>
            <span class="info-hint">Tap to copy</span>
          </div>
        </div>
        <div class="wifi-qr-wrap">
          <div id="wifi-qr"></div>
          <p class="wifi-qr-label">Scan to connect</p>
        </div>
        <div class="acc-list">
          <div class="acc-item">
            <button class="acc-trigger">Smart TVs &amp; Streaming</button>
            <div class="acc-body">
              <p>Every bedroom and living space has a Smart TV. Netflix, Hulu, YouTube TV, and more are available to download. <strong>Sign in with your own account.</strong> Please sign out before you check out.</p>
            </div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger">Pool &amp; Spa Controls (Tablet)</button>
            <div class="acc-body">
              <p>The hot tub, bubbles, and pool/spa lights are also controllable from the <strong>tablet mounted on the wall in the kitchen</strong>. Tap <strong>Pool &amp; Spa</strong> in the menu for live controls and full instructions.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── 4. Check-In ── -->
      <section class="pad-section" id="checkin">
        <h2 class="pad-section-title">Check-In</h2>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">Check-In</span>
            <span class="info-value">4:00 PM</span>
            <span class="info-hint">Code in your booking app</span>
          </div>
          <div class="info-card">
            <span class="info-label">Check-Out</span>
            <span class="info-value">10:00 AM</span>
            <span class="info-hint">See checkout instructions</span>
          </div>
        </div>
        <div class="acc-list">
          <div class="acc-item">
            <button class="acc-trigger">Door Lock &amp; Entry</button>
            <div class="acc-body">
              <p>Your key is the <strong>black smart lock</strong> on the front door — no physical key needed.</p>
              <ul style="margin-top:0.75rem">
                <li><strong>To unlock:</strong> Press the house icon (bottom left), enter your code, and the door will unlock.</li>
                <li><strong>To lock:</strong> Press the lock icon (bottom right) when leaving.</li>
              </ul>
              <p style="margin-top:0.75rem">Your door code will be sent in the messages section of your <strong>Airbnb or VRBO booking app</strong> prior to arrival.</p>
            </div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger">Parking</button>
            <div class="acc-body">
              <p>Park in the <strong>right garage spot, driveway, or front yard grass</strong>. Watch for the water meter near the grass area.</p>
              <p style="margin-top:0.75rem"><strong>Street parking is prohibited</strong> and may result in fines or towing.</p>
            </div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger">Upon Arrival</button>
            <div class="acc-body">
              <p>Please <strong>inspect the home</strong> when you arrive and notify us immediately if anything needs attention. Document any pre-existing damage with photos and send via text or booking app.</p>
            </div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger">How to Heat the Hot Tub</button>
            <div class="acc-body">
              <ol class="steps-list">
                <li><span class="step-num">1</span><div class="step-body">Touch the tablet screen to wake it, then <strong>slide your finger upward from the bottom</strong> to unlock.</div></li>
                <li><span class="step-num">2</span><div class="step-body">Tap <strong>"815 NSB Pool System"</strong> to open controls.</div></li>
                <li><span class="step-num">3</span><div class="step-body">Select the <strong>"OneTouch Scenes"</strong> tab and toggle on <strong>"Spa Mode."</strong></div></li>
                <li><span class="step-num">4</span><div class="step-body">Allow approximately <strong>30 minutes</strong> to reach <strong>102°F</strong>. Or — use the live controls on the Pool &amp; Spa tab.</div></li>
              </ol>
              <p style="margin-top:0.875rem; font-size:0.875rem"><strong>Important:</strong> Under Devices, "Spa Mode" must be toggled on — not just "Spa Heater."</p>
            </div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger">Pool Sliding Door Alarm (Child Safety)</button>
            <div class="acc-body">
              <p>The sliding glass doors to the pool have a legally required audible alarm — a <strong>grey rectangular box</strong> to the left of the door.</p>
              <ul style="margin-top:0.75rem">
                <li><strong>To exit:</strong> Press the mute button before opening the door.</li>
                <li><strong>To re-enter:</strong> Press the small button on the outside of the door frame before opening.</li>
                <li>The mute lasts <strong>10–15 seconds.</strong></li>
                <li>If your group is adults only, you may disable the alarm using the black switch on the left side. <strong>Do not disable if children are present.</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- ── 5. House Rules ── -->
      <section class="pad-section" id="rules">
        <h2 class="pad-section-title">House Rules</h2>
        <div class="acc-list">
          <div class="acc-item"><button class="acc-trigger">Quiet hours outside: 10 PM – 9 AM</button><div class="acc-body"><p>Please be mindful of neighbors. Quiet hours apply to outdoor spaces — pool area, patio, and yard.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">Max occupancy: 16 guests</button><div class="acc-body"><p>The property is permitted for a maximum of 16 guests at any time, including day visitors.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No street parking</button><div class="acc-body"><p>Use the driveway, right garage spot, or front yard grass only. Street parking may result in fines or towing.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No glass outside</button><div class="acc-body"><p>Broken glass on outdoor surfaces is nearly impossible to fully clear and poses a serious injury risk — especially in and around the pool.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No smoking on the property</button><div class="acc-body"><p>If you need to smoke, please step off the property and dispose of cigarette butts responsibly.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">Pets require a $395 fee</button><div class="acc-body"><p>Pets must be pre-approved before arrival. Please clean up after your pet at all times.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No parties or events without approval</button><div class="acc-body"><p>Parties or events require prior written approval from the host.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No unauthorized overnight guests</button><div class="acc-body"><p>Overnight guests must not exceed the booked headcount. No unregistered guests permitted to stay the night.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">No open-flame candles indoors</button><div class="acc-body"><p>Scented, pillar, tea lights, and similar candles are a fire hazard. Birthday candles are fine. Battery-powered candles are always welcome.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">Report any damage immediately</button><div class="acc-body"><p>Accidents happen — please notify Antonio right away rather than after checkout. Call or text (407) 506-6654.</p></div></div>
          <div class="acc-item"><button class="acc-trigger">Trash pickup: Monday &amp; Thursday mornings</button><div class="acc-body"><p>Please roll bins to the curb by 7 AM and return them the same day.</p></div></div>
        </div>
      </section>

      <!-- ── 6. Local Guide ── -->
      <section class="pad-section" id="local">
        <h2 class="pad-section-title">Local Guide</h2>
        <div class="local-filter-tabs">
          <button class="filter-btn active" data-filter="eat">Eat</button>
          <button class="filter-btn" data-filter="drink">Drink</button>
          <button class="filter-btn" data-filter="see">See</button>
          <button class="filter-btn" data-filter="do">Do</button>
          <button class="filter-btn" data-filter="coffee">Coffee</button>
          <button class="filter-btn" data-filter="essentials">Essentials</button>
          <button class="filter-btn" data-filter="">All</button>
        </div>
        <div class="local-guide-cards" id="local-guide-cards">
          <div class="place-card" data-category="eat"><img src="../assets/photos/local-breakers.jpg" alt="The Breakers" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Casual · On the Beach</span><h3>The Breakers</h3><p>Beachfront dining with burgers, seafood, and ocean views. Possibly the best burger in Central Florida.</p><p class="place-address">359 Flagler Ave</p></div></div>
          <div class="place-card" data-category="eat"><img src="../assets/photos/local-garlic.jpg" alt="The Garlic" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Casual · Lively</span><h3>The Garlic</h3><p>Rustic Italian with lush garden seating, wood-fired pizza, and an extensive wine list.</p><p class="place-address">604 N Dixie Fwy</p></div></div>
          <div class="place-card" data-category="eat"><img src="../assets/photos/local-outriggers.jpg" alt="Outriggers" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Casual · Waterfront</span><h3>Outriggers Tiki Bar &amp; Grille</h3><p>Waterfront tiki bar with marina views, seafood, and tropical cocktails. Perfect sunset spot.</p><p class="place-address">2900 N Causeway</p></div></div>
          <div class="place-card" data-category="eat"><img src="../assets/photos/local-spott.jpg" alt="The Spott" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Elevated Dining</span><h3>The Spott</h3><p>Fresh fish, Black Angus steaks, and a speakeasy bar upstairs. Reserve in advance — highly recommended.</p><p class="place-address">609 Flagler Ave</p></div></div>
          <div class="place-card" data-category="see"><img src="../assets/photos/flagler.jpg" alt="Flagler Avenue" loading="lazy"><div class="place-card-body"><span class="place-tag">Shopping · Beach Access</span><h3>Flagler Avenue</h3><p>The heart of NSB — local shops, restaurants, festivals, and direct beach access.</p><p class="place-address">Flagler Ave, New Smyrna Beach</p></div></div>
          <div class="place-card" data-category="see"><img src="../assets/photos/dunes.jpg" alt="Smyrna Dunes Park" loading="lazy"><div class="place-card-body"><span class="place-tag">Nature · Dog Friendly</span><h3>Smyrna Dunes Park</h3><p>184-acre park with a boardwalk, nature trails, wildlife observation, and stunning Ponce Inlet views.</p><p class="place-address">2995 N Peninsula Ave</p></div></div>
          <div class="place-card" data-category="see"><img src="../assets/photos/canal.jpg" alt="Canal Street" loading="lazy"><div class="place-card-body"><span class="place-tag">Historic · Culture</span><h3>Canal Street Historic District</h3><p>Across the causeway — art galleries, local eateries, historic architecture, and community events.</p><p class="place-address">Canal St, New Smyrna Beach</p></div></div>
          <div class="place-card" data-category="drink"><img src="../assets/photos/local-flagler-tavern.jpg" alt="Flagler Tavern" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Bar · Nightlife</span><h3>Flagler Tavern</h3><p>Known for its vibrant nightlife, extensive drink menu, and live entertainment.</p><p class="place-address">208 Flagler Ave</p></div></div>
          <div class="place-card" data-category="drink"><img src="../assets/photos/local-traders.jpg" alt="Traders Sports Bar" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Sports Bar · Casual</span><h3>Traders Sports Bar</h3><p>A lively sports bar with a wide selection of beers, cocktails, and pub food.</p><p class="place-address">115 Canal St</p></div></div>
          <div class="place-card" data-category="drink"><img src="../assets/photos/local-ciao-bella.jpg" alt="Ciao Bella" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Italian · Martini Bar</span><h3>Ciao Bella Italian Restaurant</h3><p>This Italian restaurant has an extensive martini and wine selection.</p><p class="place-address">301 Canal St</p></div></div>
          <div class="place-card" data-category="drink"><img src="../assets/photos/local-toni-joes.jpg" alt="Toni &amp; Joe's Patio" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Beachfront Bar · Live Music</span><h3>Toni &amp; Joe's Patio</h3><p>This beachfront bar offers a lively atmosphere with live music and a diverse selection of drinks.</p><p class="place-address">301 S Atlantic Ave</p></div></div>
          <div class="place-card" data-category="do"><img src="../assets/photos/local-surfing.jpg" alt="Surf Lessons" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Water Sport · All Levels</span><h3>Surf Lessons</h3><p>NSB is one of Florida's best surf spots. Local schools offer beginner-friendly lessons right on the beach.</p><p class="place-address">Various locations on the beach</p></div></div>
          <div class="place-card" data-category="do"><img src="../assets/photos/dunes.jpg" alt="Smyrna Dunes Park" loading="lazy"><div class="place-card-body"><span class="place-tag">Nature · Active</span><h3>Smyrna Dunes Park</h3><p>Walk or bike the 1.5-mile boardwalk through dunes, maritime hammock, and around Ponce Inlet. Dog-friendly.</p><p class="place-address">2995 N Peninsula Ave</p></div></div>
          <div class="place-card" data-category="do"><img src="../assets/photos/local-kayak.jpg" alt="Kayaking &amp; Paddleboard" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Water Sport · Rental</span><h3>Kayaking &amp; Paddleboarding</h3><p>Rent kayaks or SUPs from several local outfitters and explore the Indian River Lagoon or inshore waterways.</p><p class="place-address">Various Intracoastal locations</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-luma.jpg" alt="Luma" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Café · Outdoor · Beachy</span><h3>Luma</h3><p>Beautiful outdoor, beachy, bohemian vibe with coffee, teas, juices, food, and even beers &amp; wines. A must-visit to relax and unwind.</p><p class="place-address">309 Flagler Ave</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-third-wave.jpg" alt="Third Wave Café" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Artisanal Coffee · Outdoor Dining</span><h3>Third Wave Café</h3><p>Artisanal coffee and an extensive wine selection in a cozy atmosphere, attached to a restaurant with exceptional food and a beautiful outdoor venue.</p><p class="place-address">114 Canal St</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-island-roasters.jpg" alt="Island Roasters Coffee Co." loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Coffee Roaster · Specialty</span><h3>Island Roasters Coffee Co.</h3><p>Freshly roasted coffee beans and specialty drinks in a relaxed setting.</p><p class="place-address">319 Flagler Ave</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-bakers-table.jpg" alt="The Bakers Table" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Café · Bakery</span><h3>The Bakers Table</h3><p>A café and bakery known for freshly baked goods and excellent coffee.</p><p class="place-address">761 E Third Ave, New Smyrna Beach</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-hub-canal.jpg" alt="The Hub on Canal" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Gallery · Café · Canal Street</span><h3>The Hub on Canal</h3><p>A community-focused art gallery and coffee shop offering artisanal coffee across the causeway.</p><p class="place-address">132 Canal St</p></div></div>
          <div class="place-card" data-category="coffee"><img src="../assets/photos/local-wake-up.jpg" alt="Wake Up Café" loading="lazy" onerror="this.style.display='none'"><div class="place-card-body"><span class="place-tag">Café · Local Favorite</span><h3>Wake Up Café</h3><p>A local favorite known for its cozy atmosphere and superb coffee selection.</p><p class="place-address">Canal St, New Smyrna Beach</p></div></div>
          <div class="place-card" data-category="essentials"><div class="place-card-body"><span class="place-tag">Grocery · 1.2 mi</span><h3>Publix Super Market</h3><p>Full grocery, fresh seafood, bakery, and pharmacy.</p><p class="place-address">1021 N Dixie Fwy</p></div></div>
          <div class="place-card" data-category="essentials"><div class="place-card-body"><span class="place-tag">Pharmacy · 0.8 mi</span><h3>Walgreens</h3><p>Pharmacy, OTC meds, snacks, and late hours.</p><p class="place-address">1703 S Dixie Fwy</p></div></div>
          <div class="place-card" data-category="essentials"><div class="place-card-body"><span class="place-tag">Pharmacy · 1.5 mi</span><h3>CVS Pharmacy</h3><p>Pharmacy and health essentials.</p><p class="place-address">1401 N Dixie Fwy</p></div></div>
          <div class="place-card" data-category="essentials"><div class="place-card-body"><span class="place-tag">Grocery · 5 mi</span><h3>Walmart Supercenter</h3><p>Groceries, household goods, beach gear, and more.</p><p class="place-address">2700 S Ridgewood Ave, Edgewater</p></div></div>
        </div>
      </section>

      <!-- ── 7. Emergency ── -->
      <section class="pad-section" id="emergency">
        <h2 class="pad-section-title">Emergency &amp; Safety</h2>
        <p style="color:var(--charcoal-light,#666); font-size:0.9rem; margin:0 0 1.25rem">Reference numbers and locations for emergencies.</p>
        <div class="emg-grid">
          <div class="emg-card emg-card-red"><span class="emg-number">911</span><span class="emg-label">Fire / Police / Medical</span></div>
          <div class="emg-card"><span class="emg-number">(800) 222-1222</span><span class="emg-label">Poison Control — 24/7</span></div>
          <div class="emg-card"><span class="emg-number emg-number-sm">AdventHealth ER</span><span class="emg-label">~3.5 miles · 401 Palmetto St</span></div>
          <div class="emg-card"><span class="emg-number emg-number-sm">Urgent Care NSB</span><span class="emg-label">~3 miles · Primecare Medical</span></div>
          <div class="emg-card"><span class="emg-number emg-number-sm">(386) 736-5999</span><span class="emg-label">Volusia County Sheriff — non-emergency</span></div>
          <div class="emg-card"><span class="emg-number">(407) 506-6654</span><span class="emg-label">Antonio (Host) — call or text</span></div>
          <div class="emg-card emg-card-util"><span class="emg-number emg-number-sm">Circuit Breaker</span><span class="emg-label">Garage — left wall</span></div>
          <div class="emg-card emg-card-util"><span class="emg-number emg-number-sm">Water Main Shutoff</span><span class="emg-label">Right side of home — lever near corner of porch by palm tree</span></div>
        </div>
      </section>

    </main>

    <div class="pool-toast" id="pool-toast"></div>
    <div class="copy-toast" id="copy-toast">Copied!</div>

  </div><!-- /#guest-content -->

  <script src="/js/config.js"></script>
  <script src="/pad/js/pad.js"></script>
  <script src="/guide/js/beach-conditions.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
    // Token gate — runs before pad.js initialises controls
    (function () {
      var parts = window.location.pathname.split('/').filter(Boolean);
      var token = parts[parts.length - 1];

      // No token or URL is just /guest
      if (!token || token === 'guest') {
        showExpired();
        return;
      }

      fetch('/api/guest-token?token=' + encodeURIComponent(token))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.valid) {
            document.getElementById('guest-gate').style.display = 'none';
            document.getElementById('guest-content').style.display = '';
          } else {
            showExpired();
          }
        })
        .catch(function () {
          document.getElementById('gate-title').textContent = 'Unable to verify access';
          document.getElementById('gate-sub').textContent = 'Please check your connection and try again.';
          document.getElementById('gate-spinner').style.display = 'none';
        });

      function showExpired() {
        document.getElementById('gate-spinner').style.display = 'none';
        document.getElementById('gate-title').textContent = 'This link is no longer active.';
        document.getElementById('gate-sub').textContent = 'Contact your host if you believe this is an error.';
      }
    })();
  </script>
  <script>
    // QR code — only runs if gate passed (content visible)
    (function () {
      var qrEl = document.getElementById('wifi-qr');
      if (!qrEl || typeof QRCode === 'undefined') return;
      // Wait for content to be shown before generating QR
      var observer = new MutationObserver(function () {
        if (document.getElementById('guest-content').style.display !== 'none') {
          var ssid = (typeof CONFIG !== 'undefined' && CONFIG.quick_info) ? CONFIG.quick_info.wifi_name : 'NSB Retreat';
          var pass = (typeof CONFIG !== 'undefined' && CONFIG.quick_info) ? CONFIG.quick_info.wifi_password : '';
          new QRCode(qrEl, { text: 'WIFI:T:WPA;S:' + ssid + ';P:' + pass + ';;', width: 160, height: 160, colorDark: '#2d2926', colorLight: '#f9ece8' });
          observer.disconnect();
        }
      });
      observer.observe(document.getElementById('guest-content'), { attributes: true, attributeFilter: ['style'] });
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add guest/index.html
git commit -m "feat: guest access page with token gate"
```

---

## Task 5: Admin — Guest Links Section

**Files:**
- Modify: `admin.html`

This task adds CSS, HTML, and JS to `admin.html`. The existing file has three zones: `<style>` block (in `<head>`), dashboard HTML (after the Guestbook section), and `<script>` block. All additions go in those exact spots.

- [ ] **Step 1: Add CSS to the `<style>` block**

Inside `admin.html`, find the closing `</style>` tag (line ~151) and insert immediately before it:

```css
    /* ── Guest Links ── */
    .gl-toolbar { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
    .btn-new-link {
      background: var(--charcoal); color: var(--white); border: none;
      border-radius: var(--radius-sm); padding: 0.5rem 1.125rem;
      font-family: var(--font-sans); font-size: 0.78rem; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-new-link:hover { opacity: 0.85; }
    .gl-create-form {
      background: var(--white); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: 1.25rem 1.5rem;
      margin-bottom: 1rem; display: none;
    }
    .gl-create-form.show { display: block; }
    .gl-form-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 0.875rem; }
    .gl-field { display: flex; flex-direction: column; gap: 0.375rem; flex: 1; min-width: 180px; }
    .gl-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--charcoal-light); }
    .gl-input {
      border: 1.5px solid var(--tan); border-radius: var(--radius-sm);
      padding: 0.625rem 0.875rem; font-family: var(--font-sans); font-size: 0.875rem;
      color: var(--charcoal); background: var(--white); outline: none;
      transition: border-color 0.15s; width: 100%;
    }
    .gl-input:focus { border-color: var(--accent); }
    .gl-table-wrap { overflow-x: auto; }
    .gl-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .gl-table th {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--charcoal-light); border-bottom: 1.5px solid var(--tan);
      padding: 0.5rem 0.875rem; text-align: left; white-space: nowrap;
    }
    .gl-table td { padding: 0.875rem 0.875rem; border-bottom: 1px solid var(--sand); vertical-align: top; }
    .gl-table tr.gl-expired td { opacity: 0.55; }
    .gl-exp-past { color: #b91c1c; font-size: 0.82rem; }
    .gl-exp-ok { font-size: 0.82rem; }
    .gl-url-text { font-family: monospace; font-size: 0.75rem; color: var(--charcoal-light); word-break: break-all; }
    .gl-actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .btn-gl {
      border-radius: var(--radius-sm); padding: 0.3rem 0.7rem;
      font-family: var(--font-sans); font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; transition: background 0.15s;
    }
    .btn-gl-copy { background: rgba(107,100,96,0.1); color: var(--charcoal-light); border: 1px solid rgba(107,100,96,0.25); }
    .btn-gl-copy:hover { background: rgba(107,100,96,0.2); }
    .btn-gl-edit { background: rgba(184,150,126,0.12); color: var(--accent); border: 1px solid rgba(184,150,126,0.3); }
    .btn-gl-edit:hover { background: rgba(184,150,126,0.22); }
    .btn-gl-del { background: rgba(220,53,69,0.08); color: #b91c1c; border: 1px solid rgba(220,53,69,0.25); }
    .btn-gl-del:hover { background: rgba(220,53,69,0.16); }
    .gl-edit-row { display: none; margin-top: 0.5rem; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .gl-edit-row.show { display: flex; }
    .gl-input-sm {
      border: 1.5px solid var(--tan); border-radius: var(--radius-sm);
      padding: 0.4rem 0.625rem; font-family: var(--font-sans); font-size: 0.8rem;
      color: var(--charcoal); outline: none; transition: border-color 0.15s;
    }
    .gl-input-sm:focus { border-color: var(--accent); }
    .gl-copy-flash {
      position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
      background: var(--charcoal); color: var(--white);
      padding: 0.5rem 1.25rem; border-radius: 999px;
      font-size: 0.82rem; opacity: 0; pointer-events: none;
      transition: opacity 0.2s;
    }
    .gl-copy-flash.show { opacity: 1; }
```

- [ ] **Step 2: Add HTML for the Guest Links section**

Inside `admin.html`, find the closing `</div>` of the dashboard (the line just before `</div>` that closes `<div class="dashboard" id="dashboard">`), and insert before it:

```html
    <!-- Guest Links -->
    <div class="dash-section">
      <h2 class="dash-section-title">Guest Links</h2>
    </div>
    <div class="gl-toolbar">
      <button class="btn-new-link" id="btn-new-link" onclick="toggleCreateForm()">+ New Link</button>
    </div>
    <div class="gl-create-form" id="gl-create-form">
      <div class="gl-form-row">
        <div class="gl-field">
          <label class="gl-label" for="gl-new-label">Label</label>
          <input class="gl-input" type="text" id="gl-new-label" placeholder="e.g. Smith Family June 2026">
        </div>
        <div class="gl-field">
          <label class="gl-label" for="gl-new-expires">Expires (checkout date &amp; time)</label>
          <input class="gl-input" type="datetime-local" id="gl-new-expires">
        </div>
      </div>
      <div style="display:flex;gap:0.5rem">
        <button class="btn-primary" style="margin-top:0;padding:0.5rem 1.25rem;font-size:0.82rem" onclick="createToken()">Create Link</button>
        <button class="btn-delete" style="padding:0.5rem 1rem" onclick="toggleCreateForm()">Cancel</button>
      </div>
    </div>
    <div id="gl-list"><div class="dash-loading">Loading&hellip;</div></div>
    <div class="gl-copy-flash" id="gl-copy-flash">Link copied!</div>
```

- [ ] **Step 3: Add JS functions**

Inside `admin.html`, find `function showDashboard()` and add `loadTokens();` at the end of it (after `loadGuestbook();`):

```js
    function showDashboard() {
      document.getElementById('login-wrap').style.display = 'none';
      document.getElementById('dashboard').classList.add('visible');
      document.getElementById('btn-logout').style.display = 'block';
      loadFeedback();
      loadGuestbook();
      loadTokens();   // ← add this line
    }
```

Then add these functions at the end of the `<script>` block, before the closing `</script>` tag:

```js
    // ── Guest Links ──────────────────────────────────────────────────────────

    function genToken() {
      var bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function toggleCreateForm() {
      document.getElementById('gl-create-form').classList.toggle('show');
    }

    async function loadTokens() {
      var list = document.getElementById('gl-list');
      list.innerHTML = '<div class="dash-loading">Loading&hellip;</div>';
      var _a = await sb.from('guest_tokens').select('*').order('created_at', { ascending: false });
      if (_a.error) { list.innerHTML = '<p style="color:#b91c1c;font-size:0.875rem;padding:1rem 0">Failed to load.</p>'; return; }
      var data = _a.data || [];
      if (data.length === 0) { list.innerHTML = '<p style="color:var(--charcoal-light);font-size:0.875rem;padding:1rem 0">No guest links yet.</p>'; return; }
      var now = Date.now();
      var rows = data.map(function(r) {
        var expired = new Date(r.expires_at).getTime() <= now;
        var expStr = new Date(r.expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        var url = 'https://nsbretreat.com/guest/' + r.token;
        return '<tr class="' + (expired ? 'gl-expired' : '') + '">'
          + '<td><strong style="font-size:0.875rem">' + esc(r.label) + '</strong></td>'
          + '<td><span class="' + (expired ? 'gl-exp-past' : 'gl-exp-ok') + '">' + expStr + (expired ? ' (expired)' : '') + '</span>'
          + '<div class="gl-edit-row" id="gl-edit-' + r.id + '">'
          + '<input class="gl-input-sm" type="datetime-local" id="gl-dt-' + r.id + '">'
          + '<button class="btn-gl btn-gl-edit" onclick="saveExpiry(\'' + r.id + '\')">Save</button>'
          + '<button class="btn-gl btn-gl-copy" onclick="cancelEdit(\'' + r.id + '\')">Cancel</button>'
          + '</div></td>'
          + '<td><span class="gl-url-text">' + url + '</span></td>'
          + '<td><div class="gl-actions">'
          + '<button class="btn-gl btn-gl-copy" onclick="copyLink(\'' + r.token + '\')">Copy</button>'
          + '<button class="btn-gl btn-gl-edit" onclick="editExpiry(\'' + r.id + '\',\'' + r.expires_at + '\')">Edit</button>'
          + '<button class="btn-gl btn-gl-del" onclick="deleteToken(\'' + r.id + '\')">Delete</button>'
          + '</div></td>'
          + '</tr>';
      }).join('');
      list.innerHTML = '<div class="gl-table-wrap"><table class="gl-table"><thead><tr><th>Label</th><th>Expires</th><th>Link</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    async function createToken() {
      var label = document.getElementById('gl-new-label').value.trim();
      var expires = document.getElementById('gl-new-expires').value;
      if (!label || !expires) { alert('Label and expiry date are required.'); return; }
      var token = genToken();
      var _a = await sb.from('guest_tokens').insert({ token: token, label: label, expires_at: new Date(expires).toISOString() });
      if (_a.error) { alert('Error: ' + _a.error.message); return; }
      document.getElementById('gl-new-label').value = '';
      document.getElementById('gl-new-expires').value = '';
      document.getElementById('gl-create-form').classList.remove('show');
      loadTokens();
    }

    function editExpiry(id, currentExpiry) {
      var editRow = document.getElementById('gl-edit-' + id);
      editRow.classList.add('show');
      var d = new Date(currentExpiry);
      var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      document.getElementById('gl-dt-' + id).value = local;
    }

    function cancelEdit(id) {
      document.getElementById('gl-edit-' + id).classList.remove('show');
    }

    async function saveExpiry(id) {
      var val = document.getElementById('gl-dt-' + id).value;
      if (!val) return;
      var _a = await sb.from('guest_tokens').update({ expires_at: new Date(val).toISOString() }).eq('id', id);
      if (_a.error) { alert('Error: ' + _a.error.message); return; }
      loadTokens();
    }

    async function deleteToken(id) {
      if (!confirm('Delete this link? Anyone using it will lose access immediately.')) return;
      var _a = await sb.from('guest_tokens').delete().eq('id', id);
      if (_a.error) { alert('Error: ' + _a.error.message); return; }
      loadTokens();
    }

    function copyLink(token) {
      var url = 'https://nsbretreat.com/guest/' + token;
      navigator.clipboard.writeText(url).then(function() {
        var flash = document.getElementById('gl-copy-flash');
        flash.classList.add('show');
        setTimeout(function() { flash.classList.remove('show'); }, 2000);
      });
    }
```

- [ ] **Step 4: Commit**

```bash
git add admin.html
git commit -m "feat: guest links management section in admin dashboard"
```

---

## Task 6: Deploy and Verify

- [ ] **Step 1: Push everything**

```bash
git push
```

Wait ~60 seconds for Vercel to build and deploy.

- [ ] **Step 2: Verify expired/invalid token shows dead-end screen**

Open in browser: `https://nsbretreat.com/guest/doesnotexist`

Expected: spinner briefly, then "This link is no longer active." — no controls visible.

- [ ] **Step 3: Create a test token via admin**

Open `https://nsbretreat.com/admin.html`, log in, scroll to Guest Links, click "+ New Link".
- Label: `Test Token`
- Expires: set to 1 hour from now

Click Create. The token appears in the table. Click Copy.

- [ ] **Step 4: Verify valid token shows full controls**

Open the copied URL in browser.

Expected: spinner briefly, then full pad page renders with Pool & Spa controls, Beach, WiFi, all sections.

- [ ] **Step 5: Verify token validation API directly**

```bash
# Should return {"valid":false,"reason":"not_found"}
curl "https://nsbretreat.com/api/guest-token?token=bad"

# Should return {"valid":true,"label":"Test Token"}  (use actual token from Step 3)
curl "https://nsbretreat.com/api/guest-token?token=PASTE_TOKEN_HERE"
```

- [ ] **Step 6: Verify edit expiry works**

In admin, click Edit on the test token, set expiry to 1 minute in the past, click Save. Reload the guest URL — should now show "This link is no longer active."

Reset expiry to the future, confirm page becomes accessible again.

- [ ] **Step 7: Verify `/pad` is completely unchanged**

Open `https://nsbretreat.com/pad` — controls should load normally with no token gate.
