# Online Chess Platform: Architecture Proposal (for approval)

> **Decisions made after v1 (these override the sections below where they conflict):**
> - **Name: Rookery.** Lives at chess.missing.website until there's its own domain. Then chess.missing.website redirects to it with a Cloudflare redirect rule. "Chessly" was rejected: it's a registered trademark of Levy Rozman / chessly.com. Do a USPTO check on "Rookery" before buying a domain. "The Rookery" is an unrelated chess roguelike on Steam, and no registration was found.
> - **Realtime: Cloudflare Durable Objects + native WebSockets, replacing the VM and Socket.IO.**
>   - One Durable Object per live game; matchmaking objects per time-control pool.
>   - Every move is saved to the object's own SQLite database. Clocks use alarms. The WebSocket Hibernation API is on.
>   - Clients use PartySocket for reconnects plus a full-state resync.
>   - Game logic is a pure function `(state, event, now) → (state, outbound, timers)` in `packages/chess-core`, so it's portable off Cloudflare.
>   - `apps/game-server` becomes `apps/realtime` (a Worker with Durable Objects).
>   - Next.js runs on Workers via @opennextjs/cloudflare. No VM, Caddy or docker-compose.
> - **Board: chessground (GPL-3.0), npm package `@lichess-org/chessground`. The unscoped `chessground` package is deprecated.** The web front-end (`apps/web`) is licensed GPL-3.0-or-later and its source is public on GitHub. Restyle it with our own pieces and theme. Don't copy any lichess site code (lila is AGPL), and check the licence of each lichess asset before using it.
> - **Age: 13+ only at launch.** A neutral date-of-birth gate; under-13 sign-ups are refused. A 9–12 tier with parental consent and no chat is a later phase, after a legal review. Chat stays 13+, enforced on the server.
> - **Hosting cost:** start on Cloudflare's free plan. Move to Workers Paid ($5/mo) if the Next.js bundle exceeds the free size limit, server-side rendering exceeds the free CPU limit, or traffic approaches the daily request caps.

Working name: **Rookery**. It's a placeholder you can change; the folder and brand are renamed in one step.
Proposed address: **chess.missing.website**. This follows the same subdomain pattern as play., apps. and music.

---

## 0. What I found

### The repository (`qwertymakesstuff/nothingwebsite`)
- The site is a **static site with no build step**. GitHub Pages serves the repo root (`CNAME` = `missing.website`). There is **no `.nojekyll`**, so Pages runs Jekyll.
- Each game lives in its own top-level folder (`zero-day/`, `pumped/`, `silicon-dreams/` …) as plain HTML/CSS/ES modules.
- Games are listed in `pages.html` ("bigger games") and `play/public/games.json`.
- Subdomains run as **Cloudflare Workers** (`play/`, `apps/`, and the `wrangler.jsonc` at the root for music) with `custom_domain` routes. You already use Cloudflare.
- `tools/offline/files.mjs` **walks the whole repo** to build the offline zips and `offline-files.json`. The GitHub Action runs it on every push to `main`. Any new source folder gets bundled into the offline download unless it's added to `SKIP_DIRS`.
- Tests are Node's built-in runner, in `tests/music/*.test.mjs`.
- **`checkmate-club/` already has a chess game**: its own rules engine, an alpha-beta AI, and a local SVG board. I'll **leave it untouched**. The new platform is a separate product that links to it and from it.

### The screenshots (Dropbox `/ChessGame`, 21 usable; `…111431.png` is a 131-byte empty file)
They show these screens, which I'll use as the functional and UX reference:

| Screen | What to take (functionality and layout) | What NOT to take |
|---|---|---|
| Dashboard | Left icon sidebar; "Play" card with quick time-control chips and a big CTA; puzzle, lesson and last-game mini-boards; daily puzzle card; streak counter; recommended match; game-history table | Logo, green brand colour, "Get 50% off" upsell |
| Play hub | Board on the left, mode list on the right (Online / Bots / Coach / Friend / Tournaments / Variants) | Their icons |
| Play Bots | Bot avatar with a speech bubble, bots grouped by tier with a count per tier, Options, choose colour, Play | Their bot characters and art |
| Play Coach / Choose Coach | Coached games at difficulty presets, eval bar beside the board, coach picker grid | **Real-person coaches (Magnus, Hikaru, Levy…), the "Mittens" cat**. Use only original characters |
| Puzzles | Rating and progress bar, streak, level path/map, "Solve Puzzles" CTA; solved state with a check badge on the square, retry/hint/next | Their path art and mascot |
| Daily Puzzle | Date picker, title and teaser, lives (hearts), solved-by count, hint | |
| Live game | Player strips with avatar, rating, flag, clocks; move list with per-move time bars; tabs for Moves/Chat/Info; opening name; draw/resign; replay controls; win/draw/lose rating preview | |
| Game over modal | Result and reason, rating change, league rank, move-quality summary, Game Review / New game / Rematch | |
| Game Review | Eval graph, per-player accuracy, move-classification counts, game rating, Start Review | Their classification icons |
| Profile | Avatar, join date, friends, tabs (Overview/Games/Stats/Posts/Friends/Awards/Clubs), rating cards per time control with sparklines, streak, league, theme preview, awards | |
| Settings → Board & Pieces | Board, piece, background and preset pickers with a live 3×3 preview; settings nav (Gameplay, Profile, Interface, Social, Notifications, Account, Accessibility) | **Their piece sets ("neo" etc.), board textures, photo backgrounds** |

Visual direction: **dark charcoal UI, desaturated photographic backdrop, neutral grey board, right-hand control panel**. I'll keep that *structure*, but use our own logo, accent colour (not their green; for example a warm amber or teal), typography, icons, mascot and piece set.

---

## 1. Recommended folder structure

Everything lives under **one new top-level folder**. Nothing existing moves.

```
rookery/                              ← new; npm workspaces monorepo
├─ package.json                       workspaces: apps/*, packages/*
├─ tsconfig.base.json                 strict TS shared config
├─ docker-compose.yml                 web + game-server + caddy (production)
├─ .env.example                       names only, never values
├─ README.md
├─ docs/                              ARCHITECTURE.md, PROTOCOL.md, LICENSES.md, RUNBOOK.md
│
├─ apps/
│  ├─ web/                            Next.js (App Router) + React + Tailwind
│  │  ├─ app/                         routes (see §4)
│  │  ├─ components/                  UI, grouped by feature (see §5)
│  │  ├─ features/                    feature hooks/state: game, bots, puzzles, review, social…
│  │  ├─ lib/
│  │  │  ├─ supabase/                 browser + server clients (@supabase/ssr)
│  │  │  ├─ socket/                   typed Socket.IO client and reconnect logic
│  │  │  └─ engine/                   Stockfish Web Worker bridge (UCI)
│  │  ├─ public/
│  │  │  ├─ engine/                   stockfish .js/.wasm (+ COPYING, source link)
│  │  │  ├─ pieces/<set>/             licensed/original SVG piece sets
│  │  │  ├─ boards/  backgrounds/  sounds/  avatars/bots/
│  │  └─ tests/e2e/                   Playwright
│  │
│  └─ game-server/                    Node.js + Socket.IO (authoritative)
│     ├─ src/
│     │  ├─ index.ts                  http + socket.io bootstrap, health check
│     │  ├─ auth.ts                   verify Supabase JWT on handshake
│     │  ├─ rooms/GameRoom.ts         one live game: state, clocks, validation
│     │  ├─ matchmaking/              queues per time control / rating band
│     │  ├─ challenges/               direct challenges, rematches
│     │  ├─ tournaments/              arena scheduler and pairing
│     │  ├─ presence/                 online friends
│     │  ├─ persistence/              Postgres writes (service role), recovery
│     │  └─ ratelimit.ts
│     └─ tests/                       integration tests with socket.io-client
│
├─ packages/
│  ├─ chess-core/                     pure TS, no DOM, no I/O
│  │  ├─ game.ts                      chess.js wrapper: apply/validate, outcome, PGN, FEN
│  │  ├─ clock.ts                     increment/delay maths, flag detection
│  │  ├─ timeControls.ts              catalogue + category (bullet/blitz/rapid/classical/daily)
│  │  ├─ rating/glicko2.ts            Glicko-2 (+ tests)
│  │  └─ review/                      win% model, move classification, accuracy
│  ├─ ai/                             bot system (pure logic, engine-agnostic)
│  │  ├─ personas/*.json              ← each bot is DATA, not code
│  │  ├─ schema.ts                    zod schema for persona files
│  │  ├─ moveSelector.ts              MultiPV sampling, blunder model, style bias
│  │  ├─ openingBook.ts               per-persona opening preferences
│  │  └─ dialogue.ts                  event → line selection
│  ├─ protocol/                       zod schemas + TS types for every socket event
│  ├─ db/                             Supabase migrations, seed, RLS tests, generated types
│  │  ├─ supabase/migrations/*.sql
│  │  └─ scripts/import-puzzles.ts    Lichess CC0 puzzle import
│  └─ config/                         achievements.json, leagues.json, eslint/tailwind presets
│
└─ .github/ → (repo-level) .github/workflows/rookery-ci.yml   ← new workflow file only
```

**Additive changes outside `rookery/`, made only when we reach them:**
1. `tools/offline/files.mjs`: add `'rookery'` to `SKIP_DIRS`. Without this, the offline zips pick up the TypeScript source. It's a one-word addition.
2. `.gitignore`: add `.env*`, `.next/`, `rookery/**/node_modules`.
3. `.github/workflows/rookery-ci.yml`: a new workflow, path-filtered to `rookery/**`.
4. At launch: one new entry in `pages.html` and in `play/public/games.json`.

---

## 2. Technical architecture

```
                 Browser (Next.js app, React, Tailwind)
   ┌────────────────────────────────────────────────────────────────┐
   │ UI components ─ feature state ─ chess-core (local validation    │
   │ for instant UI feedback only) ─ Stockfish WASM in a Web Worker  │
   │ (bots, analysis, review, hints)                                 │
   └──────┬──────────────────────┬───────────────────────┬──────────┘
          │ HTTPS (pages, RSC)    │ supabase-js (auth,    │ Socket.IO (wss)
          ▼                       │ RLS-guarded reads)    ▼
   Next.js server (SSR,           │              Game server (Node + Socket.IO)
   route handlers for small       │              ── AUTHORITATIVE for live play ──
   mutations: profile, settings,  │              • verifies Supabase JWT
   friend requests)               │              • chess-core validates every move
          │                       │              • owns clocks (server time)
          │                       ▼              • matchmaking, challenges, rematch,
          └──────────────►  Supabase             presence, arenas
                            • Auth (email, magic link, OAuth)
                            • Postgres + RLS  ◄──── service-role writes: games,
                            • Storage (avatars)     ratings, achievements
```

Principles:
- **Separation.** `chess-core` and `ai` are pure and shared by the web app and the server. The UI never contains chess rules. The server never contains UI.
- **Trust boundary.** The client is never trusted for live games. It sends *intent* (`move: {uci, ply}`). The server validates it with chess.js, updates the clocks, persists, and broadcasts. Ratings, results and achievements are written **only** by the server, using the service-role key. Clients get read access through RLS and can write only their own profile and settings rows.
- **Bots and analysis run client-side** (free; scales with users). Bot games are therefore **unrated** for Glicko purposes. They're stored for history and stats, but flagged `source='bot'` and not trusted.
- **Config over code.** Bots, time controls, achievements, leagues, board/piece themes and dialogue are JSON validated by zod.

### Recommended hosting (the main infrastructure decision; see §10)
**One small always-on Linux VM** running `docker compose`:
- `web`: Next.js `output: 'standalone'` Node server
- `game-server`: Socket.IO
- `caddy`: TLS and reverse proxy (`/` → web, `/socket.io/` → game-server)
- DNS: `chess.missing.website` → VM, proxied through Cloudflare (which supports WebSockets)
- Supabase Cloud, free tier, for auth and the database

Why: Socket.IO needs a long-lived process. GitHub Pages can't run it, and Cloudflare Workers can't run Socket.IO. With one VM, both Node services sit together with no cross-origin issues. Free options: **Oracle Cloud Always Free** (ARM VM). The cheap paid option is ~€4–6/mo (Hetzner CAX11 or similar).

---

## 3. Database schema (Supabase Postgres)

All tables have RLS enabled. "Server" means writes happen only with the service-role key, from the game server or Next.js server code.

```sql
-- ── Identity ────────────────────────────────────────────────────────────
profiles (
  id uuid PK → auth.users(id) on delete cascade,
  username citext UNIQUE NOT NULL CHECK (username ~ '^[A-Za-z0-9_-]{3,20}$'),
  display_name text, avatar_url text, bio text, country char(2),
  title text NULL,                      -- reserved for future verified titles
  created_at timestamptz default now(), last_seen_at timestamptz,
  is_banned bool default false, birth_year int NULL   -- age gate (see §10)
)
user_settings (
  user_id uuid PK → profiles, board_theme text, piece_set text, background text,
  sound_on bool, show_coords bool, highlight_moves bool, auto_queen bool,
  premoves bool, confirm_resign bool, allow_challenges text  -- 'all'|'friends'|'none'
  , chat text  -- 'all'|'friends'|'presets'|'off'
)

-- ── Ratings (Glicko-2, one row per user per category) ─────────────────
ratings (
  user_id uuid → profiles, category text CHECK (category IN
    ('bullet','blitz','rapid','classical','daily','puzzle')),
  rating numeric(7,2) default 1500, rd numeric(6,2) default 350,
  volatility numeric(8,6) default 0.06, games int default 0,
  peak numeric(7,2), updated_at timestamptz,
  PRIMARY KEY (user_id, category)
)
rating_history (id bigserial PK, user_id, category, rating, rd, game_id NULL,
  puzzle_attempt_id NULL, created_at)          -- powers profile sparklines

-- ── Games ─────────────────────────────────────────────────────────────
games (
  id text PK,                          -- short public id, e.g. 8 chars base62
  white_id uuid NULL → profiles, black_id uuid NULL → profiles,
  bot_id text NULL → bots(id),         -- set for bot games
  source text CHECK (source IN ('lobby','challenge','rematch','tournament','bot','local')),
  rated bool, variant text default 'standard',
  initial_ms int, increment_ms int, category text,
  initial_fen text NULL,
  moves text default '',               -- space-separated UCI, compact
  move_times_ms int[] default '{}',    -- clock after each ply (time bars)
  status text CHECK (status IN ('created','started','ended','aborted')),
  result text NULL CHECK (result IN ('1-0','0-1','1/2-1/2')),
  termination text NULL,               -- checkmate|resign|timeout|stalemate|
                                       -- repetition|50move|insufficient|agreement|abandon
  white_rating int, black_rating int, white_delta int, black_delta int,
  opening_eco text, opening_name text,
  tournament_id uuid NULL, rematch_of text NULL,
  started_at, ended_at, created_at
)
  index (white_id, ended_at desc), (black_id, ended_at desc), (status) where status='started'

game_analysis (game_id PK → games, engine text, depth int,
  evals int[], classifications text[], white_accuracy numeric, black_accuracy numeric,
  created_by uuid, created_at)         -- cached review results

-- ── Bots (configs mirrored from packages/ai/personas for listing/FKs) ──
bots (id text PK, name, tier text, display_rating int, avatar, enabled bool, sort int)

-- ── Puzzles ────────────────────────────────────────────────────────────
puzzles (id text PK, fen text, moves text, rating int, rd int, popularity int,
  themes text[], opening_tags text[], source text default 'lichess-cc0')
  index (rating), GIN (themes)
puzzle_attempts (id bigserial PK, user_id, puzzle_id, solved bool, time_ms int,
  rating_before, rating_after, mode text,  -- 'rated'|'daily'|'path'|'rush'
  created_at)
daily_puzzles (date date PK, puzzle_id → puzzles, title text, teaser text)
puzzle_path_progress (user_id PK, level int, step int, updated_at)

-- ── Social ─────────────────────────────────────────────────────────────
friendships (user_a uuid, user_b uuid, status text CHECK (status IN ('pending','accepted')),
  requested_by uuid, created_at, PRIMARY KEY (user_a,user_b), CHECK (user_a < user_b))
blocks (blocker uuid, blocked uuid, PK(blocker,blocked))
challenges (id uuid PK, from_id, to_id NULL /*open link*/, initial_ms, increment_ms,
  rated bool, color text, status text, game_id NULL, expires_at, created_at)
notifications (id bigserial PK, user_id, kind text, payload jsonb, read_at NULL, created_at)
chat_messages (id bigserial PK, game_id, user_id, body text, created_at)  -- retained N days
reports (id bigserial PK, reporter_id, target_user_id, game_id NULL, reason text,
  status text, created_at)

-- ── Progression ────────────────────────────────────────────────────────
achievements (id text PK, name, description, icon, tier, hidden bool)  -- seeded from config
user_achievements (user_id, achievement_id, unlocked_at, PK(user_id, achievement_id))
streaks (user_id PK, current int, longest int, last_active_date date)
leagues / league_memberships  -- phase 2 of progression (weekly divisions), optional

-- ── Tournaments ────────────────────────────────────────────────────────
tournaments (id uuid PK, name, kind text CHECK (kind IN ('arena','swiss')),
  initial_ms, increment_ms, rated bool, starts_at, duration_min int, rounds int NULL,
  status text, created_by uuid NULL)
tournament_players (tournament_id, user_id, score int, fire bool /*streak bonus*/,
  rating_at_join, withdrawn bool, PK(tournament_id,user_id))

-- ── Views ──────────────────────────────────────────────────────────────
leaderboard_<category>  (materialised, refreshed every few minutes;
                         only users with rd < 110 and games ≥ 20)
user_stats_v            (wins/losses/draws by category, by colour; from games)
```

RLS summary:
- `profiles` and `ratings`: public read; owner may update profile fields only.
- `user_settings`: owner only.
- `games`: public read for `ended`. `started` games are readable too (for spectating), but moves come over sockets.
- `friendships` and `notifications`: participants only.
- `chat_messages`: game participants only.
- Everything rating- or result-related: **no client writes**.

---

## 4. Routes and pages

| Route | Page |
|---|---|
| `/` | Landing page (logged out) / **Dashboard** (logged in) |
| `/play` | Play hub: board and mode list |
| `/play/online` | Time-control picker → matchmaking |
| `/play/bots`, `/play/bots/[botId]` | Bot picker by tier, then the game |
| `/play/coach` | Coached game against an original coach character, with hints and an eval bar |
| `/play/friend` | Create a challenge link or challenge a friend |
| `/game/[id]` | Live or finished game (players and spectators) |
| `/game/[id]/review` | Game Review: eval graph, accuracy, classifications |
| `/analysis` | Free analysis board (FEN/PGN import) |
| `/puzzles` | Puzzle home: rated puzzles and the path |
| `/puzzles/daily`, `/puzzles/daily/[date]` | Daily puzzle |
| `/puzzles/[id]` | Single puzzle (shareable) |
| `/tournaments`, `/tournaments/[id]` | Arena list and detail (standings, pairings) |
| `/leaderboard`, `/leaderboard/[category]` | Leaderboards |
| `/u/[username]` (+ `/games`, `/stats`, `/friends`, `/awards`) | Profile tabs |
| `/friends` | Friends, requests, search, online status |
| `/notifications` | Notifications |
| `/settings/{board,gameplay,profile,account,privacy,accessibility}` | Settings |
| `/login`, `/signup`, `/auth/callback`, `/reset-password` | Auth |
| `/about`, `/terms`, `/privacy`, `/licenses` | Legal. **`/licenses` is required** (Stockfish GPL, piece-set licences) |
| `/admin/*` | Moderation (reports, bans). Later phase |

---

## 5. Component breakdown

**Layout:** `AppShell`, `SidebarNav` (icons with labels; collapses to icons only), `MobileTopBar`, `MobileBottomNav`, `BackdropImage`, `UserMenu`, `StreakBadge`

**Board (reusable everywhere):**
- `ChessBoard`, which takes `fen`, `orientation`, `legalMoves`, `onMove`, `highlights`, `arrows`, `interactive`
- `Square`, `Piece`, `DragLayer` (pointer events, so it works on touch and mouse), `PromotionPicker`, `Coordinates`, `MoveHighlights`, `ArrowLayer`, `CheckGlow`, `SolvedBadge`
- `BoardThemeProvider`, which reads the board, piece set and background from settings as CSS variables

I'll build our **own board** rather than use chessground (chessground is GPL-3, see §10). `react-chessboard` (MIT) is a fallback.

**Game:** `PlayerStrip` (avatar, name, rating, flag, captured material, clock), `Clock`, `MoveList` (with per-move time bars), `GameTabs` (Moves/Chat/Info), `GameControls` (draw/resign/abort/flip/takeback), `DrawOfferBanner`, `GameOverModal` (result, rating delta, quality summary, Review/New/Rematch), `ReplayControls`, `ChatPanel` (presets plus moderated free text), `EvalBar`, `OpeningLabel`, `ConnectionStatus`

**Play:** `PlayModeList`, `PlayModeCard`, `TimeControlPicker` (chips like the dashboard), `MatchmakingStatus` (with cancel), `BotPicker`, `BotTierGroup`, `BotCard`, `BotSpeechBubble`, `ColorPicker`, `GameOptions`

**Review / analysis:** `EvalGraph`, `AccuracyCard`, `ClassificationTable`, `ClassificationBadge` (our own icon set), `ReviewNavigator`, `EngineLines`, `PgnImport`

**Puzzles:** `PuzzleBoard` (wraps `ChessBoard` and validates the solution line), `PuzzlePanel`, `PuzzleRatingBar`, `HintButton`, `LivesIndicator`, `PuzzlePath`, `DailyPuzzleCard`

**Dashboard:** `QuickPlayCard`, `MiniBoardCard` (puzzle/lesson/last game), `DailyPuzzleWidget`, `RecommendedMatchCard`, `GameHistoryTable`, `FriendsOnlineWidget`

**Profile:** `ProfileHeader`, `RatingCard` (with sparkline), `StatsBreakdown`, `GameHistoryTable` (shared), `FriendGrid`, `AchievementGrid`, `ThemePreview`

**Settings:** `SettingsNav` with search; `ThemeGrid` (boards, pieces, backgrounds, presets), `ThemePreview3x3`, `Toggle`, `SelectRow`

**Tournaments / social:** `TournamentCard`, `StandingsTable`, `CountdownTimer`, `FriendRow`, `ChallengeDialog`, `NotificationItem`

**Primitives:** `Button` (with CTA variant), `Card`, `Tabs`, `Dialog`, `Tooltip`, `Avatar`, `Badge`, `Toast`, `Skeleton`, `EmptyState`

---

## 6. Backend and multiplayer architecture

**Connection.** The client gets a Supabase access token and connects with `io(url, { auth: { token } })`. The server verifies the JWT against Supabase's JWKS (`jose`) and attaches `userId`. Guests can watch but not play rated games.

**Protocol.** Every event is typed and validated with zod in `packages/protocol`.
```
C→S  queue:join {tc, rated} · queue:leave · challenge:create/accept/decline
     game:join {id} · game:move {id, uci, ply} · game:resign · game:abort
     game:draw:offer|accept|decline · game:takeback:offer|accept · game:rematch · chat:send
S→C  queue:matched {gameId} · game:state {fen, moves, clocks, status, ...} (full snapshot)
     game:move {uci, san, ply, clocks, serverTs} · game:end {result, termination, deltas}
     game:offer {...} · presence:update · notification
```

**GameRoom (authoritative).**
- State lives in memory: chess.js instance, clocks, players, offers, and the last acknowledged ply.
- A move is accepted only if it comes from the side to move, `ply` matches (idempotency, ignores duplicates), and chess.js says it's legal.
- Clocks use server time. The mover's time is deducted using the server's receipt time, with **bounded lag compensation** (for example, at most 150 ms per move, tracked per player). The increment is added afterwards.
- A server-side timer fires at the exact flag moment, so a game never waits for the losing client.
- Automatic endings: checkmate, stalemate, insufficient material, threefold repetition, fifty-move rule, timeout (draw if the opponent has insufficient material), abandonment (disconnect grace, e.g. 30–60 s), and abort (before both sides move).
- At game end, in one DB transaction: Glicko-2 update, `rating_history`, game row, then the achievements/streak evaluation hook.

**Persistence and recovery.**
- Each accepted move does `UPDATE games SET moves=…, move_times_ms=…`. That's one small row update, and it's cheap.
- On boot, the server reloads `status='started'` games and resumes clocks from the stored timestamps. The client re-syncs from the `game:state` snapshot on reconnect.

**Matchmaking.**
- One queue per `(time control, rated)`.
- Pairing runs every 1 s, using the closest rating within a window that grows with wait time (±100 → ±400).
- Avoids repeat pairings and blocked users. Colours are assigned to balance each player's colour history.

**Challenges and rematches.** These are direct or link challenges that expire. A rematch swaps colours and only starts when both players accept.

**Presence.** The server tracks socket connections per user and sends online/playing status to friends.

**Tournaments (arena).**
- A scheduler in the game server opens and closes arenas.
- Free players are paired continuously by score and rating.
- Scoring: 2 for a win, 1 for a draw, and a double-points streak bonus.
- Swiss comes later.

**Abuse controls.** Per-socket rate limits, chat filtering and limits, report flow, `is_banned` checked at handshake.

**Scaling path.** Start with one instance and no Redis. Later: the Socket.IO Redis adapter, sticky sessions, and sharding game rooms by game id.

---

## 7. AI opponent architecture

**Engine.**
- Stockfish compiled to WebAssembly runs in a **Web Worker** in the browser (`packages/ai` plus `lib/engine`), using the npm package `stockfish`.
- Use the **single-threaded "lite" build**. Multi-threaded builds need `SharedArrayBuffer`, which requires COOP/COEP headers; we can add those later, on the analysis page only.
- It's driven over UCI by a small `EngineClient` (`position`, `go`, `MultiPV`, `stop`). The same engine serves bots, coach hints, review and analysis.

**Personas are data.** Each bot is one JSON file validated by a zod schema:
```json
{
  "id": "rook-rosa", "name": "Rosa", "tier": "beginner", "displayRating": 650,
  "avatar": "/avatars/bots/rosa.svg", "bio": "...", "country": null,
  "engine": { "movetimeMs": 300, "depth": 8, "multiPv": 5, "limitStrengthElo": null },
  "weakening": { "temperatureCp": 180, "blunderRate": { "opening": 0.02, "middlegame": 0.08, "endgame": 0.05 },
                 "maxBlunderCp": 600, "missMateInN": 3 },
  "style": { "aggression": 0.7, "trades": -0.3, "pawnStorms": 0.5, "kingSafety": -0.2 },
  "openings": { "white": ["e2e4 e7e5 g1f3"], "black": ["e7e5", "c7c5"], "bookDepth": 6 },
  "timing": { "minMs": 400, "maxMs": 2500, "thinkLongerWhenComplex": true },
  "dialogue": { "greet": ["..."], "capture": ["..."], "check": ["..."], "blunderedPiece": ["..."],
                "playerBlunder": ["..."], "win": ["..."], "loss": ["..."], "draw": ["..."] }
}
```

**Move selection (`moveSelector.ts`).**
1. If in book, pick from the persona's opening lines.
2. Otherwise run MultiPV search, then score each candidate by its eval plus a **style bias**: aggression favours checks and captures toward the king, `trades` favours or avoids exchanges, and so on.
3. Sample with a softmax at the persona's `temperatureCp`. A phase-dependent **blunder roll** can choose a worse move, capped by `maxBlunderCp`.
4. Strong bots (above ~1400) use Stockfish's own `UCI_LimitStrength`/`UCI_Elo` plus light style bias.
5. This covers the full range from about 250 to master level. Stockfish's own Elo limit floors around 1320, so weaker bots *need* the sampling approach.

**Human-like timing.** A delay is drawn from the persona's timing profile, with quick recaptures and longer thinks in complex positions.

**Tiers** (data-driven like the screenshot list): New to Chess, Beginner, Intermediate, Advanced, Master, Adaptive. An *Adaptive* persona adjusts `temperatureCp` from the running eval to keep the game close.

**Coach mode.** This is a persona plus a hint/feedback layer. After each user move it compares the move to the engine's best and gives short explanations: hanging piece, missed fork, and similar. These come from simple tactical detectors in `chess-core/review`.

**Calibration.** A script runs bot-vs-bot and bot-vs-fixed-Stockfish matches headlessly (Node `stockfish` build) and fits each persona's `displayRating`. This is a testing checkpoint.

**Characters are 100% original.** No real players, and no likenesses of any existing site's bots or mascot.

**Game Review.**
- Per ply, compute eval → win% (logistic model).
- Classify by win% lost: Best / Excellent / Good / Inaccuracy / Mistake / Blunder, plus "Brilliant-style" for sound sacrifices if we want. Labels and icons are our own.
- Accuracy is computed from the win% losses.
- Analysis runs client-side, and results are cached in `game_analysis` through a server route that rechecks plausibility.

---

## 8. Development roadmap and testing checkpoints

Each phase ends deployable. **The existing-site regression check runs every phase:** run `node --test tests/music`, then `node tools/offline/build-manifest.mjs` and confirm `offline-files.json` doesn't change.

| # | Phase | Deliverable | Testing checkpoint |
|---|---|---|---|
| 0 | **Scaffold** | Monorepo, strict TS, ESLint/Prettier, Tailwind, Vitest, Playwright, CI workflow, Supabase project and first migration, VM and Caddy, "hello" at chess.missing.website | CI green; deploy reachable over HTTPS and WSS; existing-site regression passes |
| 1 | **Board + chess-core** | `ChessBoard` (drag/click/touch, promotion, highlights, themes), local pass-and-play, PGN/FEN, clocks | Unit: outcomes, clock maths, PGN round-trip. E2E: castling, en passant, promotion, check/mate on desktop and mobile viewport |
| 2 | **Auth, profiles, settings** | Sign up/in (email + magic link; OAuth optional), username claim, profile page shell, Board & Pieces settings with live preview | RLS tests (anon/user/other-user clients); E2E signup → settings persist |
| 3 | **AI opponents** | Engine worker, persona schema, 10–15 launch bots across tiers, bot picker, speech bubbles, bot games saved | Persona schema tests, deterministic selector tests (seeded), calibration script report, no UI jank (engine off main thread) |
| 4 | **Live multiplayer** | Game server, matchmaking, clocks, draw/resign/abort, reconnect, Glicko-2 rated results | Integration: two simulated clients; illegal/out-of-turn/duplicate moves rejected; flag timing; disconnect → abandonment; **server restart mid-game recovers**; load test (~200 concurrent games) |
| 5 | **History, stats, review** | Game history table, stats, Game Review and analysis board, opening names | Classification/accuracy unit tests on fixed eval sequences; review E2E |
| 6 | **Puzzles** | Lichess CC0 import (subset, e.g. 200k), rated puzzles, daily puzzle, path/levels, hints and lives | Solution validation (alternate mates accepted), puzzle Glicko updates, daily rollover at UTC midnight |
| 7 | **Dashboard + leaderboards** | Full dashboard like the screenshot layout, leaderboards per category | Query performance (EXPLAIN), mobile layout snapshots |
| 8 | **Social** | Friends, blocks, challenges, rematch, presence, notifications, in-game chat | Permission tests (blocked users can't challenge or chat), E2E challenge → game → rematch |
| 9 | **Progression** | Achievements from config, streaks, (optional) weekly leagues | Event → achievement unit tests; idempotency (no double unlocks) |
| 10 | **Tournaments** | Arena create/join/pair/score/standings; Swiss later | Simulated 50-player arena run; scoring and berserk edge cases |
| 11 | **Hardening and launch** | Moderation/admin, reports, fair-play heuristics, a11y pass, legal pages, `/licenses`, rate limits, backups, monitoring, add to `pages.html` and `games.json` | Lighthouse/a11y audit, security review, restore-from-backup drill, closed beta |

---

## 9. Dependencies and setup

**Runtime:** Node 22 LTS, npm workspaces, Docker (for local Supabase and production compose).

| Package | Use | Licence |
|---|---|---|
| next, react, react-dom | Web app | MIT |
| typescript | | Apache-2.0 |
| tailwindcss (v4), @tailwindcss/postcss | Styling | MIT |
| @supabase/supabase-js, @supabase/ssr | Auth/DB client | MIT |
| supabase (CLI, dev) | Local stack, migrations, type generation | MIT |
| chess.js | Rules/validation | BSD-2 |
| stockfish (npm, WASM builds) | Engine | **GPL-3.0** |
| socket.io, socket.io-client | Realtime | MIT |
| zod | Schemas (protocol, personas, config) | MIT |
| jose | JWT verification on the game server | MIT |
| pg or postgres | Server DB access | MIT/Unlicense |
| pino | Server logging | MIT |
| vitest, @testing-library/react, playwright | Tests | MIT/Apache-2.0 |
| eslint, prettier | Lint/format | MIT |

Glicko-2 will be our own ~150-line implementation with tests, rather than a dependency.

**Data:**
- Lichess puzzle database: **CC0**
- lichess-org/chess-openings (ECO names): **CC0**
- Piece set: an original set, or Colin Burnett's (cburnett) set, which is available under BSD/GPL/GFDL. We can also reuse the procedural pieces from `checkmate-club`.

**Local setup (once approved):**
```bash
cd rookery && npm install
npx supabase start            # local Postgres/Auth in Docker
npx supabase db reset         # apply migrations + seed
cp .env.example .env.local    # fill NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (+ server: SERVICE_ROLE_KEY)
npm run dev                   # web on :3000, game-server on :4000 (concurrently)
npm test                      # unit + integration
npm run e2e -- --trace off    # Playwright
```
**Production:** `docker compose up -d` on the VM, with secrets in the VM's env file, never in the repo. A Cloudflare DNS record points to the VM. Supabase Auth gets a custom SMTP sender, because the built-in mailer is heavily rate-limited (Resend's free tier is fine).

---

## 10. Risks, licensing and decisions that need your attention

### Decisions I need from you
1. **Hosting for the Node services.** My recommendation is one VM running Next.js, Socket.IO and Caddy: **Oracle Cloud Always Free** (free, more setup) or **Hetzner ~€4–6/mo** (simplest). The fully free alternative is Cloudflare Workers plus Durable Objects, but that means **replacing Socket.IO with native WebSockets**, which departs from your stack. Render's free tier sleeps after idle, which is unusable for live clocks. Vercel Hobby forbids commercial use.
2. **Brand name and domain.** "Rookery" at chess.missing.website is a placeholder. Please do a trademark check before launch.
3. **Folder name** inside the repo (`rookery/`), and approval for the small *additive* edits listed in §1: the offline-tool skip, `.gitignore`, the new CI workflow, and later the games-list entries.
4. **Minimum age / chat policy.** Chess has a young audience. Do we require 13+ at signup (simplest under COPPA/GDPR-K), and should launch have preset-only chat?

### Licensing
- **Stockfish is GPL-3.0.** Serving its WASM means distributing it. We must ship the licence, credit it, and link the exact source (on `/licenses` and in `public/engine/`). Keeping it as a separate worker program that talks UCI is the standard approach and doesn't make the rest of the app GPL. If we modify it, we must publish our changes.
- **chessground (lichess board) is GPL-3.** I'll avoid it and build our own board, so the app's licence stays your choice.
- **Assets.** We can't use chess.com piece sets, board textures, backgrounds, sounds, icons, the mascot, bot or coach characters, or the "Game Review" visual language. **No real-person bots or coaches** (personality/likeness rights). Piece sets on lichess have mixed licences, so pick per set and record it in `docs/LICENSES.md`.
- The Lichess puzzle and openings data is CC0 (no obligations; attribution is courteous).

### Technical risks
- **The offline packager walks the whole repo.** `rookery/` source would end up in the offline zips unless it's added to `SKIP_DIRS`. GitHub Pages (Jekyll) will also publicly serve the raw source under `missing.website/rookery/…`. That's harmless, because the repo is public, but it means **no secrets in the repo, ever**.
- **Cheating.** Client-side Stockfish makes engine assistance trivial in live games. Plan basic fair-play signals (accuracy vs rating, move-time patterns), reports, and manual review. Analysis is disabled for your own live game.
- **Clock fairness under latency.** Lag compensation must be bounded and server-timed, and flag detection server-side.
- **Weak-bot realism.** Stockfish's Elo limit floors around 1320, so beginner bots depend on our sampling model and need calibration.
- **Engine size and mobile performance.** The lite WASM is several MB. Load it lazily, only on bot/analysis pages, and cache it.
- **Supabase free-tier limits.** 500 MB DB, 5 GB egress, and project pause after 7 days of inactivity. Store moves compactly (UCI string) and import only a puzzle subset. Plan an upgrade path ($25/mo Pro) when traffic arrives.
- **Single-instance game server** is a single point of failure. Mitigations are restart recovery from the DB, Docker restart policy, health checks and uptime monitoring.
- **Email deliverability.** Supabase's default SMTP is heavily rate-limited, so configure custom SMTP before public signup.
- **Legal for a public site:** Terms, Privacy Policy, GDPR data export/deletion, cookie notice (auth cookies only, so minimal), DMCA/contact, and moderation for chat and usernames.
- **Scope.** This is a multi-month build. The phased plan keeps each step shippable, and nothing existing on missing.website is touched beyond the additive list in §1.
