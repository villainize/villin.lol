create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  site_title text not null default '',
  display_name text not null default '',
  bio text not null default '',
  status text not null default 'online now',
  footer text not null default 'made with villin.lol',
  overlay_tag text not null default 'personal page',
  overlay_title text not null default 'click to enter',
  show_overlay boolean not null default true,
  avatar_text text not null default '',
  avatar_image text not null default '',
  background_image text not null default '',
  audio_url text not null default '',
  accent text not null default '#7ae7ff',
  accent_2 text not null default '#ff7ad9',
  text_color text not null default '#f6f8ff',
  muted_color text not null default 'rgba(246, 248, 255, 0.72)',
  border_color text not null default 'rgba(255, 255, 255, 0.12)',
  card_opacity numeric not null default 0.62,
  background_opacity numeric not null default 0.15,
  effect_opacity numeric not null default 0.38,
  border_size integer not null default 1,
  radius integer not null default 28,
  card_width integer not null default 590,
  avatar_size integer not null default 116,
  effect_type text not null default 'bubbles',
  info_bubbles jsonb not null default '[
    {"label":"handle","value":"","visible":true},
    {"label":"focus","value":"creator mode","visible":true},
    {"label":"location","value":"internet","visible":true}
  ]'::jsonb,
  socials jsonb not null default '[
    {"label":"discord","url":"https://discord.com/"},
    {"label":"github","url":"https://github.com/"},
    {"label":"x","url":"https://x.com/"}
  ]'::jsonb,
  buttons jsonb not null default '[
    {"title":"main link","subtitle":"showcase your important destination","url":"#"},
    {"title":"contact","subtitle":"email, bookings, and messages","url":"#"},
    {"title":"latest project","subtitle":"music, art, stream, or portfolio","url":"#"}
  ]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._-]{3,32}$'),
  constraint profiles_username_reserved check (
    lower(username) not in ('yugioh', 'gs', 'bf', 'bf_stories', 'd.o.t.t', 'v', 'login', 'register', 'studio', 'auth')
  )
);

create or replace function public.sync_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.sync_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
begin
  new_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));

  if new_username = '' then
    raise exception 'username is required';
  end if;

  insert into public.profiles (
    user_id,
    username,
    site_title,
    display_name,
    avatar_text,
    info_bubbles
  )
  values (
    new.id,
    new_username,
    new_username || ' profile',
    new_username,
    upper(left(new_username, 2)),
    jsonb_build_array(
      jsonb_build_object('label', 'handle', 'value', '@' || new_username, 'visible', true),
      jsonb_build_object('label', 'focus', 'value', 'creator mode', 'visible', true),
      jsonb_build_object('label', 'location', 'value', 'internet', 'visible', true)
    )
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
on public.profiles
for select
using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);
