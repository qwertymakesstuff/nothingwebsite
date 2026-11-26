# Live multiplayer (Stage 5)

Two people playing a real game in real time, with the server as the only authority. Built on
Cloudflare Durable Objects (WebSockets with the Hibernation API) instead of a Node.js/Socket.IO
server, so it runs on the Workers free plan with nothing else to host.

```
browser ──wss /ws/lobby──────▶ Lobby (one Durable Object)       matchmaking queue, challenges,
                                  │ creates                        notifications, online count
browser ──wss /ws/game/<id>──▶ GameRoom (one Durable Object per game)
                                  │ the authoritative game: rules, clocks, deadlines, results
                                  └─ record_online_game() ──▶ Supabase (games, ratings, history)
```

## What players can do

| Feature | How |
| --- | --- |
| Quick play / matchmaking | Play → pick a time control → **Find an opponent** (rated or casual). Dashboard quick-play chips go straight into the queue. |
| Time controls | 1+0, 2+1 (bullet) · 3+0, 3+2, 5+0, 5+3 (blitz) · 10+0, 10+5, 15+10 (rapid) · 30+0 (classical). |
| Challenge a player | Play → **Play a friend** → username, or **Challenge** on their profile. They get a live notification (Accept / Decline) on any page. |
| Invitation link | Play → **Create an invitation link**. Anyone signed in who opens it takes the empty seat. |
| In the game | Live board and clocks, opponent card (avatar, rating, country), connection indicators, move list you can browse, draw offers, resign, abort (before both have moved), flip. |
| After the game | Result with rating change, **Rematch** (colours swap), **New opponent**, **Open in analysis**. History on profiles and the dashboard shows opponent rating and your rating change. |

Live games need an account (that's what makes ratings and fair matchmaking possible).

## The server is the authority

Every rule is enforced in `apps/realtime/src/game/room.ts`, a pure state machine fed by the
GameRoom object (`apps/realtime/src/GameRoom.ts`):

- **Who you are** comes from a Supabase access token verified by the server on every connection.
  Your colour comes from your seat; messages never say which side they're for. Only the two
  players can open a game; anyone else is refused (`not_a_player`).
- **Illegal moves / playing out of turn:** every move is replayed with chess.js on the server.
- **Duplicate and replayed messages:** every state-changing message names the position it was meant
  for (`ply`). The same move sent twice, or an old message replayed later, no longer matches the
  current position and is rejected (`stale`). Draw acceptances are tied to the offer's position;
  resignations to the position the player saw.
- **Clocks** are measured with the server's time only; messages carry no clock values (extra
  fields are discarded). Clocks start after both first moves, the increment is added by the server,
  and an alarm ends the game the instant a flag falls, even if nobody sends anything. A move that
  arrives after the flag loses on time. Running out against a lone king (or king + minor) is a draw.
- **Results** are never sent by clients. The server decides them (checkmate, stalemate, repetition,
  50-move, insufficient material, resignation, agreement, timeout, abandonment) and writes them once.
- **Unauthorized access:** sockets from other websites are refused (Origin check); malformed or
  oversized messages are rejected; each socket is rate-limited.

## Disconnections, reconnection and abandonment

- The client reconnects automatically (backoff) and re-authenticates; the server resends the full
  game, so nothing is lost. The opponent sees a connection dot and, if you've gone, a countdown.
- A player who stays away for 60 s loses by **abandonment** (a draw if the opponent couldn't ever
  checkmate). Coming back in time cancels it. Your clock keeps running meanwhile.
- **First moves:** each side has 30 s for its first move, otherwise the game is **aborted** (not
  recorded, no rating change). Either player may abort before both have moved.

## Ratings

Glicko-2 (`packages/chess-core/src/glicko.ts`, verified against Glickman's worked example), one
rating per format (bullet, blitz, rapid, classical), each game its own rating period, τ = 0.75, RD
between 45 and 350, growing with inactivity. Ratings with RD > 110 are shown as provisional (`1500?`).

Ratings change **only** after a rated game between two players ends with a verified result. The
GameRoom computes the update and calls `record_online_game` (service role only), which in one
transaction: locks both rating rows, checks the ratings haven't changed since they were read (if
they have, the server recomputes), inserts the game, updates both ratings and their history, and
awards achievements. Retried automatically if Supabase is unreachable; a retry of an
already-recorded game does nothing.

## Matchmaking

One pool per time control and rated/casual (`apps/realtime/src/game/matchmaking.ts`). You're paired
with the closest rating inside both players' acceptable range, which starts at ±100 and widens by
10 points a second (to ±600), then anyone after a minute. Leaving the site takes you out of the
queue.

## Limits and what's next

- Friends lists arrive with the social features (Stage 8). Until then, the "friends only" challenge
  setting means nobody can challenge you.
- No premoves or spectating yet; chat arrives with the social features (13+).
- Network lag isn't compensated: the server charges the time between receiving moves.

## Cost

Everything runs on the Workers free plan: games and the lobby hibernate between messages, and
keep-alives are answered by Cloudflare without waking them. Durable Object storage holds each
game for 7 days after it ends (the permanent record is in Supabase).

## Tests

| Suite | Covers |
| --- | --- |
| `apps/realtime/test/room.test.ts` | Every game rule: turns, stale plies, clocks, flags, first-move aborts, abandonment, draws, rematches, challenges |
| `apps/realtime/test/matchmaking.test.ts` | Pools, ranges widening, closest pairing |
| `packages/chess-core/test/glicko.test.ts` | Glicko-2 against the published example |
| `packages/db/test` | `record_online_game`: transactional, stale-rating refusal, duplicates, server-only |
| `e2e/multiplayer.e2e.mjs` | 49 checks with separate browser sessions as separate users, against real Supabase and the real Worker: matchmaking, a full rated game, rematches, draw, resignation, reconnection, abandonment, challenges, invitation links, private rooms, and raw-socket attacks |
