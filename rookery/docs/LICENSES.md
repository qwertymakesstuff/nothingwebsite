# Licences

Rookery's own code is **GPL-3.0-or-later**. That's required because the website bundles Chessground,
which is GPL. The full text is in `../LICENSE`, and the public `/licenses` page must stay in sync
with this file.

| Component | Licence | Used for | Obligations |
| --- | --- | --- | --- |
| [@lichess-org/chessground](https://github.com/lichess-org/chessground) | GPL-3.0-or-later | Board UI | Keep the website source public under GPL-3.0+; keep licence notices |
| cburnett piece set (Colin M.L. Burnett, via Chessground) | GPL-2.0-or-later (also BSD/GFDL on Wikimedia) | Default pieces | Attribution |
| [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause | Rules | Keep copyright notice |
| Next.js, React, Tailwind CSS, Zod, Supabase JS, PGlite (dev) | MIT / Apache-2.0 | Framework, styling, validation, data | Keep notices |
| Fraunces, Inter, JetBrains Mono (via Fontsource) | SIL OFL 1.1 | Typefaces, self-hosted | Don't sell the fonts on their own; keep the licence |
| Lucide icons | ISC | Interface icons | Keep notice |
| Stockfish 19 via Stockfish.js 19.0.1 (lite, single-threaded WASM), vendored unmodified in `packages/ai/engine/` | GPL-3.0 | Computer opponents | Licence served at `/engine/COPYING.txt`; exact source linked on `/licenses` and in `packages/ai/engine/README.md`; publish any changes |
| Lichess puzzle DB, lichess-org/chess-openings (Phase 6) | CC0 | Puzzles, opening names | None (attribution is courteous) |

## Rules for adding assets
- **Never** use assets from Chess.com or any other commercial chess site: pieces, boards,
  backgrounds, sounds, icons, mascots or bot/coach characters.
- **No real people** as bots or coaches.
- Lichess-hosted piece sets have mixed licences, and some are non-commercial. Check each one and add
  it to this table before use.
- Board colours are CSS gradients, the backdrops are pure CSS, and the bot portraits and logo are original SVG drawn in code, so there are no image licences to track.
