# WORLD DOMINION

Map-first country sandbox at `missing.website/world-dominion/`. You lead a real nation on an interactive world
map and play however you like: conquest, development, diplomacy, economy, or just ruling indefinitely.

**Status: checkpoint 2 — the real world map and the country database.**
Checkpoint 1 built the interface (top bar, 5-button dock, drawers, event window, design system). Checkpoint 2
replaced the placeholder map with Natural Earth 1:50m countries, added a structured country database, on-demand
first-level regions, flags, and the map-mode (overlay) framework with Political, Population and Economy modes.
The simulation (armies, AI, politics) is still to come; actions that need it are tagged *Soon* in the UI.

## How it fits into the site

Same pattern as the other bigger games (Zero Day, PUMPED, Silicon Dreams): a self-contained folder at the site
root, static files only, ES modules, no build step at runtime, no shared code with other games.

| Touchpoint | Change |
|---|---|
| `world-dominion/` | the game |
| `play/public/games.json` | one entry, group `strategy` |
| `play/public/index.html` | one heading label in `GROUPS` (`strategy: 'strategy'`) |
| `play/public/banners/world-dominion.svg` | arcade banner, generated from the game's map |
| `pages.html` | one link in "bigger games" |
| `offline-files.json` | regenerated with `node tools/offline/build-manifest.mjs` |
| `tests/music/world-dominion.test.mjs` | data, database, regions, overlays, state, save and listing tests |
| `tools/world-dominion/` | data and banner generators (not shipped) |

Every path inside the game is relative, so it works on missing.website, in the offline zip and in the
Chromebook offline cache. Saves use `localStorage` key `world-dominion-save-v0` (the format version is inside the
save; checkpoint-1 saves are migrated automatically).

## Layout

```
index.html               the game page
design.html              living design system (every component, rendered from the real CSS)
css/tokens.css           colours (incl. map-mode ramps), type, spacing, motion
css/components.css       reusable components
css/game.css             game-screen layout: map, HUD, picker, map modes, legend, phone layout
js/main.js               controller: start screen, HUD, map modes, clock, events, actions, save, keyboard
js/ui/map.js             SVG world map (see "The map")
js/ui/panels.js          the country panel and the five toolbar panels
js/ui/flags.js           real flag, or a generated one
js/ui/overlays.js        Drawer, modal (event window), toasts, tooltip, Esc stack
js/ui/icons.js, dom.js   icon set, DOM helper
js/core/db.js            THE COUNTRY DATABASE (joins geography + starting data, derives game values)
js/core/regions.js       region geography, fetched on demand
js/core/overlays.js      map modes: Political, Population, Economy (+ how to add more)
js/core/state.js         game state (what changes in play), save/load, migration
js/core/events.js        event shape (major / minor) + the sample event
js/core/format.js        money / people / date formatting
js/data/world.js         GENERATED geography: 240 countries and territories
js/data/nations.js       GAMEPLAY starting data: capitals, population, GDP, government, military, resources
data/regions/<ID>.json   GENERATED regions: 4,549 first-level subdivisions in 212 files
flags/<iso2>.svg         flags (flag-icons, MIT — see flags/LICENSE.txt)
```

## Data: what is real and what is game

| Layer | File | Source | Nature |
|---|---|---|---|
| Country shapes, borders, ISO codes, sovereignty, continent, area | `js/data/world.js` | Natural Earth 1:50m admin-0 (public domain) | **geographic fact** |
| Region shapes, names, ISO 3166-2 codes, types | `data/regions/*.json` | Natural Earth 1:10m admin-1 (public domain) | **geographic fact** |
| Flags | `flags/` | flag-icons 7 (MIT) | real flags |
| Capital, population, GDP, active military | `js/data/nations.js` | rounded mid-2020s public estimates | **realistic starting values** |
| Territories' population and GDP | `world.js` (`pop2019`, `gdp2019`) | Natural Earth's own 2019 attributes | realistic starting values |
| Government type | `js/data/nations.js` | the game's simplified classification | game judgement |
| Resources | `js/data/nations.js` | major producers from public rankings | approximate |
| Stability, infrastructure, military strength | derived in `js/core/db.js` | formulas (government, crises, wealth, troops, GDP) | **simulated** |
| Ownership, relations, buildings, regional control | `js/core/state.js` | — | **live game state** |

Every database record carries `sources` saying which of these its numbers came from, and the country panel prints
a one-line note distinguishing them.

**Stable ids.** Countries are keyed by ISO 3166-1 alpha-3 (`DEU`, `USA`). Where Natural Earth has no valid,
unique ISO code its `ADM0_A3` is used (`KOS` Kosovo, `CYN` Northern Cyprus, `SOL` Somaliland, `IOA`/`ATC` two
Australian territories). Regions are keyed by Natural Earth's `adm1_code` (`DEU-1573`) and also carry their
ISO 3166-2 code where one exists (`DE-BY`).

**A country record** (`country(id)` in `core/db.js`): `id, iso2, iso3, isoNum, name, formal, status, territory,
sovereign, continent, subregion, areaKm2, neighbors, regionCount, flag, tint, capital, population (M), gdp ($bn),
gdpPerCapita, government {key,label}, troops (K), military {strength, tier}, stability, infrastructure,
resources[], sources{}`. Live values go through `ownerOf`, `regionOwnerOf`, `stabilityOf`, `troopsOf`,
`buildingsOf` with the game state.

## The map

- 240 countries and territories as SVG paths, pre-projected (Natural Earth projection) at build time by
  `tools/world-dominion/build-world.mjs`, written in a compact path format (530 KB, ~150 KB gzipped).
- Pan (drag), zoom (wheel, trackpad pinch, touch pinch, double-click, + / −, up to 24×), fly-to.
- Hover highlight (a translucent copy of the hovered shape; cheaper than filters on large countries) and tooltip;
  click to select (outlined; opens the country panel); click empty sea to deselect.
- Names appear as they fit; region names take over when you zoom into a country.
- Countries too small to see at the current zoom (87 at world view) get a small clickable dot.
- **Recolouring:** `map.setFills(Map<id, css colour>)` touches only shapes whose colour changed;
  `map.setRegionFill(regionId, colour)` is ready for regional control.
- **Regions:** at about 2.2× zoom, regions load for the (up to 24) largest countries on screen, one small file
  per country, drawn as clipped hit areas plus internal borders. Nothing region-related loads at world view.
  Ownership is country-level today; `state.regionOwners` is the hook for partial conquest, separatism and civil war.

## Map modes (overlays)

The layers button (top of the zoom stack, or `L`) switches modes. Political shows owners (territories share their
sovereign's colour; the player is gold). Population and Economy use 7-step colour ramps with a legend.

To add a mode, push a definition into `OVERLAYS` in `js/core/overlays.js`:
`{ id, label, icon, hint, fill(country, {state}) → css colour, legend(ctx) → null | {title, steps, note}, describe(country, ctx) → string }`.
The `stepped()` helper builds data modes from a value, thresholds and a colour ramp in `tokens.css`.

## Data limitations

- **Borders are de facto, as Natural Earth draws them.** Disputed areas follow its default "who controls it" view:
  Crimea is drawn as part of Russia, Kashmir is split between India, Pakistan and China along the lines of
  control, Western Sahara is separate, and Kosovo, Somaliland and Northern Cyprus are their own entities. Natural
  Earth also publishes country-specific points of view (e.g. a Ukrainian or Indian view); switching to one is a
  generator change, not a game change. Natural Earth
  lists Palestine under Israel's sovereignty; the game treats Palestine as self-governing and Western Sahara as
  administered by Morocco. The Siachen Glacier sliver and Antarctica are left out.
- **1:50m detail.** Accurate at world and continent scale. At high zoom coasts are generalised (simplified to
  ~2 km), and microstates (Vatican, Monaco, Nauru) are a few pixels wide, hence the dots.
- **Region borders don't share lines with country borders.** Regions come from the 1:10m set; their outer edges
  are clipped to the 1:50m country shape, so only internal region borders are drawn, but a coastal region's
  hit area can be a sliver smaller or larger than the land.
- **Regions are uneven.** Natural Earth's first level is whatever each country uses: 16 German states, but over
  200 UK unitary authorities, 101 French departments... and none for some places (Singapore has 5; Vatican,
  Monaco, Puerto Rico, Hong Kong and others have none). Gameplay should use them as given, or group them later.
- **Region names** are English where Natural Earth has them, otherwise local names.
- **No region statistics.** Natural Earth admin-1 has no population or GDP; regional numbers will have to be
  apportioned (e.g. by area) or come from another source.
- **Starting figures are rounded estimates**, not an almanac; territories use Natural Earth's 2019 figures; some
  uninhabited territories correctly have zero population. Government types are simplified.
- **Flags:** 236 real flags; Northern Cyprus, Somaliland and two uninhabited Australian territories have no flag in
  flag-icons and get a generated one (three stripes and a disc, chosen from a hash of the id).

## Regenerating the data

```bash
mkdir -p /tmp/wd && cd /tmp/wd && npm init -y && npm i d3-geo@3 topojson-client@3 mapshaper@0.6 flag-icons@7
```

```bash
B=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson; cd /tmp/wd && curl -LO $B/ne_50m_admin_0_countries.geojson && curl -LO $B/ne_10m_admin_1_states_provinces.geojson
```

```bash
node tools/world-dominion/build-world.mjs /tmp/wd /tmp/wd && node tools/world-dominion/build-banner.mjs && node tools/offline/build-manifest.mjs
```

## Testing

`node --test tests/music/world-dominion.test.mjs` (also part of `node --test tests/music/*.test.mjs`): geography
(ids, ISO codes, symmetric borders, sovereignty, colouring), regions (files, counts, unique ids), flags, the
database (fields, sources, derived values), ownership, overlays, region loading, game state, save migration.

In headless Chromium (1440×900 and an iPhone 13 profile): rendering of all 240 shapes, hover highlight and
tooltip, click selection and outline, panel contents and flag, generated flag, regions appearing on zoom (and not
loading at world view), region names and region hover, flying to a region from the panel, microstate dots, all
three map modes and their legends and tooltips, recolouring on ownership change, a checkpoint-1 save continuing,
no horizontal overflow on a phone — plus every checkpoint-1 interaction. Pan/zoom measured at ~18–20 ms per frame
(p95 ~33 ms) in software-rendered headless Chromium; a real GPU does better.

## Next checkpoints

1. **Military** — armies on the map, war, battles, occupation (country-level first, regions later), peace deals.
2. **Simulation core** — a deterministic daily tick and AI nations.
3. **Build & economy** — buildings (`state.buildings`), trade, budget categories, debt.
4. **Diplomacy** — alliances, trade deals, opinion drift, reactions to aggression.
5. **Politics** — the event engine, rebellions, separatism and civil war using `state.regionOwners`.
