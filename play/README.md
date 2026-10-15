# play.missing.website

A small arcade of ten classic-style games that run in the browser. Static files only (no build step), served by a
Cloudflare Worker with static assets.

## Games

| URL | Game | Inspired by | Controls |
|---|---|---|---|
| `/snake/` | Snake | the classic snake game | arrows / WASD, swipe, on-screen pad |
| `/blockfall/` | Blockfall | falling-block puzzles | arrows, up/X rotate, space drops |
| `/flutter/` | Flutter | one-button bird-and-pipes games | space / click / tap |
| `/merge/` | Merge Tiles | number-merging 2048-style puzzles | arrows, swipe |
| `/paddle/` | Paddle Duel | the original paddle-and-ball game | mouse / touch drag, up / down |
| `/bricks/` | Brick Breaker | brick-breaking games | mouse / touch drag, space launches |
| `/sweeper/` | Sweeper | mine-clearing puzzles | click, right-click or long-press to flag |
| `/five/` | Five Letters | five-letter word-guessing games | type or tap the keys |
| `/raiders/` | Void Raiders | shoot-'em-up arcade invaders | arrows, space |
| `/chomper/` | Chomper | maze-and-dot chase games | arrows / WASD, swipe |

Names, art, mazes and word lists are original; only the well-known mechanics are borrowed.

## Layout

```
wrangler.jsonc        Worker config (name: nothingplay, domain: play.missing.website)
public/index.html     the homepage: a list of 1260 x 320 banners (same layout as missing.website/programs)
public/games.json     what the homepage lists: name, banner image, url (add "hidden": true to hide one)
public/banners/       one 1260 x 320 banner per game (SVG; replace with your own PNG/JPG any time)
public/assets/        site.css (page look), gamekit.js + gamekit.css (shared game engine and chrome)
public/<game>/        index.html + <game>.js for each game
```

`gamekit.js` gives every game the same: start / pause / game-over screens, score and a best score saved in
the browser (`localStorage`), sound on/off, pausing when the tab is hidden, keyboard + mouse + touch input and
on-screen controls on phones. A game is one class with `reset()`, `update(dt)`, `draw(ctx)` and `press(code)`.

## Adding a game

1. Copy a folder (for example `snake/`), rename it and write the game class in `<name>.js`.
2. Make a 1260 x 320 banner in `banners/` and add an entry to `games.json`.

## Deploying

In Cloudflare: Workers & Pages -> create a Worker named **nothingplay**, connect this repository, and set
**Root directory** to `play`. The custom domain `play.missing.website` is attached by `wrangler.jsonc` on deploy.

## Testing

`node --test tests/music/*.test.mjs` includes a syntax check of every file here. The games were also played through
with a headless browser (keyboard, mouse and touch).
