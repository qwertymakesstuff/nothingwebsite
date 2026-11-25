# WORLD DOMINION

Map-first country sandbox at `missing.website/world-dominion/`. You lead a real nation on an interactive world
map and play however you like: conquest, development, diplomacy, economy, or just ruling indefinitely.

**Status: checkpoint 1 — UI prototype.** The main screen, design system and interaction model are built and
tested. The simulation (provinces, armies, AI nations, politics) is not; actions that need it are clearly
tagged *Soon* in the UI instead of pretending to work.

## How it fits into the site

Same pattern as the other bigger games (Zero Day, PUMPED, Silicon Dreams): a self-contained folder at the site
root, static files only, ES modules, no build step, no shared code with other games.

| Touchpoint | Change |
|---|---|
| `world-dominion/` | the game (new) |
| `play/public/games.json` | one entry, group `strategy` |
| `play/public/index.html` | one new heading label in `GROUPS` (`strategy: 'strategy'`) |
| `play/public/banners/world-dominion.svg` | arcade banner, generated from the game's map data |
| `pages.html` | one link in "bigger games" |
| `offline-files.json` | regenerated with `node tools/offline/build-manifest.mjs` |
| `tests/music/world-dominion.test.mjs` | data, state, save and listing tests |
| `tools/world-dominion/` | map and banner generators (not shipped) |

Every path inside the game is relative, so it works on missing.website, in the offline zip and in the
Chromebook offline cache. Saves use `localStorage` key `world-dominion-save-v0` (nothing else is touched).

## Layout

```
index.html            the game page
design.html           living design system (every component, rendered from the real CSS)
css/tokens.css        colours, type, spacing, motion — the design tokens
css/components.css    reusable components (buttons, tags, stats, meters, rows, drawer, modal, toast…)
css/game.css          game-screen layout: map, top bar, dock, zoom, nation picker, phone layout
js/main.js            controller: start screen, HUD, clock, events, actions, save, keyboard
js/ui/map.js          SVG world map: pan / zoom / pinch, hover, selection, fly-to, zoom-aware labels
js/ui/overlays.js     Drawer, modal (event window), toasts, tooltip, Esc stack
js/ui/panels.js       contents of the country panel and the five toolbar panels
js/ui/icons.js        original 24px stroke icon set
js/ui/dom.js          tiny DOM helper
js/core/state.js      game state, budget, relations, save/load (DOM-free, unit tested)
js/core/events.js     event shape (major / minor) + the sample event
js/core/format.js     money / people / date formatting
js/data/world.js      GENERATED map: 175 countries, borders, label points, 6-colour map colouring
js/data/nations.js    starting data per country: capital, population, GDP, government, military
```

The map is Natural Earth 1:110m (public domain), pre-projected (Natural Earth projection) by
`tools/world-dominion/build-map.mjs` so the browser needs no map library. To regenerate:

```bash
mkdir -p /tmp/wd-map && (cd /tmp/wd-map && npm init -y && npm i world-atlas@2 topojson-client@3 d3-geo@3)
```

```bash
node tools/world-dominion/build-map.mjs /tmp/wd-map
```

```bash
node tools/world-dominion/build-banner.mjs && node tools/offline/build-manifest.mjs
```

## What the prototype does

- **Start screen** — the map is the menu: click any country (or search / quick-pick) to preview it, then
  *Lead {country}*. Territories (Greenland, Puerto Rico…) can't be led. A saved game offers *Continue*.
- **Top bar** — your nation (click to fly home), date with pause and three speeds, treasury (+ monthly
  balance), stability, military. Nothing else is permanently on screen.
- **Dock** — exactly five buttons: Military, Build, Diplomacy, Economy, More. Each opens a left drawer;
  clicking the active one closes it.
- **Country panel** — click a country: relation, key stats, opinion meter, actions (send an envoy works;
  trade/alliance are *Soon*), clickable borders, and *Declare war* behind a confirmation.
- **Events** — a major sample event ("Protests in {capital}") fires on 19 Jan, pauses time, can't be
  dismissed without a decision and previews each choice's effects. Monthly budgets arrive as minor toasts.
  *More → Preview an event* shows it again.
- **Economy** — a working tax slider: changes income, the monthly balance and the stability trend.
- **Controls** — drag, wheel / trackpad, pinch, double-click to zoom; Space, 1-3, M B D E O, C, + − 0, Esc.
- **Phones** — drawers become bottom sheets and the top bar wraps to two rows. Desktop is the priority.

## Testing

`node --test tests/music/world-dominion.test.mjs` (also part of `node --test tests/music/*.test.mjs`).
The UI was played through in headless Chromium at 1440×900 and on an iPhone 13 profile: picker, search, every
dock panel, map hover/click, envoy, war confirmation, Esc handling, wheel zoom, drag, speed 3 until the event,
choice effects, Space pause, reload → Continue, and no horizontal overflow on a phone.

## Next checkpoints

1. **Simulation core** — provinces (split large countries), ownership, a deterministic daily tick, AI nations.
2. **Military** — armies on the map, movement by drag, battles, occupation, peace deals.
3. **Build & economy** — province buildings, trade, budget categories, debt.
4. **Diplomacy** — alliances, trade deals, opinion drift, AI reactions to aggression.
5. **Politics** — the event engine (triggers, chains), rebellions, separatism, civil war, government crises.

Every system plugs into the UI built here: new drawer content in `panels.js`, new events in the `events.js`
shape, new map layers in `map.js`.
