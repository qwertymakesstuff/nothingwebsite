# Development Log

## Build 1 — first playable (Phases 0–3)
Request: make FAKEOS a playable game on missing.website without changing anything else about the site.

### Implemented
- **Phase 0 (spec)**: all nine project documents, architecture, folder structure, schemas, alternate history, mysteries and anomaly rules.
- **Phase 1 (OS)**: boot screen, first-run account setup and logon, wallpaper (7 procedural + solid/custom colours), desktop icons on a grid (drag, lasso/ctrl select, auto-arrange, sort, three sizes, positions saved), desktop context menu (View, Sort by, Refresh, New → Text Document, wallpaper, Personalize), taskbar with window buttons (click to minimise/restore, right-click menu, middle-click close), start menu with search (apps, documents, web addresses, Findr search), shut down / restart / power button, clock with calendar, network, sound toggle, notification bell + history, toast notifications, show-desktop strip.
  Window manager: drag, 8-edge resize, minimise/maximise/restore, double-click title, focus & stacking, edge snapping (top = maximise, left/right = half) with preview, drag out of maximised/snapped, cascade placement, keeps windows on screen on resize, open/close/minimise animations.
  Apps: Skylark Browser, Notepad (new/open/save/save as/word wrap/time-date, unsaved-changes prompt), Personalize (background, window colour, icons & clock, sounds, user account, reset computer), Welcome Center.
- **Phase 2 (browser)**: tabs (new, close, middle-click, drag to reorder, duplicate, move to new window, reopen closed), per-tab back/forward with scroll restore and right-click history lists, reload/stop, home, address bar with suggestions (bookmarks, history, search), search-or-address detection, bookmarks bar + star + manager, history page with search/delete/clear, new tab page (top sites, recent), simulated loading with progress bar and tab spinner, status bar link preview, link context menu, page context menu, page info, error pages (server not found, crash), multiple windows, session restore offer, keyboard shortcuts (Ctrl+T/W/N/L/R/D/H/B, Ctrl+Tab, Ctrl+Shift+T, Alt+←/→, F5, Backspace).
- **Phase 3 (four websites)**: Findr, Vidder, Threadit, Blink with every feature in the Phase 3 list (see WEBSITE_DIRECTORY.md), each with its own visual identity.

### Content in this build
50 recurring people (17 on 3 sites), 37 videos (4 performed music tracks), 6 playlists, 11 communities, 47 forum threads, 45 Blink posts, 358 forum replies and video comments, 94 Blink comments, 222 searchable pages.

### Tests performed
- `node --test tests/music/fakeos.test.mjs` — 10 tests pass: module syntax, URL normalisation and relative links, search-vs-address detection, **content validation (0 problems: broken links, unknown users, duplicate IDs, bad relationships)**, content targets, cross-site people, search ranking and spelling suggestions, missing-page detection, save migration.
- Playwright runs at 1024×700, 1366×768/800 and 1920×1080, no console errors: boot/logon, drag/resize/maximise/restore/minimise/snap, notepad save → desktop icon, personalize wallpaper, start menu search, desktop context menu, Findr autocomplete/pagination/tabs/filters/did-you-mean/history/trends, Vidder watch/like/subscribe/Watch Later/music playback/playlist autoplay-next, Threadit communities/join/vote/collapse/profile/search/archive, Blink sign-up/follow/post, tab drag/close/reopen, second browser window, middle-click new tab, bookmark, back, DNS error page, full page reload → bookmarks/subscriptions/posts persist and session restore offered and restored.

### Bugs found and fixed during testing
- Enter in the address bar also re-ran a still-selected desktop icon (stray tab).
- The browser ran a page's own cleanup right after rendering it, killing the video player.
- `hidden` elements with a display rule still showed (share box).
- The pinned Lantern megathread was auto-archived by age.
- Restored tabs had no favicon until loaded; Night Sky wallpaper painted over its stars; address bar font turned "1x9" into "1×9".

### Known limitations (honest list)
- Commenting, replying, messaging and NPC reactions to the player are Phase 6. Threadit says new accounts can't comment yet; Blink status updates work, and friends like them, but nobody replies.
- Major story progression, collectibles, achievements, file manager, email, messenger, media player, download manager, recycle bin and offline time simulation are later phases.
- Non-music videos are silent (captions carry the dialogue).
- Desktop-only: screens under 900 px wide get a message instead of the OS.
- Built without React/Vite/TypeScript to fit the site's no-build static hosting (see TECHNICAL_ARCHITECTURE.md).

## Build 1.1 — media pipeline (between phases)
- `tools/fakeos-media/`: asset catalogue (129 image prompts: 48 avatars, 2 character references, 20 Blink photos, 37 thumbnails, 15 channel banners, 7 wallpapers; 36 video jobs in 3 tiers), prompt-sheet builder (`fakeos/docs/ASSET_PROMPTS.md`), image importer (WebP conversion, Midjourney file-name matching), media indexer, and an unattended video generator (Replicate / Gemini / free `test` provider; shot planning from captions; resumable cache; spending cap; ffmpeg stitching and 2012-camera degradation).
- Game: `js/lib/media.js` loads `fakeos/media/manifest.json` at boot. Real avatars, photos, thumbnails, banners and wallpapers replace drawn ones. Thumbnail text and meme captions are drawn over real images. The player plays `full` clips (own length, sound, captions) and `loop` clips (silent, looped under the original runtime). The drawn version is used for anything without a file.
- Tests: catalogue coverage (every person, photo post and video has a prompt; nothing references missing content; no duplicate file names) and media-list validity. Repo suite 748/748.
- Verified end to end with generated test images and test footage in the browser. All test media was removed before committing; `fakeos/media/` ships empty.
- Limitation: seeking inside looping clips needs a server that supports range requests (Cloudflare does; Python's simple test server doesn't).
