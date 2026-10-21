# Idle Empire (`/idle-empire/`)

An incremental idle game: strike crowns at the Mint, buy buildings that strike crowns for you,
grow a market stall into an industrial empire. Plain HTML, CSS and ES modules, no build step,
no dependencies. Built in phases (see the roadmap in the project brief); done so far:
**phase 1** (foundation and core gameplay), **phase 2** (economy and purchase systems) and
**phase 3** (upgrades and multipliers).

| File | Job |
| --- | --- |
| `index.html` | page shell: treasury, the Mint, upgrade shop, building shop |
| `css/style.css` | theme tokens (dark iron + gold) and component looks |
| `css/layout.css` | three columns on wide screens, two on medium, stacked below 820 px |
| `css/animations.css` | floating click rewards, purchase / denied feedback |
| `js/config.js` | tuning knobs: click value, default price growth, buy modes, loop timings |
| `js/main.js` | entry point: creates the one game state, logic loop (100 ms) and render loop |
| `js/gameState.js` | the single authoritative state object (`createState()`) |
| `js/buildings.js` | building roster as data: name, description, base cost, optional growth, rate, icon |
| `js/upgrades.js` | upgrade catalogue as data, and `collectModifiers()`: how effects combine |
| `js/upgradeSystem.js` | upgrade actions: unlock checks, prices, buying, before-purchase preview |
| `js/economy.js` | pure rules: prices, bulk quotes, Buy Max, production, click, buy, tick |
| `js/bigNum.js` | the number type every amount uses |
| `js/numberFormatter.js` | the one function that turns amounts into text |
| `js/ui.js` | DOM building, input, and change-only rendering |

## Numbers

Every amount (currency, costs, production) is a `BigNum`, so no system ever does arithmetic on
raw JavaScript numbers. Below 1e300 a BigNum is an ordinary double, so everyday sums are exact;
above that it switches to mantissa x 10^exponent and keeps going (a 5,000th Bank costs 4.31e309).
Invalid input (NaN, Infinity, garbage strings) becomes zero, division by zero gives zero, and
`toJSON()` / `BigNum.from()` round-trip every value for saving later.

Building prices: copy number k costs `ceil(baseCost * growth^k)` whole crowns, and a bulk
purchase costs exactly the sum of its copies (ten x1 buys cost the same as one x10). Only copies
priced under 2^53 can have a fraction to round, so those are summed one by one (a few hundred at
most) and the rest with the geometric-series formula: pricing a million copies is as cheap as one.

Buying (`x1`, `x10`, `x100`, `Max`, chosen in the shop header and kept in `state.buyMode`):
fixed amounts are all-or-nothing, so x10 with money for 9 buys nothing. Max buys every copy you
can afford, found by inverting the geometric series and then checking against the exact price;
with nothing affordable it quotes the next single copy. A purchase never leaves the treasury
negative. The shop shows each row's quantity, price, an affordability colour and a bar for how
close you are to the price.

Formatting: `0.1`, `999`, `12,345`, `1.23 M` ... `999 NoDc`, then `1.23e70`. Digits are cut, never
rounded up, so the counter never shows more than you have.

## Upgrades

33 upgrades in `upgrades.js`, each with unlock conditions (clicks, buildings owned, crowns earned,
production per second; all must hold, and once unlocked an upgrade stays unlocked) and effects:

* three x2 tiers per building (unlock at 1 / 10 / 25 owned, priced 10x / 50x / 500x the building)
* clicking: three x2 click upgrades, and two that add a share of per-second income to each click
* empire-wide production: +10%, +15%, +25%
* conditional synergies: +1% output per building of the tier below (e.g. Workshops per Market Stall)
* repeatable: Sharper Dies (+1 base click, 20 levels, price x2.5 per level) and Overtime Shifts
  (all production x1.05 compounding, 25 levels, price x3 per level)

Stacking rule, the same for every effect:

```
building unit rate = baseRate x (its building multipliers) x (1 + its synergy % / 100) x (global multipliers)
click value        = (1 + click additions) x (click multipliers) + per-second x (click share of per-second)
```

Multipliers multiply each other; additions add up first. Each card shows what the next level
changes before you buy it (`previewUpgrade`, computed on a copy of the state, so the preview is
exactly the result). Combined modifiers are cached per `state.upgrades` object, which is replaced
on every purchase rather than edited.

## Scope so far

Clicking, six buildings with escalating prices, passive income, per-second and per-click counters
(phase 1); x1 / x10 / x100 / Max buying, exact bulk prices, the economy config, affordability
states and purchase feedback (phase 2); upgrades, multipliers and the upgrade panel (phase 3). Not yet (later phases): achievements, statistics, prestige, saving and
offline earnings. **Progress is not saved yet**: a refresh starts over.

`window.idleEmpire` exposes `{ state, economy }` for testing from the console.

## Testing

`node --test tests/music/idle-empire.test.mjs`: syntax check, BigNum arithmetic past 1e308 and
bad input, formatting, cost scaling, clicking, purchase validation, passive income, a simulated
hour of greedy play, bulk prices = sum of singles, Buy Max exactness from 0 to 3.3e5000 crowns,
all-or-nothing buy modes, config defaults, the upgrade catalogue, unlocks, one-time and
repeatable purchases, multiplier stacking, preview = result, and a simulated session with and
without upgrades.
