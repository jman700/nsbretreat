-- 007_admin_allowlist.sql — restrict admin access to an email allowlist.
-- The browser gate in admin.html is UX; THIS file is the real security boundary.

-- Allowlist of admin emails. RLS on, no client policies: only the
-- security-definer function below and the service role read/write it.
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;

insert into public.admins (email) values
  ('antoniofconcha@gmail.com'),
  ('jman700@gmail.com')
on conflict (email) do nothing;

-- True when the caller's JWT email is an allowlisted admin. security definer so
-- it can read admins regardless of the caller's RLS; search_path pinned for safety.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- ── Rewrite admin policies to require is_admin(). Anon policies are left intact. ──

-- recommendations
drop policy if exists "admin full access" on public.recommendations;
create policy "admin full access" on public.recommendations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- guest_tokens (admin policy only; "anon select" for guest-link validation stays)
drop policy if exists "authenticated full" on public.guest_tokens;
create policy "authenticated full" on public.guest_tokens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- pool_health_log
drop policy if exists "admin read health log" on public.pool_health_log;
create policy "admin read health log" on public.pool_health_log
  for select to authenticated using (public.is_admin());

-- heater_sessions
drop policy if exists "admin read heater sessions" on public.heater_sessions;
create policy "admin read heater sessions" on public.heater_sessions
  for select to authenticated using (public.is_admin());

-- heating_bills
drop policy if exists "admin all heating bills" on public.heating_bills;
create policy "admin all heating bills" on public.heating_bills
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- guest_feedback (dashboard-created): restrict admin read/manage; keep anon INSERT "guests can submit"
drop policy if exists "admin full access" on public.guest_feedback;
create policy "admin full access" on public.guest_feedback
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- guestbook (dashboard-created): restrict admin delete/update; keep "anon_insert" + "anon_select_visible"
drop policy if exists "Auth delete" on public.guestbook;
create policy "Auth delete" on public.guestbook
  for delete to public using (public.is_admin());

drop policy if exists "Auth update" on public.guestbook;
create policy "Auth update" on public.guestbook
  for update to public using (public.is_admin()) with check (public.is_admin());
