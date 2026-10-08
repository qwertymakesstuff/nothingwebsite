# missing music

A web music player, built in phases. No build step: plain ES modules, served as static files.

**Status: Phase 4 complete, Phase 3 (real playback) now done.** Search, channels/artists, the mobile
player and real playback through YouTube's official embedded player all work. Media Session / lock-screen
controls are Phase 5 and are not built yet.

## Run locally

```
python3 -m http.server 8000 --directory music
# open http://localhost:8000
```

Unit tests (Node 20+): `node --test tests/music/*.test.mjs`

Locally the static server has no `/api/search`, so search shows "Search isn't available right now".
To try the real thing, run `npx wrangler dev` (needs a `.dev.vars` file containing
`YOUTUBE_API_KEY=...`, which is git-ignored by wrangler's default and must never be committed).

## Architecture

```
js/
  main.js                 composition root - wires everything together
  core/store.js           observable store with selector subscriptions
  player/
    queueManager.js       pure queue logic (play order, shuffle, repeat, add/remove)
    player.js             Player facade - the ONLY thing that changes playback state
    playbackEngine.js     engine contract + SimulatedEngine (silent, for UI tests: ?engine=sim)
    youtubeEngine.js      real playback through YouTube's official IFrame Player API
    mediaSession.js       reserved seam: lock-screen controls (later phase)
  services/youtube.js     client for OUR /api/search (timeout, abort, cache, friendly errors)
  storage/persistence.js  validated save/restore of player state (never throws)
  storage/recentSearches.js   last 10 search terms
  storage/safeStorage.js  localStorage with an in-memory fallback
  ui/
    swipeFx.js            swipe feedback animations (follow finger, settle, slide in)
    shell.js              layout + view switching
    router.js             hash router (#/home, #/search?q=, #/library, #/queue)
    uiStore.js            UI-only state (mobile sheet, queue panel, toast)
    components/           reusable pieces shared by desktop AND mobile (videoDock.js = the visible YouTube player)
    views/                home, search, library, queue
  dev/demoTracks.js       Phase 1 only: fake tracks for testing
worker/                   (repo root, not served) Cloudflare Worker
  index.js                /api/search: validation, same-site check, edge cache, error mapping
  youtube.js              official YouTube Data API calls + normalising results
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

## Deploying (Cloudflare Worker)

The repo root `wrangler.jsonc` defines the Worker `missing-music`: it serves `./music` as static assets
and runs `worker/index.js` only for `/api/*`. Pushing to `main` deploys it (Workers Builds, deploy
command `npx wrangler deploy`), and attaches `music.missing.website`.

### YouTube API key (required for search)

1. Google Cloud Console -> create/select a project -> **APIs & Services -> Library** -> enable
   **YouTube Data API v3**.
2. **Credentials -> Create credentials -> API key**. Click the key -> **API restrictions -> Restrict key**
   -> select only *YouTube Data API v3*. (An application/IP restriction is not possible for Workers.)
3. Cloudflare dashboard -> **Workers & Pages -> missing-music -> Settings -> Variables and Secrets -> Add**:
   type **Secret**, name `YOUTUBE_API_KEY`, value = the key. Save/deploy.

The key only ever exists in that secret. It is never in the repo or in browser code, and the Worker
never includes it in a response or error message.

### Quota

Each search runs two `search.list` calls (songs + channels/artists, 100 units each) plus two 1-unit detail lookups, about **202 units**; the free quota is 10,000/day (about **50 uncached searches**). Opening a channel page costs about **105 units** (100 for the most-viewed lookup behind the Popular list, plus a few 1-unit lookups) and is cached for an hour. If the channel half fails, songs still show. Cached answers carry a version number (`CACHE_VERSION` in `worker/index.js`, `API_VERSION` in `music/js/services/youtube.js`); bump both when a response shape changes so old cached answers are never reused. To stay inside the quota:
search is submit-only (no search-as-you-type), results are cached at the edge for 1 hour and in the
browser for 10 minutes, and repeated terms are free. Add a free Cloudflare **rate limiting rule** on
`/api/search` (Security -> WAF -> Rate limiting rules) so scripts cannot burn the quota; the Worker
itself only blocks cross-site browser requests.

## Current limits (intentional, later phases)

- **No real audio yet.** Tapping a result "plays" it on the simulated engine. Real playback uses
  YouTube's official embedded player (no downloading or extracting audio).
- No Media Session / lock-screen controls, favorites, playlists, recently played, or PWA/offline yet.
- The "Load demo tracks" button on Home is for testing and will be removed.

## Mobile player (Phase 4)

- **Mini-player:** tap or swipe up to open; swipe left/right for next/previous.
- **Full-screen player:** drag down on the header or artwork to dismiss (a quick flick works too), swipe the
  artwork for next/previous, switch between *Now playing* and *Up next*, back gesture / Esc / chevron close it.
  It is an accessible modal (focus moves in and returns, the page behind is `inert`).
- **Layouts:** phone portrait, phone landscape (artwork beside the controls, compact nav), tablet portrait
  (capped widths), small phones (320px). Safe-area insets are used throughout. Rotating or widening past 900px
  while the player is open closes it cleanly. Android's on-screen keyboard hides the bottom bars.
- **Touch:** 44px targets, no double-tap zoom, no text selection or image callouts on controls, larger scrub
  bar while dragging.

Tested with Chromium touch emulation (real touch events). It has **not** been tested on real iOS Safari or
Android devices - hardware-specific behaviour (safe areas, address-bar collapse, keyboard handling) needs a real-device check.

## Playback (Phase 3)

Playback uses YouTube's **official embedded player** (IFrame Player API, privacy host `youtube-nocookie.com`).
We only send it commands (load, play, pause, seek, volume); we never touch, download or extract the audio.

- **Cover by default, video on request.** Normally you see the cover art. Click the cover in the bottom-left of the
  player bar to open the expanded player (big cover, Up next, and a *Cover | Video* switch); the cover turns into an
  arrow that closes it again. On phones the same switch is the button in the full-screen player's header. The choice
  is saved. The YouTube player is never removed: when hidden it keeps its size and keeps playing, it is just
  transparent and behind everything.
- **YouTube's rules.** YouTube's embedded-player policies ask for the player to stay visible. Hiding it by default
  is a site-owner decision and a policy risk to the API project (not a technical limit). It is always shown when it
  has to be: when the browser needs a tap on the video to start (see below) and while an ad plays.
- **Ads.** Ads are served inside YouTube's own player and cannot be blocked from the page (and circumventing
  them is against YouTube's terms), so there is no ad blocker. Instead the engine *detects* an ad (best effort:
  `getAdState()`, a different video id, or a length that doesn't match the song) and then shows the video, pauses
  the song's clock, and tells you, so the ad can be seen and skipped. This heuristic has not been tested against a
  real ad. Real ad-free options: a YouTube Premium account signed in on the standard `youtube.com` embed host (this
  site uses the privacy host `youtube-nocookie.com`, where sign-in does not apply).
- **Autoplay rules.** Browsers may refuse scripted playback. If nothing starts, the player shows "Tap the video to
  start playback" and the video becomes tappable. iPhone/iPad usually need this on the *first* play of a session, so
  the prompt appears after about 1.5s there (6s elsewhere).
- **Errors** (video removed, embedding disabled, YouTube blocked by an ad blocker or offline) show a clear message and
  the player skips to the next song, unless the whole queue is failing.
- **Resume:** the queue, position, volume, shuffle and repeat are restored after a reload (paused); pressing play
  resumes at the saved position.
- `?engine=sim` swaps in a silent simulated engine (and the "Load demo tracks" card) for UI testing without network.

Known platform limits: iOS ignores programmatic volume, so the volume slider is hidden there (use the hardware
buttons); embedded videos can show ads that YouTube controls; the first YouTube script load happens about 1.5s after the page opens (or on the first play).
Background / screen-off playback and lock-screen controls are Phase 5 and depend on the browser; iOS is the most
restrictive.
