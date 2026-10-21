# Migration rules (Supabase default-privilege change, 2026-10-30)

**Why:** from 2026-10-30 Supabase stops auto-granting `anon` / `authenticated` Data API access on new tables in `public`
for existing projects, and on 2026-10-22 we stripped the same auto-grants from our own default privileges
(`jse`, `cc`, `latch`, `public` on the JSE project; `public` on the CM project; `tab` / `vip` earlier), and
revoked default `EXECUTE` from `PUBLIC` on new functions. A new object is now born with **no** browser-role access.
Every migration must say what it wants, explicitly. See
`docs/audits/2026-10-21-supabase-exposure/findings.md` in `JSE-Program-Source-Code` for the audit behind this.

Applies to the shared JSE Supabase project (`xittuxwilxmzzawjdivd`). Migrations here are numbered (`008_name.sql` onward); numbers above 7 are checked.

## The rules

1. **Every new table:** `alter table ... enable row level security;` then explicit minimal grants.
   - `grant select, insert, update, delete on ... to authenticated;` only for the operations browsers really need
     (drop the verbs they do not).
   - `anon` only for data that is public by design (state why in a comment).
   - `grant all on ... to service_role;` (server code).
   - Sequences / identity columns the browser inserts into need `grant usage, select on sequence ...` too.
   - RLS on with no policy means "service role only" - that is fine, and often right.
2. **Every new function / procedure:** `revoke execute on function ... from public, anon, authenticated;` then
   `grant execute ... to service_role;` (and to `authenticated` only if the browser calls it with `.rpc()`).
   Always `set search_path = ''` (or an explicit list). `SECURITY DEFINER` functions are the dangerous ones: they run
   with the owner's rights, so they must never be callable by `anon`.
3. **Every view:** create it with `with (security_invoker = on)`. `create or replace view` **drops** the option if you
   leave it out, so re-state it every time (or follow with `alter view ... set (security_invoker = on);`).
4. Never rely on a default privilege. There are none for `anon` / `authenticated` any more.

## Copy-paste template

```sql
-- TABLE ------------------------------------------------------------------
create table public.example (
  id         bigint generated always as identity primary key,
  owner_id   uuid not null references auth.users (id),
  note       text
);
alter table public.example enable row level security;
grant select, insert, update, delete on public.example to authenticated;   -- only what browsers need
-- grant select on public.example to anon;                                  -- ONLY if public by design (say why)
grant all on public.example to service_role;
grant usage, select on sequence public.example_id_seq to authenticated;     -- if browsers insert
grant all on sequence public.example_id_seq to service_role;
create policy example_own on public.example
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- FUNCTION ---------------------------------------------------------------
create function public.example_fn(p_id bigint) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  return true;
end $$;
revoke execute on function public.example_fn(bigint) from public, anon, authenticated;
grant execute on function public.example_fn(bigint) to service_role;
-- grant execute on function public.example_fn(bigint) to authenticated;   -- only if the browser calls it

-- VIEW -------------------------------------------------------------------
create or replace view public.example_v with (security_invoker = on) as
  select id, note from public.example;
```

## The guard

`test/migration-rules.test.js` runs with the normal test command (`node --test test/migration-rules.test.js` to run just this one). It reads every migration **created on or after 2026-10-22** (by the date in the
file name, or by number above 7 for undated numbered files; older files are grandfathered) and fails when, within the same file:

- a `create table` has no `enable row level security` for that table, or no `grant ... to service_role` covering it;
- a `create function` / `create or replace function` has no `revoke execute ... from public` for it;
- a `create view` / `create or replace view` has no `security_invoker = on`.

It strips comments, ignores schema prefixes and quoting, is case-insensitive, and accepts a dynamic
`format('... %I ...')` loop as covering its tables. Name migrations with a date prefix (`YYYYMMDD...`) so the guard sees them.

**Legitimate exceptions.** A `create or replace function` that only changes the body of an existing function keeps
its grants, so the rule does not apply: put `-- migration-rules: ignore function (replaces existing, ACL kept)` in the
file. The same marker exists for `table` and `view`; `all` skips the file. Say why. Files that already failed when the
guard was added are listed with a reason in the test's `ACKNOWLEDGED` map.
