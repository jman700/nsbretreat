-- 005_heater_usage.sql — pool/spa heater usage logging (observation-only)

-- One row per heating episode. Timestamps are Unix ms (bigint), matching spa_timer.
create table if not exists public.heater_sessions (
  id               bigint generated always as identity primary key,
  heater_type      text    not null,           -- 'pool' | 'spa'
  started_at       bigint  not null,           -- Unix ms, first observed on
  last_seen_at     bigint  not null,           -- Unix ms, most recent confirmed on
  ended_at         bigint,                      -- Unix ms, set on close = last_seen_at
  duration_seconds integer,                     -- filled on close
  source           text    default 'external', -- 'pad' | 'external' (best-effort)
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- Unique partial index: enforces at most one open session at a time (the burner
-- heats pool OR spa, never both), and makes the single-open-row read spiral-proof
-- even if a getOpenSession read transiently fails.
create unique index if not exists heater_sessions_active_idx  on public.heater_sessions (is_active) where is_active;
create index        if not exists heater_sessions_started_idx on public.heater_sessions (started_at);

alter table public.heater_sessions enable row level security;
drop policy if exists "admin read heater sessions" on public.heater_sessions;
create policy "admin read heater sessions" on public.heater_sessions
  for select to authenticated using (true);

-- One row per month, entered from the admin panel.
create table if not exists public.heating_bills (
  id              bigint generated always as identity primary key,
  period_month    text unique not null,        -- 'YYYY-MM'
  therms          numeric default 0,
  cost_usd        numeric default 0,
  baseline_therms numeric default 0,           -- non-heater therms to subtract
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.heating_bills enable row level security;
drop policy if exists "admin all heating bills" on public.heating_bills;
create policy "admin all heating bills" on public.heating_bills
  for all to authenticated using (true) with check (true);
