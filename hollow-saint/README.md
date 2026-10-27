# The Hollow Saint (`/hollow-saint/`)

A low-resolution survival horror game in three chapters with four endings. Bellwether, 1987:
Elias Ward, who left the seminary under a cloud, comes back to his hometown after a tape arrives
from his missing sister, Mara. The game is an original work. Its characters, story, art and
sound are all its own, and it borrows only the broad feel of low-colour indie horror.

Plain HTML + ES modules, no build step, no dependencies, no backend.

## Playing

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| E / Enter | Interact, advance text, choose |
| Mouse | Aim the held relic; menus |
| Left click / Space / F | Raise the held relic |
| Tab / I | Pockets: items, notes and map |
| M | Map (▲▼ switches between above ground and below) |
| Esc / P | Pause (Esc always pauses) |

Every gameplay key can be remapped under **Settings → Controls**. Every new game starts on a
**brightness calibration** screen: three marks in the game's darkest colours sit on black, and
you raise the brightness until the faintest is just visible. The setting lifts the display gamma
(black stays black, so the picture keeps its sixteen colours) and widens the light a little. You
can redo it under **Settings → Brightness**.

**The relic.** Equip the seminary crucifix from your pockets and raise it. It throws a short cone
of light where you aim, then needs a moment before you can raise it again. It works differently
on each thing, and on some it doesn't work at all:

| Thing | What it does | What the relic does |
| --- | --- | --- |
| **Hollow** (pale, thin) | Stalks you; circles for your back if you face it with the cross in hand | Drives it back. The third time unmakes it. |
| **Shade** (tall, blank face) | Moves only while you aren't looking at it; passes through walls | Stuns it. Nothing kills it. |
| **Mimic** | Stands too still, in the shape of someone you know. Up close it shows what it is and rushes you. | Sends it away for good |
| **Penitent** (kneeling) | Blocks the way | Nothing. It listens: play it the tape. |
| **Watcher**, **edge figure** | Seen far off, or only at the edge of the screen | Nothing. Gone when you get close. |
| **The Choir** | A congregation that chases you down the Long Gallery, a little slower than you run | Nothing. The relic won't lift there. Run. |

Touching something hostile wounds you, and three wounds kill you. You wake at the last save. The
game autosaves on every room and at the lit shrine, which also heals you.

## The story

**Chapter I: The Recording.** Elias's car dies a mile short of Bellwether.
- **The first clue:** a page of Mara's notebook under a cot in Halvorsen's abandoned station.
- **The town:** Ruth Halvorsen, Deputy Cal Ostrander and Father Price each tell a different
  story of how Mara left. Ruth's keys open the town.
- **St. Oran's House:** the caretaker's grounds log, the cemetery, and finally the chapel,
  where somebody is still holding services and recording something under the floor.
- **The end of the chapter:** once you understand where the recordings come from, the bricked
  crypt gives way.

**Chapter II: The House Below.**
- **The records room:** the Register of the Emptied (1915, 1951, 1987), an admission card with
  Elias's own name on it, and Mara's last page.
- **Cal:** he blocks the way until you show him the account that contradicts his.
- **Below:** the bone maze is solved from Mara's directions, and the bell chamber from the
  numbers on her tape.

**Chapter III: The Last Prayer.**
- **The Long Gallery:** a pursuit.
- **The ceremony floor:** step only on the plaques whose lines were *not* crossed out on the
  prayer card from the shrine.
- **The ritual:** the three things named in Father Price's letter: Mara's ribbon, a votive from
  where she slept, and water from the chapel stoup.
- **The end:** the saint opens.

What you found decides what you can do at the end. All four endings are listed in
`game/endings.js` as plain conditions, not a hidden score:

| Ending | How |
| --- | --- |
| **Dawn** | Run. Always possible. |
| **The Hollow** | Take her place. Always possible. |
| **The Names** | Read the Register; find Mara's second page (behind the Penitent); get the truth from Cal; know the recordings come from under the chapel. |
| **The Last Prayer** (hidden) | All of the above. Answer Father Price's question in the confessional correctly. Find the town's smaller secrets: Mara's grave, the names under the station, Haskell's stone, the watcher's footprints, and Ruth's empty chair. |

Some story events change the town:
- the station door slams and its lights fail
- the cans move up onto the counter
- the cellar chair turns to face you
- Ruth's chair is empty, her tea still steaming
- something wearing Ruth's shape waits by the phone booth

The final scene also changes depending on who you listened to.

After an ending, the run save is cleared. Settings, the chapters you reached and the endings you
have seen are kept. **Chapters** on the title screen starts any chapter you've reached, with the
items and progress of the chapters before it.

## How it works

- **Rendering** (`js/engine/frame.js`): a 256×192 buffer of palette indices. It is converted to
  RGBA once per frame, through the brightness gamma, and scaled up with nearest-neighbour
  filtering. Darkness is an ordered dither (`game/lighting.js`).
- **Rooms** (`game/rooms/`): `road`, `town`, `oran`, `below` and `house`, 20 rooms in all. Each
  room has a tile map, spawns, exits, props, entities, triggers, events, and flag-dependent tile
  overrides. Locks open with keys or from the other side.
- **Scripts** (`game/script.js`): variants with conditions on flags, items, notes, counts and
  chapter. Their effects cover items, notes, healing, saving, chapter changes, spawns, wounds,
  screen effects, and hand-offs to documents, tapes, conversations and doorways.
- **Horror events** (`game/world.js`, `events` in room data): script variants that fire on
  entering a room (optionally delayed) or on walking into a zone. They follow story flags and fire
  once unless marked `repeat`. They can tear the picture (respecting *Reduce flashing*), flicker or
  kill the lights, show a figure for a moment, slam doors, move things, or start a pursuit.
- **Puzzles** (`game/puzzles.js`): the bells, the bone maze and the ritual table, as pure
  functions that return what happens. The evidence confrontation and the confession are
  dialogue graphs (`game/dialogue.js`), and the ceremony floor is room data.
- **Chapters and endings**: `game/chapters.js` (chapter starts and meta progress) and
  `game/endings.js`.
- **Audio** (`engine/audio.js`): Web Audio synthesis only.
  - Twelve ambiences, including distant murmured voices underground and a congregation's held
    note in the sanctum.
  - Footsteps that change with the surface.
  - Each enemy has its own cue.
  - Bells in tune with their numbers.
  - Short musical phrases, only at chapter cards and endings.
  - Music and effects have separate volume controls.

## Tests

`node --test tests/music/hollow-saint.test.mjs` (77 tests) covers:

- **Data:** every reference in every room, script and dialogue resolves; text fits; every
  dialogue path ends.
- **Reachability:** a flood fill from every spawn in all 20 rooms, plus every room reachable
  from the start.
- **The relic and every creature's rules:** includes the pursuit, which you outrun at full
  speed and which catches you if you stop.
- **Horror events:** they wait for their story beat, fire once, and come with their effects.
- **Each puzzle checked against its in-game clue:** the bell order is parsed from the tape's
  transcript, the maze path from Mara's page, and the forbidden plaques from the struck lines of
  the prayer card. Wrong answers carry their consequences: something called up, a locked door
  with the drain still open, wounds and being sent back.
- **The four endings:** each one's conditions, each one's reachability, and each missing
  secret closing the hidden ending.
- **Chapters and meta progress:** chapter-select states, and meta progress surviving a new
  game and corrupt storage.
- **Full playthroughs** of Chapter I, and of Chapters II–III to an ending.
- **Headless app flows:** calibration, saving and loading, settings, pockets, the tape,
  conversations, death and waking, and an ending back to the title with Chapters unlocked.
