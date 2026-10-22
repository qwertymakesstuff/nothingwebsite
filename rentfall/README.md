# Rentfall (`/rentfall/`)

A single-player roguelike about a slot machine in an old apartment block: the building's twenty
windows are the reels. Collect odd little symbols, chain their synergies and earn enough to pay
twelve rent deadlines; pay the twelfth (the Final Notice) and the lease is yours. Plain HTML, CSS
and ES modules, no build step, no dependencies, no asset files (the art is inline SVG and the
sound is synthesised with WebAudio). The currency (¤) is fictional: there are no real-money
purchases and nothing to cash out.

## Playing

- **Spin** (`Space`): up to 20 symbols from your collection land in random windows (the rest sit
  this spin out; empty windows stay dark). Each earns its base value plus its effects.
- **The mail** arrives after every spin: take one of three symbols (`1`–`5`), reroll (`R`) or skip
  (`S`). Skipping keeps the collection lean, so your best symbols show up more often.
- **Rent day**: when the spins run out, pay the rent. Short = evicted. Savings carry over.
- **The corner shop** opens after each rent: four symbols, two relics, two supplies, symbol
  removal and one upgrade service (polish +1 base, laminate against destruction, or photocopy).
  Rerolls get pricier each time; Fortune Cookies give free ones.
- Hover a window after a spin for its exact sum; teal outlines show what affected it, amber what
  it affected. The paper receipt lists every symbol, payout and event of the last spin.
- `C` collection and almanac, `H` help, `Esc` closes dialogs.

Settings: animations on/off, animation speed, sound and volume, explanations, rain, confirm skips.
The active run (saved after every action, including before a spin's animation plays), the profile
(wins, evictions, best run, last 30 runs) and settings are kept in `localStorage`. Starting a new
run while one is unfinished records it as an eviction. "Reset all progress" (in Run history)
asks first and keeps settings.

## Rules of resolution

Every spin resolves in four fixed phases (also in the in-game help):

1. **Setup**: destroying, eating, transforming, disabling. Batteries (−3), Keys (−2), Dogs, Black
   Cats and Recycling Bins (−1) have priority and act first.
2. **Earn**: flat bonuses and penalties, then relic bonuses, then the deadline's notice.
3. **Boost**: multipliers, after every flat bonus. The Golden Ticket (priority 9) acts last.
4. **After**: counters, storage, growth and new symbols. A cell's value is settled before this
   phase, so a Candle that burns out still earns.

Within a phase, symbols act by priority, then in reading order. A cell is worth
`floor((base + flat) × multipliers)`, and multipliers never apply to a value ≤ 0. Each hook fires
at most once per phase per spin. Destroyed symbols skip later phases and leave the collection.
Disabled ones ("zz") earn 0 and do nothing. Whole-spin multipliers (Night Shift, Double Shift)
only apply to a positive total. Money never drops below 0.

## Content

- **52 symbols** (50 you can collect, plus Junk and the Landlord). Categories: basic income, money
  and containers, office and production, cats/mice/yarn, garden, kitchen, multipliers and decor,
  risk and reward, junk, and utility (removal, extra spins, discounts, rerolls, extra choices).
  The data and effects are in `js/symbols.js`. A test checks that no two symbols share the same
  rules.
- **14 relics** (rule changes for the run), **5 supplies** (single use, carry three) and **3 upgrade
  services**, all in `js/relics.js`.
- **12 deadlines**, from ¤20 in 4 spins to ¤2,400 in 10 (`js/rent.js`). Five carry a landlord's
  notice: Garage Sale, Heat Wave, Market Day, Brown-out, Noise Complaint. The Final Notice puts
  the Landlord himself on the grid, earning −5 every spin.

## Code

| File | Job |
| --- | --- |
| `js/config.js` | grid size, storage keys, starting collection, rarity prices and draft weights, shop tuning |
| `js/rng.js` | seeded RNG with saveable state (`run.rng`); seed strings like `MOTH-4821` |
| `js/symbols.js` | the symbol catalogue: data plus `setup` / `earn` / `boost` / `after` / `onDestroy` hooks |
| `js/effects.js` | `resolveSpin()`: the pure resolution engine and its `ctx` API; `explainCell()` |
| `js/relics.js` | relics (engine hooks and numeric modifiers), supplies, services |
| `js/rent.js` | deadlines, notices, `rentDue()` |
| `js/generate.js` | grid placement, rarity rolls, symbol offers |
| `js/collection.js` | symbol instances, passive effects (coupon discount, delivery choices) |
| `js/shop.js` | offers, live prices, every purchase as a validate-then-apply transaction |
| `js/state.js` | the run and its actions (`spin`, `chooseDelivery`, `payRent`, shop wrappers, `useItem`) |
| `js/save.js` | run and profile persistence with full validation; records; reset |
| `js/settings.js`, `js/audio.js` | settings with validation; synthesised sound effects |
| `js/icons.js` | all artwork as inline SVG |
| `js/ui/*` | rendering: `machine.js` (the building, falling reels, step-by-step scoring), `hud.js`, `modals.js`, `shopView.js`, `screens.js`, `cards.js`, `dom.js` |
| `js/main.js` | controller: input, saving, which screen to show |
| `tools/balance.mjs` | plays whole campaigns with bots (`naive`, `random`, `smart`) and prints win rates and margins |
| `tools/banner.mjs` | regenerates the arcade banner from the icons |

Game rules never touch the DOM. Every action copies the run, validates, then applies, so a failed
action returns the run unchanged. The same seed with the same choices always replays identically.

## Balance

`node rentfall/tools/balance.mjs 80` at the time of writing:

| Bot | Wins | Typical end |
| --- | --- | --- |
| naive (always takes the first offer, never shops) | 0% | evicted at deadlines 6–8 |
| random (random offers and skips, never shops) | 0% | evicted at deadlines 5–8 |
| smart (simulates each offer and purchase; ignores supplies and most relics) | ~58% | wins, or falls at 9–12 |

Early deadlines leave about 2× the rent in savings even for careless play. Margins shrink to about
1.5× for the smart bot by the Final Notice.

## Testing

`node --test tests/music/rentfall.test.mjs` covers syntax, symbol data and art, broken
references, every symbol family's effects, resolution order and priorities, multipliers vs.
penalties, duplicate-trigger prevention, relics and notices, placement, seeded reproducibility,
out-of-turn actions, rent (exact, short, final, modifiers), shop transactions (prices, insufficient
funds, sold offers, coupons, relic duplicates, the item limit, services, removal, rerolls), every
supply, save round trips and repairs of corrupt saves, profile records, settings, and 25 whole
campaigns with invariants checked after every action. The interface was also played through in a
headless browser at desktop and phone sizes.
