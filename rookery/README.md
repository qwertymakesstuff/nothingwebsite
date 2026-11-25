# Rookery

An online chess platform at **chess.missing.website**. Its design and plan are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Rookery is a separate product from the rest of missing.website and from `checkmate-club/`. It lives
entirely in this folder. The only files it touches outside it are:
- `tools/offline/files.mjs`, which keeps it out of the offline downloads;
- `.gitignore`;
- `.github/workflows/rookery-ci.yml`.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Scaffold: monorepo, static site, realtime Worker + Durable Object, first DB migration, CI | **done** |
| 1 | Board + chess-core: promotion picker, clocks, move list, sounds, settings | next |
| 2 | Accounts: sign-up (13+), profiles, settings | |
| 3 | Computer opponents (Stockfish WASM, data-driven personas) | |
| 4 | Live multiplayer: matchmaking, clocks, ratings | |
| 5–11 | History and review, puzzles, dashboard, social, progression, tournaments, launch | |

## Layout

```
wrangler.jsonc          one Cloudflare Worker: static site (free) + /api and /ws (realtime)
apps/web/               Next.js, fully prerendered (`output: 'export'` → apps/web/out)
apps/realtime/          Worker code + GameRoom Durable Object (one per live game)
packages/chess-core/    rules (chess.js wrapper), clocks, time controls: pure, no DOM, no I/O
packages/protocol/      zod schemas for every browser ↔ server message
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
