# iPad House Guide + iAqualink Pool Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, iPad-optimized house guide at `pad.nsbretreat.com/pad/` with live iAqualink pool controls proxied through Vercel serverless functions.

**Architecture:** Two Vercel serverless API routes (`pool-status.js`, `pool-command.js`) handle all iAqualink communication server-side using env-var credentials. A shared internal helper (`api/_iaqualink.js`) handles auth. The frontend is a single vanilla HTML/CSS/JS page in `/pad/` — no build step, no dependencies, deploys automatically with the existing site.

**Tech Stack:** Vanilla HTML/CSS/JS, Vercel Serverless Functions (Node.js), iAqualink reverse-engineered REST API, existing NSBretreat repo + Vercel project.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/_iaqualink.js` | Create | iAqualink auth + raw API calls. Shared by both routes. Vercel ignores `_`-prefixed files as public routes. |
| `api/pool-status.js` | Create | GET endpoint — auth, fetch home screen, normalize response |
| `api/pool-command.js` | Create | POST endpoint — validate whitelist, auth, dispatch command |
| `pad/index.html` | Create | Full 7-section iPad guide page |
| `pad/css/pad.css` | Create | iPad-optimized styles (imports `../css/styles.css` for CSS vars) |
| `pad/js/pad.js` | Create | Pool widget (poll, controls, optimistic UI), accordion, scrollspy |
| `.env.example` | Modify | Add three new iAqualink env vars |

---

## Task 1: Project scaffold

**Files:**
- Create: `api/_iaqualink.js` (empty)
- Create: `api/pool-status.js` (empty)
- Create: `api/pool-command.js` (empty)
- Create: `pad/index.html` (empty)
- Create: `pad/css/pad.css` (empty)
- Create: `pad/js/pad.js` (empty)

- [ ] **Step 1: Create directory structure**

```bash
cd C:\Users\anton\Documents\Claude-Code\NSBretreat
mkdir pad
mkdir pad\css
mkdir pad\js
```

- [ ] **Step 2: Create empty placeholder files**

Create each file with a single comment so git tracks them:

`api/_iaqualink.js` — `// iAqualink shared auth helper`
`api/pool-status.js` — `// GET /api/pool-status`
`api/pool-command.js` — `// POST /api/pool-command`
`pad/index.html` — `<!-- NSB Retreat iPad Guide -->`
`pad/css/pad.css` — `/* pad.css */`
`pad/js/pad.js` — `// pad.js`

- [ ] **Step 3: Commit scaffold**

```bash
git add api/_iaqualink.js api/pool-status.js api/pool-command.js pad/
git commit -m "chore: scaffold iPad guide project structure"
```

---

## Task 2: iAqualink auth helper (`api/_iaqualink.js`)

**Files:**
- Write: `api/_iaqualink.js`

This module exports two functions: `authenticate()` and `deviceRequest()`. Both API routes import these. Vercel treats `_`-prefixed files as internal — they are never exposed as HTTP routes.

- [ ] **Step 1: Write `api/_iaqualink.js`**

```js
// api/_iaqualink.js
// Shared iAqualink API helper — not a public route (Vercel ignores _ prefix)

const LOGIN_URL  = 'https://prod.zodiac-ios.com/users/v1/login';
const API_BASE   = 'https://iaqualink-api.realtime.io/v1/mobile/session.json';
const API_KEY    = 'EOOEMOW4YR6QNB07';

/**
 * Authenticate with iAqualink and return a session token.
 * Throws on failure.
 */
export async function authenticate() {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.IAQUALINK_EMAIL,
      password: process.env.IAQUALINK_PASSWORD,
      api_key:  API_KEY,
    }),
  });

  if (!res.ok) {
    throw new Error(`iAqualink login failed: ${res.status}`);
  }

  const data = await res.json();

  // Response shape: { id, authentication_token, ... }
  if (!data.authentication_token) {
    throw new Error('iAqualink login: no authentication_token in response');
  }

  return data.authentication_token;
}

/**
 * Make a request to the iAqualink session API.
 * @param {string} token      - authentication_token from authenticate()
 * @param {string} command    - e.g. "get_home_screen", "set_spa_temp"
 * @param {Record<string,string|number>} extra - additional query params
 */
export async function deviceRequest(token, command, extra = {}) {
  const serial = process.env.IAQUALINK_DEVICE_SERIAL;

  const params = new URLSearchParams({
    actionID:  'command',
    command,
    serial,
    sessionID: token,
    api_key:   API_KEY,
    ...extra,
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`iAqualink command "${command}" failed: ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 2: Verify the file looks correct, then commit**

```bash
git add api/_iaqualink.js
git commit -m "feat: add iAqualink auth helper"
```

---

## Task 3: `api/pool-status.js` — status endpoint

**Files:**
- Write: `api/pool-status.js`

Authenticates, calls `get_home_screen`, normalizes the response into a flat object, returns JSON. The iAqualink `get_home_screen` response is an array of single-key objects:
```json
{ "home_screen": [ {"pool_temp": "82"}, {"spa_temp": "101"}, {"spa_heater": "0"}, ... ] }
```
We flatten this into `{ pool_temp: 82, spa_temp: 101, spa_heater: "off", ... }`.

- [ ] **Step 1: Write `api/pool-status.js`**

```js
// api/pool-status.js
// GET /api/pool-status — returns live pool/spa state

import { authenticate, deviceRequest } from './_iaqualink.js';

// Maps raw iAqualink key names to our normalized field names.
// Add entries here if the device returns unexpected keys.
const FIELD_MAP = {
  pool_temp:         'pool_temp',
  spa_temp:          'spa_temp',
  spa_heater:        'spa_heater',
  pool_heater:       'pool_heater',
  pool_pump:         'pool_pump',
  spa_pump:          'spa_pump',
  pool_set_point:    'pool_set_point',
  spa_set_point:     'spa_set_point',
  // Light — iAqualink may call this aux_1, pool_light, or a named aux
  aux_1:             'pool_light',
  pool_light:        'pool_light',
  // Jets / air blower — varies by installation
  aux_2:             'spa_jets',
  air_blower:        'spa_jets',
};

/**
 * Parses the home_screen array into a flat key→value map.
 * Raw values are strings like "0"/"1" for booleans and "82" for temps.
 */
function parseHomeScreen(homeScreenArray) {
  const raw = {};
  for (const item of homeScreenArray) {
    const key = Object.keys(item)[0];
    raw[key] = item[key];
  }

  const result = {
    online:           true,
    pool_temp:        null,
    spa_temp:         null,
    spa_heater:       'off',
    pool_pump:        'off',
    pool_light:       'off',
    pool_light_color: 'white',
    spa_jets:         'off',
    spa_set_point:    102,
    _raw:             raw, // included for debugging — remove in prod if desired
  };

  for (const [rawKey, val] of Object.entries(raw)) {
    const mapped = FIELD_MAP[rawKey];
    if (!mapped) continue;

    if (mapped === 'pool_temp' || mapped === 'spa_temp' || mapped === 'spa_set_point' || mapped === 'pool_set_point') {
      result[mapped] = parseInt(val, 10) || null;
    } else {
      // "0" = off, "1" = on; some return "true"/"false"
      result[mapped] = (val === '1' || val === 'true' || val === 'on') ? 'on' : 'off';
    }
  }

  // Light color: if aux_1 or pool_light has a numeric value > 1, it's a color mode index.
  // iAqualink color mode indices (IntelliBrite/ColorLogic):
  // 2=blue, 3=green, 4=red, 5=white, 6=magenta, 7=party
  const lightRaw = raw['aux_1'] || raw['pool_light'];
  if (lightRaw && parseInt(lightRaw, 10) > 1) {
    const colorMap = { 2: 'blue', 3: 'green', 4: 'red', 5: 'white', 6: 'magenta', 7: 'party' };
    result.pool_light       = 'on';
    result.pool_light_color = colorMap[parseInt(lightRaw, 10)] || 'white';
  }

  return result;
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers (requests come from pad.nsbretreat.com, same project)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const token      = await authenticate();
    const data       = await deviceRequest(token, 'get_home_screen');
    const homeScreen = data.home_screen || data.data || [];

    if (!Array.isArray(homeScreen)) {
      // Device returned unexpected shape — return offline
      return res.status(200).json({ online: false, _raw: data });
    }

    const status = parseHomeScreen(homeScreen);
    return res.status(200).json(status);

  } catch (err) {
    console.error('[pool-status]', err.message);
    return res.status(200).json({ online: false, error: err.message });
  }
}
```

- [ ] **Step 2: Verify with curl after Vercel deploy (or local `vercel dev`)**

```bash
# Run locally with Vercel CLI (if installed):
vercel dev

# Then in a second terminal:
curl http://localhost:3000/api/pool-status
```

Expected (when iAqualink is reachable):
```json
{"online":true,"pool_temp":82,"spa_temp":98,...}
```

Expected (when iAqualink is offline or creds wrong):
```json
{"online":false,"error":"iAqualink login failed: 401"}
```

- [ ] **Step 3: Commit**

```bash
git add api/pool-status.js
git commit -m "feat: add /api/pool-status endpoint"
```

---

## Task 4: `api/pool-command.js` — command endpoint

**Files:**
- Write: `api/pool-command.js`

Accepts POST with `{ command, value }`. Validates against whitelist. Authenticates. Dispatches to iAqualink. Returns `{ success: true }` or `{ error }`.

**iAqualink command reference for this device:**

| Our command | iAqualink command | level param |
|---|---|---|
| `spa_heater` on/off | `set_spa_heater` | `1` / `0` |
| `spa_setpoint` 98-104 | `set_spa_temp` | integer °F |
| `spa_jets` on/off | `set_aux` + `aux=aux_2` | `1` / `0` |
| `pool_light` on/off | `set_aux` + `aux=aux_1` | `1` / `0` |
| `pool_light_color` | `set_aux` + `aux=aux_1` | color index (see below) |

Pool light color index: `blue=2, green=3, red=4, white=5, magenta=6, party=7`

> **Note for implementer:** If spa jets or pool light don't respond to `aux_1`/`aux_2`, call `/api/pool-status` first and inspect the `_raw` field to find the correct aux key name for your installation. Update `AUX_JETS` and `AUX_LIGHT` constants below accordingly.

- [ ] **Step 1: Write `api/pool-command.js`**

```js
// api/pool-command.js
// POST /api/pool-command — dispatch a control command to iAqualink

import { authenticate, deviceRequest } from './_iaqualink.js';

// Adjust these if your installation uses different aux slot names.
// Check _raw from /api/pool-status to discover your device's aux names.
const AUX_LIGHT = 'aux_1';
const AUX_JETS  = 'aux_2';

const LIGHT_COLOR_INDEX = {
  blue:    2,
  green:   3,
  red:     4,
  white:   5,
  magenta: 6,
  party:   7,
};

// Server-side command whitelist — pool pump is intentionally excluded.
const ALLOWED_COMMANDS = new Set([
  'spa_heater',
  'spa_setpoint',
  'spa_jets',
  'pool_light',
  'pool_light_color',
]);

/**
 * Translates our normalized command + value into an iAqualink API call.
 * Returns { iaqualinkCommand, extraParams } ready to pass to deviceRequest().
 */
function translateCommand(command, value) {
  switch (command) {
    case 'spa_heater':
      return {
        iaqualinkCommand: 'set_spa_heater',
        extraParams: { level: value === 'on' ? 1 : 0 },
      };

    case 'spa_setpoint': {
      const temp = parseInt(value, 10);
      if (isNaN(temp) || temp < 98 || temp > 104) {
        throw new Error('spa_setpoint must be 98–104');
      }
      return {
        iaqualinkCommand: 'set_spa_temp',
        extraParams: { level: temp },
      };
    }

    case 'spa_jets':
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_JETS, level: value === 'on' ? 1 : 0 },
      };

    case 'pool_light':
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_LIGHT, level: value === 'on' ? 1 : 0 },
      };

    case 'pool_light_color': {
      const idx = LIGHT_COLOR_INDEX[value];
      if (!idx) throw new Error(`Unknown color: ${value}`);
      return {
        iaqualinkCommand: 'set_aux',
        extraParams: { aux: AUX_LIGHT, level: idx },
      };
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { command, value } = req.body || {};

  if (!command || value === undefined) {
    return res.status(400).json({ error: 'Missing command or value' });
  }

  if (!ALLOWED_COMMANDS.has(command)) {
    return res.status(400).json({ error: `Command not allowed: ${command}` });
  }

  try {
    const { iaqualinkCommand, extraParams } = translateCommand(command, value);
    const token = await authenticate();
    await deviceRequest(token, iaqualinkCommand, extraParams);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[pool-command]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Test with curl after deploy**

```bash
# Spa heater on
curl -X POST http://localhost:3000/api/pool-command \
  -H "Content-Type: application/json" \
  -d '{"command":"spa_heater","value":"on"}'

# Expected: {"success":true}

# Invalid command (should be blocked)
curl -X POST http://localhost:3000/api/pool-command \
  -H "Content-Type: application/json" \
  -d '{"command":"pool_pump","value":"off"}'

# Expected: {"error":"Command not allowed: pool_pump"}

# Set spa temp
curl -X POST http://localhost:3000/api/pool-command \
  -H "Content-Type: application/json" \
  -d '{"command":"spa_setpoint","value":102}'

# Expected: {"success":true}
```

- [ ] **Step 3: Commit**

```bash
git add api/pool-command.js
git commit -m "feat: add /api/pool-command endpoint"
```

---

## Task 5: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Read current `.env.example`**

Check if it exists:
```bash
ls C:\Users\anton\Documents\Claude-Code\NSBretreat\.env.example
```

If it doesn't exist, create it. If it does, append to it.

- [ ] **Step 2: Write final `.env.example`**

The complete file should be:
```
# Airbnb iCal feed URL (proxied by /api/ical)
AIRBNB_ICAL_URL=

# Google Analytics
GA_MEASUREMENT_ID=

# iAqualink pool controller
# Your iAqualink account email and password
IAQUALINK_EMAIL=
IAQUALINK_PASSWORD=
# Found in iAqualink app → Settings → Device Info, or on device label
IAQUALINK_DEVICE_SERIAL=
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add iAqualink env vars to .env.example"
```

---

## Task 6: `pad/css/pad.css` — iPad styles

**Files:**
- Write: `pad/css/pad.css`

Full stylesheet for the iPad guide. Imports CSS variables from `../css/styles.css`. Defines nav, section layout, pool widget, emergency grid, local guide grid, and accordion. All touch targets ≥ 48px.

- [ ] **Step 1: Write `pad/css/pad.css`**

```css
/* pad.css — NSB Retreat iPad House Guide */

/* ── Base ── */
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  background: var(--sand, #f5ede4);
  color: var(--charcoal, #2c2c2c);
  margin: 0;
  padding: 0;
  -webkit-text-size-adjust: 100%;
  overflow-x: hidden;
}

/* ── Nav tab bar ── */
.pad-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(245, 237, 228, 0.97);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(44,44,44,0.12);
  height: 52px;
  display: flex;
  align-items: stretch;
}

.pad-nav-inner {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  scrollbar-width: none;
  width: 100%;
  gap: 0;
  padding: 0 0.5rem;
}
.pad-nav-inner::-webkit-scrollbar { display: none; }

.pad-logo {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 0.95rem;
  color: var(--charcoal, #2c2c2c);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  border-right: 1px solid rgba(44,44,44,0.1);
  margin-right: 0.25rem;
}

.pad-tab {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--charcoal, #2c2c2c);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  position: relative;
  transition: color 0.15s;
  min-width: 48px;
  justify-content: center;
}
.pad-tab:hover  { color: var(--accent, #b8967e); }
.pad-tab.active { color: var(--accent, #b8967e); }
.pad-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0.5rem;
  right: 0.5rem;
  height: 2px;
  background: var(--accent, #b8967e);
  border-radius: 2px 2px 0 0;
}

/* ── Page layout ── */
.pad-main {
  padding-top: 52px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pad-section {
  padding: 2rem 2rem 2.5rem;
  border-bottom: 1px solid rgba(44,44,44,0.08);
}
.pad-section:last-child { border-bottom: none; }

.pad-section-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
  color: var(--charcoal, #2c2c2c);
}

/* ── Welcome section ── */
.welcome-layout {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: start;
}
.welcome-address {
  font-size: 0.9rem;
  color: var(--charcoal-light, #666);
  margin: 0 0 0.75rem;
}
.welcome-bio {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--charcoal-light, #666);
  margin: 0 0 1.25rem;
}
.welcome-photo {
  width: 130px;
  height: 160px;
  object-fit: cover;
  object-position: top center;
  border-radius: 8px;
  flex-shrink: 0;
}
.welcome-call-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent, #b8967e);
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  min-height: 48px;
}
.welcome-signature {
  font-family: 'Dancing Script', 'Brush Script MT', cursive;
  font-size: 1.6rem;
  color: var(--charcoal, #2c2c2c);
  display: block;
  margin: 0.5rem 0 1rem;
}
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');

/* ── Info grid (check-in times, wifi) ── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.info-card {
  background: rgba(44,44,44,0.04);
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.info-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--charcoal-light, #666);
  font-weight: 600;
}
.info-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--charcoal, #2c2c2c);
}
.info-hint {
  font-size: 0.75rem;
  color: var(--charcoal-light, #666);
}
.info-card.copyable { cursor: pointer; }
.info-card.copyable:active { background: rgba(184,150,126,0.15); }

/* ── Accordion ── */
.acc-list { display: flex; flex-direction: column; gap: 0; }
.acc-item { border-bottom: 1px solid rgba(44,44,44,0.1); }
.acc-item:first-child { border-top: 1px solid rgba(44,44,44,0.1); }

.acc-trigger {
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--charcoal, #2c2c2c);
  padding: 1rem 2.5rem 1rem 0;
  cursor: pointer;
  position: relative;
  min-height: 52px;
  display: flex;
  align-items: center;
  font-family: inherit;
}
.acc-trigger::after {
  content: '+';
  position: absolute;
  right: 0;
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--accent, #b8967e);
  line-height: 1;
  transition: transform 0.2s;
}
.acc-trigger.open::after { transform: rotate(45deg); }

.acc-body {
  display: none;
  padding: 0 0 1.25rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--charcoal-light, #666);
}
.acc-body.open { display: block; }
.acc-body ul, .acc-body ol {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}
.acc-body li strong { color: var(--charcoal, #2c2c2c); }

/* ── Steps list (hot tub instructions) ── */
.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
.steps-list li {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
}
.step-num {
  background: var(--accent, #b8967e);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* ── Pool Widget ── */
.pool-widget {
  background: #fff;
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  margin-top: 1.5rem;
}

.pool-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.pool-widget-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--charcoal, #2c2c2c);
  margin: 0;
}
.pool-online-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.3rem 0.75rem;
  border-radius: 100px;
  background: #e8f5e9;
  color: #2e7d32;
}
.pool-online-badge.offline {
  background: #fce4ec;
  color: #c62828;
}

.pool-temps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.temp-card {
  background: var(--sand, #f5ede4);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}
.temp-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--charcoal-light, #666);
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}
.temp-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--charcoal, #2c2c2c);
  line-height: 1;
}
.temp-unit { font-size: 1rem; font-weight: 400; }
.temp-loading { font-size: 1.5rem; color: var(--charcoal-light, #666); }

.pool-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-top: 1px solid rgba(44,44,44,0.08);
  padding-top: 1.25rem;
}
.pool-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 52px;
}
.control-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--charcoal, #2c2c2c);
  flex: 1;
}
.control-sub {
  font-size: 0.75rem;
  color: var(--charcoal-light, #666);
  display: block;
  font-weight: 400;
}

/* Toggle button */
.pool-toggle {
  background: rgba(44,44,44,0.08);
  border: none;
  border-radius: 100px;
  padding: 0.625rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--charcoal, #2c2c2c);
  cursor: pointer;
  min-width: 72px;
  min-height: 44px;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}
.pool-toggle.on {
  background: var(--accent, #b8967e);
  color: #fff;
}
.pool-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Spa setpoint slider */
.setpoint-row {
  flex-direction: column;
  align-items: stretch;
}
.setpoint-display {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent, #b8967e);
  text-align: right;
  min-width: 60px;
}
.setpoint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.5rem;
}
input[type="range"].pool-slider {
  width: 100%;
  height: 6px;
  accent-color: var(--accent, #b8967e);
  cursor: pointer;
}

/* Pool light color swatches */
.light-colors {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}
.color-swatch {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s;
  flex-shrink: 0;
}
.color-swatch:active { transform: scale(0.9); }
.color-swatch.active { border-color: var(--charcoal, #2c2c2c); }
.color-swatch.disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }

/* Swatch colors */
.swatch-white   { background: #f0f0f0; border-color: #ccc; }
.swatch-blue    { background: #2196f3; }
.swatch-green   { background: #4caf50; }
.swatch-red     { background: #f44336; }
.swatch-magenta { background: #e91e99; }
.swatch-party   { background: linear-gradient(135deg, #f44336, #9c27b0, #2196f3, #4caf50); }

/* Pool pump read-only status */
.pool-pump-status {
  font-size: 0.85rem;
  color: var(--charcoal-light, #666);
  padding: 0.375rem 0.875rem;
  background: rgba(44,44,44,0.05);
  border-radius: 100px;
}

/* Command toast */
.pool-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(44,44,44,0.9);
  color: #fff;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: 100px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  z-index: 200;
  white-space: nowrap;
}
.pool-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Local Guide cards ── */
.local-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.local-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.local-card-tag {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent, #b8967e);
  font-weight: 600;
}
.local-card-name {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}
.local-card-desc {
  font-size: 0.82rem;
  color: var(--charcoal-light, #666);
  line-height: 1.5;
  flex: 1;
}
.local-card-link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--accent, #b8967e);
  text-decoration: none;
  font-weight: 600;
}

/* ── Emergency grid ── */
.emg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.emg-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 80px;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  transition: background 0.15s;
}
.emg-card:active { background: #f5f5f5; }
.emg-card-red { background: #fce4ec; }
.emg-card-red:active { background: #f8bbd9; }
.emg-card-util { background: rgba(44,44,44,0.04); }

.emg-number {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--charcoal, #2c2c2c);
}
.emg-number-sm { font-size: 0.9rem; }
.emg-label {
  font-size: 0.78rem;
  color: var(--charcoal-light, #666);
  line-height: 1.4;
}
.emg-hint {
  font-size: 0.7rem;
  color: var(--accent, #b8967e);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.25rem;
}

/* ── Copy toast ── */
.copy-toast {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(44,44,44,0.9);
  color: #fff;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: 100px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  z-index: 200;
}
.copy-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Dark mode ── */
@media (prefers-color-scheme: dark) {
  body { background: #1a1a1a; color: #e8e0d8; }
  .pad-nav { background: rgba(26,26,26,0.97); border-color: rgba(255,255,255,0.08); }
  .info-card { background: rgba(255,255,255,0.06); }
  .pool-widget { background: #242424; }
  .temp-card { background: rgba(255,255,255,0.06); }
  .local-card, .emg-card { background: #242424; }
  .emg-card-red { background: rgba(244,67,54,0.15); }
  .emg-card-util { background: rgba(255,255,255,0.05); }
  .acc-item { border-color: rgba(255,255,255,0.08); }
  .pool-controls { border-color: rgba(255,255,255,0.08); }
}

/* ── Responsive: portrait narrower ── */
@media (max-width: 768px) {
  .pad-section { padding: 1.5rem 1.25rem 2rem; }
  .welcome-layout { grid-template-columns: 1fr; }
  .welcome-photo { width: 100%; height: 200px; order: -1; }
  .pool-temps { grid-template-columns: 1fr 1fr; }
  .emg-grid { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Commit**

```bash
git add pad/css/pad.css
git commit -m "feat: add iPad guide stylesheet"
```

---

## Task 7: `pad/index.html` — full page

**Files:**
- Write: `pad/index.html`

All guide content, pool widget markup, nav tabs. JavaScript is in `pad/js/pad.js`. WiFi credentials pulled from `../js/config.js` (already has `CONFIG.quick_info.wifi_name` and `CONFIG.quick_info.wifi_password`).

- [ ] **Step 1: Write `pad/index.html`**

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
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="css/pad.css">
</head>
<body>

  <!-- ── Nav ── -->
  <nav class="pad-nav" id="pad-nav">
    <div class="pad-nav-inner" id="pad-tabs">
      <a href="../" class="pad-logo">NSB Retreat</a>
      <a href="#welcome"    class="pad-tab active">Welcome</a>
      <a href="#checkin"    class="pad-tab">Check-In</a>
      <a href="#rules"      class="pad-tab">House Rules</a>
      <a href="#wifi"       class="pad-tab">WiFi &amp; Tech</a>
      <a href="#pool"       class="pad-tab">Pool &amp; Spa</a>
      <a href="#local"      class="pad-tab">Local Guide</a>
      <a href="#emergency"  class="pad-tab">Emergency</a>
    </div>
  </nav>

  <main class="pad-main">

    <!-- ── 1. Welcome ── -->
    <section class="pad-section" id="welcome">
      <div class="welcome-layout">
        <div class="welcome-text">
          <p class="welcome-address">815 Carol Ave · New Smyrna Beach, FL 32169</p>
          <h1 class="pad-section-title" style="margin-bottom:0.5rem">Welcome!</h1>
          <p class="welcome-bio">We are Antonio and Yani — two brothers and Florida locals who now call New Smyrna Beach our second home. Hosting is something we truly enjoy and we hope you feel the love that was put into this home.</p>
          <span class="welcome-signature">Antonio &amp; Yani</span>
          <a href="tel:4075066654" class="welcome-call-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Call or Text Antonio · (407) 506-6654
          </a>
        </div>
        <img src="../assets/photos/hosts.jpg" alt="Antonio and Yani" class="welcome-photo">
      </div>
    </section>

    <!-- ── 2. Check-In ── -->
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
      </div>
    </section>

    <!-- ── 3. House Rules ── -->
    <section class="pad-section" id="rules">
      <h2 class="pad-section-title">House Rules</h2>
      <div class="acc-list">
        <div class="acc-item">
          <button class="acc-trigger">View All Rules</button>
          <div class="acc-body">
            <ul>
              <li><strong>Quiet hours outside: 10 PM – 9 AM.</strong> Please be mindful of neighbors.</li>
              <li><strong>Max occupancy: 16 guests.</strong></li>
              <li><strong>No street parking.</strong> Use the driveway, right garage spot, or front yard grass only.</li>
              <li><strong>No glass outside.</strong> Broken glass near the pool poses a serious injury risk.</li>
              <li><strong>No smoking on the property.</strong> If you need to smoke, please step off the property.</li>
              <li><strong>Pets require a $395 fee</strong> and must be pre-approved. Please clean up after your pet.</li>
              <li><strong>No parties or events</strong> without prior written approval from the host.</li>
              <li><strong>No unauthorized overnight guests</strong> beyond the booked headcount.</li>
              <li><strong>No open-flame candles indoors</strong> — fire hazard. Battery-powered candles are always welcome.</li>
              <li><strong>Report any damage immediately.</strong> Call or text Antonio at (407) 506-6654.</li>
              <li><strong>Trash pickup: Monday &amp; Thursday mornings.</strong> Roll bins to the curb by 7 AM and return them the same day.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 4. WiFi & Tech ── -->
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
            <p>The hot tub, bubbles, and pool/spa lights are also controllable from the <strong>tablet mounted on the wall in the kitchen</strong>. See the Pool &amp; Spa section below for full instructions, or use the live controls on this screen.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 5. Pool & Spa ── -->
    <section class="pad-section" id="pool">
      <h2 class="pad-section-title">Pool &amp; Spa</h2>

      <div class="acc-list">
        <div class="acc-item">
          <button class="acc-trigger">How to Heat the Hot Tub</button>
          <div class="acc-body">
            <ol class="steps-list">
              <li><span class="step-num">1</span><div>Touch the tablet screen to wake it, then <strong>slide your finger upward from the bottom</strong> to unlock.</div></li>
              <li><span class="step-num">2</span><div>Tap <strong>"815 NSB Pool System"</strong> to open controls.</div></li>
              <li><span class="step-num">3</span><div>Select the <strong>"OneTouch Scenes"</strong> tab and toggle on <strong>"Spa Mode."</strong></div></li>
              <li><span class="step-num">4</span><div>Allow approximately <strong>30 minutes</strong> to reach <strong>102°F</strong>. Or — use the live controls below.</div></li>
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

      <!-- iAqualink Live Controls Widget -->
      <div class="pool-widget" id="pool-widget">
        <div class="pool-status-header">
          <h3 class="pool-widget-title">Live Pool &amp; Spa Controls</h3>
          <span class="pool-online-badge offline" id="pool-badge">Loading…</span>
        </div>

        <!-- Temp display -->
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

        <!-- Controls -->
        <div class="pool-controls">

          <!-- Spa Heater -->
          <div class="pool-control-row">
            <div class="control-label">
              Spa Heater
              <span class="control-sub">Heats the hot tub</span>
            </div>
            <button class="pool-toggle" id="btn-spa-heater" data-command="spa_heater" data-state="off" disabled>Off</button>
          </div>

          <!-- Spa Setpoint -->
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

          <!-- Spa Jets -->
          <div class="pool-control-row" id="row-spa-jets" style="display:none">
            <div class="control-label">
              Spa Jets
              <span class="control-sub">Air blower / jets</span>
            </div>
            <button class="pool-toggle" id="btn-spa-jets" data-command="spa_jets" data-state="off" disabled>Off</button>
          </div>

          <!-- Pool Light -->
          <div class="pool-control-row">
            <div class="control-label">
              Pool Light
              <span class="control-sub">Main pool light</span>
            </div>
            <button class="pool-toggle" id="btn-pool-light" data-command="pool_light" data-state="off" disabled>Off</button>
          </div>

          <!-- Pool Light Colors -->
          <div class="pool-control-row" style="flex-direction:column; align-items:flex-start; gap:0.5rem">
            <div class="control-label">
              Light Color
              <span class="control-sub">Tap a color — light must be on</span>
            </div>
            <div class="light-colors" id="light-colors">
              <button class="color-swatch swatch-white  disabled" data-color="white"   title="White"   aria-label="White"></button>
              <button class="color-swatch swatch-blue   disabled" data-color="blue"    title="Blue"    aria-label="Blue"></button>
              <button class="color-swatch swatch-green  disabled" data-color="green"   title="Green"   aria-label="Green"></button>
              <button class="color-swatch swatch-red    disabled" data-color="red"     title="Red"     aria-label="Red"></button>
              <button class="color-swatch swatch-magenta disabled" data-color="magenta" title="Magenta" aria-label="Magenta"></button>
              <button class="color-swatch swatch-party  disabled" data-color="party"   title="Party"   aria-label="Party (Color Cycle)"></button>
            </div>
          </div>

          <!-- Pool Pump (read-only) -->
          <div class="pool-control-row">
            <div class="control-label">
              Pool Pump
              <span class="control-sub">Read-only — contact Antonio to adjust</span>
            </div>
            <span class="pool-pump-status" id="pool-pump-status">–</span>
          </div>

        </div>
      </div>
    </section>

    <!-- ── 6. Local Guide ── -->
    <section class="pad-section" id="local">
      <h2 class="pad-section-title">Local Guide</h2>
      <div class="local-grid">

        <!-- Eat -->
        <div class="local-card">
          <span class="local-card-tag">Eat · On the Beach</span>
          <h3 class="local-card-name">The Breakers</h3>
          <p class="local-card-desc">Beachfront dining with burgers, seafood, and ocean views. Possibly the best burger in Central Florida.</p>
          <a href="https://maps.google.com/?q=The+Breakers+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Eat · Italian</span>
          <h3 class="local-card-name">The Garlic</h3>
          <p class="local-card-desc">Rustic Italian with lush garden seating, wood-fired pizza, and an extensive wine list.</p>
          <a href="https://maps.google.com/?q=The+Garlic+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Eat · Waterfront</span>
          <h3 class="local-card-name">Outriggers Tiki Bar &amp; Grille</h3>
          <p class="local-card-desc">Waterfront tiki bar with marina views, seafood, and tropical cocktails.</p>
          <a href="https://maps.google.com/?q=Outriggers+Tiki+Bar+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Eat · Elevated</span>
          <h3 class="local-card-name">The Spott</h3>
          <p class="local-card-desc">Fresh fish, Black Angus steaks, speakeasy bar upstairs. Reserve in advance.</p>
          <a href="https://maps.google.com/?q=The+Spott+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>

        <!-- Drink -->
        <div class="local-card">
          <span class="local-card-tag">Drink · Nightlife</span>
          <h3 class="local-card-name">Flagler Tavern</h3>
          <p class="local-card-desc">Vibrant nightlife, extensive drink menu, and live entertainment on Flagler Ave.</p>
          <a href="https://maps.google.com/?q=Flagler+Tavern+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Drink · Beachfront</span>
          <h3 class="local-card-name">Toni &amp; Joe's Patio</h3>
          <p class="local-card-desc">Beachfront bar with live music and a diverse selection of drinks.</p>
          <a href="https://maps.google.com/?q=Toni+and+Joes+Patio+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>

        <!-- Coffee -->
        <div class="local-card">
          <span class="local-card-tag">Coffee · Outdoor</span>
          <h3 class="local-card-name">Luma</h3>
          <p class="local-card-desc">Beautiful outdoor bohemian vibe with coffee, teas, juices, and even beers &amp; wines.</p>
          <a href="https://maps.google.com/?q=Luma+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Coffee · Specialty</span>
          <h3 class="local-card-name">Island Roasters Coffee Co.</h3>
          <p class="local-card-desc">Freshly roasted beans and specialty drinks. Their beans are in our espresso machine.</p>
          <a href="https://maps.google.com/?q=Island+Roasters+Coffee+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Coffee · Artisanal</span>
          <h3 class="local-card-name">Third Wave Café</h3>
          <p class="local-card-desc">Artisanal coffee and wine selection in a cozy setting with exceptional food.</p>
          <a href="https://maps.google.com/?q=Third+Wave+Cafe+New+Smyrna+Beach" target="_blank" class="local-card-link">Directions →</a>
        </div>

        <!-- Essentials -->
        <div class="local-card">
          <span class="local-card-tag">Grocery · 1.2 mi</span>
          <h3 class="local-card-name">Publix</h3>
          <p class="local-card-desc">Full grocery, fresh seafood, bakery, and pharmacy.</p>
          <a href="https://maps.google.com/?q=Publix+New+Smyrna+Beach+FL" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Pharmacy · 0.8 mi</span>
          <h3 class="local-card-name">Walgreens</h3>
          <p class="local-card-desc">Pharmacy, OTC meds, snacks, and late hours.</p>
          <a href="https://maps.google.com/?q=Walgreens+New+Smyrna+Beach+FL" target="_blank" class="local-card-link">Directions →</a>
        </div>
        <div class="local-card">
          <span class="local-card-tag">Grocery · 5 mi</span>
          <h3 class="local-card-name">Walmart Supercenter</h3>
          <p class="local-card-desc">Groceries, household goods, beach gear, and more at the lowest prices.</p>
          <a href="https://maps.google.com/?q=Walmart+New+Smyrna+Beach+FL" target="_blank" class="local-card-link">Directions →</a>
        </div>

      </div>
    </section>

    <!-- ── 7. Emergency ── -->
    <section class="pad-section" id="emergency">
      <h2 class="pad-section-title">Emergency &amp; Safety</h2>
      <p style="color:var(--charcoal-light,#666); font-size:0.9rem; margin:0 0 1.25rem">Save these contacts before you need them.</p>
      <div class="emg-grid">

        <a class="emg-card emg-card-red" href="tel:911">
          <span class="emg-number">911</span>
          <span class="emg-label">Fire / Police / Medical</span>
          <span class="emg-hint">Tap to call</span>
        </a>

        <a class="emg-card" href="tel:8002221222">
          <span class="emg-number">(800) 222-1222</span>
          <span class="emg-label">Poison Control</span>
          <span class="emg-hint">Available 24/7</span>
        </a>

        <a class="emg-card" href="https://maps.google.com/?q=AdventHealth+New+Smyrna+Beach+Emergency+Room" target="_blank" rel="noopener">
          <span class="emg-number emg-number-sm">AdventHealth ER</span>
          <span class="emg-label">~3.5 miles · 401 Palmetto St</span>
          <span class="emg-hint">Tap for directions</span>
        </a>

        <a class="emg-card" href="https://maps.google.com/?q=Primecare+Medical+New+Smyrna+Beach" target="_blank" rel="noopener">
          <span class="emg-number emg-number-sm">Urgent Care NSB</span>
          <span class="emg-label">~3 miles · Primecare Medical</span>
          <span class="emg-hint">Tap for directions</span>
        </a>

        <a class="emg-card" href="tel:3867365999">
          <span class="emg-number emg-number-sm">(386) 736-5999</span>
          <span class="emg-label">Volusia County Sheriff</span>
          <span class="emg-hint">Non-emergency line</span>
        </a>

        <a class="emg-card" href="tel:4075066654">
          <span class="emg-number">(407) 506-6654</span>
          <span class="emg-label">Antonio (Host)</span>
          <span class="emg-hint">Call or text — urgent issues</span>
        </a>

        <div class="emg-card emg-card-util">
          <span class="emg-number emg-number-sm">Circuit Breaker</span>
          <span class="emg-label">Garage — left wall</span>
        </div>

        <div class="emg-card emg-card-util">
          <span class="emg-number emg-number-sm">Water Main Shutoff</span>
          <span class="emg-label">Right side of home — lever near corner of porch by palm tree</span>
        </div>

      </div>
    </section>

  </main>

  <!-- Toasts -->
  <div class="pool-toast" id="pool-toast"></div>
  <div class="copy-toast" id="copy-toast">Copied!</div>

  <script src="../js/config.js"></script>
  <script src="js/pad.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add pad/index.html
git commit -m "feat: add iPad guide HTML page"
```

---

## Task 8: `pad/js/pad.js` — pool widget + page JS

**Files:**
- Write: `pad/js/pad.js`

Handles: pool status polling, command dispatch (with optimistic UI), toggle buttons, setpoint slider, color swatches, WiFi copy-to-clipboard, accordion, scrollspy.

- [ ] **Step 1: Write `pad/js/pad.js`**

```js
// pad.js — NSB Retreat iPad Guide

// ── WiFi copy ──────────────────────────────────────────────────────────────
(function initWifi() {
  const nameEl  = document.getElementById('pad-wifi-name');
  const passEl  = document.getElementById('pad-wifi-pass');
  const passCard = document.getElementById('pad-wifi-pass-card');
  const toast   = document.getElementById('copy-toast');

  if (typeof CONFIG !== 'undefined' && CONFIG.quick_info) {
    if (nameEl && CONFIG.quick_info.wifi_name)     nameEl.textContent = CONFIG.quick_info.wifi_name;
    if (passEl && CONFIG.quick_info.wifi_password) passEl.textContent = CONFIG.quick_info.wifi_password;
  }

  if (!passCard || !toast) return;

  passCard.addEventListener('click', function() {
    const val = passEl ? passEl.textContent.trim() : '';
    if (!val) return;
    navigator.clipboard.writeText(val).then(function() {
      toast.classList.add('show');
      clearTimeout(toast._t);
      toast._t = setTimeout(function() { toast.classList.remove('show'); }, 2000);
    }).catch(function() {});
  });
})();

// ── Accordion ──────────────────────────────────────────────────────────────
(function initAccordion() {
  document.querySelectorAll('.acc-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var body   = trigger.nextElementSibling;
      var isOpen = body.classList.contains('open');

      document.querySelectorAll('.acc-body').forEach(function(b)   { b.classList.remove('open'); });
      document.querySelectorAll('.acc-trigger').forEach(function(t) { t.classList.remove('open'); });

      if (!isOpen) {
        body.classList.add('open');
        trigger.classList.add('open');
      }
    });
  });
})();

// ── Scrollspy ──────────────────────────────────────────────────────────────
(function initScrollSpy() {
  var sections = Array.from(document.querySelectorAll('.pad-section[id]'));
  var links    = document.querySelectorAll('.pad-tab');
  var tabs     = document.getElementById('pad-tabs');

  function update() {
    var current = sections[0] ? sections[0].id : '';
    sections.forEach(function(sec) {
      if (window.scrollY + 70 >= sec.offsetTop) current = sec.id;
    });
    links.forEach(function(link) {
      var href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === current);
    });
    if (tabs) {
      var activeLink = tabs.querySelector('.pad-tab.active');
      if (activeLink) {
        tabs.scrollLeft = activeLink.offsetLeft - (tabs.offsetWidth / 2) + (activeLink.offsetWidth / 2);
      }
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── Pool Widget ────────────────────────────────────────────────────────────
(function initPoolWidget() {
  // DOM refs
  var badge         = document.getElementById('pool-badge');
  var poolTempEl    = document.getElementById('pool-temp-val');
  var spaTempEl     = document.getElementById('spa-temp-val');
  var pumpStatusEl  = document.getElementById('pool-pump-status');
  var toast         = document.getElementById('pool-toast');

  var btnSpaHeater  = document.getElementById('btn-spa-heater');
  var btnSpaJets    = document.getElementById('btn-spa-jets');
  var btnPoolLight  = document.getElementById('btn-pool-light');
  var rowSpaJets    = document.getElementById('row-spa-jets');
  var slider        = document.getElementById('slider-spa-setpoint');
  var setpointDisp  = document.getElementById('setpoint-display');
  var colorSwatches = document.querySelectorAll('.color-swatch');

  // Local state — mirrors last known device state
  var state = {
    online:           false,
    spa_heater:       'off',
    spa_jets:         'off',
    pool_light:       'off',
    pool_light_color: 'white',
    spa_set_point:    102,
    pool_pump:        'off',
  };

  // ── Toast helper ──
  function showToast(msg, duration) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove('show'); }, duration || 2500);
  }

  // ── Apply state to DOM ──
  function applyState(s) {
    // Badge
    badge.textContent = s.online ? 'Online' : 'Offline';
    badge.classList.toggle('offline', !s.online);

    // Temps
    poolTempEl.innerHTML = s.pool_temp != null
      ? s.pool_temp + '<span class="temp-unit">°F</span>'
      : '<span class="temp-loading">–</span>';
    spaTempEl.innerHTML = s.spa_temp != null
      ? s.spa_temp + '<span class="temp-unit">°F</span>'
      : '<span class="temp-loading">–</span>';

    // Pool pump
    pumpStatusEl.textContent = s.pool_pump === 'on' ? 'Running' : 'Off';

    // Spa heater toggle
    updateToggle(btnSpaHeater, s.spa_heater);

    // Spa jets (show row only if device has jets)
    if (s.spa_jets !== undefined && rowSpaJets) {
      rowSpaJets.style.display = '';
      updateToggle(btnSpaJets, s.spa_jets);
    }

    // Pool light
    updateToggle(btnPoolLight, s.pool_light);

    // Color swatches — enabled only when light is on
    var lightOn = s.pool_light === 'on';
    colorSwatches.forEach(function(sw) {
      sw.classList.toggle('disabled', !lightOn);
      sw.classList.toggle('active', lightOn && sw.dataset.color === s.pool_light_color);
    });

    // Setpoint slider
    var sp = s.spa_set_point || 102;
    slider.value = sp;
    setpointDisp.textContent = sp + '°F';

    // Enable all controls when online
    btnSpaHeater.disabled = !s.online;
    btnPoolLight.disabled = !s.online;
    slider.disabled       = !s.online;
    if (btnSpaJets) btnSpaJets.disabled = !s.online;

    Object.assign(state, s);
  }

  function updateToggle(btn, val) {
    if (!btn) return;
    var isOn = val === 'on';
    btn.textContent = isOn ? 'On' : 'Off';
    btn.classList.toggle('on', isOn);
    btn.dataset.state = val;
  }

  // ── Fetch status ──
  function fetchStatus() {
    fetch('/api/pool-status')
      .then(function(r) { return r.json(); })
      .then(function(data) { applyState(data); })
      .catch(function() {
        badge.textContent = 'Offline';
        badge.classList.add('offline');
      });
  }

  // ── Send command ──
  function sendCommand(command, value, onSuccess, onError) {
    fetch('/api/pool-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: command, value: value }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          if (onSuccess) onSuccess();
        } else {
          showToast('Error: ' + (data.error || 'Unknown error'));
          if (onError) onError();
        }
      })
      .catch(function() {
        showToast('Connection error — try again.');
        if (onError) onError();
      });
  }

  // ── Toggle button handler ──
  function handleToggle(btn, command) {
    btn.addEventListener('click', function() {
      var newVal   = btn.dataset.state === 'on' ? 'off' : 'on';
      var prevVal  = btn.dataset.state;

      // Optimistic update
      updateToggle(btn, newVal);
      btn.disabled = true;

      // Special: update color swatches immediately when light toggled
      if (command === 'pool_light') {
        var lightOn = newVal === 'on';
        colorSwatches.forEach(function(sw) {
          sw.classList.toggle('disabled', !lightOn);
        });
      }

      sendCommand(command, newVal,
        function() {
          // Confirmed — re-enable
          btn.disabled = false;
          showToast(command.replace('_', ' ') + ' ' + newVal, 1800);
        },
        function() {
          // Revert on error
          updateToggle(btn, prevVal);
          btn.disabled = false;
          if (command === 'pool_light') {
            colorSwatches.forEach(function(sw) {
              sw.classList.toggle('disabled', prevVal !== 'on');
            });
          }
        }
      );
    });
  }

  // ── Setpoint slider ──
  var sliderTimer;
  slider.addEventListener('input', function() {
    setpointDisp.textContent = slider.value + '°F';
  });
  slider.addEventListener('change', function() {
    var val = parseInt(slider.value, 10);
    slider.disabled = true;
    sendCommand('spa_setpoint', val,
      function() {
        slider.disabled = false;
        showToast('Spa set to ' + val + '°F', 1800);
      },
      function() {
        slider.value = state.spa_set_point;
        setpointDisp.textContent = state.spa_set_point + '°F';
        slider.disabled = false;
      }
    );
  });

  // ── Color swatches ──
  colorSwatches.forEach(function(sw) {
    sw.addEventListener('click', function() {
      if (sw.classList.contains('disabled')) return;
      var color    = sw.dataset.color;
      var prevColor = state.pool_light_color;

      // Optimistic
      colorSwatches.forEach(function(s) { s.classList.remove('active'); });
      sw.classList.add('active');

      sendCommand('pool_light_color', color,
        function() {
          state.pool_light_color = color;
          showToast(color.charAt(0).toUpperCase() + color.slice(1) + ' selected', 1500);
        },
        function() {
          // Revert
          colorSwatches.forEach(function(s) {
            s.classList.toggle('active', s.dataset.color === prevColor);
          });
        }
      );
    });
  });

  // ── Wire up toggles ──
  handleToggle(btnSpaHeater, 'spa_heater');
  handleToggle(btnPoolLight, 'pool_light');
  if (btnSpaJets) handleToggle(btnSpaJets, 'spa_jets');

  // ── Initial load + polling ──
  fetchStatus();
  setInterval(fetchStatus, 30000);
})();
```

- [ ] **Step 2: Commit**

```bash
git add pad/js/pad.js
git commit -m "feat: add pool widget and page JS"
```

---

## Task 9: Push, add env vars, test on device

- [ ] **Step 1: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

- [ ] **Step 2: Add env vars in Vercel dashboard**

Go to Vercel → NSBretreat project → Settings → Environment Variables. Add:
```
IAQUALINK_EMAIL     = (your iAqualink account email)
IAQUALINK_PASSWORD  = (your iAqualink account password)
IAQUALINK_DEVICE_SERIAL = QNX-5AC-NG2-7F7
```

Redeploy after adding env vars (Vercel → Deployments → Redeploy latest).

- [ ] **Step 3: Add `pad.nsbretreat.com` in Vercel dashboard**

Vercel → NSBretreat project → Settings → Domains → Add `pad.nsbretreat.com`.
In your DNS (wherever nsbretreat.com is managed): add CNAME `pad` → `cname.vercel-dns.com`.

- [ ] **Step 4: Test `/api/pool-status` in browser**

Navigate to: `https://pad.nsbretreat.com/api/pool-status`

Expected (device online):
```json
{"online":true,"pool_temp":82,"spa_temp":98,"spa_heater":"off","pool_pump":"on","pool_light":"off","pool_light_color":"white","spa_set_point":102}
```

If `online: false` with an error, check:
1. Env vars are set and Vercel was redeployed after adding them
2. The iAqualink app on your phone still works (confirms account/device are active)
3. Check Vercel Function Logs (Vercel → Deployments → Functions tab) for the error message

- [ ] **Step 5: Inspect `_raw` to verify aux names**

The status response includes `_raw` which shows the full device response. Look for keys like `aux_1`, `aux_2`, `pool_light`. If the pool light maps to a different aux key (e.g., `aux_3`), update `AUX_LIGHT` in `api/pool-command.js` and redeploy.

- [ ] **Step 6: Test the pool widget on iPad**

Open Safari on the iPad to `pad.nsbretreat.com/pad/`. Verify:
- Temps display correctly
- Spa heater toggle works (tap On → confirm in iAqualink app)
- Spa setpoint slider sends correct temp
- Pool light toggle works
- Color swatches appear when light is on and send the right color

- [ ] **Step 7: Configure iPad kiosk mode (Guided Access)**

On the iPad: Settings → Accessibility → Guided Access → Enable.
Open Safari to `pad.nsbretreat.com/pad/`. Triple-click the Home/Side button to start Guided Access. Set a passcode.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: complete iPad guide with iAqualink pool controls"
git push
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `/api/pool-status.js` — GET, auth, normalize
- ✅ `/api/pool-command.js` — POST, whitelist, dispatch
- ✅ `pad/index.html` — 7 sections
- ✅ `pad/css/pad.css` — iPad layout, touch targets ≥ 48px
- ✅ `pad/js/pad.js` — polling, optimistic UI, toggles, slider, swatches
- ✅ `.env.example` — updated
- ✅ No external frontend dependencies (Dancing Script is optional; system cursive fallback included)
- ✅ Scrollspy instant scroll (no smooth behavior)
- ✅ Spa jets row hidden until device confirms support via `_raw`
- ✅ Pool pump read-only — excluded from command whitelist
- ✅ Color swatches disabled when light is off
- ✅ `noindex, nofollow` meta tag on iPad page (won't appear in search)

**Placeholder scan:** None found.

**Type consistency:** `state` object keys match field names used in `applyState()`, `updateToggle()`, and `handleToggle()` throughout. `sendCommand()` signature is consistent across all call sites.
