# NSB Admin Google OAuth + Email Allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. NOTE: several tasks are user-gated (Google Cloud + Supabase dashboard setup, applying SQL) because they require credentials/consoles the agent cannot access.

**Goal:** Add "Sign in with Google" to the NSB admin panel and restrict admin access to an email allowlist enforced in the database.

**Architecture:** `admin.html` gains a Google sign-in button and an admin gate (`is_admin()` RPC) layered on top of the existing Supabase email/password auth. A new migration adds an `admins` allowlist table, a `security definer` `is_admin()` function, and rewrites every `to authenticated using (true)` admin RLS policy to `using (public.is_admin())`. The browser gate is UX; the RLS rewrite is the actual security boundary.

**Tech Stack:** Supabase Auth (Google OAuth provider), Postgres RLS, vanilla-JS admin page, Vercel.

---

## File Map

| File | Change |
|------|--------|
| `admin.html` | Modify — Google button, `signInWithGoogle()`, `ensureAdmin()` gate, "not authorized" element, CSS |
| `supabase/migrations/007_admin_allowlist.sql` | Create — `admins` table, `is_admin()`, RLS policy rewrites |

Deploy-order safety: `admin.html` uses a **fail-open** gate (if `is_admin` RPC errors — e.g. migration not yet applied — it allows the session through; RLS is unchanged until the migration runs, so admins are never locked out). This makes the two changes safe to ship in either order. The Google button is inert until the Supabase provider is configured.

---

### Task 1: `admin.html` — Google sign-in button + admin gate

**Files:**
- Modify: `admin.html`

- [ ] **Step 1: Add CSS for the Google button + divider**

In `admin.html`, immediately before the closing `</style>` tag, add:

```css
    /* ── Google sign-in ── */
    .login-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 1rem; color: var(--charcoal-light); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: var(--tan); }
    .btn-google { display: flex; align-items: center; justify-content: center; gap: 0.625rem; width: 100%; background: var(--white); color: var(--charcoal); border: 1.5px solid var(--tan); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-family: var(--font-sans); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
    .btn-google:hover { border-color: var(--accent); background: var(--blush); }
```

- [ ] **Step 2: Add the Google button + "not authorized" message to the login card**

Find this block (the end of the login form):

```html
        <button type="submit" class="btn-primary" id="login-btn">Sign In</button>
        <div class="login-error" id="login-error">Invalid email or password.</div>
      </form>
    </div>
  </div>
```

Replace with:

```html
        <button type="submit" class="btn-primary" id="login-btn">Sign In</button>
        <div class="login-error" id="login-error">Invalid email or password.</div>
      </form>
      <div class="login-divider"><span>or</span></div>
      <button type="button" class="btn-google" id="btn-google" onclick="signInWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </button>
      <div class="login-error" id="login-notauth">This account isn&rsquo;t authorized for admin access.</div>
    </div>
  </div>
```

- [ ] **Step 3: Add `signInWithGoogle()` and `ensureAdmin()`**

Find the Supabase client creation and the auth-state block:

```js
    sb.auth.onAuthStateChange(function (event, session) {
      if (session) { showDashboard(); } else { showLogin(); }
    });
```

Insert these two functions immediately **before** that `sb.auth.onAuthStateChange(...)` call:

```js
    async function signInWithGoogle() {
      var _a = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/admin' },
      });
      if (_a.error) {
        var el = document.getElementById('login-error');
        el.textContent = 'Google sign-in failed: ' + _a.error.message;
        el.classList.add('show');
      }
    }

    // Allowlist gate. RLS is the real security boundary; this is UX + a clean
    // rejection. Fails OPEN on RPC error (e.g. migration not yet applied) so an
    // admin is never locked out — the database still returns nothing to non-admins.
    async function ensureAdmin() {
      var _a = await sb.rpc('is_admin');
      if (_a.error) { console.error('is_admin check failed:', _a.error.message); return true; }
      if (!_a.data) {
        await sb.auth.signOut();
        document.getElementById('login-notauth').classList.add('show');
        return false;
      }
      return true;
    }
```

- [ ] **Step 4: Gate `showDashboard()` behind `ensureAdmin()`**

Find `showDashboard` (currently starts `function showDashboard() {` with a `var heatTimer = null;` line just above it). Change its first line from:

```js
    var heatTimer = null;
    function showDashboard() {
      document.getElementById('login-wrap').style.display = 'none';
```

to:

```js
    var heatTimer = null;
    async function showDashboard() {
      if (!(await ensureAdmin())) return;
      document.getElementById('login-wrap').style.display = 'none';
```

- [ ] **Step 5: Verify in the preview (no console errors, button renders)**

Start the preview (`preview_start` with the `nsbretreat-guide` config that serves `.`), open `http://localhost:3456/admin.html`, and confirm: the "Sign in with Google" button renders under an "or" divider, `typeof signInWithGoogle === 'function'`, `typeof ensureAdmin === 'function'`, and there are no console errors. (Full OAuth can't be exercised locally — that needs the Supabase provider configured.)

- [ ] **Step 6: Commit and push**

```bash
git add admin.html
git commit -m "feat: admin Google sign-in + is_admin allowlist gate"
git push
```

---

### Task 2: Enumerate existing RLS policies (user-gated)

**Context:** `guest_feedback` and `guestbook` were created via the Supabase dashboard, so their RLS policy names aren't in the repo. The migration must rewrite their `authenticated` policies to `is_admin()` while preserving any `anon` policy (e.g. the guest feedback INSERT). We need the exact names.

- [ ] **Step 1: Run this query in the Supabase SQL Editor and paste the output**

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('guest_feedback', 'guestbook')
order by tablename, policyname;
```

This yields the exact policy names + which role each targets, used to fill Task 3's guest_feedback/guestbook section.

---

### Task 3: `supabase/migrations/007_admin_allowlist.sql`

**Files:**
- Create: `supabase/migrations/007_admin_allowlist.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/007_admin_allowlist.sql` with:

```sql
-- 007_admin_allowlist.sql — restrict admin access to an email allowlist.

create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
-- No client policies: only the security-definer function and the service role touch this table.

insert into public.admins (email) values
  ('antoniofconcha@gmail.com'),
  ('jman700@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- ── Rewrite admin policies (known names from migrations). Anon policies untouched. ──
drop policy if exists "admin full access" on public.recommendations;
create policy "admin full access" on public.recommendations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated full" on public.guest_tokens;
create policy "authenticated full" on public.guest_tokens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read health log" on public.pool_health_log;
create policy "admin read health log" on public.pool_health_log
  for select to authenticated using (public.is_admin());

drop policy if exists "admin read heater sessions" on public.heater_sessions;
create policy "admin read heater sessions" on public.heater_sessions
  for select to authenticated using (public.is_admin());

drop policy if exists "admin all heating bills" on public.heating_bills;
create policy "admin all heating bills" on public.heating_bills
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── guest_feedback + guestbook: authenticated policies, exact names from Task 2. ──
-- Fill using the enumerated policy names. For each authenticated policy P on table T:
--   drop policy if exists "<P>" on public.<T>;
--   create policy "<P>" on public.<T> for <cmd> to authenticated
--     using (public.is_admin())  [with check (public.is_admin()) if cmd is ALL/INSERT/UPDATE];
-- Do NOT touch anon policies (e.g. the guest_feedback INSERT).
```

The final `guest_feedback`/`guestbook` statements are written from Task 2's output before this file is committed (no placeholder ships).

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_admin_allowlist.sql
git commit -m "feat: admins allowlist table, is_admin(), RLS rewrites"
```

---

### Task 4: Google + Supabase provider setup (user-gated)

**Context:** Google OAuth needs a Google Cloud OAuth client and the Supabase Google provider enabled. The agent cannot access these consoles; these are step-by-step instructions for the user.

- [ ] **Step 1: Create a Google OAuth client**

Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type **Web application**. Under **Authorized redirect URIs** add exactly:

```
https://xittuxwilxmzzawjdivd.supabase.co/auth/v1/callback
```

Create, then copy the **Client ID** and **Client secret**. (If prompted, configure the OAuth consent screen — External, add your email as a test user or publish.)

- [ ] **Step 2: Enable the Google provider in Supabase**

Supabase → Authentication → Providers → Google → enable, paste the Client ID and Client secret, save.

- [ ] **Step 3: Add redirect URLs**

Supabase → Authentication → URL Configuration → add to **Redirect URLs**:

```
https://nsbretreat.com/admin
https://www.nsbretreat.com/admin
```

Confirm the **Site URL** is `https://nsbretreat.com`.

---

### Task 5: Apply migration + end-to-end verification

- [ ] **Step 1: Apply the migration**

Supabase → SQL Editor → paste and run `supabase/migrations/007_admin_allowlist.sql`. Confirm no error and that `admins` contains the two emails (`select * from public.admins;`).

- [ ] **Step 2: Verify allowed Google login**

Open `https://nsbretreat.com/admin` → "Sign in with Google" → choose `antoniofconcha@gmail.com`. Expected: redirected back and the dashboard loads with all sections populated.

- [ ] **Step 3: Verify password login still works**

Log in with an allowlisted email + password. Expected: dashboard loads.

- [ ] **Step 4: Verify a non-admin is rejected (security)**

Sign in with a Google account **not** in `admins`. Expected: "This account isn't authorized" appears and you're signed out. To confirm the data (not just the UI) is protected, while signed in as the non-admin, in the browser console run:

```js
await sb.from('guest_feedback').select('*')
```

Expected: an empty array (RLS returns nothing), not the feedback rows.

- [ ] **Step 5: Confirm add-admin path**

`insert into public.admins (email) values ('someone@example.com');` in the SQL Editor grants that account access on next login — no code change.
