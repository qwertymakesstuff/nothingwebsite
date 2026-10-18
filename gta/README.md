# Harbor City (`/gta/`)

A GTA-style open-world sandbox: three.js (local `three.min.js`, no other dependencies), plain ES modules, no build step.

| Module (`js/`) | Job |
| --- | --- |
| `main.js` | entry point: populates the world, frame loop, pause/begin wiring |
| `state.js` | game mode (`menu / playing / paused / wasted / busted`), money, wanted heat |
| `save.js` | versioned save (`localStorage` key `gta:save`), migrates the older separate keys |
| `layout.js`, `roads.js` | pure city numbers and the road graph (unit-tested) |
| `render.js`, `city.js`, `camera.js` | renderer + WebGL help, static city and collision (`pushOut`), third-person camera |
| `player.js`, `input.js`, `interaction.js` | on-foot movement, getting in/out, controls, the single "what can I do now" decision |
| `vehicles.js`, `traffic.js`, `people.js` | cars and driving physics, civilian cars, pedestrians and pickups |
| `police.js`, `weapons.js`, `lifecycle.js` | wanted level + cops, pistol, death/arrest/respawn |
| `missions.js`, `locations.js`, `ui.js`, `audio.js`, `effects.js` | jobs, points of interest, HUD/menus/minimap, sound, visuals |

Rules of thumb: money only changes through `state.js` (`addMoney` / `spend` / `loseMoney`), heat only through `addHeat`, and
timers that matter (respawn, pickups) run on game time so pausing can't skip them. `window.__gta` exposes a few handles for the browser tests.
