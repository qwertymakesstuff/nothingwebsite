# The Hollow Saint (`/hollow-saint/`)

A low-resolution survival horror game. Bellwether, 1987: Elias Ward, who left the seminary under
a cloud, comes back to his hometown after a tape arrives from his missing sister, Mara. The game
is an original work. Its characters, story, art and sound are all its own, and it borrows only
the broad feel of low-colour indie horror.

Plain HTML + ES modules, no build step, no dependencies, no backend. The game is being built in
stages; **stages 1–5 are done**:

1. The foundation: the engine, menus, saving and settings.
2. Controls and the relic.
3. The story opening and the cast.
4. Dialogue, documents, recordings, items and locks.
5. The first big explorable area: 13 connected rooms with a journal map.

## Playing

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| E / Enter | Interact, advance text, choose |
| Mouse | Aim the held relic; menus |
| Left click / Space / F | Raise the held relic |
| Tab / I | Pockets: items, notes and map |
| M | Map |
| Esc / P | Pause (Esc always pauses) |

Every gameplay key can be remapped under **Settings → Controls**.

**The relic.** Equip the seminary crucifix from your pockets, then raise it. It throws a short
cone of pale light in the direction you aim, then needs a moment before you can raise it again.
It only works on some things, and works differently on each:

| Thing | What it does | What the relic does |
| --- | --- | --- |
| **Hollow** (pale, thin) | Stalks you. If you face it with the cross in hand, it circles, looking for your back. | Drives it back. The third time unmakes it, for good. |
| **Shade** (tall, black, a blank face) | Moves only while you aren't looking at it, and passes through walls. | Stuns it for a few seconds. Nothing kills it, so walk backwards and keep it in view. |
| **Penitent** (kneeling) | Blocks the way. | Nothing. It listens: play it something. |
| **Watcher** (far off) | Stands at the end of a path. | Nothing. It is gone when you get near, and leaves something behind. |

The relic won't lift in some places (Ruth's house, the chapel). Touching a hostile thing wounds
you, and three wounds kill you. You wake at the last save. The lit shrine heals you.

## The story so far (Chapter I)

Elias's car dies a mile short of Bellwether, and the road gate into town has been chained shut.
Under a cot in Halvorsen's abandoned station he finds a page from Mara's notebook, dated weeks
after the town says she left. From there:

- the shrine trail and Bellwether Woods lead round to Mill Row
- Ruth Halvorsen, if he has read the page, hands over her late husband's keys. They open the
  road gate (a shortcut back to the car) and the lane up to St. Oran's House.
- at St. Oran's: the caretaker's house and its grounds log, the burying ground and the Pike urn,
  and finally the chapel itself, where someone is still holding services and recording something
  under the floor
- the maintenance passage underneath joins Pike's cellar, the chapel undercroft and
  Halvorsen's storeroom hatch. Each of those has to be opened from one side first.

Ruth, Deputy Cal Ostrander, Father Price and Mara's own pages all give different accounts of
when and how Mara left. They go into your notes as you hear them. Seeing the chapel changes the
town behind you.

## How it works

- **Rendering** (`js/engine/frame.js`): everything is drawn into a 256×192 buffer of palette
  indices, which is converted to RGBA once per frame and scaled up with nearest-neighbour
  filtering. The 16 colours in `palette.js` are the only colours that can appear. Darkness is an
  ordered dither (`game/lighting.js`). Lights come from Elias's lantern, candles, stoves and the
  relic.
- **Font and art**: a hand-drawn 5×8 bitmap font. Sprites are hex-digit pixel rows or painted in
  code (`game/art.js`, `art-world.js`, `art-cast.js`). This includes 24×24 portraits for the
  people you talk to.
- **Rooms** (`game/rooms/`): one file per area (`road`, `town`, `oran`, `below`). Each room is an
  ASCII tile map plus spawns, exits, props, entities, triggers and flag-dependent tile overrides
  (an unchained gate, for example). Exits can carry a lock that opens with a key, or with a flag
  set from the other side. The format is documented in `rooms/index.js`.
- **Scripts** (`game/script.js`): an interaction is a list of variants with conditions on flags,
  items, counts and visit number. The first variant whose conditions hold plays. It can give or
  take items, add journal notes, heal, save, or hand off to a document, a tape, a conversation or
  a doorway. Every interaction records `looked:<id>`, so nothing repeats by accident.
- **Dialogue** (`game/dialogue.js`): graphs of nodes with conditional choices, one-time choices,
  effects, and lines that get cut off mid-sentence. The runner is pure functions.
- **Entities** (`game/entities.js`): each type has its own behaviour and its own rule for the
  relic. The cone test is plain geometry.
- **World** (`game/world.js`): pure logic. It takes `{ dx, dy, interact, relic, aim }` and returns
  events, so all of the above can be stepped headlessly in tests.
- **Scenes** (`js/scenes/`): boot, title, intro, play, pause, settings, controls, credits,
  confirm, pockets (items / notes / map), document reader, tape player and death screen.
- **Audio** (`engine/audio.js`): Web Audio synthesis only. Each area has its own ambience.
  Footsteps change with the floor (dirt, grass, gravel, wood, stone, cloth, water). Each enemy has
  its own cue, the relic has a sound of its own, and dead phones ring. Recordings play with tape
  hiss over a murmur you can tell is a voice but can't make out.
- **Saving** (`engine/storage.js`): settings and the run save live under separate keys. The game
  autosaves on entering a room, and at the shrine. Saves from Stage 1 still load.

## Tests

`node --test tests/music/hollow-saint.test.mjs` (56 tests) covers:

- syntax, the palette, the font and sprites
- the room data: every reference to an item, document, note, tape, dialogue, sprite or entity
  resolves
- a flood fill from every spawn in all 13 rooms, which checks that every exit, trigger and
  interactable can be reached once the locks are open
- that every locked exit's key is given somewhere, and that no script ever takes a key item
- the relic: its cone geometry, needing it in hand, rooms where it won't lift, and its cooldown
- each enemy's rules: the Hollow is repelled three times then unmade, flees, circles when faced
  and hurts on contact (with a moment of grace, and death at zero); the Shade only moves unseen,
  passes through walls, and is stunned but never killed; the Penitent ignores the relic, blocks
  the alcove until it hears the tape, then lets you past; the Watcher vanishes and leaves
  footprints
- the dialogue graphs: no unreachable or dangling nodes, and every path ends. Ruth only gives the
  keys after the notebook; discoveries open new questions; accounts reach the journal; the phone
  call stops the ringing; Father Price leaves after one talk.
- the tape changing on later plays, locks with and without keys, and the gate's tile override
- a full Chapter I walkthrough from the car to the chapel and down into the passages, including
  the shortcuts and the changes after the chapel
- saves with items, notes and remains (and old saves); pocket actions; the map only showing
  visited rooms
- whole-app flows: pockets and map, playing the tape, reading, choosing in a conversation, and
  dying then waking
