-- 002_pool_health.sql — server-side pool/spa health check
-- spa_timer was created via the dashboard; back-fill its shape and add columns.
create table if not exists public.spa_timer (
  id         bigint primary key,
  end_time   bigint  default 0,
  started_at bigint  default 0,
  source     text    default 'init'
);

alter table public.spa_timer add column if not exists state            text        default 'idle';
alter table public.spa_timer add column if not exists shutoff_attempts integer     default 0;
alter table public.spa_timer add column if not exists spa_mode_since   bigint      default 0;
alter table public.spa_timer add column if not exists alerted          boolean     default false;
alter table public.spa_timer add column if not exists updated_at       timestamptz default now();

-- ensure the single control row exists and has a state
insert into public.spa_timer (id, end_time, started_at, source, state)
values (1, 0, 0, 'init', 'idle')
on conflict (id) do update set state = coalesce(public.spa_timer.state, 'idle');

create table if not exists public.pool_health_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  source     text,
  found      jsonb,
  action     text,
  success    boolean,
  detail     text
);

alter table public.pool_health_log enable row level security;
drop policy if exists "admin read health log" on public.pool_health_log;
create policy "admin read health log" on public.pool_health_log
  for select to authenticated using (true);
