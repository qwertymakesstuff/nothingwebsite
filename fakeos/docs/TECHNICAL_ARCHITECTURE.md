# FAKEOS — Technical Architecture

## Stack decision
The master prompt prefers TypeScript + React + Vite + Zustand. This repository (missing.website) is a static site: every other game is served straight from its folder with no build step, and the offline download tooling (`tools/offline`) zips the repository as-is. A Vite build would mean committing build output or adding a build step to hosting that doesn't currently have one.

**This build therefore uses dependency-free ES modules and plain CSS**, keeping the same architecture the stack implies:

| Preferred | Used here | Notes |
|---|---|---|
| React components | `h()` DOM builder (`js/lib/dom.js`) | Same component-function style; swapping to React later is mechanical. |
| Zustand | `createStore()` (`js/lib/store.js`) | get / set(partial) / subscribe, identical semantics. |
| IndexedDB | `js/lib/db.js` | IndexedDB key-value store, localStorage fallback. |
| TypeScript | JSDoc-free JS, `node --check` + node tests | Types can be added with `// @ts-check` later. |
| Cloudflare Pages | Works unchanged | Pure static files; no server, no external APIs. |

If the project later moves to Vite + TS, `content/` and `net/` port over unchanged (no DOM), and the site renderers are already pure functions of (route, ctx) → node.

## Folder structure
```
fakeos/
  index.html            entry; loads CSS and js/main.js
  css/os.css            desktop, windows, taskbar, menus, dialogs ("Frost" theme)
  css/browser.css       Skylark chrome + skylark:// pages
  css/apps.css          Notepad, Personalize, Welcome
  css/sites/*.css       one stylesheet per website, scoped by .site-<id>
  js/main.js            boot → logon → desktop
  js/lib/               dom, store, db, rng, time, art (procedural images), rich (text → links)
  js/os/                state (save file), wm (window manager), desktop, taskbar, menu, dialog, notify, sound, icons, apps (registry)
  js/apps/              browser, browser-pages, notepad, personalize, welcome
  js/net/               router (URLs), search (index + ranking), linkcheck (validation)
  js/sites/             findr, vidder (+ player), threadit, blink, common, index (registration)
  js/content/           users, videos, threads, communities, posts, findr-data, index (lookups)
  docs/                 the project documents
tests/music/fakeos.test.mjs   automated tests (repo convention puts all tests here)
```

## Layers
```
 content/*.js  ──►  content/index.js (lookups, cross-refs)  ──►  net/search.js (index)
       │                         │                                      │
       └──────────────► sites/*.js (render(route, ctx) → { title, node }) ◄┘
                                  ▲
 net/router.js (parse/normalize/resolve) ◄── apps/browser.js (tabs, history, chrome)
                                                  ▲
 os/wm.js (windows) ◄── os/desktop.js, os/taskbar.js, apps/*  ◄── os/state.js (save store) ◄─► lib/db.js (IndexedDB)
```
- **Content is data.** Adding a thread = adding an object to `threads.js`. Threadit's code never changes.
- **Sites own their look.** They share helpers (`sites/common.js`, `lib/rich.js`) but draw their own layouts and CSS.
- **The router is the only place URLs are understood.** Sites register `{ id, host, name, favicon, render }`.

## Browser and routing
- Addresses are canonical strings without scheme: `vidder.tv/watch?v=ID`. `normalize()` strips `http://`, `www.`, trailing slashes; `skylark://` is the browser's own scheme.
- `resolveHref(href, base)` handles `/path`, `?query`, and absolute internal hosts inside page content.
- Each tab keeps its own back/forward stack with scroll positions; each tab has its own DOM view so switching tabs keeps state (a paused video stays paused).
- Page lifecycle: a page registers cleanup with `ctx.onLeave(fn)`; cleanup runs when the page is replaced or the tab closes.
- Loading delay is simulated (longer for hosts never visited) with a progress bar and tab spinner.
- Session: open windows/tabs are written to `save.browser.lastSession`; the first browser window after boot offers to restore.

## Save data
One object in IndexedDB under key `save` (see `os/state.js`):
`settings, desktop, browser{bookmarks,history,lastSession,typed}, findr{history}, vidder{subs,votes,watched,playlists}, threadit{joined,votes}, blink{following,likes,profile,posts,notifRead,joinedAt}, files{notes}`.
- Writes are debounced (400 ms) and flushed on `pagehide`.
- `migrate()` merges loaded saves over a fresh save, so new fields appear without wiping old data.
- Personalize → User Account → "Reset this computer" wipes it.

## World clock
`worldNow() = 2013-10-14 08:40 UTC + (real now − firstBoot)`. All "x days ago", trends and the taskbar clock use it. Counts grow slowly with world time (`grow()` in content/index.js). Offline catch-up rules and scheduled events are Phase 9.

## Procedural media
Avatars, thumbnails, photos and wallpapers are drawn on canvas from seeds (`lib/art.js`) and cached as data URLs. Videos are canvas scenes driven by a `scene` spec with captions; music videos are performed live by a small WebAudio synth (`sites/player.js`).

## Testing & performance requirements
- `node --test tests/music/fakeos.test.mjs`: syntax of every module, URL normalisation/resolution, search ranking, save migration, and **content validation** (broken internal links, unknown users, duplicate IDs, playlists/communities/friend lists referencing missing things, every search result pointing at a real page).
- Browser checks (Playwright) were run for boot, windows, tabs, every site, persistence and session restore — see DEVELOPMENT_LOG.md.
- Performance: no per-frame work unless a video is visible and playing; images generated once and cached; one IndexedDB write per burst of changes.
