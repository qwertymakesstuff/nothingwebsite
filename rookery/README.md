# Rookery

An online chess platform at **chess.missing.website**. Its design and plan are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Rookery is a separate product from the rest of missing.website and from `checkmate-club/`. It lives
entirely in this folder. The only files it touches outside it are:
- `tools/offline/files.mjs`, which keeps it out of the offline downloads;
- `.gitignore`;
- `.github/workflows/rookery-ci.yml`.

## Status

| Stage | What | Status |
| --- | --- | --- |
| 0 | Scaffold: monorepo, static site, realtime Worker + Durable Object, first DB migration, CI | **done** |
| 1 | Frontend foundation: design system, navigation, every page layout, reusable components | **done** |
| 3 | Computer opponents: Stockfish WASM in a Web Worker, 15 configured personas, calibrated strength | **done** |
| 4 | Accounts and progression: sign-up (13+), email verification, password recovery, profiles + avatars, settings sync, per-format ratings, game history, statistics, achievements | **done** (see [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md)) |
| 5 | Live multiplayer: matchmaking by time control and rating, challenges and invitation links, server-authoritative games and clocks, draws, rematches, reconnection and abandonment, Glicko-2 ratings | **done** (see [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md)) |
| 6 | Platform: daily + unlimited rated puzzles, Stockfish game review and analysis, opening explorer, arena tournaments, friends, search, notifications, statistics, chat, reports and moderation | **done** (see [`docs/PLATFORM.md`](docs/PLATFORM.md), [`docs/FINAL_REPORT.md`](docs/FINAL_REPORT.md)) |

### What works today vs. what is sample data

**Working for real:** accounts (sign-up for ages 13+, email verification, sign-in/out, password
recovery, change email/password, sign out everywhere, data download, account deletion); public
profiles with avatars; settings saved to your account (or per device for guests); per-format
ratings; game history, win/draw/loss statistics and achievements, all from Supabase; games against
15 computer opponents and a custom-strength engine (see [`docs/AI.md`](docs/AI.md)), saved to
your profile when signed in; **live games against other people** (matchmaking, challenges,
invitation links, rated or casual, with server clocks, draw offers, rematches and reconnection);
pass-and-play with clocks; the analysis board; leaderboards.

Ratings (Glicko-2, one per format) change only after rated online games, verified and recorded by
the server. Games against the computer count towards statistics and achievements, never ratings.

Also working: rated puzzles (daily and unlimited, generated and verified with Stockfish), game
review and live engine analysis, an opening explorer over Rookery's own games, arena tournaments,
friends, player search, notifications, statistics dashboards, moderated in-game chat, reports and a
moderation area. See [`docs/PLATFORM.md`](docs/PLATFORM.md).

There is no sample data left on the site.

## Layout

```
wrangler.jsonc          one Cloudflare Worker: static site (free) + /api and /ws (realtime)
apps/web/               Next.js, fully prerendered (`output: 'export'` → apps/web/out)
  app/                  routes: / dashboard play bots puzzles analysis leaderboard u/[username] settings design licenses
  components/ui/        design-system primitives (Button, Card, Modal, Menu/Select, Tabs, Badge, Switch, states)
  components/board/     ChessBoard (chessground), BoardFrame, PlayerStrip/Clock, MoveList, GamePanel, EvalBar, PromotionPicker
  components/<feature>/ page-level components (play, bots, puzzles, analysis, leaderboard, profile, settings, home)
  lib/                  auth, db.ts (typed Supabase queries), synced preferences, game + clock hooks
apps/realtime/          Worker: /api (game recording, account deletion) + GameRoom Durable Object
packages/chess-core/    rules (chess.js wrapper), clocks, time controls: pure, no DOM, no I/O
packages/protocol/      zod schemas for every browser ↔ server message
packages/ai/            computer opponents: persona configs, strength model, Stockfish UCI driver (+ vendored engine)
packages/db/            Supabase config + SQL migrations (+ tests on PGlite)
packages/puzzles/       puzzle generator (Stockfish self-play, verified) + SQL export
e2e/                    end-to-end tests against a real local Supabase stack
docs/                   architecture, accounts & security, AI, licences
```

## Develop

Requires Node 22+.

```bash
npm ci                 # from rookery/
npm run dev            # website only, on http://localhost:3000 (no /api or /ws)
npm run build && npx wrangler dev   # the real thing, site + realtime, on http://localhost:8787
npm test               # chess-core, realtime (inside workerd) and database tests
npm run check          # typecheck + test + build (what CI runs)
```

The full component catalogue, with colours, type, buttons, dropdowns, modal, tabs and states, is at
`/design` on the running site.

## Deploy (Cloudflare)

This deploys like `play/` and `apps/`, through Cloudflare's GitHub integration:

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → `nothingwebsite`.
2. Set the build settings:
   - Root directory: `rookery`
   - Build command: `npm ci && npm run build`
   - Deploy command: `npx wrangler deploy`
3. The Worker name must be `rookery`, matching `wrangler.jsonc`.

On deploy, Wrangler attaches `chess.missing.website` as a custom domain. Everything runs on the
**Workers Free** plan, using SQLite-backed Durable Objects.

## Database (Supabase)

Migrations live in `packages/db/supabase/migrations/`. The CI workflow applies them on pushes to
`main` once these repository secrets exist (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to find it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | the database password set when the project was created |
| `SUPABASE_PROJECT_REF` | `fazzxshhvfecpfypqusz` |

The Worker also needs the **secret key** as a Worker secret, and the Supabase Auth settings need a
few changes: see [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md#production-setup).

The publishable key and URL in `apps/web/lib/config.ts` are public by design. **Never commit the
secret/service-role key, the database password or the JWT secret.**

## Licence

GPL-3.0-or-later (see `LICENSE`). Third-party components are listed in
[`docs/LICENSES.md`](docs/LICENSES.md) and on the site at `/licenses`.
