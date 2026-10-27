# Donnie Darko (`/darko/`)

A low-resolution psychological horror adventure adapted from the film *Donnie Darko*
(written and directed by Richard Kelly). Middlesex, Virginia, October 1988.

Plain HTML + ES modules on a 320×180 canvas scaled with nearest-neighbour. No build step,
no dependencies, no backend. Code, pixel art and sound are made for this game (all audio is
synthesised with Web Audio at runtime); the bitmap font is shared with `/hollow-saint/`.

The game is being built in stages. **Stages 1–5 are done**: the foundation, the 28-day
timeline, the Darko house, Frank and the engine, and school. The story is playable from
Saturday, October 1 to Friday, October 7, 1988.

## What's in it

**Stage 1, foundation.** Title screen (Continue, New Game, Load Game, Settings, Credits),
pause menu, three save slots plus an autosave, settings (volumes, text speed, screen shake,
reduced flashing, scanlines, scaling, fullscreen), movement with collision, click-to-walk,
dialogue with choices, room transitions, a dated journal and pockets.

**Stage 2, the countdown.** The story is a fixed list of *beats* in `game/timeline.js`, each
pinned to a date and time from the film. A beat ends only when its own story flag is set, so
wandering can't skip or reorder a required event. While you explore, the clock creeps forward
(one in-game minute every three seconds) but never past the current beat. Sleeping ends a day
once that day's events are done. After the seventh hole, the numbers on Donnie's arm count down
in the corner (28:06:42:12 from 1:30 AM on October 2). The journal gains a calendar page.

**Stage 3, the house.** The prologue is the Saturday evening before: the fridge note, dinner,
Rose at bedtime, the pills. After the engine, Donnie's room is under a tarp and he sleeps on the
couch. The TV, the paper and the family change with the date (the engine on the news, the flood,
the vice-presidential debate on the 5th).

**Stage 4, Frank and the engine.** 12:50 AM: "Wake up, Donnie." Then the sleepwalk through the
dark house (the marker from the fridge), the seventh hole, and Frank's countdown. The engine
comes through the roof. Next morning: the green, Dr. Fisher and Jim Cunningham, the crane, the
FAA, and the hotel.

**Stage 5, school.** The bus stop crowd, Middlesex Ridge School (the courtyard and the bronze
mongrel, the hallway and lockers, English and health classrooms), *The Destructors* and
Gretchen's arrival, Grandma Death on Old Gun Road, Dr. Thurman, the 2 AM flood, the cancelled
day and walking Gretchen home, hypnosis, the police in English class, and the
"Controlling Fear" tape.

Fifteen connected areas: Donnie's room, the upstairs hall, the living room, the kitchen, the
front yard, the street, the golf course, the hotel, Old Gun Road, Dr. Thurman's office, the
school courtyard, the main hallway, the English room, the health room and the basement.

Dialogue paraphrases the film. The few lines the plot turns on (Frank's countdown, Grandma
Death's warning) stay close to it.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Walk faster |
| E / Enter / Space | Interact, advance text, choose |
| Mouse | Click to walk; click things to use them; menus |
| J / Tab / I | Journal |
| Esc / P | Pause |
| F | Fullscreen |

## Code

```
js/main.js            browser bootstrap: canvas, scaling, events, fixed-step loop
js/app.js             scene stack, settings, new game / continue
js/engine/            gfx (rects, dither, bitmap text), font, input, audio, storage, collision
js/game/              tiles, art, cast, calendar, timeline (beats, countdown), state, world,
                      lighting, script runner, journal, items
js/game/rooms/        house, town and school rooms
js/game/scripts/      prologue, house (day-by-day), chapters 1-4
js/ui/                text box and choices, menus, panels
js/scenes/            title, play, pause, settings, journal, save/load, credits, end
```

Story is data. Rooms list props, people and exits with conditions on story flags and beats
(`'beat:oct4'`, `'from:flood'`). Scripts are lists of steps (`say`, `choice`, `set`, `go`,
`walk`, `time`, `sleep`, …) run by `game/script.js`. Tests:
`node --test tests/music/darko.test.mjs`. They include reachability checks for every room in
every beat and a full headless playthrough from October 1 to the end of the current build.
