# missing music

A web music player, built in phases. No build step: plain ES modules, served as static files.

**Status: Phase 1 (architecture + responsive app shell).** There is no real audio, search or
YouTube yet. Phase 1 uses a simulated engine (a clock) so the whole app can be exercised.

## Run locally

```
python3 -m http.server 8000 --directory music
# open http://localhost:8000
```

Unit tests (Node 20+): `node --test tests/music/core.test.mjs`

## Architecture

```
js/
  main.js                 composition root - wires everything together
  core/store.js           observable store with selector subscriptions
  player/
    queueManager.js       pure queue logic (play order, shuffle, repeat, add/remove)
    player.js             Player facade - the ONLY thing that changes playback state
    playbackEngine.js     engine contract + SimulatedEngine (Phase 1 stand-in)
    mediaSession.js       reserved seam: lock-screen controls (later phase)
  services/youtube.js     reserved seam: search via a backend (later phase)
  storage/persistence.js  validated save/restore of player state (never throws)
  ui/
    shell.js              layout + view switching
    router.js             hash router (#/home, #/search?q=, #/library, #/queue)
    uiStore.js            UI-only state (mobile sheet, queue panel, toast)
    components/           reusable pieces shared by desktop AND mobile
    views/                home, search, library, queue
  dev/demoTracks.js       Phase 1 only: fake tracks for testing
css/                      tokens, base, components, layout (desktop default, mobile @ <900px)
```

Rules the code follows:

- **One source of truth.** Components read from the player store and call Player actions.
  They never touch the engine, so desktop bar, mobile mini-player and the full-screen
  player all share the same components and logic.
- **Engine is swappable.** The Player talks to an engine through a small interface
  (`load/play/pause/seek/setVolume` + `state/time/ended/error` events). A YouTube engine
  will implement the same interface.
- **Real mobile layout.** Below 900px the UI switches to compact top bar, bottom nav,
  mini-player and a full-screen now-playing sheet (swipe down / back gesture closes it),
  with safe-area insets. It is not the desktop UI shrunk down.

## Deploying (Cloudflare Pages)

Create a Pages project from this repo with **no build command** and output directory `music`,
then add the custom domain `music.missing.website`. Paths are relative, so it also works
under any subpath.

## Phase 1 limits (intentional)

No search, no real playback, no Media Session, no favorites/playlists/recently played,
no PWA/offline. The "Load demo tracks" button on Home exists only for testing and will be removed.
