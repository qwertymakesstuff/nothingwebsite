# BORDERLINE (`/borderline/`)

A border inspection game. It is 1982 in the Republic of Corvenna, and you check papers at
Checkpoint 9 on the Ilvar Pass, a mountain crossing to the eastern states. Plain HTML, CSS and
ES modules, no build step, no dependencies. The game is built in 13 phases. Done so far:
**phase 1** (project foundation and the inspection desk).

## Playing (phase 1)

Report for duty, call each entrant to the booth, read their passport (and, for foreigners, their
Entry Declaration), stamp **Entry granted** or **Entry denied**, then return their papers. The
training shift has six entrants and pays a flat K5 for each one processed. Decisions are not yet
judged right or wrong; accuracy, penalties and the rules engine come in phases 4 and 5. Some
training entrants already carry problems (an expired passport, a name spelled differently on the
declaration), so the papers are worth reading.

Every control is a native button, and focus moves to the next control you need (call → stamp →
return), so the whole shift can be played with Tab and Enter.

## Files

| File | Job |
| --- | --- |
| `index.html` | page shell: intro, HUD, booth, desk (bulletin, document tray, decision controls), log, end-of-shift dialog |
| `css/style.css` | theme tokens, buttons, intro, dialog, reduced-motion handling |
| `css/desk.css` | post layout: booth window, wooden desk, stamp buttons, log; stacks below 900 / 640 px |
| `css/documents.css` | passport and entry-declaration paper, stamp strip and stamp mark |
| `data/setting.js` | the country, checkpoint, currency and the five issuing nations |
| `data/campaignDays.js` | campaign days as data: date, entrant order, wage, morning bulletin |
| `data/visitors.js` | entrants: name, portrait parameters, lines, structured documents |
| `js/gameState.js` | **the only writer**: `createGame()`, `dispatch(state, action)` |
| `js/documentRenderer.js` | builds document HTML from document data |
| `js/portrait.js` | portrait SVG from `look` data (booth and passport photo use the same one) |
| `js/dates.js` | ISO date formatting and validation |
| `js/html.js` | HTML escaping |
| `js/ui.js` | renders state into the page and sends clicks to `act` |
| `js/main.js` | entry point: holds the one state and routes actions through `dispatch` |

## Game state

`dispatch` returns a new state, or the old state untouched along with an error. Shift phases:
`waiting` → `callNext` → `inspecting` → `decide` → `departing` → `returnPapers` → `waiting`, or
`shiftEnd` after the last entrant. A decision is refused unless an entrant is being inspected and
has not been processed yet, so a wage is paid exactly once per entrant.

## Tests

`node --test tests/music/borderline.test.mjs` covers module syntax, data integrity, date
formatting, the full shift loop, refusal of duplicate or out-of-phase actions, that every
rendered document field matches its data, and HTML escaping.
