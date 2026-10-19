# LAST EXIT: story bible and design notes

*Last Exit* is the story campaign of the Harbor City sandbox (`/gta/`). It is set in **Port Alder**, the harbor district. Everything is fictional and original: people, places, plot and words. The whole game, including the story, is playable with every voice recording missing (subtitles carry the dialogue). **No line has been recorded yet.** See `VOICE_SCRIPT.md` and `voice/README.md`.

Menus: **begin / continue the story**, **new story**, or **free roam** (the old open sandbox with random jobs, no story). Story and free roam share one wallet and one city.

## Premise

Ash (gender-neutral, past left vague on purpose) arrives in Port Alder at dusk with $38, a car that shudders on left turns, and a room that has just been rented to somebody else. The mechanic at Vale Auto needs a driver. One small favour leads to a larger one, and then to container **PAC-4471**, which vanished from the docks and holds the paperwork that ties **Victor Sloane's** Alder Point redevelopment to fraud, to **Darius King's** crew, and to a detective who keeps investigations from finishing.

The truth comes out in pieces and each piece changes what earlier scenes meant: the VIN that was swapped (4417 / 4471) in the very first job; the tailgate dent Eddie remembers; Rowan's "Let's be precise" on a recording; the gate log Walt kept; the pickup in the photograph that Ash delivered in the first mission.

## Cast

| Who | Is | Wants / fears (short) |
| --- | --- | --- |
| **Ash** | the protagonist | to get on their feet / to be exactly what Port Alder makes them |
| **Eddie Vale** | mechanic, Vale Auto | to stay out of it / that his brother Danny is dead and he could have stopped it. He repainted the truck. |
| **Mara Cruz** | getaway driver | to get her brother Mateo out / that leaving means abandoning him. She has been collecting evidence for months. |
| **Detective Rowan** | police, compromised | to keep control / being known. Menace in pauses, never in volume. |
| **Victor Sloane** | developer | threats arrive as favours. |
| **Darius King** | charismatic local boss | to be loved and obeyed; vindictive when he is not. |
| Walt Pruitt | dockworker, witness | kept the gate log; afraid. |
| Lucille Ng | shop owner (Ng's Corner Mart) | refuses to sell Wharf Street. |
| Officer Dana Whitfield | honest officer | notes that do not match Rowan's reports. |
| Jojo Baptiste | uneasy crew member | drove the truck that moved the container. |
| Mateo Cruz | Mara's brother | runs "deliveries". |
| Priya Nair | journalist, the Ledger | has been told the story is not a story. |
| Dale, Marty Quill, dispatcher, guard | voicemail, radio, police radio, depot gate | |

Full profiles (history, motivation, fear, secret, arc, speech patterns, voice direction, look) are in `js/story/cast.js` and printed in `VOICE_SCRIPT.md`.

## The campaign

Main missions unlock strictly in order. Each can be failed and retried from its last checkpoint (the marker reads `RETRY:`). Rewards are paid once only.

| ID | Mission | Where | What happens | Reward |
| --- | --- | --- | --- | --- |
| M00 | `ARRIVAL` (prologue) | arrival car, Vale Auto | landlord's voicemail, car radio (Marty Quill, Sloane's advert), first talk with Eddie | |
| M01 | `A_NEW_START` | garage, docks | deliver the blue pickup to Walt | $200 |
| M02 | `EASY_MONEY` | garage, car park, King Haulage depot | meet Mara; move a grey sedan (plate ends 4471) for Darius | $800 |
| M03 | `THE_WRONG_PACKAGE` | Warehouse 14 | fetch a sealed case; container tag PAC-4471; the police arrive in ninety seconds. **Choice: who gets the manifest** | $600 |
| M04 | `NO_LOOSE_ENDS` | west beach, the cove | Mara's hidden bag; ambushed; someone knew where she would be. **Choice: how to treat Mara** | $700 |
| M05 | `DIRTY_BADGE` | City Plaza, holding yard | Rowan's trade; the tape; Eddie recognises a truck. **Choice: what to tell Rowan** | $500 |
| M06 | `THE_PEOPLE_WHO_PAY` | Wharf Street, Alder Point site, Harbor Tower | the records; Sloane's reception and envelope. **Choices: the money; who gets the files** | $1,000 |
| M07 | `BURN_NOTICE` | car park | Darius knows; the meeting is a trap. **Choices: who to call; how to answer Darius** | $300 |
| M08 | `THE_LAST_WITNESS` | lighthouse | protect Walt from the crew's siege; he lives or dies by how well you defend him. **Choice: where the gate log goes** | $1,200 |
| M09 | `PORT_ALDER_BURNING` | container yard, Berth Four, Harbor Tower | take the records, fight out of the port, chase Darius, face Rowan and Sloane. **Choices: Darius, Rowan, the ending** | by ending |

## Branching

Relationships (`EDDIE MARA ROWAN DARIUS JOJO DANA PRIYA LUCILLE WALT`) are numbers from -4 to 4 shown as **HOSTILE** (<= -3), **DISTRUSTED** (-2..-1), **NEUTRAL** (0..1), **TRUSTED** (>= 2). Story flags and choices are stored in the save. They change:

- **Dialogue.** Scenes branch on flags, choices and relationship levels (`if: 'choice:evidence=darius'`, `'rel:MARA>=TRUSTED'`, ...). Hangout conversations pick a different scene at different levels (Mara greets a trusted friend, a distrusted friend and a stranger differently).
- **Gameplay.** Eddie charges 30% less once he trusts you and half price after his closure (`E03`). Jojo's trust shrinks the M07 trap from three cars to two. Mara's level changes the size of the crew that hunts you out of the port in M09 (2, 3 or 4 cars). Whether Walt survives is decided by the real siege (his health drains under the crew's fire) and changes the next scenes and the ending.
- **Who is in the world.** People appear where their story says and are in different places, or absent, depending on the story state.

### Choice keys

`evidence` (M03), `mara_confession` (M04), `rowan_share` (M05), `sloane_offer`, `evidence2` (M06), `who_called`, `darius_reply` (M07), `witness_evidence` (M08), `darius_fate`, `rowan_fate`, `ending_choice` (M09), plus the optional chains: `mateo`, `mara_plan`, `jojo`.

## Endings

The last decision in Sloane's office sets **A**, **B** or **C**. The epilogue (three scenes each, with different people in different places), the payout, the fate of the cast and the city all differ.

| | **A: expose it** | **B: take the money** | **C: burn it all** |
| --- | --- | --- | --- |
| Choice | refuse, hand it over, let it all come out | take the deal | destroy the cabinet, the deal, everything |
| Payout | $2,000 | $50,000 | $500 |
| Radio | Alder FM interrupts: the Ledger's seven-page investigation, warrants for Sloane | Sloane's advert again, now "open to the public" | Alder FM: a fire at the container yard; "We are deeply saddened" |
| Eddie | a new sign, *VALE & VALE AUTO*; he sat by the harbor for the first time in five years | "You had the chance to say my brother's name out loud... and you took the money." | holding an envelope, no copy kept: "Danny would've liked the fire" |
| Mara | at the end of Harbor Pier; trusted, she is leaving *for a while* and asks Ash along | no scene: she is not there to see it | at the East Jetty with the engine running if she trusts Ash |
| Ash | | alone at a very high window | |
| The city | | | the container yard, Warehouse 14 and the Alder Point site keep smoking and burning (smoke and fire stay in the city) |

Darius's fate (arrested / let go / killed) and Rowan's (arrested / flips / free) are layered on top, so there are many combinations of words and outcomes.

## Optional chains (all skippable)

| Chain | Missions | Notes |
| --- | --- | --- |
| Eddie's garage | `E01 OLD_TICKETS`, `E02 DANNYS_TRUCK`, `E03 SOMEONE_WHO_KNEW_HIM` | after M05; unlocks Eddie's closure and cheaper repairs |
| Mara's escape plan | `R01 CLEAN_MONEY`, `R02 MATEO`, `R03 THE_PLAN` | after M04 |
| The honest officer | `O01 INCONSISTENCIES`, `O02 THREE_SITES`, `O03 THE_FILE` | after M04; builds Dana's case |
| Waterfront residents | `W01 WINDOWS`, `W02 SIGNATURES`, `W03 THE_PERMIT` | after M06; saves Ng's Corner Mart |
| Darius's crew | `D01 COLLECTIONS`, `D02 BORROWED_CAR`, `D03 JOJOS_QUESTION` | after M02; closes once the story turns on Darius (M06) |

Press **E** next to a person in the city (Eddie at the garage, Mara on her street, Lucille at the mart, and so on) for a conversation that reflects where the story is.

## How it is built (`js/story/`)

The story logic is pure (no rendering) so a headless test plays the same campaign the browser does.

| File | Job |
| --- | --- |
| `cast.js` | character profiles, voice briefs, body looks |
| `state.js` | story state, relationship levels, condition language, save migration |
| `dialogue.js`, `lines/*.js` | the **dialogue database**: every scene is data; every spoken line gets a unique ID `CHARACTER_MISSION_SCENE_NNN` (for example `EDDIE_M01_GARAGE_001`) with speaker, text, performance direction, priority, condition, audio path |
| `sceneRunner.js` | walks a scene: lines, choices, effects, branches |
| `missions.js`, `places.js` | the mission registry (IDs, prerequisites, locations, objectives, steps, checkpoints, rewards, failure rules) and the named places (mapped to the city's points of interest) |
| `engine.js` | the mission engine (step machine, retry, rewards paid once, announcements) |
| `voiceQueue.js` | priorities, interruption, queueing, no-restart cooldown, subtitle timing (pure) |
| `voice.js` | recordings: loads `voice/available.json`, decodes and plays audio, radio filter, volume, graceful fallback |
| `conversation.js` | the conversation player: cinematic camera, cast staging, choices, skip, subtitles, phone/radio/car dialogue |
| `npcs.js`, `crew.js` | the people (bodies, facing, health) and the crew's cars (hunt, siege, flee) |
| `runtime.js`, `menu.js` | the bridge to the game (markers, HUD, cars, wanted level, save) and the menus/journal |

**Step types** in a mission: `scene`, `call`, `goto`, `drive`, `pickup`, `getcar`, `heat`, `ambush`, `protect`, `chase`, `wait`, `pay`. Steps can carry `if:` conditions, `radio:` scenes that play while you drive, `npcs:` to place, `cp: false` to skip checkpointing.

**Dialogue modes.** `direct` (people together: the world pauses, letterbox bars, the camera frames each speaker over the other's shoulder), `phone` and `radio` (heard while you play, with a phone/radio filter on a recording), `car` (a passenger).

**Arriving at a cutscene.** You have to reach the mission point (about 7 m). The world then stops, the engine hum and any phone call or radio go quiet, the screen fades to black, Ash gets out of the car, and the scene fades in. A phone call that was cut off carries on afterwards; the ambient car radio does not.

**Controls in a conversation.** E, Enter, Space or click: next line. X or the *skip scene* button: skip the scene (a choice is still asked). 1-4 or click: answer. P: pause (the conversation waits). Nothing can hold the player: every line can be skipped.

**Saves.** Completed missions, the current mission and its checkpoint, flags, relationships, choices, unlocked chains, played hangouts and the ending live in `data.story` inside the normal save (`gta:save`). Old, partial or newer-version saves are repaired or reset, never thrown on. A mission in progress resumes from its checkpoint.

## The rigged model (`kaidin`)

`gta/models/kaidin.glb` is a rigged character (Walking and Running clips; the 22 MB source texture was shrunk to a 2048 px JPEG so the file is 4 MB) meant to become Darius King's body. It is **not** part of the story or the world yet. Type **`kaidin`** while playing to put him in front of you as an NPC (same NPC base as everyone else: facing, health, hangout rules; only the body differs); type it again to send him away. The model and `lib/GLTFLoader.js` (three.js r128, unchanged) are downloaded only then. With no idle clip he stands in the walk cycle's neutral frame and breathes; he walks or runs when something moves him. `js/story/glbChar.js` is the loader; `js/story/cheat.js` the typed-code matcher.

## Adding things

- **A line or scene:** edit or add a `scene(...)` in `js/story/lines/`. Run `node gta/tools/voice.mjs` to refresh the voice script and manifest. Tests fail if they are stale.
- **A mission:** add an entry to `MISSION_LIST` in `missions.js`; reference scenes by ID and places by `place:<name>`.
- **A recording:** see `voice/README.md`.

## Known limits

- No voice recordings exist. Subtitles carry everything.
- Characters have articulated bodies but no lip sync or facial animation; staging and camera do the acting.
- Ambushes use simple road-graph driving and shooting; they are tuned for play, not for realism.
