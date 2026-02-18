-- Adds persistent share tracking and keeps posts.shares_count correct.

create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  original_post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_type text not null check (share_type in ('feed', 'club', 'dm')),
  club_id uuid null references public.clubs(id) on delete cascade,
  receiver_id uuid null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.post_shares enable row level security;

-- Users can record shares for themselves.
create policy "Users can insert their own post shares"
  on public.post_shares
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow reading share events for authenticated users (not currently used by UI,
-- but useful for debugging/admin tooling).
create policy "Authenticated users can read post shares"
  on public.post_shares
  for select
  to authenticated
  using (true);

create index if not exists idx_post_shares_original_post_id on public.post_shares(original_post_id);
create index if not exists idx_post_shares_user_id on public.post_shares(user_id);

-- Trigger to keep posts.shares_count in sync.
create or replace function public.update_post_shares_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts
      set shares_count = greatest(coalesce(shares_count, 0) + 1, 0)
      where id = new.original_post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts
      set shares_count = greatest(coalesce(shares_count, 0) - 1, 0)
      where id = old.original_post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_update_post_shares_count on public.post_shares;
create trigger trg_update_post_shares_count
after insert or delete on public.post_shares
for each row
execute function public.update_post_shares_count();

-- Ensure shares are available for postgres_changes subscriptions.
alter publication supabase_realtime add table public.post_shares;
