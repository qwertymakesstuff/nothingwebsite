# WORLD DOMINION — design system

Rendered live at `world-dominion/design.html`. Source of truth today: `css/tokens.css` + `css/components.css`.

## Direction: night cartography

- **The map is the game.** It fills the screen edge to edge. UI floats over it as frosted-glass islands
  (`--surface` + backdrop blur) and never boxes it in.
- **Quiet world, bright you.** Ocean is a dark slate blue; land uses six muted, desaturated tints chosen so
  neighbours never match (graph colouring at build time). Your nation is warm gold (`--land-player`), the one
  saturated colour on the map, so you always find yourself instantly. Gold is also the primary-action colour.
- **Few things, large targets.** Permanent HUD = top bar (3 groups) + 5-button dock + zoom. Every control is
  ≥ 40px. Text is short and literal ("Improve relations", not "Diplomatic overture").
- **One secondary pattern per job.** Drawers for tools (left) and places (right); a modal only for decisions;
  toasts for news; a tooltip for hover. Everything closes with ✕, Esc or a click on the map.
- **Calm motion.** 140–420ms ease-out; the camera arcs when flying; respects reduced motion.

## Tokens

| Group | Tokens |
|---|---|
| Map | `--map-space` `--map-ocean` `--map-ocean-hi` `--map-grid` `--map-border` `--land-0…5` `--land-player` `--land-player-edge` `--land-select-edge` |
| Surface | `--surface` `--surface-solid` `--surface-raised/hover/press` `--scrim` `--line` `--line-strong` |
| Text | `--text` `--text-muted` `--text-dim` `--text-on-accent` |
| Semantic | `--accent` `--good` `--bad` `--warn` `--info` (+ `-soft` backgrounds) |
| Type | `--font-display` Space Grotesk (titles, numbers, tabular) · `--font-ui` Inter · sizes `--fs-xs…2xl` |
| Space / shape | `--s1…s8` (4px grid) · `--r-sm/md/lg/pill` · `--shadow` `--shadow-lg` · `--hit` 40px |
| Motion | `--ease` `--t-fast` `--t-med` `--t-slow` |
| Layout | `--topbar-h` `--dock-h` `--edge` `--drawer-w` |

## Components

`wd-surface` · `wd-btn` (primary / secondary / danger / ghost; md, lg, block) · `wd-icon-btn` ·
`wd-tag` (you / good / info / neutral / warn / bad / plain) · `wd-chip` + `wd-swatch` · `wd-stat` / `wd-stat-grid` ·
`wd-meter` · `wd-row` (icon, title, subtitle, trailing value or tag) · `wd-section` · `wd-slider` · `wd-seg` ·
`wd-kbd` · `wd-drawer` · `wd-modal` + `wd-choice` + `wd-fx` · `wd-toast` · `wd-tip` · dock button · icons (`js/ui/icons.js`) ·
ledger (`wd-ledger`: label/value lines for budgets, factors and decision logs) · map-mode picker (`layers-pop`, opened from the layers button at the top of the zoom stack) · map legend (`legend`, 7 stepped
swatches) · flag (`flag`, 4:3, 40×30).

### Map modes

Political uses the six land tints (territories take their sovereign's tint; touching owners never share one) and gold
for the player. Data modes use 7-step ramps from dark (few) to light (many): blue `--ramp-pop-*` for population,
green `--ramp-eco-*` for the economy, red-to-green `--ramp-stab-*` for stability, slate-to-rose `--ramp-mil-*` for military strength. Neither ramp uses gold, so the player's outline still reads on every mode.
`--land-none` marks no data. Region borders (`--region-edge`) are a thin light line, only drawn when zoomed in.

Relation scale used everywhere (tags, meters, tooltips): Hostile (bad) → Wary (warn) → Neutral → Cordial (info)
→ Friendly (good); "Your nation / Your territory" is gold.

## Figma workflow

Figma wasn't reachable from the session that built this checkpoint, so the system lives in code first.
The intended setup, so design and code stay one-to-one:

1. **File:** `World Dominion — UI` with pages *Foundations*, *Icons*, *Components*, *Screens*, *Map styles*.
2. **Variables:** one collection per token group above, same names without `--` (e.g. `land/player`,
   `surface/raised`, `space/s4`). Copy values from `design.html` (it prints each token's value).
3. **Components:** one Figma component per class in the list above, with variants matching the modifiers
   (`Button / variant=primary|secondary|danger|ghost, size=md|lg`). Name layers after the CSS classes.
4. **Icons:** 24×24 frames, 1.8 stroke, round caps/joins, exported as SVG and pasted into `js/ui/icons.js`
   (the inner markup only). No raster artwork; the banner and map are generated from data.
5. **Screens:** frames at 1440×900 and 390×844 for: nation picker, main game, country panel, each dock
   panel, event window. Screenshots of the current build are the starting point.
6. **Hand-off:** changes in Figma land as edits to `tokens.css` / `components.css`; `design.html` is the
   check that code matches the file.
