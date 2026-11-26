-- Rookery Stage 6: puzzles, game reviews, friends, notifications, tournaments, search, opening
-- explorer, more achievements, and moderation (reports, restrictions, chat review, staff).
--
-- Trust model (unchanged): browsers use the publishable key and Row Level Security; anything that
-- decides a result, a rating or a sanction is written by trusted server code (the service role) or
-- by staff, never by the player it concerns. Privileges are granted explicitly at the end.

-- ══ Staff ═══════════════════════════════════════════════════════════════════════════════════
create table public.staff (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role       text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()))
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'admin')
$$;

create policy "staff see the staff list" on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- ══ Notifications ═══════════════════════════════════════════════════════════════════════════
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in (
               'friend_request', 'friend_accepted', 'achievement', 'tournament_started',
               'tournament_finished', 'report_resolved', 'restriction')),
  actor_id   uuid references public.profiles (id) on delete set null,
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_recent on public.notifications (user_id, created_at desc);
create index notifications_user_unread on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- Notifications are inserted only by triggers and server code, through this helper.
create function public.notify(p_user uuid, p_kind text, p_actor uuid, p_data jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, actor_id, data) values (p_user, p_kind, p_actor, coalesce(p_data, '{}'))
$$;

-- ══ Restrictions and the moderation log ════════════════════════════════════════════════════
create table public.restrictions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('mute', 'no_play', 'no_tournaments', 'ban')),
  reason     text not null check (char_length(reason) between 3 and 500),
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  lifted_at  timestamptz,
  lifted_by  uuid references public.profiles (id) on delete set null
);
create index restrictions_user on public.restrictions (user_id, created_at desc);
alter table public.restrictions enable row level security;
create policy "players see their own restrictions; staff see all" on public.restrictions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
-- Moderators may mute and restrict play; only admins may ban (bans go through the server API,
-- which also blocks sign-in). Nobody may restrict themselves or another staff member.
create policy "staff add restrictions" on public.restrictions for insert to authenticated
  with check (
    public.is_staff() and created_by = (select auth.uid()) and user_id <> (select auth.uid())
    and (kind <> 'ban' or public.is_admin())
    and not exists (select 1 from public.staff s where s.user_id = restrictions.user_id)
  );
create policy "staff lift restrictions" on public.restrictions for update to authenticated
  using (public.is_staff() and (kind <> 'ban' or public.is_admin())) with check (public.is_staff());

/** Whether a restriction of `p_kind` (or a ban, which implies everything) is in force. */
create function public.is_restricted(p_user uuid, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restrictions r
     where r.user_id = p_user and r.lifted_at is null
       and (r.expires_at is null or r.expires_at > now())
       and (r.kind = p_kind or r.kind = 'ban'))
$$;

-- A ban also marks the profile (shown publicly as a closed account).
create function public.sync_ban_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_banned = public.is_restricted(new.user_id, 'ban') where id = new.user_id;
  perform public.notify(new.user_id, 'restriction', null, jsonb_build_object('kind', new.kind, 'reason', new.reason, 'expires_at', new.expires_at, 'lifted', new.lifted_at is not null));
  return new;
end $$;
create trigger restrictions_sync after insert or update on public.restrictions
  for each row execute function public.sync_ban_flag();

create table public.moderation_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  target_id  uuid references public.profiles (id) on delete set null,
  details    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index moderation_log_recent on public.moderation_log (created_at desc);
alter table public.moderation_log enable row level security;
create policy "staff read the moderation log" on public.moderation_log for select to authenticated using (public.is_staff());

create function public.log_restriction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.moderation_log (actor_id, action, target_id, details)
  values (
    coalesce(case when tg_op = 'UPDATE' then new.lifted_by end, new.created_by),
    case when tg_op = 'INSERT' then 'restrict:' || new.kind else 'lift:' || new.kind end,
    new.user_id,
    jsonb_build_object('restriction_id', new.id, 'reason', new.reason, 'expires_at', new.expires_at));
  return new;
end $$;
create trigger restrictions_log after insert or update of lifted_at on public.restrictions
  for each row execute function public.log_restriction();

-- ══ Reports ═════════════════════════════════════════════════════════════════════════════════
create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  target_id   uuid not null references public.profiles (id) on delete cascade,
  game_id     text check (game_id is null or game_id ~ '^[A-Za-z0-9]{8,24}$'),
  reason      text not null check (reason in ('cheating', 'abuse', 'spam', 'inappropriate_profile', 'sandbagging', 'other')),
  details     text check (details is null or char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution  text check (resolution is null or char_length(resolution) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  check (reporter_id <> target_id)
);
create index reports_open on public.reports (created_at) where status = 'open';
create index reports_target on public.reports (target_id, created_at desc);
alter table public.reports enable row level security;
create policy "reporters see their reports; staff see all" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());
create policy "players file reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and resolution is null and resolved_by is null);
create policy "staff handle reports" on public.reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Abuse prevention: at most 10 reports a day, and one open report per target per reporter.
create function public.check_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'report_limit' using hint = 'You can file at most 10 reports a day.';
  end if;
  if exists (select 1 from public.reports where reporter_id = new.reporter_id and target_id = new.target_id and status = 'open') then
    raise exception 'report_duplicate' using hint = 'You already have an open report about this player.';
  end if;
  return new;
end $$;
create trigger reports_check before insert on public.reports for each row execute function public.check_report();

create function public.log_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status then
    new.resolved_by := (select auth.uid());
    new.resolved_at := now();
    insert into public.moderation_log (actor_id, action, target_id, details)
    values ((select auth.uid()), 'report:' || new.status, new.target_id, jsonb_build_object('report_id', new.id, 'resolution', new.resolution));
    perform public.notify(new.reporter_id, 'report_resolved', null, jsonb_build_object('report_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;
create trigger reports_log before update on public.reports for each row execute function public.log_report();

-- ══ In-game chat (kept for moderation) ═══════════════════════════════════════════════════
create table public.chat_messages (
  id         bigint generated always as identity primary key,
  game_id    text not null check (game_id ~ '^[A-Za-z0-9]{8,24}$'),
  user_id    uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 140),
  flagged    boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_game on public.chat_messages (game_id, created_at);
create index chat_messages_user on public.chat_messages (user_id, created_at desc);
alter table public.chat_messages enable row level security;
-- Written only by the game server; read only by staff (players see chat live in the game).
create policy "staff read chat" on public.chat_messages for select to authenticated using (public.is_staff());

-- ══ Friends ═════════════════════════════════════════════════════════════════════════════════
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on public.friendships (addressee_id);
alter table public.friendships enable row level security;
-- Accepted friendships are public (friends lists on profiles); requests only to the two players.
create policy "friendships visible" on public.friendships for select to anon, authenticated
  using (status = 'accepted' or (select auth.uid()) in (requester_id, addressee_id));
create policy "send friend requests" on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending' and accepted_at is null);
create policy "accept friend requests" on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid())) with check (addressee_id = (select auth.uid()) and status = 'accepted');
create policy "remove friendships" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships
                  where status = 'accepted'
                    and least(requester_id, addressee_id) = least(a, b)
                    and greatest(requester_id, addressee_id) = greatest(a, b))
$$;

create function public.friendship_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.friendships where requester_id = new.requester_id and created_at > now() - interval '1 day') >= 30 then
      raise exception 'friend_limit' using hint = 'You can send at most 30 friend requests a day.';
    end if;
    if exists (select 1 from public.friendships where requester_id = new.addressee_id and addressee_id = new.requester_id) then
      raise exception 'friend_pending' using hint = 'They already sent you a request: accept it instead.';
    end if;
    perform public.notify(new.addressee_id, 'friend_request', new.requester_id, '{}');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    new.accepted_at := now();
    perform public.notify(new.requester_id, 'friend_accepted', new.addressee_id, '{}');
  end if;
  return new;
end $$;
create trigger friendships_insert before insert on public.friendships for each row execute function public.friendship_events();
create trigger friendships_update before update on public.friendships for each row execute function public.friendship_events();

-- ══ Puzzles ═════════════════════════════════════════════════════════════════════════════════
-- Generated by packages/puzzles/generate.mjs (Stockfish-verified, see its header). The solution is
-- never readable by browsers: moves are checked by the server (/api/puzzles), which also updates
-- ratings. Puzzle ratings start from an engine-based estimate and then follow real attempts.
create table public.puzzles (
  id          text primary key check (id ~ '^[A-Za-z0-9_-]{6,16}$'),
  fen         text not null,
  first_move  text not null check (first_move ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  solution    text[] not null check (cardinality(solution) between 1 and 9),
  rating      numeric(7, 2) not null,
  rd          numeric(6, 2) not null default 350,
  volatility  numeric(8, 6) not null default 0.06,
  plays       integer not null default 0,
  solves      integer not null default 0,
  themes      text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index puzzles_rating on public.puzzles (rating);
create index puzzles_themes on public.puzzles using gin (themes);
alter table public.puzzles enable row level security;
create policy "puzzles are public" on public.puzzles for select to anon, authenticated using (true);

create table public.puzzle_attempts (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  puzzle_id     text not null references public.puzzles (id) on delete cascade,
  solved        boolean not null,
  rated         boolean not null,
  rating_before numeric(7, 2),
  rating_after  numeric(7, 2),
  created_at    timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);
create index puzzle_attempts_recent on public.puzzle_attempts (user_id, created_at desc);
alter table public.puzzle_attempts enable row level security;
create policy "own puzzle history" on public.puzzle_attempts for select to authenticated using (user_id = (select auth.uid()));

create table public.daily_puzzles (
  day       date primary key,
  puzzle_id text not null references public.puzzles (id) on delete cascade
);
alter table public.daily_puzzles enable row level security;
create policy "daily puzzles are public" on public.daily_puzzles for select to anon, authenticated using (true);

/**
 * Today's puzzle (UTC). Chosen once per day, deterministically, from puzzles of moderate
 * difficulty with more than one move, never repeating; then fixed for everyone.
 */
create function public.daily_puzzle() returns text
language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'utc')::date;
  pid text;
begin
  select puzzle_id into pid from public.daily_puzzles where day = d;
  if pid is not null then return pid; end if;
  select p.id into pid from public.puzzles p
   where p.rating between 500 and 1600 and cardinality(p.solution) >= 3
     and not exists (select 1 from public.daily_puzzles dp where dp.puzzle_id = p.id)
   order by md5(p.id || d::text) limit 1;
  if pid is null then
    select p.id into pid from public.puzzles p order by md5(p.id || d::text) limit 1;
  end if;
  if pid is null then return null; end if;
  insert into public.daily_puzzles (day, puzzle_id) values (d, pid) on conflict (day) do nothing;
  select puzzle_id into pid from public.daily_puzzles where day = d;
  return pid;
end $$;

/**
 * Next puzzle to practise: one the player hasn't tried, near their puzzle rating (or near
 * `p_rating` for guests), optionally of one theme. Widens the window if nothing is close.
 */
create function public.next_puzzle(p_theme text default null, p_rating numeric default null, p_exclude text[] default '{}')
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  target numeric := p_rating;
  pid text;
  w numeric;
begin
  if me is not null then
    select rating into target from public.ratings where user_id = me and category = 'puzzle';
  end if;
  target := coalesce(target, 500);
  foreach w in array array[100, 250, 500, 5000] loop
    select p.id into pid from public.puzzles p
     where abs(p.rating - target) <= w
       and (p_theme is null or p_theme = any (p.themes))
       and not (p.id = any (coalesce(p_exclude, '{}')))
       and (me is null or not exists (select 1 from public.puzzle_attempts a where a.user_id = me and a.puzzle_id = p.id))
     order by random() limit 1;
    exit when pid is not null;
  end loop;
  return pid;
end $$;

/** Public puzzle statistics for a player (counts only; the attempts themselves are private). */
create function public.puzzle_stats(p_user uuid)
returns table (attempts integer, solved integer, solved_today integer, best_streak integer, current_streak integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  r record;
  run integer := 0;
begin
  attempts := 0; solved := 0; solved_today := 0; best_streak := 0; current_streak := 0;
  for r in select a.solved, a.created_at from public.puzzle_attempts a where a.user_id = p_user and a.rated order by a.created_at loop
    attempts := attempts + 1;
    if r.solved then
      solved := solved + 1;
      run := run + 1;
      if r.created_at >= date_trunc('day', now()) then solved_today := solved_today + 1; end if;
    else
      run := 0;
    end if;
    best_streak := greatest(best_streak, run);
  end loop;
  current_streak := run;
  return next;
end $$;

/**
 * Records a player's first (rated) attempt at a puzzle and both rating updates, in one
 * transaction. Called only by the server, which checked the moves and computed the update.
 * Later attempts at the same puzzle are practice: not recorded, ratings unchanged.
 */
create function public.record_puzzle_attempt(p_user uuid, p_puzzle text, p_solved boolean, p_user_rating jsonb, p_puzzle_rating jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ur public.ratings%rowtype;
  pr public.puzzles%rowtype;
begin
  if exists (select 1 from public.puzzle_attempts where user_id = p_user and puzzle_id = p_puzzle) then
    return jsonb_build_object('rated', false);
  end if;
  select * into ur from public.ratings where user_id = p_user and category = 'puzzle' for update;
  select * into pr from public.puzzles where id = p_puzzle for update;
  if ur.user_id is null or pr.id is null then raise exception 'missing rating or puzzle'; end if;
  if abs(ur.rating - (p_user_rating->'before'->>'rating')::numeric) > 0.01
     or abs(pr.rating - (p_puzzle_rating->'before'->>'rating')::numeric) > 0.01 then
    raise exception 'rating_changed';
  end if;
  insert into public.puzzle_attempts (user_id, puzzle_id, solved, rated, rating_before, rating_after)
  values (p_user, p_puzzle, p_solved, true, ur.rating, (p_user_rating->'after'->>'rating')::numeric);
  update public.ratings set
    rating = (p_user_rating->'after'->>'rating')::numeric,
    rd = (p_user_rating->'after'->>'rd')::numeric,
    volatility = (p_user_rating->'after'->>'volatility')::numeric,
    games = games + 1,
    peak = greatest(coalesce(peak, 0), (p_user_rating->'after'->>'rating')::numeric),
    updated_at = now()
  where user_id = p_user and category = 'puzzle';
  update public.puzzles set
    rating = (p_puzzle_rating->'after'->>'rating')::numeric,
    rd = (p_puzzle_rating->'after'->>'rd')::numeric,
    volatility = (p_puzzle_rating->'after'->>'volatility')::numeric,
    plays = plays + 1,
    solves = solves + case when p_solved then 1 else 0 end
  where id = p_puzzle;
  insert into public.rating_history (user_id, category, rating, rd, game_id)
  values (p_user, 'puzzle', (p_user_rating->'after'->>'rating')::numeric, (p_user_rating->'after'->>'rd')::numeric, null);
  return jsonb_build_object('rated', true, 'achievements', (select coalesce(jsonb_agg(a), '[]') from public.award_achievements(p_user) as a));
end $$;

-- ══ Game reviews (Stockfish analysis, computed in the players' browsers) ═══════════════════
create table public.game_reviews (
  game_id    text primary key references public.games (id) on delete cascade,
  evals      jsonb not null check (jsonb_typeof(evals) = 'array' and jsonb_array_length(evals) <= 1001 and octet_length(evals::text) <= 200000),
  engine     text not null check (char_length(engine) <= 60),
  depth      integer not null check (depth between 1 and 40),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.game_reviews enable row level security;
create policy "reviews are public" on public.game_reviews for select to anon, authenticated using (true);
-- Only a player of the game may save (or re-save, deeper) its review.
create policy "players save reviews" on public.game_reviews for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.games g where g.id = game_id and (select auth.uid()) in (g.white_id, g.black_id)));
create policy "players update reviews" on public.game_reviews for update to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and (select auth.uid()) in (g.white_id, g.black_id)))
  with check (created_by = (select auth.uid()));

-- ══ Tournaments (arena) ════════════════════════════════════════════════════════════════════
-- Run live by a Tournament Durable Object; stored here for listings and history. Only the server
-- writes these tables.
create table public.tournaments (
  id               text primary key check (id ~ '^[A-Za-z0-9]{8,24}$'),
  name             text not null check (char_length(name) between 3 and 40 and name !~ '[\x00-\x1f]'),
  created_by       uuid references public.profiles (id) on delete set null,
  time_control     text not null check (time_control ~ '^\d{1,3}\+\d{1,3}$'),
  category         text not null check (category in ('bullet', 'blitz', 'rapid', 'classical')),
  rated            boolean not null default true,
  starts_at        timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 10 and 180),
  status           text not null default 'scheduled' check (status in ('scheduled', 'running', 'finished', 'cancelled')),
  winner_id        uuid references public.profiles (id) on delete set null,
  player_count     integer not null default 0,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create index tournaments_upcoming on public.tournaments (starts_at) where status in ('scheduled', 'running');
create index tournaments_recent on public.tournaments (finished_at desc) where status = 'finished';
alter table public.tournaments enable row level security;
create policy "tournaments are public" on public.tournaments for select to anon, authenticated using (true);

create table public.tournament_players (
  tournament_id text not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  score         integer not null default 0,
  games         integer not null default 0,
  wins          integer not null default 0,
  draws         integer not null default 0,
  losses        integer not null default 0,
  rating        integer not null,
  rank          integer,
  withdrawn     boolean not null default false,
  joined_at     timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index tournament_players_user on public.tournament_players (user_id);
alter table public.tournament_players enable row level security;
create policy "standings are public" on public.tournament_players for select to anon, authenticated using (true);

alter table public.games add column tournament_id text references public.tournaments (id) on delete set null;
create index games_tournament on public.games (tournament_id) where tournament_id is not null;
alter table public.games drop constraint if exists games_source_check;
alter table public.games add constraint games_source_check check (source in ('bot', 'online', 'challenge', 'tournament'));

-- record_online_game now also records tournament games.
create or replace function public.record_online_game(p_game jsonb, p_white jsonb, p_black jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g_id     text := p_game->>'id';
  w_id     uuid := (p_game->>'white_id')::uuid;
  b_id     uuid := (p_game->>'black_id')::uuid;
  is_rated boolean := coalesce((p_game->>'rated')::boolean, false);
  cat      text := p_game->>'category';
  src      text := p_game->>'source';
  t_id     text := p_game->>'tournament_id';
  w        public.ratings%rowtype;
  b        public.ratings%rowtype;
  inserted text;
  w_ach    text[];
  b_ach    text[];
begin
  if g_id is null or g_id !~ '^[A-Za-z0-9]{8,24}$' then raise exception 'invalid game id'; end if;
  if w_id is null or b_id is null or w_id = b_id then raise exception 'a game needs two different players'; end if;
  if src not in ('online', 'challenge', 'tournament') then raise exception 'invalid source'; end if;
  if (src = 'tournament') <> (t_id is not null) then raise exception 'tournament games need a tournament'; end if;

  if exists (select 1 from public.games where id = g_id) then
    return jsonb_build_object('duplicate', true);
  end if;

  if is_rated then
    if cat not in ('bullet', 'blitz', 'rapid', 'classical') then raise exception 'unrated category'; end if;
    perform 1 from public.ratings where user_id in (w_id, b_id) and category = cat order by user_id for update;
    select * into w from public.ratings where user_id = w_id and category = cat;
    select * into b from public.ratings where user_id = b_id and category = cat;
    if w.user_id is null or b.user_id is null then raise exception 'missing rating row'; end if;
    if abs(w.rating - (p_white->'before'->>'rating')::numeric) > 0.01
       or abs(w.rd - (p_white->'before'->>'rd')::numeric) > 0.01
       or abs(b.rating - (p_black->'before'->>'rating')::numeric) > 0.01
       or abs(b.rd - (p_black->'before'->>'rd')::numeric) > 0.01 then
      raise exception 'rating_changed';
    end if;
  end if;

  insert into public.games (
    id, white_id, black_id, source, rated, category, time_control, initial_fen, moves, plies,
    result, termination, opening, white_rating, black_rating, white_delta, black_delta, started_at, ended_at, tournament_id
  ) values (
    g_id, w_id, b_id, src, is_rated, cat, p_game->>'time_control', p_game->>'initial_fen',
    coalesce(p_game->>'moves', ''), (p_game->>'plies')::integer, p_game->>'result', p_game->>'termination',
    p_game->>'opening',
    case when is_rated then round(w.rating)::integer end,
    case when is_rated then round(b.rating)::integer end,
    case when is_rated then round((p_white->'after'->>'rating')::numeric - w.rating)::integer end,
    case when is_rated then round((p_black->'after'->>'rating')::numeric - b.rating)::integer end,
    (p_game->>'started_at')::timestamptz, coalesce((p_game->>'ended_at')::timestamptz, now()), t_id
  )
  on conflict (id) do nothing
  returning id into inserted;

  if inserted is null then
    return jsonb_build_object('duplicate', true);
  end if;

  if is_rated then
    update public.ratings set
      rating = (p_white->'after'->>'rating')::numeric, rd = (p_white->'after'->>'rd')::numeric,
      volatility = (p_white->'after'->>'volatility')::numeric, games = games + 1,
      peak = greatest(coalesce(peak, 0), (p_white->'after'->>'rating')::numeric), updated_at = now()
    where user_id = w_id and category = cat;
    update public.ratings set
      rating = (p_black->'after'->>'rating')::numeric, rd = (p_black->'after'->>'rd')::numeric,
      volatility = (p_black->'after'->>'volatility')::numeric, games = games + 1,
      peak = greatest(coalesce(peak, 0), (p_black->'after'->>'rating')::numeric), updated_at = now()
    where user_id = b_id and category = cat;
    insert into public.rating_history (user_id, category, rating, rd, game_id) values
      (w_id, cat, (p_white->'after'->>'rating')::numeric, (p_white->'after'->>'rd')::numeric, g_id),
      (b_id, cat, (p_black->'after'->>'rating')::numeric, (p_black->'after'->>'rd')::numeric, g_id);
  end if;

  select coalesce(array_agg(a), '{}') into w_ach from public.award_achievements(w_id) as a;
  select coalesce(array_agg(a), '{}') into b_ach from public.award_achievements(b_id) as a;
  return jsonb_build_object('duplicate', false, 'white_achievements', to_jsonb(w_ach), 'black_achievements', to_jsonb(b_ach));
end;
$$;

-- ══ Player search and the opening explorer ═════════════════════════════════════════════════
create index profiles_username_prefix on public.profiles (lower(username::text) text_pattern_ops);

create function public.search_players(q text, lim integer default 20)
returns table (id uuid, username text, display_name text, avatar_path text, country text, blitz integer, rapid integer)
language sql stable set search_path = '' as $$
  select p.id, p.username::text, p.display_name, p.avatar_path, p.country,
         (select round(r.rating)::integer from public.ratings r where r.user_id = p.id and r.category = 'blitz'),
         (select round(r.rating)::integer from public.ratings r where r.user_id = p.id and r.category = 'rapid')
    from public.profiles p
   where char_length(trim(q)) >= 2
     and not p.is_banned
     and (lower(p.username::text) like lower(replace(replace(trim(q), '%', ''), '_', '\_')) || '%'
          or p.display_name ilike '%' || replace(replace(trim(q), '%', ''), '_', '\_') || '%')
   order by lower(p.username::text) like lower(trim(q)) || '%' desc, p.username
   limit least(greatest(lim, 1), 50)
$$;

create index games_moves_prefix on public.games (left(moves, 200) text_pattern_ops);

/**
 * Opening explorer over games played on Rookery: for the position reached by `p_moves` (UCI,
 * space-separated, from the standard start), the moves played next and how those games ended.
 * `p_source`: 'people' (games between players), 'computer' (games against computer opponents)
 * or 'all'.
 */
create function public.explorer_moves(p_moves text default '', p_source text default 'people', p_rated_only boolean default false)
returns table (move text, games bigint, white_wins bigint, draws bigint, black_wins bigint, avg_rating integer)
language sql stable set search_path = '' as $$
  with base as (
    select g.*, case when p_moves = '' then g.moves else substr(g.moves, char_length(p_moves) + 2) end as rest
      from public.games g
     where g.initial_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
       and char_length(p_moves) <= 195
       and p_moves ~ '^([a-h][1-8][a-h][1-8][qrbn]?( |$))*$'
       and (p_moves = '' or left(g.moves, 200) like p_moves || ' %')
       and (p_source = 'all' or (p_source = 'people' and g.source <> 'bot') or (p_source = 'computer' and g.source = 'bot'))
       and (not p_rated_only or g.rated)
  )
  select split_part(rest, ' ', 1) as move,
         count(*),
         count(*) filter (where result = '1-0'),
         count(*) filter (where result = '1/2-1/2'),
         count(*) filter (where result = '0-1'),
         round(avg((coalesce(white_rating, 0) + coalesce(black_rating, 0)) / 2.0) filter (where white_rating is not null))::integer
    from base
   where split_part(rest, ' ', 1) <> ''
   group by 1
   order by 2 desc, 1
   limit 30
$$;

-- ══ Achievements: more to earn, and a notification for each ══════════════════════════════
insert into public.achievements (id, name, description, tier, icon, sort) values
  ('online-win',      'Worthy opponent',  'Win a game against another player',        'bronze', 'swords',    120),
  ('rated-ten',       'On the ladder',    'Finish 10 rated games',                     'silver', 'zap',       130),
  ('puzzle-ten',      'Puzzler',          'Solve 10 rated puzzles',                    'bronze', 'puzzle',    140),
  ('puzzle-hundred',  'Puzzle master',    'Solve 100 rated puzzles',                   'gold',   'puzzle',    150),
  ('puzzle-streak',   'In the zone',      'Solve 10 rated puzzles in a row',           'silver', 'target',    160),
  ('tournament-play', 'Competitor',       'Play a game in a tournament',               'bronze', 'hourglass', 170),
  ('tournament-win',  'Champion',         'Win a tournament',                          'gold',   'crown',     180),
  ('friends-five',    'Club regular',     'Have 5 friends',                            'bronze', 'shield',    190)
on conflict (id) do nothing;

create or replace function public.award_achievements(p_user uuid)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  earned text[] := array[]::text[];
  r record;
  ps record;
  got text;
begin
  select count(*) as games,
         count(*) filter (where outcome = 'win') as wins,
         count(*) filter (where outcome = 'win' and side = 'black') as black_wins,
         count(*) filter (where outcome = 'win' and termination = 'checkmate' and plies <= 20) as quick_mates,
         count(distinct (ended_at at time zone 'utc')::date) as days,
         coalesce(max(bot_elo) filter (where outcome = 'win'), 0) as best_bot_win,
         count(*) filter (where outcome = 'win' and bot_id = 'corvus') as corvus_wins,
         count(*) filter (where outcome = 'win' and source <> 'bot') as online_wins,
         count(*) filter (where rated) as rated_games,
         count(*) filter (where source = 'tournament') as tournament_games
    into r
    from public.player_game_results
   where user_id = p_user;
  select * into ps from public.puzzle_stats(p_user);

  if r.games >= 1 then earned := array_append(earned, 'first-game'); end if;
  if r.wins >= 1 then earned := array_append(earned, 'first-win'); end if;
  if r.black_wins >= 1 then earned := array_append(earned, 'win-as-black'); end if;
  if r.quick_mates >= 1 then earned := array_append(earned, 'quick-mate'); end if;
  if r.games >= 10 then earned := array_append(earned, 'ten-games'); end if;
  if r.games >= 50 then earned := array_append(earned, 'fifty-games'); end if;
  if r.days >= 7 then earned := array_append(earned, 'seven-days'); end if;
  if r.best_bot_win >= 1300 then earned := array_append(earned, 'beat-club'); end if;
  if r.best_bot_win >= 1800 then earned := array_append(earned, 'beat-expert'); end if;
  if r.best_bot_win >= 2300 then earned := array_append(earned, 'beat-master'); end if;
  if r.corvus_wins >= 1 then earned := array_append(earned, 'beat-corvus'); end if;
  if r.online_wins >= 1 then earned := array_append(earned, 'online-win'); end if;
  if r.rated_games >= 10 then earned := array_append(earned, 'rated-ten'); end if;
  if r.tournament_games >= 1 then earned := array_append(earned, 'tournament-play'); end if;
  if ps.solved >= 10 then earned := array_append(earned, 'puzzle-ten'); end if;
  if ps.solved >= 100 then earned := array_append(earned, 'puzzle-hundred'); end if;
  if ps.best_streak >= 10 then earned := array_append(earned, 'puzzle-streak'); end if;
  if exists (select 1 from public.tournaments t where t.winner_id = p_user and t.status = 'finished') then
    earned := array_append(earned, 'tournament-win');
  end if;
  if (select count(*) from public.friendships f where f.status = 'accepted' and p_user in (f.requester_id, f.addressee_id)) >= 5 then
    earned := array_append(earned, 'friends-five');
  end if;

  for got in
    insert into public.user_achievements (user_id, achievement_id)
    select p_user, a from unnest(earned) as a
    on conflict do nothing
    returning achievement_id
  loop
    perform public.notify(p_user, 'achievement', null, jsonb_build_object('achievement_id', got));
    return next got;
  end loop;
end;
$$;

create function public.award_after_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.award_achievements(new.requester_id);
  perform public.award_achievements(new.addressee_id);
  return new;
end $$;
create trigger friendships_award after update on public.friendships for each row
  when (new.status = 'accepted') execute function public.award_after_friendship();

-- ══ Privileges (explicit; see 20261127000000_explicit_grants.sql) ═════════════════════════
grant select on public.staff, public.restrictions, public.moderation_log, public.reports,
  public.chat_messages, public.notifications, public.puzzle_attempts to authenticated;
grant select on public.friendships, public.daily_puzzles, public.game_reviews, public.tournaments,
  public.tournament_players to anon, authenticated;
-- Puzzles: everything except the solution.
grant select (id, fen, first_move, rating, rd, plays, solves, themes, created_at) on public.puzzles to anon, authenticated;

grant insert (target_id, game_id, reason, details) on public.reports to authenticated;
grant update (status, resolution) on public.reports to authenticated; -- policy: staff only
grant insert (user_id, kind, reason, expires_at) on public.restrictions to authenticated; -- policy: staff only
grant update (lifted_at, lifted_by) on public.restrictions to authenticated; -- policy: staff only
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
grant insert (addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant delete on public.friendships to authenticated;
grant insert (game_id, evals, engine, depth) on public.game_reviews to authenticated;
grant update (evals, engine, depth, updated_at) on public.game_reviews to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.notify(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_puzzle_attempt(uuid, text, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.notify(uuid, text, uuid, jsonb), public.record_puzzle_attempt(uuid, text, boolean, jsonb, jsonb) to service_role;
revoke all on function public.is_restricted(uuid, text), public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.is_restricted(uuid, text), public.are_friends(uuid, uuid) to authenticated, service_role;
grant execute on function public.daily_puzzle(), public.next_puzzle(text, numeric, text[]), public.puzzle_stats(uuid),
  public.search_players(text, integer), public.explorer_moves(text, text, boolean), public.is_staff(), public.is_admin()
  to anon, authenticated, service_role;
revoke all on function public.award_after_friendship(), public.friendship_events(), public.check_report(), public.log_report(),
  public.sync_ban_flag(), public.log_restriction() from public, anon, authenticated;
