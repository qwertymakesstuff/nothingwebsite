# Idle Empire (`/idle-empire/`)

An incremental idle game: strike crowns at the Mint, buy buildings that strike crowns for you,
grow a market stall into an industrial empire. Plain HTML, CSS and ES modules, no build step,
no dependencies. Built in phases (see the roadmap in the project brief); done so far:
**phase 1** (foundation and core gameplay), **phase 2** (economy and purchase systems),
**phase 3** (upgrades and multipliers), **phase 4** (empire buildings and progression),
**phase 5** (achievements and milestones) and **phase 6** (statistics).

| File | Job |
| --- | --- |
| `index.html` | page shell: treasury, the Mint, rank, skyline, upgrade shop, building shop, toasts |
| `css/style.css` | theme tokens (dark iron + gold) and component looks |
| `css/layout.css` | three columns on wide screens, two on medium, stacked below 820 px |
| `css/animations.css` | floating click rewards, purchase / denied feedback, toasts, chimney smoke |
| `js/config.js` | tuning knobs: click value, default price growth, buy modes, loop timings |
| `js/main.js` | entry point: creates the one game state, logic loop (100 ms) and render loop |
| `js/gameState.js` | the single authoritative state object (`createState()`) |
| `js/buildings.js` | the 14-building roster as data: name, kind, description, cost, rate, unlock rule, icon |
| `js/conditions.js` | unlock conditions shared by buildings and upgrades, and their progress |
| `js/milestones.js` | ownership milestones and empire ranks (pure data and maths) |
| `js/progression.js` | `checkProgress()`: records new unlocks / milestones / ranks and returns them as events |
| `js/skyline.js` | the skyline SVG that grows with what you own |
| `js/notifications.js` | toast notifications |
| `js/achievements.js` | the 72 achievements as data (check + progress functions) |
| `js/achievementSystem.js` | checking and granting achievements (once each, timestamped) |
| `js/achievementStore.js` | keeps unlocked achievements in `localStorage` across refreshes |
| `js/achievementsView.js` | the achievement collection dialog and the unlock celebration |
| `js/stats.js` | statistics bookkeeping: the counters, recording, save conversion (no economy import) |
| `js/statistics.js` | statistics reports: production history, building breakdown, bonuses, progress |
| `js/statsView.js` | the statistics dialog: overview, chart, building table, bonuses, progress |
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

98 upgrades in `upgrades.js`, each with unlock conditions (clicks, buildings owned, crowns earned,
production per second; all must hold, and once unlocked an upgrade stays unlocked) and effects:

* five x2 tiers per building (unlock at 1 / 10 / 25 / 50 / 100 owned, priced 10x to 50,000x the building)
* clicking: x2, x2, x2 and x3 click upgrades, and three that add a share of per-second income to each click
* empire-wide production: +10%, +15%, +25%, +25%, +30%, +50%
* conditional synergies: +1% output per building of the tier below (e.g. Workshops per Market Stall)
* repeatable: Sharper Dies (+1 base click, 20 levels, price x2.5 per level) and Overtime Shifts
  (all production x1.05 compounding, 25 levels, price x3 per level)

Stacking rule, the same for every effect:

```
building unit rate = baseRate x (its building multipliers) x (its ownership milestones)
                     x (1 + its synergy % / 100) x (global multipliers) x (1 + 5% per empire rank)
                     x (1 + 1% per achievement)
click value        = (1 + click additions) x (click multipliers) + per-second x (click share of per-second)
```

Multipliers multiply each other; additions add up first. Each card shows what the next level
changes before you buy it (`previewUpgrade`, computed on a copy of the state, so the preview is
exactly the result). Combined modifiers are cached per `state.upgrades` object, which is replaced
on every purchase rather than edited.

## The empire (phase 4)

14 buildings in three kinds (workers, machines, businesses), from the Market Stall (15 crowns,
0.1/s) to the Imperial Mint (1.4 Qa, 3.8 B/s). Only the Market Stall is open at the start; each
next building unlocks when you own 1 of the previous one (5 from the Gold Mine on) and have
earned a quarter of its price. The shop shows the next locked building with its requirements
and a progress bar, and counts how many are left to discover.

* **Ownership milestones** (`milestones.js`): owning 10, 25, 50, 100, 150, 200, 300, 400 and 500 of a
  building multiplies its output (x1.5 to x3 each, stacking); the row shows the next one.
* **Empire ranks**: twelve ranks by crowns earned, Street Peddler to Emperor, each +5% production.
  Shown under the Mint with a bar to the next rank.
* **Skyline**: a silhouette per building along the bottom of the Mint panel, taller as you own
  more (log scale), under a sky that warms with your rank.
* **Notifications**: toasts for new buildings, first copies, milestones (bulk buys report the
  highest one with the combined bonus), rank-ups and new upgrades. Each event is reported once.

Pacing, from a simulated player (3 clicks/s, best-payback buying, all affordable upgrades, no
prestige): Factory 5 min, Bank 22 min, Railway 1.1 h, Stock Exchange 3.6 h, Airship 6 h,
Aether Refinery 11 h, Sky Colony 19 h, Imperial Mint 30 h. Prestige (phase 7) is meant to
shorten the later stretch.

## Achievements (phase 5)

72 achievements in seven groups: clicking (clicks, crowns earned by clicking), earning, production
per second, buildings (in total, and 100 of each kind), upgrades (counts, all of them, both
repeatables maxed), progress (buildings unlocked, ranks) and 10 **hidden** ones that show as "???"
until done (holding exactly 777 crowns, 15 clicks in a second, a 100+ Buy Max, emptying the
treasury on a big purchase, playing between midnight and 4 a.m., ...).

* Each one adds **+1% to all production**. `grant()` refuses an id that is already unlocked or
  unknown, so a reward can never be counted twice; the unlock time is stored with it.
* The **collection** (top-bar button, which also shows the count) lists every group with locked,
  unlocked and hidden states, unlock dates, progress bars toward locked goals, and All / Unlocked /
  Locked filters.
* Unlocking shows a gold toast with a sheen, sparkles burst from the top-bar button and it pulses.
* **Persistence**: unlocked achievements are written to `localStorage` (`idleEmpire:achievements`)
  the moment one unlocks and read back on load, dropping unknown ids, bad or future timestamps and
  corrupted JSON. This is the only thing saved so far; the full save system (phase 8) will take
  it over. Because the reward is kept too, a returning player starts slightly faster.

## Statistics (phase 6)

`state.stats` records, as things happen: crowns earned by clicking, crowns each building has made,
crowns spent, buildings bought, upgrade levels bought, highest production per second, best single
click, best clicks in a second, refused purchases, buy-mode switches and play time (the time the
game loop has run). `state.session` holds this visit's start and a production sample every 5 s
(the last 10 minutes) for the chart; it is not meant to be saved.

The books always balance, and a test plays 30 simulated minutes to prove it:

```
crowns earned  = crowns earned by clicking + crowns made by all buildings
crowns in hand = crowns earned - crowns spent
```

The **Statistics** button in the top bar opens a screen with 16 overview figures, a production
chart for this visit (log scale once values pass 1e308), a per-building table (owned, output
each and in total, share of production, crowns made so far), the active bonuses (rank,
achievements, empire-wide upgrades, click bonuses) and progress (rank, buildings unlocked,
ownership milestones, upgrades, achievements). `serializeStats` / `deserializeStats` turn the
statistics into plain JSON and back (missing, negative or non-numeric values become zero), ready
for the save system.

## Scope so far

Clicking, six buildings with escalating prices, passive income, per-second and per-click counters
(phase 1); x1 / x10 / x100 / Max buying, exact bulk prices, the economy config, affordability
states and purchase feedback (phase 2); upgrades, multipliers and the upgrade panel (phase 3); 14 buildings, tiered unlocks,
milestones, ranks, skyline and notifications (phase 4); achievements with rewards, hidden ones, the
collection and their persistence (phase 5); statistics and the statistics screen (phase 6). Not yet
(later phases): prestige, saving and offline earnings. **Only achievements are saved yet**: a refresh starts the empire over.

`window.idleEmpire` exposes `{ state, economy }` for testing from the console.

## Testing

`node --test tests/music/idle-empire.test.mjs`: syntax check, BigNum arithmetic past 1e308 and
bad input, formatting, cost scaling, clicking, purchase validation, passive income, a simulated
hour of greedy play, bulk prices = sum of singles, Buy Max exactness from 0 to 3.3e5000 crowns,
all-or-nothing buy modes, config defaults, the upgrade catalogue, unlocks, one-time and
repeatable purchases, multiplier stacking, preview = result, and a simulated session with and
without upgrades, the roster, tiered unlocks, milestones and ranks (including bulk-buy events),
skyline levels, a two-hour pacing check, the achievement catalogue, once-only grants with
timestamps, the reward, every hidden achievement, progress bars, and the store (reload, garbage,
blocked storage), statistics bookkeeping over a simulated session, records, the statistics save
round trip, production history and the report helpers.
