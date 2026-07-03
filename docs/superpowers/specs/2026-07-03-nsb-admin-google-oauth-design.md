# NSB Admin — Google OAuth + Email Allowlist — Design Spec

## Goal

Add "Sign in with Google" to the NSB Retreat admin panel as a second login option (alongside the existing email/password), and restrict admin access to an explicit email allowlist enforced in the database. This unblocks admin login and establishes the shared identity foundation (an `admins` allowlist + the Google provider) that the other JSL/JSE tools can reuse later.

## Scope

**In scope:** the NSB Retreat admin panel only (`admin.html` in this repo) and the shared Supabase project's auth/RLS.

**Explicitly out of scope (separate future project, spans other repos):** the cross-tool landing page, applying Google OAuth to the other tools (coach-manager-2, cleaners, buslist, quotes, freshdesk…), and cross-tool switching. Those are separate codebases; this design only lays the foundation they will reuse.

## Security Model — why the allowlist must be in the database

The admin data (guest feedback, guest tokens, heater logs, etc.) is protected by RLS policies that currently allow **any authenticated user** (`to authenticated using (true)`). Google OAuth lets anyone with a Google account become an authenticated user. Therefore a browser-only email check is insufficient — a rejected user could still read data directly via the API with their valid JWT. Access must be restricted at the database layer so the data itself is inaccessible to non-admins.

## Data Model & Enforcement

Migration: `supabase/migrations/007_admin_allowlist.sql`

### `admins` table

| Column | Type | Notes |
|--------|------|-------|
| `email` | `text primary key` | authorized admin email |
| `created_at` | `timestamptz default now()` | |

RLS enabled with **no client policies** — only the `security definer` function below and the service role can read/write it. Seeded with `antoniofconcha@gmail.com` and `jman700@gmail.com` (idempotent `on conflict do nothing`).

### `is_admin()` function

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;
```

`security definer` lets it read `admins` regardless of the caller's RLS; `set search_path = public` hardens it. Returns `true` when the current JWT's email is an allowlisted admin. Works identically for password and Google logins (both carry the `email` claim). Executable by authenticated users so the browser can call it via `sb.rpc('is_admin')`.

### RLS policy rewrites

Every admin policy currently `to authenticated using (true)` is dropped and recreated as `using (public.is_admin())` (and `with check (public.is_admin())` for `for all` policies). **Anon policies are left untouched** — guests must still submit feedback and validate guest-token links.

Policies to rewrite (from `supabase/migrations`):
- `recommendations` — `"admin full access"` (`for all`)
- `guest_tokens` — `"authenticated full"` (`for all`); **keep** `"anon select"`
- `pool_health_log` — `"admin read health log"` (`for select`)
- `heater_sessions` — `"admin read heater sessions"` (`for select`)
- `heating_bills` — `"admin all heating bills"` (`for all`)

Plus `guest_feedback` and `guestbook`, which were created via the Supabase dashboard (not in migrations), so their exact policy names are unknown. **Before writing the migration, enumerate existing policies** and use the exact names:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;
```

The migration then drops/recreates the `authenticated` policies on `guest_feedback` and `guestbook` to `using (public.is_admin())`, keeping any anon policies intact. (If those tables have no anon policy, none is added.)

## Login Flow (`admin.html`)

The login card keeps the existing email/password form and adds a **"Sign in with Google"** button:

```js
async function signInWithGoogle() {
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/admin' },
  });
}
```

Supabase handles the Google round-trip and returns to `/admin`; the existing `sb.auth.onAuthStateChange` fires with a session. The admin gate runs on any established session (password **or** Google):

```js
async function ensureAdmin() {
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    await sb.auth.signOut();
    showNotAuthorized();          // "This account isn't authorized."
    return false;
  }
  return true;
}
```

`showDashboard()` calls `ensureAdmin()` first and only proceeds to load data when it returns `true`. A non-allowlisted Google account can complete Google sign-in but is immediately signed out with a clear message, and the database returns nothing to it regardless.

## One-Time Setup (user performs; instructions provided in the plan)

1. **Google Cloud Console** → create an OAuth 2.0 Client ID (Web application). Authorized redirect URI: `https://xittuxwilxmzzawjdivd.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers → Google** → enable, paste the Client ID and Client Secret.
3. **Supabase → Authentication → URL Configuration** → add `https://nsbretreat.com/admin` (and `https://www.nsbretreat.com/admin`) to Redirect URLs; confirm the Site URL.
4. **Run** `007_admin_allowlist.sql` in the SQL Editor.

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/007_admin_allowlist.sql` | Create — `admins` table, `is_admin()`, policy rewrites |
| `admin.html` | Modify — "Sign in with Google" button, `signInWithGoogle()`, `ensureAdmin()` gate wired into `showDashboard()`, a "not authorized" message element |

## Testing

Manual verification (no automated harness exists for `admin.html`, consistent with the project):
1. **Allowed Google login:** sign in with `antoniofconcha@gmail.com` via Google → dashboard loads, all sections populate.
2. **Rejected Google login:** sign in with a non-allowlisted Google account → "not authorized" message, signed out; separately confirm a direct REST read of a protected table with that account's token returns empty (RLS enforced, not just UI).
3. **Password login still works:** existing email/password login for an allowlisted email loads the dashboard.
4. **Add-admin path:** inserting a new email into `admins` grants that account access on next login with no code change.

## What Does NOT Change

- Anon policies and guest-facing flows (feedback submission, guest-token validation) — untouched.
- The pool/spa control system, the heater safety net, and all API routes — untouched.
- The other JSL/JSE tools and their repos — untouched (separate future project).
- The existing email/password login — remains available.
