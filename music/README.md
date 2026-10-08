# missing music

A web music player, built in phases. No build step: plain ES modules, served as static files.

**Status: Phase 2 (secure YouTube search).** Search, results, recent searches and all
loading/empty/error states work. Playback is still *simulated* (a clock, no sound) - real audio via
YouTube's embedded player is the next phase.

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
    playbackEngine.js     engine contract + SimulatedEngine (Phase 1 stand-in)
    mediaSession.js       reserved seam: lock-screen controls (later phase)
  services/youtube.js     client for OUR /api/search (timeout, abort, cache, friendly errors)
  storage/persistence.js  validated save/restore of player state (never throws)
  storage/recentSearches.js   last 10 search terms
  storage/safeStorage.js  localStorage with an in-memory fallback
  ui/
    shell.js              layout + view switching
    router.js             hash router (#/home, #/search?q=, #/library, #/queue)
    uiStore.js            UI-only state (mobile sheet, queue panel, toast)
    components/           reusable pieces shared by desktop AND mobile
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

`search.list` costs 100 units; the free quota is 10,000/day (about 100 uncached searches). To stay inside it:
search is submit-only (no search-as-you-type), results are cached at the edge for 1 hour and in the
browser for 10 minutes, and repeated terms are free. Add a free Cloudflare **rate limiting rule** on
`/api/search` (Security -> WAF -> Rate limiting rules) so scripts cannot burn the quota; the Worker
itself only blocks cross-site browser requests.

## Current limits (intentional, later phases)

- **No real audio yet.** Tapping a result "plays" it on the simulated engine. Real playback uses
  YouTube's official embedded player (no downloading or extracting audio).
- No Media Session / lock-screen controls, favorites, playlists, recently played, or PWA/offline yet.
- The "Load demo tracks" button on Home is for testing and will be removed.
