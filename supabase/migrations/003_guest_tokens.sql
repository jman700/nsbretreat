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
