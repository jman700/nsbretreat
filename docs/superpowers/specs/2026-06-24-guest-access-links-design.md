# Guest Access Links — Design Spec

## Overview

Add time-limited guest access links so guests can control the pool/spa from their own phones. The existing `/pad` page is untouched. A new `/guest/TOKEN` route serves identical controls, gated by token validity. Admins create and manage tokens (with expiry dates) from a new section in `admin.html`.

---

## Data Model

**New Supabase table: `guest_tokens`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` default `gen_random_uuid()` | Primary key |
| `token` | `text` unique not null | URL-safe random string, 16 hex chars |
| `label` | `text` not null | Human name, e.g. "Smith Family June 2026" |
| `expires_at` | `timestamptz` not null | Checkout date/time set by admin |
| `created_at` | `timestamptz` default `now()` | Auto |

**RLS:**
- Anon: `SELECT` only (token is the secret; reading one row by token value is safe)
- Authenticated: full access (admin CRUD)

**Token format:** 16 lowercase hex characters (`a3f9b2c1d4e5f607`). Generated server-side via `crypto.randomBytes(8).toString('hex')`. Hard to guess, URL-safe, easy to copy.

---

## API

**`GET /api/guest-token?token=TOKEN`**

- Looks up the token in `guest_tokens`
- Returns `{ valid: true, label: "..." }` if found and `expires_at > now()`
- Returns `{ valid: false, reason: "expired" }` if found but expired
- Returns `{ valid: false, reason: "not_found" }` if no matching row
- Uses Supabase anon key (public endpoint — the token itself is the secret)
- No auth required

**Token creation / management — direct Supabase calls from `admin.html`**

No separate server-side endpoint. `admin.html` already calls Supabase directly using the authenticated user's session (same pattern as the feedback inbox). CRUD operations use the Supabase JS client with the logged-in user's JWT, which satisfies the `authenticated full` RLS policy.

Token generation is client-side via the browser's Web Crypto API:
```js
const bytes = crypto.getRandomValues(new Uint8Array(8));
const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
```

---

## Guest Page — `/guest/index.html`

**URL structure:** `https://nsbretreat.com/guest/TOKEN`

Vercel rewrite: `{ "source": "/guest/:token", "destination": "/guest/index.html" }`

**Load flow:**
1. Page loads — shows a centered loading spinner (no content yet)
2. JS reads token from `window.location.pathname` (last path segment)
3. Calls `GET /api/guest-token?token=TOKEN`
4. **Valid:** hide spinner, render full pad content (pool/spa controls, all info sections)
5. **Invalid/expired/not_found:** hide spinner, show dead-end message

**Expired/invalid state:**
```
NSB Retreat
This link is no longer active.
```
Centered, minimal. No controls, no nav, no way forward. Matches the site's design system (Cormorant Garamond heading, Inter body, warm palette).

**Valid state:** identical content to `/pad/index.html` — all sections (Pool & Spa controls, Beach, WiFi & Tech, Check-In, House Rules, Local Guide, Emergency). Shares the same CSS files and API calls.

**Note:** `/guest/index.html` imports the same JS modules as the pad page. No duplication of pool/spa control logic.

---

## Admin Dashboard — New "Guest Links" Section in `admin.html`

Appears as a new tab or collapsible section within the existing authenticated admin UI.

**Token table — columns:**
- **Label** — e.g. "Smith Family June 2026"
- **Expires** — formatted date/time; shown in red if already past
- **Link** — truncated URL with a copy-to-clipboard button
- **Actions** — Edit expiry (inline datetime input, save on confirm) | Delete (with confirmation)

**Expired tokens** remain visible in the table (greyed out row) — since links are reused across stays, the admin updates the expiry rather than creating a new link.

**"Create new link" button** — opens an inline form above the table:
- Label (text input)
- Expires (datetime-local input)
- Create button → row appears immediately in table

---

## Vercel Config Change

Add one rewrite to `vercel.json`:
```json
{ "source": "/guest/:token", "destination": "/guest/index.html" }
```

---

## Migration

New file: `supabase/migrations/003_guest_tokens.sql`

```sql
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

---

## What Is NOT Changing

- `/pad/index.html` — untouched, no auth added
- All existing API routes — untouched
- `admin.html` login flow — untouched (new section added inside existing auth gate)

---

## Out of Scope

- Automatic link delivery (email to guests) — manual copy/send for now
- Check-in activation time — links are valid immediately on creation
- Rate limiting on the token validation endpoint
