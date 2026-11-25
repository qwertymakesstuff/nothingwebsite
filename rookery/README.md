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
| 2 | Accounts: sign-up (13+), profiles, settings sync | next |
| 3 | Computer opponents: Stockfish WASM in a Web Worker, 15 configured personas, calibrated strength | **done** |
| 4 | Live multiplayer: matchmaking, server clocks, ratings | |
| 5–11 | Review, puzzles, leaderboards, social, progression, tournaments, launch | |

### What works today vs. what is sample data

**Working for real:** games against 15 computer opponents and a custom-strength engine (see
[`docs/AI.md`](docs/AI.md)), with saved history; pass-and-play with clocks, promotion and resign/draw; the analysis board,
including PGN/FEN import and export and keyboard navigation; settings (board theme, background,
coordinates, legal-move dots, animation, auto-queen, reduce motion), saved per device and applied
to every board; all navigation; and the live system-status checks.

**Sample data, clearly labelled with a "Sample" badge or banner:** players, ratings, game history,
leaderboards, friends, puzzles and achievements. Pages read data only through
`apps/web/lib/data/`, which marks each result as `source: 'sample' | 'live'`. The fake data lives
in `apps/web/lib/sample/` (see its README). Features that aren't built yet are shown disabled,
with a "Stage N" badge. Nothing pretends to be an online opponent, an AI or a signed-in user.

## Layout

```
wrangler.jsonc          one Cloudflare Worker: static site (free) + /api and /ws (realtime)
apps/web/               Next.js, fully prerendered (`output: 'export'` → apps/web/out)
  app/                  routes: / dashboard play bots puzzles analysis leaderboard u/[username] settings design licenses
  components/ui/        design-system primitives (Button, Card, Modal, Menu/Select, Tabs, Badge, Switch, states)
  components/board/     ChessBoard (chessground), BoardFrame, PlayerStrip/Clock, MoveList, GamePanel, EvalBar, PromotionPicker
  components/<feature>/ page-level components (play, bots, puzzles, analysis, leaderboard, profile, settings, home)
  lib/                  types, data layer, preferences, local game + clock hooks, formatting
  lib/sample/           SAMPLE DATA ONLY (fictional players, ratings, games, bots, puzzles)
apps/realtime/          Worker code + GameRoom Durable Object (one per live game)
packages/chess-core/    rules (chess.js wrapper), clocks, time controls: pure, no DOM, no I/O
packages/protocol/      zod schemas for every browser ↔ server message
packages/ai/            computer opponents: persona configs, strength model, Stockfish UCI driver (+ vendored engine)
packages/db/            Supabase config + SQL migrations (+ tests on PGlite)
docs/                   architecture, licences
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

The publishable key and URL in `apps/web/lib/config.ts` are public by design. **Never commit the
secret/service-role key, the database password or the JWT secret.**

## Licence

GPL-3.0-or-later (see `LICENSE`). Third-party components are listed in
[`docs/LICENSES.md`](docs/LICENSES.md) and on the site at `/licenses`.
