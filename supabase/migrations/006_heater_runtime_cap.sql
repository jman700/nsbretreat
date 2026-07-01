-- 006_heater_runtime_cap.sql — track continuous spa-heater on-time for the safety backstop.
-- Unix ms when the spa heater was first observed continuously on (0 when off).
alter table public.spa_timer add column if not exists heater_on_since bigint default 0;
