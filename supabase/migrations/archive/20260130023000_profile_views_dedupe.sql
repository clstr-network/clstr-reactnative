-- Enforce one recorded view per viewer per profile per day
-- Use IMMUTABLE function wrapper to satisfy PostgreSQL constraint
create or replace function public.viewed_date(ts timestamptz)
returns date
language sql
immutable
as $$
  select date(ts);
$$;

alter table public.profile_views
  add column if not exists view_date date generated always as (public.viewed_date(viewed_at)) stored;

create unique index if not exists profile_views_daily_unique
  on public.profile_views (profile_id, viewer_id, view_date);
