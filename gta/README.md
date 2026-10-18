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

### Art and models (`js/models/`, `environment.js`)

Everything is procedural: no downloaded models or textures. Models are built once from small functions, merged into a few geometries, and shared.

| File | What it builds |
| --- | --- |
| `models/mesh.js`, `materials.js` | helpers to transform/colour/merge parts; shared materials (one paint material per colour) |
| `models/characters.js` | articulated people (merged torso+head+hair+accessories, separate arms/legs): player, civilians with varied bodies/hair/clothes/accessories, police officers, seated drivers. Walk/run phase follows distance travelled, plus aim and seated poses |
| `models/vehicles3d.js` | sedan, hatchback, sports car, SUV, van, pickup, box truck and police cruiser from extruded side profiles; lamps, glass, wheels (spin + steer), brake lights, light bar, suspension lean |
| `models/facades.js`, `buildings.js` | canvas facade textures with emissive window maps; offices, apartments with shopfronts, houses, an industrial corner, hospital and police station |
| `models/props.js` | instanced street lights, traffic lights (they really cycle: see `signals.js`; civilian cars stop at red), hydrants, benches, bins, meters, dumpsters, signs, trees |
| `models/interiors.js`, `shops.js` | three enterable shop interiors (mart, fashion, diner) with a clerk and something to buy |
| `environment.js` | sun, shadows (high quality), sky dome with clouds and stars, fog, a 10-minute day/night cycle, headlights |

Visible meshes are separate from collision: cars are capsules (`cl`/`cr` per type), props and trees are small circles, buildings are the block footprint.
Graphics quality (`high` / `low`, button on the start screen) controls shadows and ground texture size; phones start on low.

Rules of thumb: money only changes through `state.js` (`addMoney` / `spend` / `loseMoney`), heat only through `addHeat`, and
timers that matter (respawn, pickups) run on game time so pausing can't skip them. `window.__gta` exposes a few handles for the browser tests.
