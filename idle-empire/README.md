# Idle Empire (`/idle-empire/`)

An incremental idle game: strike crowns at the Mint, buy buildings that strike crowns for you,
grow a market stall into an industrial empire. Plain HTML, CSS and ES modules, no build step,
no dependencies. Built in phases (see the roadmap in the project brief); this is **phase 1:
foundation and core gameplay**.

| File | Job |
| --- | --- |
| `index.html` | page shell: treasury, the Mint, building shop |
| `css/style.css` | theme tokens (dark iron + gold) and component looks |
| `css/layout.css` | two-column layout, stacked below 820 px |
| `css/animations.css` | floating click rewards, purchase / denied feedback |
| `js/main.js` | entry point: creates the one game state, logic loop (100 ms) and render loop |
| `js/gameState.js` | the single authoritative state object (`createState()`) |
| `js/buildings.js` | building roster as data: name, description, base cost, growth, rate, icon |
| `js/economy.js` | pure rules: costs, production, click, buy, tick |
| `js/bigNum.js` | the number type every amount uses |
| `js/numberFormatter.js` | the one function that turns amounts into text |
| `js/ui.js` | DOM building, input, and change-only rendering |

## Numbers

Every amount (currency, costs, production) is a `BigNum`, so no system ever does arithmetic on
raw JavaScript numbers. Below 1e300 a BigNum is an ordinary double, so everyday sums are exact;
above that it switches to mantissa x 10^exponent and keeps going (a 5,000th Bank costs 4.31e309).
Invalid input (NaN, Infinity, garbage strings) becomes zero, division by zero gives zero, and
`toJSON()` / `BigNum.from()` round-trip every value for saving later.

Building prices: `baseCost * growth^owned`, rounded up. `buildingCost(def, owned, count)` already
prices any number of copies in closed form for bulk buying.

Formatting: `0.1`, `999`, `12,345`, `1.23 M` ... `999 NoDc`, then `1.23e70`. Digits are cut, never
rounded up, so the counter never shows more than you have.

## Phase 1 scope

Clicking, six buildings with escalating prices, passive income, per-second and per-click counters.
Not yet (later phases): bulk buying, upgrades, achievements, statistics, prestige, saving and
offline earnings. **Progress is not saved yet**: a refresh starts over.

`window.idleEmpire` exposes `{ state, economy }` for testing from the console.

## Testing

`node --test tests/music/idle-empire.test.mjs`: syntax check, BigNum arithmetic past 1e308 and
bad input, formatting, cost scaling, clicking, purchase validation, passive income, and a
simulated hour of greedy play.
