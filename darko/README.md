# Donnie Darko (`/darko/`)

A low-resolution psychological horror adventure adapted from the film *Donnie Darko*
(written and directed by Richard Kelly). Middlesex, Virginia, October 1988.

Plain HTML + ES modules on a 320×180 canvas scaled with nearest-neighbour. No build step,
no dependencies, no backend. Code, pixel art and sound are made for this game (all audio is
synthesised with Web Audio at runtime); the bitmap font is shared with `/hollow-saint/`.

The game was built in twelve stages, and **all twelve are done**. The story is playable from
Saturday, October 1, 1988, through the last night of October 30 and the morning of October 2
again, then the credits.

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

**Stage 6, the town.** Old Gun Road and the ruins above it, the Wizard's Arcade, the golf
course trail, Powderham Drive and Jim Cunningham's house, the Byrd Theatre, Carpathian Ridge,
the auditorium, the physics room and the principal's office, the backyard, the bathroom and
Mom and Dad's room.

**Stage 7, Frank and the visions.** Frank in the bathroom mirror and the knife that bounces off
him; the spears, which you follow (Dad's closet on October 16, the fridge on the 30th); Frank in
Dr. Thurman's office and at the Byrd, where he takes off his mask. Storm clouds gather outdoors
in the last week, and in the last few days Frank flickers into the corner of rooms.

**Stage 8, the investigation.** Dr. Monnitoff, Hawking and the Einstein-Rosen bridge;
*The Philosophy of Time Travel* (readable from your pockets, with chapters that unlock as Donnie
understands more: vessels, the Tangent Universe, the Manipulated Living and the Manipulated
Dead); Roberta Sparrow's 1944 class photo; the letter; destiny and God's channel.

**Stage 9, the set pieces.** The PTA meeting intercut with the mirror, the assembly and the
microphone, the fire intercut with Sparkle Motion's talent show, the news, Ms. Pomeroy fired,
Kitty Farmer at the door, Mom leaving for Los Angeles, Cherita's earmuffs.

**Stage 10, the last night.** The last session and the placebos, Elizabeth's Harvard letter,
the Halloween party, the answering machine, the spears and FRANK WAS HERE, Grandma Death's
cellar, Old Gun Road and the Trans-Am, the gun, carrying Gretchen home, the ridge, Flight 2806
and the portal as the countdown reaches zero. Then the tracking lines roll back to October 2,
the engine falls, and the street the next morning, with the wave.

**Stage 11, polish.** New synthesised sounds (gunshot, crash, jet, piano, rewind, answering
machine) and ambiences (crowd, party, arcade, theatre, storm, plane, portal). Reduced flashing
turns off white flashes, the subliminal Frank and the countdown blink and softens the vision
wobble; reduced shake, volume sliders and fullscreen are in Settings.

**Stage 12, saves and the full playthrough.** Every beat autosaves; three manual slots;
Continue after the ending replays the epilogue. The test suite plays the whole story headless,
from the fridge note to the credits.

Twenty-eight connected areas, from Donnie's room to Grandma Death's cellar.

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
js/game/rooms/        house, town, places (arcade, theatre, ridge, cellar, plane...) and school
js/game/scripts/      prologue, house (day-by-day), school routing, chapters 1-10
js/ui/                text box and choices, menus, panels
js/scenes/            title, play, pause, settings, journal, reader, save/load, credits, end
```

Story is data. Rooms list props, people and exits with conditions on story flags and beats
(`'beat:oct4'`, `'from:flood'`). Scripts are lists of steps (`say`, `choice`, `set`, `go`,
`walk`, `time`, `sleep`, …) run by `game/script.js`. Tests:
`node --test tests/music/darko.test.mjs`. They include reachability checks for every room in
every beat and a full headless playthrough from October 1 to the closing credits.
