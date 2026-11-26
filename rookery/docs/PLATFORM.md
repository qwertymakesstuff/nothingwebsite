# Platform features (Stage 6)

Everything here is backed by real data in Supabase or computed by the real engine; nothing is
sample or invented. Trust model as before: browsers read public data and change only their own
rows (Row Level Security); anything that decides a result, a rating or a sanction is decided by
server code (Worker / Durable Objects, secret key) or by staff.

| Feature | Where | How it works |
| --- | --- | --- |
| Daily puzzle | `/puzzles?mode=daily`, dashboard | `daily_puzzle()` picks one per UTC day, deterministically, never repeating; the same for everyone |
| Unlimited practice | `/puzzles` | `next_puzzle()` serves one you haven't tried, near your puzzle rating (widening), optionally by theme |
| Puzzle ratings | `/puzzles`, profiles, leaderboard | First attempt per puzzle is rated (Glicko-2, player vs puzzle); later attempts are practice. Hints and "show solution" count as a miss |
| Game review | `/review?id=…` (Microscope icon in any game list, "Review" after a game) | Stockfish evaluates every position in your browser; moves classified by the drop in winning chances (inaccuracy ≥ 10, mistake ≥ 20, blunder ≥ 30 points), best alternative shown as an arrow, accuracy per player (lichess formulas). Your own games' reviews are saved |
| Best moves | `/analysis` (engine on), review | Live Stockfish: three best lines at depth 10 → 14 → 18, evaluation bar, arrow |
| Opening explorer | `/explorer` | Next moves and results from games played on Rookery (`explorer_moves()`), filter by players / computer / rated; names from the lichess openings dataset (CC0) |
| Leaderboards | `/leaderboard` | Real ratings per format, players with at least one rated game |
| Tournaments | `/tournaments`, `/tournament?id=…` | Arena: a Tournament Durable Object pairs waiting players continuously; win 2, draw 1, doubled on a two-win streak; results to `tournaments`/`tournament_players` |
| Friends | `/friends`, profiles | Requests, accept/decline, unfriend; "friends only" challenge and chat settings use it |
| Player search | `/players` | Username prefix or display name (`search_players()`) |
| Achievements | profiles, dashboard | 19 earned achievements (games, wins, computer, online, puzzles, tournaments, friends) + special badges; each unlock sends a notification |
| Notifications | bell (header/sidebar), `/notifications` | Friend requests (accept inline), acceptances, achievements, tournament start/finish, report outcomes, restrictions |
| Statistics | profile → Stats | Rating history chart (per format, with table view), results by colour, type and ending, puzzle stats, most-played openings |
| In-game chat | live games | Filtered, rate-limited, respects each player's chat setting (all / friends / presets / off), stored for moderators |

## Puzzles: where they come from

Rookery's puzzles are generated, not copied (the lichess puzzle database couldn't be downloaded
from the build environment). `packages/puzzles/generate.mjs`:

1. Stockfish plays itself at deliberately weakened, varied strengths, so the games contain
   human-like mistakes.
2. After a move that throws away at least 2 pawns' worth of winning chances, the position is a
   candidate. Each move the solver must find is verified at depth 16 and kept only if it is
   clearly the single best move (the second best is at least 1.8 pawns worse, or the only mate).
3. Non-mate puzzles must win material that can't be won back at once; mate puzzles must end in
   checkmate.
4. Starting difficulty is the shallowest search depth at which Stockfish keeps finding every
   solution move; after that, ratings follow players' attempts (Glicko-2).
5. Themes are detected automatically (mate in N, fork, hanging piece, sacrifice, promotion,
   back-rank mate, check, phase, length).

`node packages/puzzles/generate.mjs --out puzzles.jsonl --count N` adds more (it resumes);
`node packages/puzzles/to-sql.mjs puzzles.jsonl <migration>.sql` turns them into a migration that
only inserts new puzzles. The server checks moves against the solution (`/api/puzzles/<id>/move`);
the solution column is not readable by browsers.

## Moderation

| Tool | Who | Notes |
| --- | --- | --- |
| Report a player | any signed-in player | Profiles, games (moves + chat visible to staff); 10/day, one open report per target |
| Reports queue | moderators, admins (`/admin`) | Resolve / dismiss with a note; one-click "mute 24h" or (admins) "ban 7 days"; the reporter is notified |
| Restrictions | moderators (mute, no online games, no tournaments), admins (+ ban) | Timed or permanent, with a reason shown to the player (banner on every page + notification); enforced by the game server, lobby and tournaments. Staff can't be restricted |
| Bans | admins | Blocks sign-in in Supabase Auth and marks the profile; lifting restores access |
| Player review | staff | Profile, restrictions history, reports, recent chat, recent games |
| Game review | staff | Moves (with engine review) and the full chat log, including blocked lines |
| Moderation log | staff | Every restriction, lift and report decision, with who did it |

### Abuse prevention and rate limits

| Limit | Value | Enforced by |
| --- | --- | --- |
| Chat | 1 message/second, 15/minute; profanity masked; threats/slurs blocked | GameRoom |
| Socket messages | 60 per 10 s per connection | GameRoom |
| Challenges | 5 per minute | Lobby |
| Aborted games | 4 in 30 minutes → no new games for 15 minutes | Lobby (reported by GameRoom) |
| Rated puzzle attempts | 20 per minute | `/api/puzzles` |
| Saved computer games | 6 per minute, 400 per day | `/api/games` |
| Reports | 10 per day, 1 open per target | database trigger |
| Friend requests | 30 per day | database trigger |
| Tournaments | 2 upcoming per organiser | `/api/tournaments` |

### Making someone staff

There is no self-service way to become staff. In the Supabase SQL editor:

```sql
insert into public.staff (user_id, role)
select id, 'admin' from public.profiles where username = 'YOUR_USERNAME';
```

Use `'moderator'` for moderators. Remove with `delete from public.staff where user_id = …`.

## Tests

| Suite | Checks |
| --- | --- |
| `packages/db` | 39: puzzles (secret solutions, daily, selection, first-attempt rating), friends, notifications, reports, restrictions & bans, staff powers, chat visibility, reviews, tournaments, search, explorer |
| `apps/realtime` | 44: puzzle checking, chat filter, arena scoring/pairing, plus earlier game rules |
| `e2e/platform.e2e.mjs` | 60 checks with four real users (player, player, moderator, admin) in separate browsers |
| `e2e/multiplayer.e2e.mjs` | 50 (Stage 5, still passing) |
| `e2e/accounts.e2e.mjs` | 36 (Stage 4, still passing) |
