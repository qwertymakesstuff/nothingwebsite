-- Rookery: identity foundation (Phase 0).
-- Public profile, private personal data (date of birth), per-user settings and ratings.
-- Everything is behind Row Level Security. Ratings are written only by trusted server code
-- (service role), never by browsers.

create extension if not exists citext with schema extensions;

-- ── Public profile ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     extensions.citext not null unique
               check (username ~ '^[A-Za-z0-9_-]{3,20}$'),
  display_name text check (char_length(display_name) <= 40),
  avatar_url   text,
  bio          text check (char_length(bio) <= 300),
  country      char(2),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  is_banned    boolean not null default false
);

comment on table public.profiles is 'Public player profile. Readable by everyone.';

-- ── Private personal data (owner-only) ────────────────────────────────────────────────────
create table public.user_private (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  birth_date date not null
);

comment on table public.user_private is
  'Personal data that is never shown publicly. birth_date gates sign-up (13+) and chat (13+).';

-- ── Settings ──────────────────────────────────────────────────────────────────────────────
create table public.user_settings (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  board_theme      text not null default 'slate',
  piece_set        text not null default 'cburnett',
  background       text not null default 'club',
  sound_on         boolean not null default true,
  show_coords      boolean not null default true,
  highlight_moves  boolean not null default true,
  auto_queen       boolean not null default false,
  confirm_resign   boolean not null default true,
  allow_challenges text not null default 'all' check (allow_challenges in ('all', 'friends', 'none')),
  chat             text not null default 'all' check (chat in ('all', 'friends', 'presets', 'off')),
  updated_at       timestamptz not null default now()
);

-- ── Ratings (Glicko-2, one row per user per category) ─────────────────────────────────────
create table public.ratings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  category   text not null check (category in ('bullet', 'blitz', 'rapid', 'classical', 'puzzle')),
  rating     numeric(7, 2) not null default 1500,
  rd         numeric(6, 2) not null default 350,
  volatility numeric(8, 6) not null default 0.06,
  games      integer not null default 0,
  peak       numeric(7, 2),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

-- ── Age helper ────────────────────────────────────────────────────────────────────────────
create function public.age_on(birth date, on_day date default current_date)
returns integer
language sql immutable
as $$ select extract(year from age(on_day, birth))::integer $$;

-- ── New user → profile, private data, settings ────────────────────────────────────────────
-- Sign-up passes { username, birth_date } in user metadata. The website checks both first;
-- this trigger is the backstop, so an under-13 sign-up fails even if the browser is bypassed.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_birth    date;
begin
  -- Strict YYYY-MM-DD only (Postgres would otherwise accept words like 'today' or 'epoch').
  if coalesce(new.raw_user_meta_data ->> 'birth_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end if;
  begin
    v_birth := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end;

  if v_birth is null then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end if;
  if v_birth > current_date or v_birth < date '1900-01-01' then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end if;
  if public.age_on(v_birth) < 13 then
    raise exception 'You must be at least 13 to create an account' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username) values (new.id, v_username);
  insert into public.user_private (user_id, birth_date) values (new.id, v_birth);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Chat eligibility (13+, not banned), callable by trusted server code.
create function public.can_chat(p_user uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.age_on(up.birth_date) >= 13 and not p.is_banned
       from public.user_private up
       join public.profiles p on p.id = up.user_id
      where up.user_id = p_user),
    false)
$$;

revoke all on function public.can_chat(uuid) from public, anon, authenticated;

-- ── Row Level Security ────────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.user_private  enable row level security;
alter table public.user_settings enable row level security;
alter table public.ratings       enable row level security;

create policy "profiles are public"
  on public.profiles for select to anon, authenticated using (true);

-- Owners may edit only their presentational fields (column grants below restrict the rest).
create policy "owners update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, bio, country) on public.profiles to authenticated;

create policy "owners read their private data"
  on public.user_private for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: only the sign-up trigger (security definer) writes here.
revoke all on public.user_private from anon;
revoke insert, update, delete on public.user_private from authenticated;

create policy "owners read their settings"
  on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "owners update their settings"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "ratings are public"
  on public.ratings for select to anon, authenticated using (true);
-- No write policies: ratings change only through the service role (game results).
