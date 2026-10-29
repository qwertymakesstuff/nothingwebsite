# PUMPED

A fast stock and crypto trading game at `/pumped/`. Start with $1,000 of play money, ride pumps,
dodge crashes and rug pulls, and get as rich as you can before you go broke. Every company, coin,
person and headline is fictional. No real money, no backend: plain HTML, CSS and ES modules, saved
in `localStorage`.

## Simple view

Putting `simple.` in front of the game, i.e. `missing.website/simple.pumped/`, opens the same game
and save with an easier-to-read screen: bigger text, plain-language labels, fewer panels, no
leverage. `simple.pumped/index.html` is a copy of `index.html` pointing at these files (a test keeps
them in sync). The page also switches to simple mode on any `simple.` subdomain or with `?simple`.

## Squawker

A Twitter-style social site you can flip to (top-left switch, or `T`) while the market keeps running.
~30 satirical celebrities, officials, exchanges and news accounts, 350 named bots plus generated ones.
Posts react to headlines, regimes and visible pumps/crashes (deliberately late and noisy). The player
can post, reply, like, repost and follow; naming a coin (`$GOB`) adds a little hype to it, once every
30 seconds per coin. The feed is saved with the run and never touches the market's random numbers.

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
js/social-data.js Squawker accounts, bot handles and post lines
js/social.js      Squawker feed engine (pure)
js/social-ui.js   Squawker view
js/main.js        controller: game loop, every panel, menus
```

## Testing

`node --test tests/music/pumped.test.mjs` covers the market, trading maths, leverage,
liquidation, bankruptcy, saves, regimes and progression.

In the browser, `?seed=ABC` fixes the market and `?debug=1` exposes `window.pumped`
(`step(n)`, `event(id, ticker)`, `pump(t)`, `crash(t)`, `regime(id)`, `pause()`, `give(clout)`).
