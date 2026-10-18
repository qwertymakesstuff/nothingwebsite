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

### The world (phase 3)

An 11 x 11 grid of blocks. `layout.js` has the map (`MAP`, one character per block) and what each type is; change a letter and the district changes.

| District | Where | What is there |
| --- | --- | --- |
| Downtown | centre | office blocks, Harbor Tower, bank, parking garage, city plaza with clock tower |
| Residential | west / north-west | houses, apartment blocks with alleys, corner stores, parks, waterfront park with the Harbor Wheel, safehouse |
| Commercial | east | supermarket, restaurants, clothing stores, gas stations, dealership, repair garage, car park |
| Civic centre | north-east | police HQ with holding yard, fire station, hospital |
| Industrial | south-west | warehouses with loading alleys, steel factory, truck depot |
| Port | south-east | container yards with a gantry crane, port warehouses, docks, a ship at the quay |
| Outskirts | edges | construction site, farmstead, lighthouse, empty lots, billboards |
| Highway | road 7 | elevated deck over the cross streets, ramps down to the two edge intersections (`highway.js`, `models/highwayModel.js`) |

* **Points of interest** (`pois.js`): one registry (id, name, category, icon, position, district, flags). Everything else reads it: markers, minimap, map, missions, zones, respawns. Plain data computed from the map, so it is unit-tested.
* **Markers** (`markers.js`): world beams, minimap icons and map icons for POIs, the current job and the player's waypoint (click the map).
* **Zones** (`zones.js`): shop doors, repair garage, dealership, safehouse. Only places with a real interaction are zones; the rest are exterior-only (`exteriorOnly` in the registry).
* **Missions** (`missionDefs.js`, `missions.js`): definitions refer to places by reference (`poi:id`, `cat:docks`, `district:industrial`, `node:3,3`, `deck:5`), never by coordinates.
* **Layers**: cars have a level (`y`, `layer`). Ground traffic can't climb a ramp from underneath, deck cars stay between the barriers, and people can't walk onto ramps.
* **Population**: traffic, pedestrians and parked cars are weighted by district (`DISTRICTS` in `layout.js`), plus a few cars on the highway.
* **Culling**: blocks and prop chunks beyond ~200-250 m are hidden; instanced props are split into chunks so the camera can skip them.

### Coast, beaches and ocean (phase 4.5)
The old square edge is gone. `js/coast.js` (pure, tested) defines the shoreline as a signed distance field: an irregular perimeter with bays, headlands and rocky stretches. `terrain.js` builds a sloping sand/rock/grass terrain mesh and a shader ocean (waves, foam line, wet sand, depth colour) that runs to the horizon. `models/beach.js` adds dunes, rocks, driftwood, beach grass, palms, umbrellas, boardwalks, piers, lifeguard towers, car parks and the port quay.
- Collisions: `limitToLand()` (used by `pushOut`) only acts at the waterline, so cars slow and splash instead of hitting an invisible wall; player, NPCs, traffic and mission vehicles all share it.
- City edges flow into the coast: the harbour pier and port quay, west beach road and car park, east point/jetty, and scenic coastal roads. Beach POIs appear on the map and minimap.

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
