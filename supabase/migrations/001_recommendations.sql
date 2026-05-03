-- recommendations table
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  guest_name text not null,
  category text not null check (category in ('restaurant','bar','cafe','activity','beach','shopping','other')),
  place_name text not null,
  comment text not null,
  featured boolean default false
);

-- RLS
alter table public.recommendations enable row level security;

-- Anon can insert only
create policy "guests can submit" on public.recommendations
  for insert to anon with check (true);

-- Authenticated (admin) can do everything
create policy "admin full access" on public.recommendations
  for all to authenticated using (true) with check (true);
