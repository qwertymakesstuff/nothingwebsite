# Development Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Specification, documents, architecture, schemas, history | **Done (build 1)** |
| 1 | Desktop OS and window manager | **Done (build 1)** |
| 2 | Skylark browser, routing, tabs, bookmarks, history, sessions | **Done (build 1)** |
| 3 | Findr, Vidder, Threadit, Blink with initial content | **Done (build 1)** |
| 4 | Content engine: more content types (products, reviews, articles, music, events, collectibles, downloads), relationship graph, tags/categories everywhere, content versioning, broken-link reports in-game | Partly started: lookups, search index and `net/linkcheck.js` validation exist |
| 5 | Personalities & communities: grow the cast to 150+, posting histories, personality-driven text | Not started (50 people exist) |
| 6 | Social interactions: commenting, replies, messages, NPC responses, persistence of participation | Not started (votes, likes, follows, joins, status posts persist) |
| 7 | Apps: file manager, email, messenger, media player, download manager, control panel, recycle bin, shared file system | Not started (Notepad, Personalize exist) |
| 8 | Achievements (300+) and collectibles (100+) with the Internet Archive app | Not started |
| 9 | Persistent world simulation: scheduled activity, offline catch-up limits, protected story stages | World clock and slow count growth exist |
| 10 | Major stories and mysteries with player-triggered stages | Background stage written (see MYSTERIES.md) |
| 11 | Expand to 30–40 websites | Not started |
| 12 | Polish, audio pass, save management, release readiness | Not started |

## Next steps when Phase 4 is requested
1. Add schemas for products, reviews, articles, tracks, events, collectibles, downloads in `js/content/`.
2. Generalise `content/index.js` into a typed registry with relationship lookups.
3. Run `validateContent()` at boot in development builds and show a report page (`skylark://content-report`).
