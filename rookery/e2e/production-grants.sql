-- Makes a local Supabase behave like a production project for testing: newer hosted projects
-- don't give the API roles automatic privileges on new tables, so remove them and re-apply only
-- what the migrations grant explicitly. Run after `supabase db reset` (see e2e/README.md).
revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;
grant update (display_name, avatar_path, bio, country) on public.profiles to authenticated;
grant update (
  board_theme, piece_set, background, sound, show_coords, show_legal_moves, highlight_last_move,
  animation, auto_queen, confirm_resign, reduce_motion, bot_move_speed, bot_chat, allow_challenges, chat
) on public.user_settings to authenticated;
\i /migrations/20261127000000_explicit_grants.sql
notify pgrst, 'reload schema';
