# Checkmate Club

A browser tabletop lounge for chess and card games at `/checkmate-club/`. Plain HTML, CSS and
ES modules: no build step, no backend, no accounts. Everything is saved in `localStorage`.

Built in stages; see the status of each game in `js/core/registry.js`.

| Stage | What | Status |
| --- | --- | --- |
| 1 | Application shell: menus, library, game screens, stats, settings, rules, pause menu | done |
| 2 | ForgeGUI asset pack | generated (32 of 40); not yet downloaded, see `assets/README.md` |
| 3 | Chess | done |
| 4 | Playing-card engine + test card table | done |
| 5 | Blackjack | not started |
| 6 | Texas Hold'em | not started |
| 7 | Klondike Solitaire | not started |
| 8–12 | More card games, opponents, progression, polish, final test pass | not started |

## Layout

```
index.html            entry page
css/style.css         all styling; colours are CSS custom properties (felt colour via data-felt)
js/main.js            bootstrap
js/app.js             shell: services, screen switching + transitions, keyboard routing
js/core/              no DOM: storage, settings schema, statistics, router, registry, timer, UI audio
js/ui/                dom helper and reusable components (button, game card, dialog, confirm,
                      score display, player info, game timer, settings panel, screen header)
js/screens/           menu, library, game (shared table frame, pause menu, game-over), stats, settings,
                      rules, workshop (test card table + asset gallery)
js/games/chess/       engine.js (rules), game.js (match controller), ai.js + ai-worker.js + ai-client.js
                      (computer), board.js (SVG renderer), pieces.js (procedural pieces), table.js (UI)
js/cards/             deck.js (cards, shuffle, piles, hands, table, turn order, match tracking),
                      view.js (card/chip rendering, flip and fly animations)
assets/               manifest.json + generated art (see assets/README.md)
```

## Chess

- Rules engine written for the club (no library), verified against the standard perft node counts
  for six reference positions; castling, en passant, promotion, check, checkmate, stalemate,
  insufficient material, threefold repetition and the fifty-move rule (the last two end the game
  automatically). Resignation and draw offers live in the match controller.
- Computer: alpha-beta search with quiescence and piece-square evaluation in a Web Worker. Four
  levels (Beginner, Casual, Club player, Club master); in self-play each level beat the one below it
  4-0. It only sees the board.
- Board: SVG, click-to-move, drag-and-drop, keyboard play, legal-move hints, coordinates, last-move
  and check highlights, move and capture animation, four board themes including a high-contrast
  colour-blind-friendly one. A game in progress is saved and resumed on return.

Routes are hash-based (`#/menu`, `#/library`, `#/game/<id>`, `#/stats`, `#/settings`,
`#/rules/<id>`), so back/forward and reloads work without a server.

## Adding a game

1. Add an entry to `GAMES` in `js/core/registry.js` (rules text included); it appears in the menu,
   library, rules and statistics automatically.
2. Put the game's rules engine in its own module with no DOM access, and its renderer separately.
3. Only set `status: 'playable'` once it can be played from start to finish.
4. Give it a table: a function in `TABLES` (js/screens/game.js) that receives the shared frame
   (timer, pause, `gameOver()` which records statistics) and returns its element and hooks.

## Storage keys

`checkmate.settings.v1`, `checkmate.stats.v1` (and `checkmate.progress.<id>.v1` reserved for games).

## Tests

```
node --test tests/music/checkmate-club.test.mjs
```
