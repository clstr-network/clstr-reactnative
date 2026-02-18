-- Profile views tracking with RLS-safe counting
-- Creates profile_views table and secure RPC for owner-only counts

create table if not exists public.profile_views (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    viewer_id uuid references public.profiles(id) on delete set null,
    viewed_at timestamptz not null default now()
);

comment on table public.profile_views is 'Per-view audit for profile analytics';

create index if not exists profile_views_profile_idx on public.profile_views (profile_id);
create index if not exists profile_views_viewer_idx on public.profile_views (viewer_id);
create index if not exists profile_views_profile_viewed_at_idx on public.profile_views (profile_id, viewed_at desc);

alter table public.profile_views enable row level security;

-- Owners can read views for their own profile
create policy profile_views_owner_select
  on public.profile_views
  for select
  using (auth.uid() = profile_id);

-- Viewers can insert their own views (optionally used by future tracking)
create policy profile_views_viewer_insert
  on public.profile_views
  for insert
  with check (auth.uid() = viewer_id);

-- Optional: allow viewers to see their own rows (not required for counts but safe)
create policy profile_views_viewer_select
  on public.profile_views
  for select
  using (auth.uid() = viewer_id);

-- Secure RPC to count views for a profile owner
create or replace function public.get_profile_views_count(p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'Not authenticated';
  end if;

  if requester <> p_profile_id then
    raise exception 'Forbidden';
  end if;

  return (select count(*) from public.profile_views where profile_id = p_profile_id);
end;
$$;

grant execute on function public.get_profile_views_count(uuid) to authenticated;
revoke execute on function public.get_profile_views_count(uuid) from anon;

-- Ensure realtime publication
alter publication supabase_realtime add table public.profile_views;
