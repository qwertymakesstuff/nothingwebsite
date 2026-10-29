# PUMPED

A fast stock and crypto trading game at `/pumped/`. Start with $1,000 of play money, ride pumps,
dodge crashes and rug pulls, and get as rich as you can before you go broke. Every company, coin,
person and headline is fictional. No real money, no backend: plain HTML, CSS and ES modules, saved
in `localStorage`.

## Simple view

Putting `simple.` in front of the game, i.e. `missing.website/simple.pumped/`, opens the same game
and save with an easier-to-read screen: bigger text, plain-language labels, fewer panels, no
leverage. `simple.pumped/index.html` is a copy of `index.html` pointing at these files (a test keeps
them in sync). The page also switches to simple mode on any `simple.` subdomain or with `?simple`:
`simple.missing.website/pumped/` is served by the `simpleplay` Worker straight from this folder (see
`../simpleplay/`). `.assetsignore` keeps this README off that site.

## Chirper

A Twitter-style social site you can flip to (top-left switch, or `T`) while the market keeps running.

- `js/chirper/celebs-1.js`, `celebs-2.js`: the 20-celebrity cast (profiles, 25+ posts, 15+ replies,
  10+ market reactions and a few market-moving posts each, plus topics, assets, rivals, running jokes
  and catchphrases)
- `js/chirper/users-1.js`, `users-2.js`: 40 regular users (8 posts, 8 replies, 3 reactions each)
- `js/chirper/threads.js`: 30+ scripted conversations (a post and 3-6 replies that answer it)
- `js/chirper/system.js`: news, alerts and officials, 350 filler bots, hindsight lines, event tags
- `js/chirper/effects.js`: the only place a post type becomes a market effect. Effects are small
  (hype, volatility, short pumps whose ending is still up to the market) with cooldowns per asset
  (45s) and per account and asset (240s), so nobody steers a price
- `js/chirper/feed.js`: the engine. Seeded and deterministic, never touches the market's own random
  numbers, avoids repeating a line for 30 minutes, applies each effect exactly once
- `js/chirper-ui.js`: the view (timeline, profiles, threads, trending, mentions, settings)

To add content, add lines to an account's pools or a new thread; nothing else needs to change.

## Layout

```
index.html        the trading terminal
css/style.css     all styling (responsive, reduced-motion aware)
js/rng.js         seeded random numbers (whole market is reproducible from a seed)
js/assets.js      assets and category behaviour (volatility, drift, pump/crash odds and sizes)
js/events.js      news events and headlines
js/regimes.js     market-wide events: bull run, bear market, meme mania, flash crash, ...
js/market.js      the price simulation (pure, no DOM)
js/portfolio.js   cash, positions, leverage, liquidation (pure)
js/game.js        a run: market + portfolio + stats, modes, bankruptcy, cash out (pure)
js/progression.js Clout, upgrades, chart themes, achievements
js/save.js        localStorage: current run + profile (settings, scores, upgrades)
js/chart.js       canvas chart and themes
js/fx.js          flying numbers, banners, coin bursts, net worth count-up
js/audio.js       synthesised sound effects
js/tips.js        glossary tooltips
js/chirper/       Chirper content, market effects and feed engine (see above)
js/chirper-ui.js  Chirper view
js/main.js        controller: game loop, every panel, menus
```

## Testing

`node --test tests/music/pumped.test.mjs` covers the market, trading maths, leverage,
liquidation, bankruptcy, saves, regimes and progression.

In the browser, `?seed=ABC` fixes the market and `?debug=1` exposes `window.pumped`
(`step(n)`, `event(id, ticker)`, `pump(t)`, `crash(t)`, `regime(id)`, `pause()`, `give(clout)`).
