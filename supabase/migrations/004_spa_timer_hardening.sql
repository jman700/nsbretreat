-- 004_spa_timer_hardening.sql
alter table public.spa_timer
  add column if not exists shutting_off_since bigint default 0,
  add column if not exists early_end_count    int    default 0;
