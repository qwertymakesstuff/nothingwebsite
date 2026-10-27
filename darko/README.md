# Donnie Darko (`/darko/`)

A low-resolution psychological horror adventure adapted from the film *Donnie Darko*
(written and directed by Richard Kelly). Middlesex, Virginia, October 1988.

Plain HTML + ES modules on a 320×180 canvas scaled with nearest-neighbour. No build step,
no dependencies, no backend. Code, pixel art and sound are made for this game (all audio is
synthesised with Web Audio at runtime); the bitmap font is shared with `/hollow-saint/`.

The game is being built in stages. **Stage 1 is done**: the foundation and a playable
test environment.

## Stage 1

- Title screen with Continue, New Game, Load Game, Settings and Credits.
- Pause menu (Resume, Journal, Save, Load, Settings, Quit to Title).
- Three save slots plus an autosave (room changes and story beats); Continue loads the newest.
- Settings: master / ambience / sound volume, text speed, screen shake (full / reduced / off),
  reduced flashing, scanlines, pixel-perfect or fill-screen scaling, fullscreen. Saved to
  `localStorage`.
- Movement with collision, interaction, dialogue with choices, room transitions, a dated
  journal and pockets.
- Six connected areas: Donnie's bedroom, the upstairs hall, the living room, the kitchen,
  the front yard and the street.
- The evening of October 2, 1988, playable from late afternoon until Donnie goes to bed:
  the fridge note, Rose, Eddie and the leaf blower, Elizabeth on the phone, Samantha and the
  TV, dinner, Rose's visit to his room and the pills. It stops just before the countdown,
  which Stage 2 starts.

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
js/game/              rooms, tiles, art, cast, calendar, state, world, lighting,
                      script runner, scripts (all dialogue), journal, items
js/ui/                text box and choices, menus, panels
js/scenes/            title, play, pause, settings, journal, save/load, credits, end
```

Story is data: rooms list props, people and exits with conditions on story flags, and
scripts are lists of steps (`say`, `choice`, `set`, `go`, `walk`, `time`, …) run by
`game/script.js`. Tests: `node --test tests/music/darko.test.mjs` (includes a full
headless playthrough of the Stage 1 evening).
