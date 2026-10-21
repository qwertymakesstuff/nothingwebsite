# Fortune Street (`/fortune-street/`)

A property-trading board game set in the fictional harbor city of Meridian Bay. Buy property,
collect rent, complete districts, build up to landmark towers, trade with rivals and finish
the richest owner. 2-4 players, human or AI, all on one device. Plain HTML, CSS and ES modules;
no build step, no dependencies.

## Modes

| Mode | Board | Rules |
| --- | --- | --- |
| Classic Meridian | 40 spaces, 6 districts | you vs 1-3 AI; auctions; bankruptcy; round limit (default 30) |
| Local Pass-and-Play | 40 spaces | 2-4 humans; hand-off screen before each private decision |
| Quick Match | 28-space Harbor Loop | no auctions, 15 rounds, first to $2,500 net worth wins |
| Sandbox | 40 spaces | $5,000 each, jump to any space, add/remove cash, no winner |

Online multiplayer isn't implemented. The title screen shows it as a future feature.

## Tutorial

First-time visitors are asked whether they want the tutorial (it is also on the title screen and
in the pause menu). It is a real match against one AI, Captain Wren, with the first rolls and
cards scripted (`script` in `createGame`, tutorial mode only) so every rule comes up in order:
buying, completing a district, building evenly, rent, doubles, auctions, City Bulletins,
Business Opportunities and the Impound Lot, then trading, mortgages, debt and winning.
A coach card explains each step and highlights what to press; actions outside the step are
refused. Step goals are written as "the game has moved past this point", so a tutorial resumed
after a reload picks up at the right step. Progress is stored under `fortune-street:tutorial`.

## Files

| File | Job |
| --- | --- |
| `js/board.js` | districts, every asset (price, rent ladder, build cost, mortgage), both board layouts, tokens |
| `js/cards.js` | City Bulletin and Business Opportunity decks; cards act only through engine-provided `ops` |
| `js/rules.js` | pure queries: rent, effects, build/sell/mortgage legality, trade validation, net worth, whose decision it is |
| `js/engine.js` | **the only writer**: `createGame`, `dispatch(state, action)`, `publicView`, `validateState` |
| `js/ai.js` | four AI personalities; `decide(view, pid)` returns one action for `dispatch` |
| `js/rng.js` | seeded generator whose state lives in the game state |
| `js/tutorial.js` | the tutorial match setup and its steps (text, highlight target, allowed actions, goal) |
| `js/save.js` | localStorage save/load with format version and validation; settings |
| `js/app.js` | controller: owns the state, routes clicks and AI choices to `dispatch`, saves, animates, hand-offs |
| `js/ui/*` | board view (grid, tokens, dice, cards), side panels, dialogs, title/setup, tutorial coach, icons, sound |

## Rules engine

`dispatch` validates an action against the current state, applies it to a copy and returns the
new state, or returns the original state untouched with an error. That makes every transaction
atomic: a purchase, a trade or a bankruptcy happens completely or not at all. UI buttons and AI
players use the same `dispatch`, so neither can bypass the rules.

Turn phases: `preRoll` → (`buy` → `auction`) / `debt` → `postRoll` → next player. Doubles grant
another roll and a third double sends you to the Impound Lot. `currentActor()` decides who must act
(trade recipient, then debtor, then auction bidder, then the active player), and every action is
rejected unless it comes from that player.

Dice and card shuffles come from `state.rng`, so a game is fully determined by its seed and the
actions taken. The game saves after every accepted action, which means a save never holds a
half-resolved transaction, and a restored game continues exactly as the original would have.
AI players only see `publicView()`: no generator state, no deck order, no rival sealed bids.

## Economy

Net worth = cash + assets at purchase price + building investment − loan payoffs − unpaid debts.
Spendable cash is shown separately, along with liquidation value (what selling and mortgaging
everything would raise). A fully developed district returns more per dollar the cheaper it is
(Old Harbor about 1.25× its total cost per landing, Skyline Row about 0.9×). Premium districts
still charge much higher rents in absolute terms.

## Tests

`node --test tests/music/fortune-street.test.mjs` covers board data, every landing space on both
boards, wrap-around and the circuit bonus, doubles and the Impound Lot, buying and sealed-bid
auctions, rent and district bonuses, development and mortgages, taxes and timed effects,
debts, liquidation and bankruptcy, trades and counteroffers, AI legality over full matches,
victory conditions, determinism, and save round-trips in every phase.
