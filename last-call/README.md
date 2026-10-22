# Last Call (`/last-call/`)

A 2D nightclub bouncer simulator. You are a new door supervisor working twelve shifts across
five original venues: check IDs, tickets, dress codes, guest lists and member cards against
tonight's rules, keep the line moving, pay your rent, and survive the politics of the night-time
economy. Plain HTML, CSS and ES modules, no build step, no dependencies, no asset files (portraits
are procedural SVG, music and sound are synthesised with WebAudio).

## Playing

Dates on documents are MM/DD/YYYY and the shift clock is 12-hour. Genuine ID photos are an exact likeness: if anything about the photo doesn't match the person, refuse.

Each shift a line forms outside. The guest at the front steps up; their face, height (read it off
the door-frame marks), outfit and behaviour are on the left, their papers in the middle, tonight's
rules and lists on the right.

- **Admit** with `A`, **Refuse** with `X`, then pick the rule that failed (`1`–`9`, or `0` for no
  reason). A correct citation earns a small bonus.
- `B` opens the rulebook (full rule wording, the ID reference sheet, lists, help). `Space` / `Esc`
  pauses. `C` toggles the Compare tool once you've done the forensics course.
- Every decision produces a slip explaining exactly which checks passed or failed.
- Waiting guests lose patience and walk out. Mistakes cost fines; one past the allowance and
  you're sent home on half pay. Miss the shift's target rating three times and you're fired; fall
  more than $120 into debt and you're evicted (a checkpoint lets you retry the last shift).
- Between shifts: the itemised paycheck, then the career screen (rent, food and transport are
  deducted every shift; buy equipment, training, transport, housing, decorations and career
  upgrades), then short dialogue scenes whose choices change later shifts and the ending.

Settings: master/music/effects volume, shift timer speed (relaxed 60% / standard / brisk 125%),
large text, high contrast, reduced motion and rule hints. Progress, upgrades, story flags and
settings save to `localStorage`.

## The campaign

| # | Shift | Venue | New |
|---|---|---|---|
| 1 | First Night | The Lantern (local bar) | minimum age, no ID no entry; the photo must match (applies every shift) |
| 2 | Old Faces | The Lantern | expiry dates |
| 3 | Borrowed Faces | The Lantern | height and eye colour must match (lookalike siblings' cards) |
| 4 | Moth & Static | The Sump (underground club) | event tickets (event, date, code, name) |
| 5 | Print Run | The Sump | forgeries vs. the ID reference sheet; mid-shift guest list |
| 6 | Thirty-One Floors Up | Halcyon (rooftop lounge) | dress code |
| 7 | Fully Booked | Halcyon | reservations with time windows, VIP list; mid-shift capacity cap |
| 8 | Pulse *or* The Launch | Voltage Hall *or* Halcyon (story branch) | intoxication; re-entry wristbands / strict guest list |
| 9 | Afterdark | Voltage Hall (electronic venue) | banned list by face; re-entry closes mid-shift |
| 10 | Members Only | The Orchid Room (private members' club) | member cards, sponsored guests |
| 11 | The Printer | The Orchid Room | everything; a suspension mid-shift |
| 12 | Last Call | The Lantern | everything, licence review, farewell party guest list |

Four endings depend on bribes taken, the finale, and how you handled the Printer.

## Code

| File | Job |
| --- | --- |
| `js/config.js` | pay, fines, patience, rating and career tuning |
| `js/dates.js` | ISO date maths, ages, game clock (minutes after 18:00) |
| `js/issuers.js` | the ID reference sheet: header, colour, number format, hologram per issuer |
| `js/appearance.js` | face traits, identity traits, clothing catalogue and dress-code tags |
| `js/rules.js` | rule definitions: parameters + one deterministic check each; `rulesAt()` applies mid-shift changes |
| `js/validation.js` | the judge: `evaluate()`, `judge()` (verdict + citation) and `explain()` for slips |
| `js/customers.js` | 53 hand-written profiles plus filler pools (names, reasons, lines) |
| `js/generator.js` | builds a shift's queue: documents valid for every active rule, then planned flaws; fills lists |
| `js/venues.js`, `js/shifts.js` | venues, the 13 shift definitions and campaign order (with the branch) |
| `js/timeline.js` | arrivals and the shift clock |
| `js/shiftEngine.js` | pure shift state machine: queue, patience, timer, decisions, incidents, summary |
| `js/incidents.js` | incidents and the fixed effects of each choice |
| `js/finances.js` | paycheck lines and booking a shift to the player |
| `js/upgrades.js` | the shop and the modifiers upgrades give the engine |
| `js/story.js`, `js/conditions.js` | characters, scenes, endings, and the condition language they use |
| `js/campaign.js`, `js/save.js` | campaign flow; versioned, sanitised save, checkpoint and settings |
| `js/portrait.js`, `js/audio.js` | procedural SVG portraits; synthesised music and effects |
| `js/ui/*` | screens: menu, briefing, inspection (`inspect.js`), rulebook, summary, career, dialogue, settings |

Rules only read what the player can see, and the generator never produces a flaw for a rule that
isn't active when that guest arrives. Upgrades make evidence easier to read (holograms, a loupe,
a cut-off date, a compare tool) but never decide.

## Testing

`node --test tests/music/last-call.test.mjs` covers syntax, date maths, every flaw against every
rule, edge cases (birthday today, expiry today), tickets/wristbands/guest lists, reservation
windows, capacity, membership, dress code, sobriety, banned faces, generator agreement with the
judge across hundreds of seeded queues, the engine (timer, walkouts, strikes, rule changes,
incidents, capacity, angry guests), paychecks, career standing, the shop, story branches and
endings, campaign flow, and save/settings restoration.

For browser testing, `?speed=N` (up to 20) runs shift time faster.
