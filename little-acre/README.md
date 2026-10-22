# Little Acre (`/little-acre/`)

A 2D farming and life sim. You inherit Aunt Hazel's overgrown farm at the edge of Bramblewick:
clear it, grow crops through four seasons, sell what you grow, befriend six villagers, fish,
craft, cook and decorate. All pixel art is drawn in code, the music is original and synthesized
in the browser, and every character, place and line of dialogue is original.

Plain HTML Canvas + ES modules, no build step, no dependencies (like the other games here).
Progress saves to `localStorage` automatically.

## Playing

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD / arrows | left stick |
| Use the selected tool or item (till, water, chop, plant, place, cast, eat) | Space or left click (hold to repeat) | **Use** |
| Interact (talk, gift, harvest, ship, open, shop, sleep) | E / Enter or right click | **Act**, or tap a nearby tile |
| Hotbar | 1–9, 0, -, =, mouse wheel, Q | tap a slot |
| Menus | Tab/I bag · C crafting · J quests · K journal · L calendar · M map · F friends · O / Esc options | **Bag** |

**The core loop:** till grass with the hoe → plant seeds → water each day (rain does it for you)
→ harvest when ripe → put the crop in the shipping bin by the house → it sells overnight. Sleep
in your bed before 2 am or you pass out (and lose some gold). Energy refills overnight; food
restores it during the day.

## What's in it

- **Farming**: 17 crops across spring, summer, fall and winter, some regrowing; growth over
  watered days; crops wither when their season ends; fertilizer; crows (and scarecrows);
  sprinklers; preserves jars that turn crops into jam or pickles.
- **World**: the farm, the town of Bramblewick (general store, smithy, carpenter's workshop,
  town square with a bulletin board), Whisperwood forest, Mirror Lake and the Old Quarry, plus
  the farmhouse and shop interiors. Day/night lighting, rain and snow, seasonal palettes.
- **Villagers**: Pip, Bram, Mabel, Juni, Teodor and Mayor Odessa walk daily schedules (that
  change by weekday, weather and festival), have their own dialogue that grows with friendship,
  birthdays, gift tastes, and friendship rewards (items and recipes).
- **Quests**: 11 story quests and a new bulletin-board request every morning.
- **Festivals**: Seedling Fair (spring 13), Midsummer Lanterns (summer 20), Harvest Show
  (fall 16), Frostlight Feast (winter 25).
- **Progression**: tool upgrades (copper, iron) at the smithy, more seeds after shipping 50
  items, the north field expansion, a kitchen renovation (cooking), a bigger backpack, crafting
  recipes unlocked by quests and friendship, placeable decorations.
- **Fishing**: 13 fish across the farm pond, forest creek and lake, by season, hour and
  weather, with a catch minigame whose difficulty depends on the fish and your rod.
- **Collection journal**: crops, forage, fish, minerals, cooking and artisan goods.

## Code layout

Game data is kept apart from game logic: everything in `js/data/` is plain data.

| File | Job |
| --- | --- |
| `js/data/mapRows.js`, `maps.js`, `tiles.js` | tile maps, buildings, warps, fixed things; the tile legend |
| `js/data/crops.js`, `items.js`, `objects.js`, `forage.js`, `fish.js` | crops, the item catalogue, debris / nodes / placeables, wild spawns, fish |
| `js/data/npcs.js`, `dialogue.js` | villagers (looks, schedules, gift tastes, rewards) and everything they say |
| `js/data/recipes.js`, `shops.js`, `quests.js`, `events.js`, `music.js` | crafting / cooking / machines, shop stock and upgrades, quests and requests, festivals, tunes |
| `js/config.js` | tuning: clock speed, energy, tool costs, friendship points |
| `js/state.js` | a new game (the save file is this object) |
| `js/world.js` | tiles, collision, warps, pathfinding |
| `js/inventory.js` | the backpack: stacking, moving, all-or-nothing removal |
| `js/farming.js`, `tools.js` | soil, growth, harvest; using tools and items on tiles |
| `js/day.js`, `spawns.js` | the overnight pass (shipping, growth, respawns, weather) |
| `js/npc.js`, `quests.js`, `festival.js` | schedules, friendship and gifts; quests and the board; festivals |
| `js/economy.js`, `crafting.js`, `fishing.js`, `journal.js` | shops and upgrades; crafting and machines; fishing; the collection |
| `js/save.js` | save / load with validation, migration and backups of unreadable data |
| `js/calendar.js`, `rng.js`, `conditions.js` | dates and clock; seeded randomness; unlock conditions |
| `js/game.js` | the controller: clock, movement, villagers walking, actions, fishing, days |
| `js/render/sprites.js`, `renderer.js` | procedural pixel art; the camera, depth sorting, weather and night lighting |
| `js/ui/*.js` | HUD, dialogue, menus, shops, chest, board, crafting, fishing, festivals, title screen |
| `js/input.js`, `audio.js`, `main.js` | keyboard / mouse / touch; Web Audio music and sound; boot and main loop |

Saving happens every morning, on every map change, once a minute and when the page is hidden.
`window.littleAcre.game` exposes the running game in the browser console.

## Tests

`node --test tests/music/little-acre.test.mjs`: syntax of every module, map integrity (rows,
legend, warps, doors, reachability, villager routes), data references, inventory, crop growth
(watering, rain, regrowth, fertilizer, seasons), collisions, tools and placement, day
transitions (shipping, calendar rollover, weather, passing out, respawns), save round trips and
repair of broken saves, quests and the board, villagers, shops and upgrades, crafting and
machines, fishing, festivals, the journal, and the game controller playing the whole
plant–water–wait–harvest–sell loop.
