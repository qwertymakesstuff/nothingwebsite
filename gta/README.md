# Last Exit / Harbor City (`/gta/`)

A GTA-style open-world sandbox with a story campaign (*Last Exit*, see `STORY.md`): three.js (local `three.min.js`, no other dependencies), plain ES modules, no build step.

| Module (`js/`) | Job |
| --- | --- |
| `main.js` | entry point: populates the world, frame loop, pause/begin wiring |
| `state.js` | game mode (`menu / playing / paused / scene / wasted / busted`; `scene` = a conversation, the world is frozen), money, wanted heat |
| `save.js` | versioned save (`localStorage` key `gta:save`), migrates the older separate keys |
| `layout.js`, `roads.js` | pure city numbers and the road graph (unit-tested) |
| `render.js`, `city.js`, `camera.js` | renderer + WebGL help, static city and collision (`pushOut`), third-person camera |
| `player.js`, `input.js`, `interaction.js` | on-foot movement, getting in/out, controls, the single "what can I do now" decision |
| `vehicles.js`, `traffic.js`, `people.js` | cars and driving physics, civilian cars, pedestrians and pickups |
| `police.js`, `weapons.js`, `lifecycle.js` | police units (patrols, cruisers, officers), pistol, death/arrest/respawn |
| `crime.js`, `reporting.js` | crime catalogue + ledger (pure), and who saw/heard what in the world |
| `copAI.js`, `dispatch.js` | the police state machine and the dispatcher (both pure and unit-tested) |
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

### World visual overhaul and physical props (phase 4.6)
Style guide: `STYLE.md` (data in `js/models/style.js`). Buildings: `models/archetypes.js` (tower / slab / classic / mixed-use, house variants, rooftop kit, awnings, balconies, scaffolding, cranes, floodlights, gatehouses). Roads: `city.js` paints wear, arrows, manholes and drains and adds kerbs. Lighting and horizon: `environment.js` + `distant.js`. Props: four tree silhouettes, shrubs, planters, kiosks, bus shelters, cones, barriers, utility poles, cabinets, street-name blades.
- **Physical props**: `propPhysics.js` (pure rules, unit-tested) + `physprops.js`. Each instanced prop that can react is registered with a category (static / destructible / pushable / breakable), mass and impact thresholds. Cars skip these circles in the wall collision and call `carVsProps` instead: below a threshold the prop is a normal obstacle, above it a lamp post or traffic light bends or falls, cones/bins/benches slide and tip, fences and kiosks break into a few pieces. The instance is swapped for a pooled loose mesh while it moves; once settled it stops being simulated and stops blocking. Limits: 26 simulated, 40 debris pieces, 70 settled; objects are restored when the player is far away or after respawn. A prop can only be knocked once. Knocking things over frightens nearby pedestrians and counts as (low-heat) vandalism when witnessed.

### Pause menu, map and navigation (phase 6)
- **Pause menu** (`pausemenu.js`): Esc opens it (P also works; Esc also closes it, a confirmation, or the map, one step at a time). Sections: Resume, Map, Missions, Player stats, Settings, Controls, Save game, Main menu (confirmed). While it is open the frame loop runs nothing that moves or times anything (traffic, pedestrians, police, mission timers, the story clock and audio all stop), the mouse is released, and `input.js` ignores everything except Esc and the pause/map keys. Keys held when it opens stay held, so holding W through a resume keeps you moving. Pausing during a story scene keeps the scene underneath.
- **Full map** (`map.js`): drawn from the same data as the world (block grid and districts, road grid, highway, coast roads, piers, the shoreline function and the marker registry). Drag to pan, wheel / pinch / +- to zoom, click a place to inspect it (name, kind, district, distance) and set or remove a waypoint, right-click sets one at once, C centres on you, legend chips filter the kinds of places. The active objective (gold, pulsing) and the player's waypoint (pink pin) are drawn differently; street names appear when zoomed in.
- **Navigation** (`nav.js`, pure part `navroute.js`): the waypoint shows on the minimap, in the world (beam) and in a HUD arrow with the distance. A road route is planned with the traffic graph (`roads.js`), drawn on the minimap and map, and re-planned when you leave it by more than 32 m. When no road route exists (the waypoint or you are off the city grid) no line is drawn and the HUD shows a direction arrow and straight-line distance. The waypoint removes itself on arrival; water is refused.
- **Missions page**: the running free-roam job or story mission with its objectives (done / current), available, locked (with what unlocks them; missions two steps away stay hidden to avoid spoilers) and completed missions; a waypoint to the objective or start point, and abandon.
- **Settings** (`prefs.js`, saved in the save data): master, effects and voice volumes (there is no music yet), mouse and touch camera sensitivity, invert Y, graphics quality (reloads), shadows (off / medium / high, on high graphics only), subtitles and radio station. **Controls** lists the real bindings and rebinds them (a key already in use swaps with its action; Esc is reserved).

### Wanted level and police (phase 4)
Every wrong-doing goes through `reporting.js`: `reportCrime(type)` gathers witnesses (people who can see the spot), people who only hear it, and any cop nearby, then `crime.js` turns that into heat. Nobody saw or heard it = no crime, no stars. Harmless bumps are not crimes. Crimes: gunshot, assault, murder, hit-and-run, car theft/carjack, serious collisions, attacking/killing officers, attacking/destroying/stealing police cars, resisting arrest. Repeats within a few seconds count for less; crimes during a pursuit count 1.5x. Stars come from the heat (15/45/90/150/230).
- **Dispatch** (`dispatch.js`): reported crime -> incident (`REPORTED, ASSIGNED, EN_ROUTE, ON_SCENE, CONTACT, SEARCH, CLOSED`). The same incident is merged, never dispatched twice. A nearby patrol (up to three ambient patrol cruisers drive the streets at zero stars) takes it first; otherwise a cruiser appears on a road node out of the player's sight, at a distance that depends on the star level. Units wanted: 1/2/3/5/6 cruisers by stars, hard cap 2/3/5/6/7 (+3 for a roadblock) and at most 10 officers on foot. An overdue incident (nobody reached the scene) brings another unit.
- **State machine** (`copAI.js`): `PATROLLING, RESPONDING, INVESTIGATING, APPROACHING_SUSPECT, ISSUING_WARNING, ATTEMPTING_ARREST, PURSUING_ON_FOOT, PURSUING_IN_VEHICLE, ENGAGING_ACTIVE_THREAT, SEARCHING_LAST_KNOWN_LOCATION, RETURNING_TO_PATROL` (+`BLOCKING` for roadblock cruisers). Transitions depend only on what the unit can see, distances, speeds and what the player did.
- **One star**: a cruiser comes, the officer gets out and walks (never runs) up while facing you, shouts a warning, and arrests you after you stay still for ~2 s within arm's reach with a clear line. Walk away or run and they chase on foot (and fleeing adds heat); attack or draw down on an officer and it escalates. Officers never shoot for a minor offence: gunfire starts at three stars, or at two stars once a cop has been attacked.
- **Pursuits**: cruisers follow the road graph, brake for corners and for cars ahead, back out when wedged, and are replaced if hopelessly stuck out of sight. Chasers take different roles (chase / cut in ahead / run alongside). At four stars and up a three-car roadblock is set ahead. Cruisers with too much damage are disabled and the crew continues on foot.
- **Losing them**: units only know where the suspect was last *seen* (witness tips count for a short while after the crime). Without sight they drive/walk to that spot and search. The hiding clock then runs (12/18/26/36/46 s by star level) and drops the wanted level one star at a time. The HUD shows `SEARCHING n%`, the warning prompt or the hold-still bar.
- **Arrest**: ARRESTED banner, fine (10% of cash, at least $50, +$25/star), respawn at the police station with wanted cleared, an active job fails. Death or respawn clears every officer, cruiser, incident and the crime ledger.
- Debug/test handles on `window.__gta`: `dispatcher`, `intel`, `ledger`, `copCars()`, `reportCrime()`; `window.__noRender` skips drawing (used by the browser tests).

### Story campaign and voice acting (phase 5): *Last Exit*
A nine-mission crime drama set in Port Alder, five optional story chains, three endings, a relationship system and a data-driven dialogue system with a voice-acting pipeline. All of it lives in `js/story/` (pure logic, unit-tested and played headlessly by `tests/music/gta-story.test.mjs`) and is described in **`STORY.md`**.
- **Dialogue** is a database (`js/story/lines/`): 692 lines, each with a unique ID such as `EDDIE_M01_GARAGE_001`, speaker, text, performance direction, priority and conditions. Conversations frame speakers with a cinematic camera; phone, radio and car dialogue play while you drive. Subtitles always work, with or without audio.
- **Voice:** no recordings exist yet, and the game never generates or imitates voices. `node gta/tools/voice.mjs` writes `VOICE_SCRIPT.md` (the master script for actors) and `voice/manifest.json` (every line, whether a recording exists, which missions use it). Drop real recordings in `voice/<CHARACTER>/<LINE_ID>.ogg` and they play automatically (see `voice/README.md`).
- **Saves:** story progress lives in the normal save (`data.story`); missions resume at their checkpoint; rewards are paid once.
- **Cutscene arrival:** reach the mission point, then fade to black, Ash steps out of the car, engine and radio go quiet, fade in. Typing `kaidin` adds the rigged `models/kaidin.glb` as an ordinary pedestrian (see `STORY.md`).
- **Car radio:** `R` in a car switches Alder FM / Harbor AM (a comic talk show, *The Dead Air Hour*) / off.
- `window.__gta.story`, `.conv`, `.crew`, `.npcs`, `.voice` are handles for the automated tests.

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
