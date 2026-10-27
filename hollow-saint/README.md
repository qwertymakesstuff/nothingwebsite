# The Hollow Saint (`/hollow-saint/`)

A low-resolution survival horror game. Bellwether, 1987: Elias Ward comes back to his hometown
after a tape arrives from his missing sister, Mara. The game is an original work. Its characters,
story, art and sound are all its own, and it borrows only the broad feel of low-colour indie
horror.

Plain HTML + ES modules, no build step, no dependencies, no backend. The game is being built in
stages. **Stage 1 (foundation)** is done: the engine, menus and a small test area you can play.

## Playing

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| E / Enter | Interact, advance text |
| Esc / P | Pause (Esc always pauses) |
| Mouse | Menus (aiming comes in Stage 2) |

Every gameplay key can be remapped under **Settings → Controls**.

The test area is a stretch of road outside Bellwether, with a broken-down car, the locked town
gate, a ruined roadside shrine, and Halvorsen's abandoned filling station with its storeroom.
Lighting the shrine candles saves the game (a checkpoint), and the game also autosaves each time
you enter a room. **Continue** on the title screen loads that save.

## How it works

- **Rendering** (`js/engine/frame.js`): everything is drawn into a 256×192 buffer of palette
  indices, which is converted to RGBA once per frame and scaled up with nearest-neighbour
  filtering (whole-number scaling by default; *Fit* in settings fills the window instead). The 16 colours in
  `palette.js` are the only colours that can appear. Each colour has a darker partner in `SHADE`,
  which the dithered lighting (`game/lighting.js`) and the pause dimmer both use.
- **Font** (`engine/font.js`): a hand-drawn 5×8 bitmap font with upper and lower case.
- **Art** (`game/art.js`, `game/tiles.js`): sprites are hex-digit pixel rows or painted in code.
  Rooms are baked to a buffer once when you first enter them.
- **Rooms** (`game/rooms.js`): ASCII tile maps plus spawns, exits, triggers and props, all as data.
  Interaction scripts are lists of variants with flag and visit-count conditions. The first
  variant whose conditions hold is the one that plays. Each interaction sets `looked:<id>` and
  bumps a counter, so a repeat visit can say something different and a one-time event can't fire twice.
- **World** (`game/world.js`): collision, exits, triggers and interactions. It is pure logic that
  takes `{ dx, dy, interact }` and returns events, so tests can drive it without a browser.
- **Scenes** (`js/scenes/`): boot, title, intro, play, pause, settings, controls, credits and
  confirm, on a stack in `app.js`. Each screen change goes through a stepped dither fade.
- **Audio** (`engine/audio.js`): Web Audio synthesis only, with no samples. A music bus carries
  the room ambiences (wind, drones, creaks, a distant bell on the title). An effects bus carries
  footsteps that change with the floor (dirt, grass, gravel, wood, stone), UI sounds, locks and
  doors.
- **Saving** (`engine/storage.js`): settings and the run save use separate `localStorage` keys,
  so a new game, or a corrupt save, never touches settings. Saves are versioned and checked
  before use. If storage is unavailable (private browsing), the game still runs.

## Tests

`node --test tests/music/hollow-saint.test.mjs` covers:

- syntax of every module, palette shading, the font, and that every sprite stays on the palette
- the room data: every tile is known, every exit leads somewhere with a way back, and every
  spawn is on open ground outside any exit
- a flood fill from every spawn, which checks that every exit, trigger and interactable can be
  reached (no softlocks)
- collision, the exit re-arm rule, triggers, footstep surfaces, and the flag and visit-count
  scripts (the gate, the shrine checkpoint, the cot that goes cold after you leave and come back)
- lighting, text pagination, input remapping, and storage, including corrupt and unavailable
  storage
- whole-app flows, run headless: boot → title → new game → intro → play, pause/resume,
  save & quit → continue (position and flags restored), a new game that resets the run but
  keeps settings, the settings menu, and a remapped key moving the player
