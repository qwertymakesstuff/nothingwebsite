-- Rookery: explicit table privileges for the API roles.
--
-- Earlier migrations relied on Supabase's *default privileges* (every new table in `public`
-- automatically granted to anon/authenticated/service_role). Newer Supabase projects no longer
-- do that, so in production the browser got "permission denied for table profiles". Grant
-- exactly what each role needs instead. Row Level Security still decides which ROWS are visible;
-- these grants only decide which tables and operations a role may attempt at all.
-- Writes by browsers stay limited to the column-level UPDATE grants from earlier migrations.

grant usage on schema public to anon, authenticated, service_role;

-- Public data: anyone may read (RLS policies: "… are public").
grant select on
  public.profiles,
  public.ratings,
  public.rating_history,
  public.games,
  public.achievements,
  public.user_achievements
to anon, authenticated;
grant select on public.player_game_results, public.player_stats to anon, authenticated;

-- Private data: signed-in players only, and RLS limits them to their own row.
grant select on public.user_private, public.user_settings to authenticated;

-- Trusted server code (the Worker with the secret key) records games and manages accounts.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.award_achievements(uuid) to service_role;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
