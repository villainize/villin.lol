-- Run in this project's Supabase SQL Editor. Only pickplay_* objects are changed.
begin;
create table if not exists public.pickplay_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create table if not exists public.pickplay_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.pickplay_members(user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and octet_length(items::text) <= 1000000),
  created_at timestamptz not null default now()
);
create index if not exists pickplay_lists_owner_idx on public.pickplay_lists(owner_id);
alter table public.pickplay_members enable row level security;
alter table public.pickplay_lists enable row level security;
revoke all on public.pickplay_members, public.pickplay_lists from anon, authenticated;
grant select, insert on public.pickplay_members to authenticated;
grant select, insert, delete on public.pickplay_lists to authenticated;
drop policy if exists pickplay_member_read on public.pickplay_members;
create policy pickplay_member_read on public.pickplay_members for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists pickplay_member_join on public.pickplay_members;
create policy pickplay_member_join on public.pickplay_members for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists pickplay_list_read on public.pickplay_lists;
create policy pickplay_list_read on public.pickplay_lists for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists pickplay_list_create on public.pickplay_lists;
create policy pickplay_list_create on public.pickplay_lists for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists pickplay_list_delete on public.pickplay_lists;
create policy pickplay_list_delete on public.pickplay_lists for delete to authenticated using ((select auth.uid()) = owner_id);
notify pgrst, 'reload schema';
commit;
