# NSB Retreat iPad House Guide — Design Spec
**Date:** 2026-05-04
**Project:** pad.nsbretreat.com — private iPad kiosk guide with live iAqualink pool controls
**Repo:** NSBretreat (same repo as nsbretreat.com)

---

## Overview

A single-page, iPad-optimized house guide hosted at `pad.nsbretreat.com`. Lives alongside the existing public guide at `nsbretreat.com/guide/`. Mirrors the core guide content and adds a live pool/spa control widget powered by the iAqualink API proxied through Vercel serverless functions. No authentication — access is controlled by URL obscurity; URL can be changed between bookings if needed.

---

## Hosting & Deployment

- **Repo:** Existing NSBretreat GitHub repo
- **Platform:** Vercel (same project as nsbretreat.com)
- **Subdomain:** `pad.nsbretreat.com` added as a second custom domain in the Vercel project dashboard, pointed at repo root via DNS CNAME
- **Routing:** `vercel.json` rewrite rule maps `pad.nsbretreat.com/` → `/pad/index.html`
- **Deployment:** Auto-deploy on push to `main`, same as current site

---

## File Structure

```
/api/
  ical.js               (existing — do not touch)
  pool-status.js        GET  — fetches live device state from iAqualink
  pool-command.js       POST — sends commands (heater, temp, jets, light)
/pad/
  index.html            — full single-page iPad guide
  css/pad.css           — iPad-optimized styles
  js/pad.js             — pool polling, command dispatch, UI logic
/docs/superpowers/specs/
  2026-05-04-ipad-guide-design.md   (this file)
vercel.json             — updated with pad subdomain rewrite
.env.example            — updated with new env var template
```

---

## Environment Variables

```
# Existing
AIRBNB_ICAL_URL=

# New — iAqualink
IAQUALINK_EMAIL=
IAQUALINK_PASSWORD=
IAQUALINK_DEVICE_SERIAL=
```

No PIN variable — access control is URL-only.

---

## iAqualink API Integration

### Authentication
Both API functions authenticate per-request. No token caching.

```
POST https://prod.zodiac-ios.com/users/v1/login
Body: { username, password, api_key: "EOOEMOW4YR6QNB07" }
Response: { id, authentication_token, ... }
```

The `authentication_token` is then used in subsequent requests.

### Status Read
```
GET https://iaqualink-api.realtime.io/v1/mobile/session.json
  ?actionID=command&command=get_home_screen
  &serial={DEVICE_SERIAL}
  &sessionID={authentication_token}
```
Returns device online status, pool temp, spa temp, heater state, pump state, light state.

### Command Send
```
GET https://iaqualink-api.realtime.io/v1/mobile/session.json
  ?actionID=command&command=set_aux
  &serial={DEVICE_SERIAL}
  &sessionID={authentication_token}
  &aux={device_id}
  &level={value}
```
Used for: spa heater on/off, set-point temp, jets/blower, pool light on/off + color mode.

### Error Handling
- If iAqualink login fails → API returns `{ error: "offline" }`, widget shows "System Offline" badge
- If command times out → widget shows brief error toast, no state change assumed
- All iAqualink calls are server-side only; browser never contacts iAqualink directly

---

## Vercel API Routes

### `GET /api/pool-status`
1. Auth with iAqualink using env credentials
2. Fetch device home screen
3. Parse and return:
```json
{
  "online": true,
  "pool_temp": 82,
  "spa_temp": 101,
  "spa_heater": "on",
  "pool_pump": "on",
  "spa_jets": "off",
  "pool_light": "on",
  "pool_light_color": "blue"
}
```

### `POST /api/pool-command`
Request body:
```json
{ "command": "spa_heater", "value": "on" }
{ "command": "spa_setpoint", "value": 102 }
{ "command": "spa_jets", "value": "on" }
{ "command": "pool_light", "value": "on" }
{ "command": "pool_light_color", "value": "magenta" }
```
1. Validate `command` is one of the allowed set (whitelist)
2. Auth with iAqualink
3. Send command
4. Return `{ "success": true }` or `{ "error": "..." }`

**Command whitelist** (server-side enforced):
`spa_heater`, `spa_setpoint`, `spa_jets`, `pool_light`, `pool_light_color`

Pool pump is intentionally excluded from the command whitelist — display only.

---

## Pool Widget — UI

### Live Reads (polled every 30s via `setInterval`)
- **System status badge** — green "Online" / red "Offline"
- **Pool temp** — large number display (°F)
- **Spa temp** — large number display (°F)
- **Pool pump** — status indicator (no control)

### Guest Controls
| Control | Type | Details |
|---|---|---|
| Spa heater | Toggle button | On/Off, shows current state |
| Spa set-point | Slider | 98–104°F, integer steps |
| Spa jets / air blower | Toggle button | On/Off (shown only if device supports it) |
| Pool light | Toggle button | On/Off |
| Pool light color | Color swatch grid | White, Blue, Green, Red, Magenta, Party (cycles) |

Color swatches only visible/enabled when pool light is on. Tapping a swatch sends `pool_light_color` command immediately.

### Optimistic UI
Controls update visually on tap, then confirm/revert on API response. Prevents laggy feel on the kiosk.

---

## iPad Guide — Page Structure

Single scrollable page. Fixed tab bar at top (matches nsbretreat.com nav aesthetic). Sections:

### 1. Welcome
- Property name + address
- Host photo (Antonio & Yani) + short bio (2–3 sentences)
- "Call or text Antonio" button → `tel:4075066654`

### 2. Check-In
- Door lock instructions (smart lock, code in booking app)
- Arrival inspection note
- Parking instructions (driveway, right garage spot, no street parking)
- Check-in 4 PM / Check-out 10 AM

### 3. House Rules
- Same 11 rules from `guide/index.html`, collapsible accordion
- Large touch targets on accordion triggers

### 4. WiFi & Tech
- WiFi network name + password (tap-to-copy, values from `CONFIG` or hardcoded)
- Smart TV / streaming note (sign in, sign out on departure)
- Smart lock tip
- Hot tub tablet location note (points to Pool & Spa section)

### 5. Pool & Spa
- Hot tub startup instructions (same steps as existing guide)
- Pool sliding door alarm instructions
- **iAqualink live control widget** (see Pool Widget section above)

### 6. Local Guide
- Condensed place cards, no filter tabs — all categories visible in a clean 2-column grid
- Categories: Eat, Drink, Coffee, Essentials
- ~12–16 cards total (top picks only, not the full 20+ from the public guide)
- Each card: name, one-line description, Google Maps link button

### 7. Emergency
- Same 8 contacts from existing guide
- Large tap-target cards (min 80px height)
- 911 card prominently red

---

## Layout & Design

### Viewport Target
- iPad (all models), 768px–1024px wide, portrait and landscape
- Optimized primarily for landscape kiosk use (1024×768)

### Typography
- `ui-sans-serif` system font stack — no external font requests, instant render on cold start
- Section titles: 1.5rem, bold
- Body text: 1rem, 1.6 line-height
- Touch targets: minimum 48×48px per Apple HIG

### Color Palette
- Inherits nsbretreat.com CSS variables where possible (`--sand`, `--accent`, `--charcoal`)
- Imports `../css/styles.css` for base variables, uses `pad.css` for iPad-specific layout

### Navigation
- Fixed top tab bar, horizontally scrollable (same pattern as `guide/index.html`)
- Tabs: Welcome · Check-In · House Rules · WiFi · Pool & Spa · Local · Emergency
- Active tab highlighted with accent color
- Scrollspy updates active tab on scroll (same `initScrollSpy` pattern as `guide/js/manual.js`, instant scroll — no smooth behavior)

### No External Dependencies
- Zero npm packages on frontend
- No CDN scripts (Fuse.js, etc.) — this page has no search
- Chatbot widget not included — iPad guide is display-only

---

## Vercel Domain Setup

Vercel does not support per-hostname rewrites in `vercel.json` — any rewrite there applies to all domains on the project. So we do **not** add a rewrite rule.

Instead:
1. Add `pad.nsbretreat.com` as a custom domain alias on the existing Vercel project (Vercel dashboard → Domains)
2. Add DNS CNAME: `pad.nsbretreat.com` → `cname.vercel-dns.com`
3. The iPad kiosk URL is **`pad.nsbretreat.com/pad/`** — no routing magic, just a direct path

No `vercel.json` changes required. The `/pad/` folder is served as static files exactly like `/guide/` is today.

---

## Out of Scope

- No chatbot
- No i18n / translations (kiosk is English-only)
- No dark mode toggle
- No share button
- No feedback/recommendations form
- No reviews section
- No beach conditions widget (no internet dependency for core content)
- No events section (changes too frequently for a kiosk)
- No checkout section (iPad stays in the house)
