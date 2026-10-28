# Checkmate Club

A browser tabletop lounge for chess and card games at `/checkmate-club/`. Plain HTML, CSS and
ES modules: no build step, no backend, no accounts. Everything is saved in `localStorage`.

Built in stages; see the status of each game in `js/core/registry.js`.

| Stage | What | Status |
| --- | --- | --- |
| 1 | Application shell: menus, library, game screens, stats, settings, rules, pause menu | done |
| 2 | ForgeGUI asset pack | not started |
| 3 | Chess | not started |
| 4 | Playing-card engine | not started |
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
js/screens/           menu, library, game (shared table screen + pause menu), stats, settings, rules
```

Routes are hash-based (`#/menu`, `#/library`, `#/game/<id>`, `#/stats`, `#/settings`,
`#/rules/<id>`), so back/forward and reloads work without a server.

## Adding a game

1. Add an entry to `GAMES` in `js/core/registry.js` (rules text included); it appears in the menu,
   library, rules and statistics automatically.
2. Put the game's rules engine in its own module with no DOM access, and its renderer separately.
3. Only set `status: 'playable'` once it can be played from start to finish.
4. Call `app.stats.record(id, { result: 'win' | 'loss' | 'draw', time, score })` when a game ends.

## Storage keys

`checkmate.settings.v1`, `checkmate.stats.v1` (and `checkmate.progress.<id>.v1` reserved for games).

## Tests

```
node --test tests/music/checkmate-club.test.mjs
```
