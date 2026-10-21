# BORDERLINE (`/borderline/`)

A border inspection game. It is 1982 in the Republic of Corvenna, and you check papers at
Checkpoint 9 on the Ilvar Pass, a mountain crossing to the eastern states. Plain HTML, CSS and
ES modules, no build step, no dependencies. The game is built in 13 phases. Done so far:
**phase 1** (foundation and inspection desk), **phase 2** (document system and generated
entrants), **phase 3** (desk interaction and the comparison tool), **phase 4** (rules engine
and rulebook), **phase 5** (decisions, scoring and penalties) and **phase 6** (regulation
progression: ten different days).

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

## The ten days

Each shift opens with a **morning briefing**: the directive, plus any regulations that are new,
changed or withdrawn. Rules marked New or Changed are flagged in the rulebook, and its
**Archive** tab keeps former regulations and earlier directives. Each day has its own date,
queue length, mix of nationalities and purposes, and rate of flawed papers. Money carries over;
warnings reset each shift.

| Day | Date | What changes |
| --- | --- | --- |
| 1 | 12 Mar 1982 | passport, expiry, citizen ID card, foreign declaration, documents agree |
| 2 | 13 Mar | recognised issuing offices (forgers); Work Permits for workers |
| 3 | 15 Mar | official seals; Transit Passes |
| 4 | 16 Mar | every paper in date; expiry rule revised with a year's grace for citizens 65+ |
| 5 | 17 Mar | Entry Permits for all foreigners; documents must also agree on purpose |
| 6 | 18 Mar | Oskarian nationals suspended except in transit (until Day 8) |
| 7 | 19 Mar | stays capped at 30 days except Work and Study; Work Permit must cover the stay |
| 8 | 20 Mar | Health Certificates for Velsundi and Dravish nationals |
| 9 | 22 Mar | Oskaria reopened; Kaltrini nationals only for a Family visit or Transit |
| 10 | 23 Mar | Port Kessel closed: transit only via Sarn Bridge or Westmark Gate |

After Day 10 a new campaign starts again from Day 1; endings come in phase 10. Add `?seed=123`
to the URL to replay the same campaign.

## Portraits

48 painted portraits live in `assets/portraits/`: the six Day 1 entrants (`v_*`), the planned
recurring cast (`c_*`) and household (`h_*`), and 30 generic portraits
(`pool_<nation>_<m|f>_<young|middle|older>`). The same image shows in the booth window and,
in sepia, as the photo on the passport and identity card. Generated entrants get the pool
portrait that fits their passport, so a face never contradicts the papers. The prompts that
made them are in `docs/BORDERLINE-portrait-prompts.docx`.

## Architecture

| File | Job |
| --- | --- |
| `data/setting.js` | country, checkpoint, currency, districts, employers, routes; the five nations (cities, seal, passport number pattern); forged seals |
| `data/documents.js` | document types: fields, labels, field kinds, display formats; purposes |
| `data/names.js` | name pools by nation |
| `data/visitors.js` | hand-written entrants with structured papers |
| `data/campaignDays.js` | the ten days: date, arrival order (`'gen'` = generated), flaw rate, nationality and purpose weights, bulletin |
| `data/regulations.js` | versioned regulations (topic, `from`/`until`, `replaces`), check kind, parameters, rulebook text; `activeRegulations(day)`, `regulationChanges(day)`, `archivedRegulations(day)` |
| `data/portraits.js` | the painted portraits in `assets/portraits/` (512 × 512 JPEG) and the age bands of the generic pool |
| `data/scoring.js` | wage, warnings per shift, fines, which breaches are serious |
| `js/gameState.js` | **the only writer**: `createGame(day, seed)`, `dispatch(state, action)` |
| `js/visitorGenerator.js` | seeded entrants whose papers satisfy the day's rules (`requirements(rules)`), and the flaw catalogue: expired, incomplete, contradictory, forged, restricted, travel, plus the legal exception case |
| `js/documentFactory.js` | builds documents and their display text |
| `js/documentRenderer.js` | document HTML from document data; seals and stamps |
| `js/rulesEngine.js` | `evaluate(visitor, regulations, { date })`: verdict, violations with evidence, per-rule checks |
| `js/decisionSystem.js` | `assess()` turns a stamp into a decision record (pay, warning or fine, reason); `shiftReport()` |
| `js/inspectionEngine.js` | the player's comparison tool (`compare(a, b)`) |
| `js/desk.js` | dragging, placing, keyboard movement, tidy, magnifier, compare mode (presentation only) |
| `js/rulebook.js` | rulebook pages (Rules with New/Changed marks, Nations, Directive, Archive) from the data |
| `js/briefing.js` | the morning briefing: directive and the day's regulation changes |
| `js/ui.js`, `js/main.js` | rendering, focus management and the controller |
| `js/portrait.js` | a visitor's face: their painted portrait, or a drawn one from `look`; `poolPortrait()` picks a generated entrant's portrait by the nationality, sex and age on their passport |
| `js/rng.js`, `js/dates.js`, `js/html.js` | seeded random numbers, dates, escaping |

How the pieces fit:

- **What the player sees is the data.** Every printed field comes from `documentFields()`, and
  a test compares the rendered text with the document objects.
- **The rules engine is the source of truth.** It reads only the papers and the regulations in
  force. The generator records which flaw it planted, but only tests use that record, to check
  that the engine catches exactly that flaw and nothing else.
- **Every case is fair.** A shift only plants flaws against regulations in force that day, and
  every fact the engine checks is printed on a paper, the date plate or the rulebook.
- **Each day is judged by its own rules.** A decision is assessed against
  `activeRegulations(day)` and keeps its `day`; finished days are filed in `state.history`
  with their reports, so earlier cases are never re-judged by later rules.
- **One decision record per entrant.** `dispatch` refuses a second stamp, so pay and fines
  are applied once. Money, the log and the report all read from these records.

## Tests

`node --test tests/music/borderline.test.mjs` covers: module syntax and data integrity; the
shift loop and refused actions; rendered fields matching document data; generator consistency
and every flaw; the comparison tool; regulation data; authored verdicts; engine agreement with
8,000 generated cases across the ten days (each flawed one fails only its planted rule); expiry and exception
boundaries; that rules not in force are not applied; the rulebook matching the data; and
scoring (warnings, fines, serious breaches); and the campaign: engine agreement on every
day, clean papers meeting each day's requirements, eight full ten-day campaigns with money
carried over, historical verdicts, every day differing, briefings, rule numbering, the
archive and the stay-length comparison.
