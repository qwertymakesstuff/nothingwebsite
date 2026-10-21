# SkinSpin — project foundation rules

SkinSpin (`/skinspin/`) is a browser-based, CS2-inspired case-opening simulator: fictional skins,
simulated currency, animated case openings, upgrades, case battles, an inventory and progression.
These rules apply to every SkinSpin development prompt.

## Stack (matches the rest of this repo)

- Plain HTML, CSS and ES modules in `skinspin/`, no build step, no dependencies (same as
  `idle-empire/`).
- Pure logic modules (no DOM) so they can be tested with `node --test`; tests go in
  `tests/music/skinspin.test.mjs` next to the other games' tests.
- Persistence: `localStorage`, one versioned save object with migrations, so saves from earlier
  stages always load.

## Development rules

1. Inspect existing files, framework and tools before changing anything.
2. Keep the existing stack unless there is a compelling technical reason to change it.
3. Build incrementally; never implement the whole game in one pass.
4. Keep code modular, organized and reusable.
5. Centralize: item database, case database, reward generation, economy, player state.
6. Every feature uses the same balance, item values, inventory and save data.
7. Persist progress between browser sessions.
8. Never replace working features with mockups.
9. Never remove existing functionality unless explicitly required.
10. Every button, menu, filter and action must work; no decorative fake controls.
11. Original branding and artwork only.
12. Fictional currency only: no real-money deposits, withdrawals or cash-out.

## Transaction rules

- Balance can never go negative.
- An item is never awarded twice for one transaction.
- Never sell an item the player does not own.
- Locked items are never consumed by any operation.
- Validate before mutating inventory or balance; a failed transaction changes nothing.
- Case rewards are decided before the roulette animation starts.
- Displayed odds match the actual reward-generation logic.

## Stage completion

At the end of each stage: test the new feature, re-test earlier features, fix errors, verify save
compatibility with earlier stages, summarize what was implemented and tested, report unfinished
features and known bugs, and do not start the next phase until the next prompt arrives.
Make reasonable decisions independently when details are unspecified; prefer a working, polished
game over unnecessary complexity.
