# BORDERLINE (`/borderline/`)

A border inspection game. It is 1982 in the Republic of Corvenna, and you check papers at
Checkpoint 9 on the Ilvar Pass, a mountain crossing to the eastern states. Plain HTML, CSS and
ES modules, no build step, no dependencies. The game is built in 13 phases. Done so far:
**phase 1** (foundation and inspection desk), **phase 2** (document system and generated
entrants), **phase 3** (desk interaction and the comparison tool), **phase 4** (rules engine
and rulebook) and **phase 5** (decisions, scoring and penalties).

## Playing

Report for duty and call each entrant to the booth. Their papers land on the desk: a passport,
plus an Identity Card for citizens, or an Entry Declaration for foreigners (with a Work Permit
or Transit Pass if their purpose needs one). Check them against the **Rulebook** (Rules,
Nations, Directive) and against each other. Then stamp **Entry granted** or **Entry denied**
and return the papers.

- **Handling papers**: drag them (mouse anywhere, touch by the header), or click one and then
  click an empty spot, or focus one and use the arrow keys (Shift for bigger steps). Enter or
  double-click magnifies a paper; **Tidy desk** lays them out again.
- **Compare fields**: in compare mode, pick any two of: a field on a paper, the passport's
  cover seal, the date plate, a nation's seal or its list of issuing offices. The desk says
  whether they agree, whether a paper has expired, or that they record different things.
- **Pay and penalties** (`data/scoring.js`): K5 per correct decision. The first two mistakes in
  a shift are warnings; each later one is fined K5. Admitting an entrant on a forged passport
  is fined K10 at once and never counts as a warning. A slip after each stamp says whether it
  was right, and why not if it wasn't. The end-of-shift report lists every citation.

Only Day 1 exists so far; a new shift starts Day 1 again with fresh generated entrants. Add
`?seed=123` to the URL to replay the same entrants.

## Architecture

| File | Job |
| --- | --- |
| `data/setting.js` | country, checkpoint, currency, districts, employers, routes; the five nations (cities, seal, passport number pattern); forged seals |
| `data/documents.js` | document types: fields, labels, field kinds, display formats; purposes |
| `data/names.js` | name pools by nation |
| `data/visitors.js` | hand-written entrants with structured papers |
| `data/campaignDays.js` | days: date, arrival order (`'gen'` = generated), flaw rate, morning bulletin |
| `data/regulations.js` | regulations: check kind, parameters, effective day, rulebook text; `activeRegulations(day)` |
| `data/scoring.js` | wage, warnings per shift, fines, which breaches are serious |
| `js/gameState.js` | **the only writer**: `createGame(day, seed)`, `dispatch(state, action)` |
| `js/visitorGenerator.js` | seeded entrants with consistent papers, and the flaw catalogue (expired, incomplete, contradictory, forged, plus the legal exception case) |
| `js/documentFactory.js` | builds documents and their display text |
| `js/documentRenderer.js` | document HTML from document data; seals and stamps |
| `js/rulesEngine.js` | `evaluate(visitor, regulations, { date })`: verdict, violations with evidence, per-rule checks |
| `js/decisionSystem.js` | `assess()` turns a stamp into a decision record (pay, warning or fine, reason); `shiftReport()` |
| `js/inspectionEngine.js` | the player's comparison tool (`compare(a, b)`) |
| `js/desk.js` | dragging, placing, keyboard movement, tidy, magnifier, compare mode (presentation only) |
| `js/rulebook.js` | rulebook pages from the regulation, nation and scoring data |
| `js/ui.js`, `js/main.js` | rendering, focus management and the controller |
| `js/rng.js`, `js/dates.js`, `js/html.js`, `js/portrait.js` | seeded random numbers, dates, escaping, portraits |

How the pieces fit:

- **What the player sees is the data.** Every printed field comes from `documentFields()`, and
  a test compares the rendered text with the document objects.
- **The rules engine is the source of truth.** It reads only the papers and the regulations in
  force. The generator records which flaw it planted, but only tests use that record, to check
  that the engine catches exactly that flaw and nothing else.
- **Every case is fair.** A shift only plants flaws against regulations in force that day, and
  every fact the engine checks is printed on a paper, the date plate or the rulebook.
- **One decision record per entrant.** `dispatch` refuses a second stamp, so pay and fines
  are applied once. Money, the log and the report all read from these records.

## Tests

`node --test tests/music/borderline.test.mjs` covers: module syntax and data integrity; the
shift loop and refused actions; rendered fields matching document data; generator consistency
and every flaw; the comparison tool; regulation data; authored verdicts; engine agreement with
3,000 generated cases (each flawed one fails only its planted rule); expiry and exception
boundaries; that rules not in force are not applied; the rulebook matching the data; and
scoring (warnings, fines, serious breaches, money reconciling over 60 full shifts).
