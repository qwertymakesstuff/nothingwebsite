# Rookery: final report (Stages 0–6)

Rookery (chess.missing.website) is a free, open-source chess platform added to the
`nothingwebsite` repository as a separate game in `rookery/`. Nothing outside that folder was
changed. Everything described here is backed by real persistent storage (Supabase Postgres) or real
computation (the authoritative game server and Stockfish); the site contains no sample data.

## 1. What's implemented

| Area | Highlights | Details |
| --- | --- | --- |
| Accounts | Sign-up (13+, enforced in the database), email verification, sign-in/out, sign out everywhere, password reset, change email/password, data download, account deletion | [ACCOUNTS.md](ACCOUNTS.md) |
| Profiles | Avatar, display name, country, bio, friend and report buttons, special badges | |
| Settings | Board, pieces, gameplay, engine, profile, account, social & chat; synced to the account | |
| Computer opponents | 15 personas plus custom strength, Stockfish 19 in a Web Worker, calibrated strength | [AI.md](AI.md) |
| Live multiplayer | Matchmaking by time control and rating, challenges, invitation links, server clocks, draws, rematches, reconnection, abandonment, aborts | [MULTIPLAYER.md](MULTIPLAYER.md) |
| Ratings | Glicko-2 per format (bullet, blitz, rapid, classical, puzzles), everyone starts at 500, updated only from server-verified results | |
| Puzzles | Daily puzzle, unlimited practice near your rating, themes, hints, rated first attempts, streaks; 477 engine-verified puzzles | [PLATFORM.md](PLATFORM.md) |
| Analysis | Live Stockfish analysis (three lines, eval bar, arrow); post-game review with move classification, best moves, accuracy and an evaluation graph | |
| Opening explorer | Next moves and results from Rookery games; CC0 opening names | |
| Tournaments | Arena tournaments created by players; live standings; streak scoring; automatic pairing; results, ranks and a Champion achievement | |
| Social | Friends, player search, notifications (bell + page), in-game chat with presets | |
| Statistics | Rating history chart (with table view), results by colour, type and ending, puzzle stats, openings | |
| Achievements | 19 earned achievements and hand-given special badges | |
| Moderation | Reports, a reports queue, restrictions (mute, no play, no tournaments, ban), bans that block sign-in, player and game review (including chat), a moderation log, a staff role model | |
| Abuse prevention | Rate limits on chat, sockets, challenges, puzzles, reports, friend requests and tournaments; an abort limit; chat filter | |

## 2. Testing

All suites run against a real local Supabase (Postgres 17, Auth, PostgREST, Storage, Mailpit) with
**hosted-project privileges simulated** (`e2e/production-grants.sh`), and the real Worker and
Durable Objects (`wrangler dev`). Separate browser sessions act as separate users.

| Suite | Result |
| --- | --- |
| Database (PGlite): migrations, RLS, grants, triggers, functions | 39 / 39 |
| Worker: game rules, matchmaking, puzzles, chat filter, arena, API | 44 / 44 |
| Core: rules, clocks, Glicko-2 (incl. Glickman's published example) | 18 / 18 |
| AI: personas, strength model, engine driver | 35 / 35 |
| e2e accounts (Stage 4) | 36 / 36 |
| e2e multiplayer (Stage 5): two users, complete games, attacks | 50 / 50 |
| e2e platform (Stage 6): four users incl. moderator and admin, a full tournament | 60 / 60 |
| Route crawl: guest and signed-in, desktop and phone, every internal link | no broken routes, no console errors, no horizontal overflow (after fixes below) |
| Existing site's tests (`tests/music`) | 736 / 736, site files untouched |

### Fixed during the final integration pass

- The dashboard's "System status" check still used a pre-Stage-5 WebSocket route, so it reported
  the live server as down. It now checks the lobby.
- Durable Objects threw "send after close" when a client left during sign-in. Sends now tolerate
  closed sockets.
- The analysis board showed a stale "Stage 3" placeholder; it now has real live engine analysis.
- Removed the "Premoves" setting placeholder and every remaining "Stage N" badge on live features.
- The schema-validation library was removed from the code every page loads.
- Earlier in Stage 6: a migration that would have failed on Postgres (dropping a view column), and
  a grant replay that tripped over a renamed column, were caught by running against real Postgres.

## 3. Outstanding issues and limitations

| Item | Detail |
| --- | --- |
| Puzzle collection is small and skewed | 477 puzzles so far; about 60% are one-move tactics (mostly winning a hanging piece) and mates are rare. The generator can be run again to add more (`packages/puzzles`), and ratings settle as people play. The lichess puzzle database (CC0) would be a better source if it can be downloaded where the generator runs |
| Explorer data is Rookery's own | Empty until people play; there's no masters database |
| Game reviews are computed in the browser | A player could save a fake review of their own game. It's display-only and never affects ratings or results |
| Games against the computer can't be proven fair | They're validated (legal moves, consistent result) and never rated |
| No automated cheat detection | Cheating is handled through reports and moderators |
| The chat filter is basic and English-only | Players can limit chat to friends or presets, or turn it off |
| Deleting an account removes reports about it | It also anonymises its chat. Consider keeping reports, if your policy allows, before you have real moderation cases |
| Not built | Premoves, spectating live games, lag compensation, berserk in arenas, Swiss tournaments, a public friends list on profiles, email notifications |
| Leaderboards | No inactivity filter yet |
| Tournament scale | 200 players per arena; standings show the top 100 live (all are stored) |
| Deploy automation | The GitHub `deploy` job needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; until then Cloudflare's own Git builds deploy |

## 4. Deployment requirements

1. **Merge to main.** CI applies the new migrations to Supabase: starting ratings of 500, Stage 6
   tables and functions, and the puzzles.
2. **Deploy the Worker.** This happens through Cloudflare's Git build, or through the GitHub deploy
   job once its secrets exist. Cloudflare creates the new Tournament Durable Object automatically
   (migration `v3` in `wrangler.jsonc`).
3. **Worker secret `SUPABASE_SECRET_KEY`.** It's already set; keep it as type *Secret*.
4. **Make yourself an admin** in the Supabase SQL editor:
   `insert into public.staff (user_id, role) select id, 'admin' from public.profiles where username = '<you>';`
5. **Never set the test-only variables in production:** `FIRST_MOVE_MS`, `DISCONNECT_GRACE_MS` and
   `TOURNAMENT_TIME_SCALE`. They live only in your local `.dev.vars`.
6. **Email is already set up:** Brevo SMTP, the verified domain and the templates in
   `packages/db/supabase/templates`.
7. **Cost:** everything fits the free tiers (Workers + Durable Objects, Supabase). Idle games,
   lobbies and tournaments hibernate, and keep-alives don't wake them. Watch the Durable Object
   request quota (100,000/day on the free plan) if usage grows.

## 5. Security considerations

- **Authority.** Every game result, rating change, puzzle result, tournament score and achievement
  is decided by server code holding the secret key (Worker / Durable Objects / database functions),
  never by the client. Moves are validated on the server; clocks use server time; every action names
  its position, so replayed or duplicated messages are rejected; puzzle solutions aren't readable by
  browsers.
- **Row Level Security** is on for every table, with privileges granted explicitly per table and
  column. The tests run without hosted-project default privileges, so a missing grant fails in
  tests, not in production.
- **Secrets.** The secret key is only a Worker secret. The site bundle contains only the publishable
  key, which the tests check. Nothing secret is in git.
- **Authentication.** Supabase tokens are verified by the server on every socket and API call.
  Sockets from other origins are refused, and API requests from other origins too.
- **Staff powers** are checked in the database (`is_staff()`/`is_admin()`), not just in the UI.
  Moderators can't ban, nobody can restrict staff or themselves, and every action is logged.
- **Abuse.** Rate limits and an abort limit (see PLATFORM.md); chat filtering and storage for
  review; reports are limited per day and per target.
- **Privacy.** Date of birth, settings, puzzle history, notifications, your reports and the chat
  logs are private (staff can read chat). Data download includes everything held about you;
  account deletion removes it.
- **Children.** Sign-up is 13+, enforced in the database trigger, with a neutral refusal message.
- **Licences.** The site is GPL-3.0. Chessground and Stockfish are GPL; the opening names are CC0;
  the lichess formulas are reimplemented with attribution (`/licenses`).
