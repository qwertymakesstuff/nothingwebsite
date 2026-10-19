// LAST EXIT: the cast. Pure data (no rendering): profiles used by the dialogue system, the voice script and the in-world characters.
// Voice direction is for the people recording the lines; look is the spec handed to createCharacter() for a persistent in-world body.
export const PROTAGONIST = 'ASH';

export const CAST = {
  ASH: {
    name: 'Ash', full: 'Ash Calloway', role: 'protagonist', color: '#9fd8ff', player: true,
    bio: 'Arrives in Port Alder at dusk with a cheap car, $38 and no connections. The past is left deliberately vague so the player can shape it through choices.',
    motivation: 'Get on their feet. Find out whether a person can leave a bad life behind.', fear: 'That they are exactly the person Port Alder will make them.', hides: 'Why they left wherever they came from.',
    arc: 'Arrives with nothing to lose and learns that every favour has a price. By the end Ash has chosen what kind of person Port Alder gets: a witness, a profiteer, or a fire.',
    voice: { description: 'Adult, gender-neutral casting; any actor can play Ash. Tired, observant, a dry streak that grows as they gain footing.', direction: 'Understated. Think out loud, never shout. Humour comes from tiredness, not from jokes.', accent: 'Neutral American; no regional markers.', pace: 'Medium, slightly slower than the other leads.', range: 'Low to medium. Anger shows as stillness.', pronunciation: [], recording: 'Close mic, dry. Record every option of a choice even if it is rarely picked.' },
    look: { female: false, h: 1.04, w: 1.05, skin: 0xe0ac84, hair: 0x1c1410, hairStyle: 'short', top: 0x2f3f6a, sleeves: 'long', bottom: 0x2a2a30, acc: [] }
  },
  EDDIE: {
    name: 'Eddie Vale', short: 'Eddie', role: 'the mechanic', color: '#ffcf6a', home: 'poi:repair_garage',
    bio: 'Runs Vale Auto. Once ran it with his younger brother Danny, who disappeared five years ago after a job for Darius King. Eddie tells himself Danny just left town.',
    motivation: 'Keep the garage alive and the people he cares about out of trouble. Stay out of the criminal world.', fear: 'That Danny is dead and that Eddie could have stopped it.', hides: 'For years he repaired trucks for dock-connected people, and one of them helped hide the missing shipment.',
    arc: 'Starts by steering Ash toward easy jobs. When the truth lands he has to stop pretending and decide what his silence cost.',
    voice: { description: 'Middle-aged, slightly rough, conversational. Late forties.', direction: 'Dry humour, deflection. Gets quieter, not louder, when it matters. Never theatrical.', accent: 'Working-class American, East Coast port-town lean. Light touch.', pace: 'Easy and unhurried; pauses before saying the true thing.', range: 'Narrow: deadpan to quietly raw.', pronunciation: ['Vale: "vayl"', 'Danny: "DAN-ee"'], recording: 'Warm room tone, mic a little off-axis. For the emotional scenes record a take at conversational volume, then one softer.' },
    look: { female: false, h: 1.0, w: 1.15, belly: .7, skin: 0xc99872, hair: 0x4a4038, hairStyle: 'short', top: 0x3f4f3a, sleeves: 'long', bottom: 0x2f3a4a, shoes: 0x2a2018, acc: ['glasses'] }
  },
  MARA: {
    name: 'Mara Cruz', short: 'Mara', role: 'the getaway driver', color: '#ff8aa8', home: 'poi:corner_mart',
    bio: 'Port Alder native who learned to drive on her family\'s delivery routes. Took illegal driving jobs after a family money crisis. Reads people well, hates admitting she needs help.',
    motivation: 'Earn enough to leave Port Alder and get her younger brother Mateo out first.', fear: 'That leaving means abandoning Mateo, and staying means losing him.', hides: 'She has been collecting evidence about suspicious shipments for months, and she picked Ash because they might be useful, not because she trusts them.',
    arc: 'Transactional ally. Becomes a loyal friend, a bitter rival, or someone who leaves, depending on how Ash treats her.',
    voice: { description: 'Young adult, mid twenties.', direction: 'Quick, sharp, funny. In serious scenes she sounds tired and guarded, never melodramatic.', accent: 'Natural American, urban working-class. No exaggerated accent.', pace: 'Fast; slows right down when she is afraid.', range: 'Wide: sarcastic to cracked-open.', pronunciation: ['Mara: "MAH-rah"', 'Cruz: "krooz"', 'Mateo: "mah-TAY-oh"'], recording: 'Close and energetic. Overlap-style interruptions are written as cut-off lines; record them cut off.' },
    look: { female: true, h: .98, w: .95, skin: 0xb98562, hair: 0x1a1210, hairStyle: 'bun', top: 0xc0392b, sleeves: 'short', bottom: 0x1f2630, shoes: 0xe8e8e8, acc: [] }
  },
  ROWAN: {
    name: 'Detective Rowan', short: 'Rowan', role: 'the compromised detective', color: '#9ab0ff', home: 'poi:police_hq',
    bio: 'Joined the force believing he could change things. Years of pressure and compromises made him part of what he once fought.',
    motivation: 'Keep his position, protect his family from ruin, and believe that he prevents worse people from taking over.', fear: 'Being seen clearly by his daughter.', hides: 'He feeds selected information to Darius and has buried evidence about Sloane\'s redevelopment.',
    arc: 'Helpful at first; his explanations get harder to reconcile with the evidence. Becomes an enemy, a reluctant source, or a witness.',
    voice: { description: 'Mature, fifties.', direction: 'Calm, measured, controlled. Menace comes from precise wording and long pauses, never volume.', accent: 'Educated American, neutral.', pace: 'Slow and deliberate. Let the pauses sit.', range: 'Very narrow until the last scene.', pronunciation: ['Rowan: "ROH-un"'], recording: 'Dry and close. Record a clean version of each line with no breath noise at the start; the silences are part of the performance.' },
    look: { female: false, h: 1.05, w: 1.0, skin: 0xe8c8a8, hair: 0x6a6a6a, hairStyle: 'short', top: 0x4a4a52, sleeves: 'long', bottom: 0x24242a, shoes: 0x14141a, acc: ['tie', 'badge'] }
  },
  SLOANE: {
    name: 'Victor Sloane', short: 'Sloane', role: 'the developer', color: '#e8d8a0', home: 'poi:harbor_tower',
    bio: 'Built a reputation buying neglected property and promising to revive it. His waterfront project promises jobs, housing and a modern district.',
    motivation: 'Finish the redevelopment, consolidate his empire, secure a political legacy.', fear: 'Being ordinary; a ledger with his handwriting in it.', hides: 'The criminal network was used to frighten owners into selling, move stolen cargo and bury inconvenient evidence.',
    arc: 'Sees Ash as a useful, disposable outsider, then tries to recruit, discredit, intimidate or remove them.',
    voice: { description: 'Refined, early sixties.', direction: 'Confident, understated, courteous. Threats sound like helpful suggestions. Never raises his voice.', accent: 'Polished American, hint of boarding school, not British.', pace: 'Unhurried; every sentence sounds pre-approved.', range: 'Narrow and smooth.', pronunciation: ['Sloane: "slohn"', 'Alder Point: "AWL-der point"'], recording: 'Warm, intimate mic. He is always almost smiling.' },
    look: { female: false, h: 1.06, w: .98, skin: 0xe6c3a0, hair: 0xc8c8c8, hairStyle: 'short', top: 0x1c2430, sleeves: 'long', bottom: 0x1c2430, shoes: 0x0e0e10, acc: ['tie'] }
  },
  DARIUS: {
    name: 'Darius King', short: 'Darius', role: 'the local boss', color: '#ff9a52', home: 'poi:truck_depot',
    bio: 'Built an operation on stolen vehicles, cargo theft and illegal deliveries. Presents himself as a neighbourhood businessman who understands how the city really works.',
    motivation: 'Keep control of his network and not become disposable to richer people like Sloane.', fear: 'Being used up and thrown away.', hides: 'He knows the redevelopment is using him, and plans to take a bigger share.',
    arc: 'Treats Ash like a promising recruit; turns viciously on anyone he decides has betrayed him.',
    voice: { description: 'Charismatic, forties.', direction: 'Warm, funny, generous early on, so the threats later land harder. Likeable first, frightening second.', accent: 'Local Port Alder, relaxed American. Do not play a stereotype.', pace: 'Loose, rhythmic; he enjoys his own jokes.', range: 'Wide: laughing to flat and cold.', pronunciation: ['Darius: "DAIR-ee-us"'], recording: 'Close, warm. Smile in the early lines. In M07 and M09 take the smile out completely.' },
    look: { female: false, h: 1.08, w: 1.2, belly: .3, skin: 0x8a5a3c, hair: 0x14100c, hairStyle: 'short', top: 0x6a2a2a, sleeves: 'long', bottom: 0x1c1c20, shoes: 0xd8d0c0, acc: ['glasses'] }
  },
  WALT: {
    name: 'Walt Pruitt', short: 'Walt', role: 'the dockworker', color: '#b8c8a0', home: 'poi:docks',
    bio: 'Thirty years on the Port Alder docks. Saw a container leave Berth 4 that was never logged, and saw Danny Vale\'s truck the night he vanished.',
    motivation: 'Get through the shift. Then, slowly, get it off his chest.', fear: 'Losing his pension; being the one who talked.', hides: 'He has kept a copy of the gate log and has told no one.',
    arc: 'Starts as a man who looks at his boots and says nothing. Pushed far enough, he decides his silence has cost enough, and either lives to testify or becomes the reason Ash cannot walk away.',
    voice: { description: 'Sixties, gravelly.', direction: 'Short sentences. Starts with "ain\'t my business" and ends up telling the truth.', accent: 'Older working-class American.', pace: 'Slow, with long gaps.', range: 'Narrow.', pronunciation: ['Pruitt: "PROO-it"'], recording: 'Room tone with a little distance.' },
    look: { female: false, h: .98, w: 1.15, belly: .9, skin: 0xd8b090, hair: 0x9a9a9a, hairStyle: 'cap', top: 0xd8a020, sleeves: 'long', bottom: 0x3a4a5a, shoes: 0x3a2a1a, acc: [] }
  },
  LUCILLE: {
    name: 'Lucille Ng', short: 'Lucille', role: 'the shop owner', color: '#e8a8d8', home: 'poi:corner_mart',
    bio: 'Has run Ng\'s Corner Mart for thirty-one years. Her street has been "cleaned up" by vandals and eviction notices ever since the redevelopment was announced.',
    motivation: 'Keep her counter and her neighbours.', fear: 'Being the last one standing.', hides: 'She already signed one paper she does not understand.',
    arc: 'Treats Ash as another stranger with a favour to ask. If the neighbourhood is defended she becomes its stubborn heart; if not, the shop she has kept for thirty years becomes a tally of what was lost.',
    voice: { description: 'Sixties, sharp.', direction: 'Wry, tough, funny when cornered. Never a victim voice.', accent: 'Port Alder native.', pace: 'Brisk.', range: 'Medium.', pronunciation: ['Ng: "ing" (as in "sing")'], recording: 'Bright, close.' },
    look: { female: true, h: .92, w: .95, skin: 0xe8c8a0, hair: 0xb0b0b0, hairStyle: 'bun', top: 0x5a8a6a, sleeves: 'long', bottom: 0x3a3a44, shoes: 0x3a3a3a, acc: ['glasses'] }
  },
  DANA: {
    name: 'Officer Dana Whitfield', short: 'Dana', role: 'the honest officer', color: '#7ab8ff', home: 'poi:police_hq',
    bio: 'Patrol officer five years in. Noticed that Detective Rowan\'s reports do not match her own notes.',
    motivation: 'Do the job she thought she signed up for.', fear: 'Being the one who ends her own career.', hides: 'She photographed a page of Rowan\'s logbook and has not told her sergeant.',
    arc: 'A patrol officer who keeps her notes in a drawer. Given proof and a partner she stops waiting for permission and builds a case that cannot be buried.',
    voice: { description: 'Late twenties.', direction: 'Earnest, straightforward, nervous when she says the risky thing.', accent: 'Neutral American.', pace: 'Medium; speeds up when anxious.', range: 'Medium.', pronunciation: ['Whitfield: "WHIT-feeld"'], recording: 'Clean, close.' },
    look: { female: true, h: .99, w: 1.0, skin: 0xd8a888, hair: 0x6a4a2a, hairStyle: 'bun', top: 0x3a5a9a, sleeves: 'short', bottom: 0x14203a, shoes: 0x111111, acc: ['badge', 'belt'] }
  },
  JOJO: {
    name: 'Jojo Baptiste', short: 'Jojo', role: 'a member of Darius\'s crew', color: '#a0f0c0', home: 'poi:truck_depot',
    bio: 'Twenty-two, runs errands and collections for Darius. Started because he was loyal; stays because he is afraid.',
    motivation: 'Prove himself without getting anyone hurt.', fear: 'Darius.', hides: 'He drove the truck that moved the container, and has not slept properly since.',
    arc: 'Loyal because he is afraid. Shown another way out, he either turns against Darius or is the one who warns him, depending on what Ash gave him to hold on to.',
    voice: { description: 'Early twenties.', direction: 'Talks fast when nervous, goes flat when he lies.', accent: 'Port Alder, a little slang. Keep it light.', pace: 'Fast and clipped.', range: 'Medium.', pronunciation: ['Baptiste: "bap-TEEST"', 'Jojo: "JOH-joh"'], recording: 'Close, energetic.' },
    look: { female: false, h: 1.0, w: .9, skin: 0x7a5238, hair: 0x14100c, hairStyle: 'beanie', top: 0x2a6a4a, sleeves: 'short', bottom: 0x2a2a30, shoes: 0xe8e8e8, acc: ['backpack'] }
  },
  MATEO: {
    name: 'Mateo Cruz', short: 'Mateo', role: 'Mara\'s younger brother', color: '#ffb090', home: 'poi:park',
    bio: 'Seventeen. Carries packages for Darius\'s crew for cash and does not ask what is in them.',
    motivation: 'Be useful. Not be a kid.', fear: 'Being as stuck as his sister thinks he is.', hides: 'He knows one of the packages was not what he was told.',
    arc: 'A seventeen-year-old who thinks he is helping. His choice to talk, or not, decides whether Mara\'s plan to leave is a rescue or an escape from him.',
    voice: { description: 'Seventeen.', direction: 'Defensive, funny, deflects, cracks when pushed.', accent: 'Natural American teen; no performed slang.', pace: 'Quick.', range: 'Medium.', pronunciation: ['Mateo: "mah-TAY-oh"'], recording: 'Natural and close. Direct him to under-act.' },
    look: { female: false, h: .94, w: .85, skin: 0xb98562, hair: 0x1a1210, hairStyle: 'short', top: 0x3a3a3a, sleeves: 'short', bottom: 0x2a3a5a, shoes: 0xe8e8e8, acc: ['backpack'] }
  },
  PRIYA: {
    name: 'Priya Nair', short: 'Priya', role: 'the journalist', color: '#ffe08a', home: 'poi:diner_2',
    bio: 'Runs the Port Alder Ledger\'s two-person investigations desk. Has been writing about waterfront evictions for a year and cannot get a source to go on record.',
    motivation: 'Publish something that holds up.', fear: 'Printing a story that gets someone killed.', hides: 'Her editor has already killed one version of the story.',
    arc: 'A journalist who has been told the story is not a story. With the right files she turns a town\'s whispers into a headline; with the wrong ones she never gets the chance.',
    voice: { description: 'Early thirties.', direction: 'Crisp, curious, warm when she wants you to talk. Always listening for the quote.', accent: 'Neutral American.', pace: 'Brisk.', range: 'Medium.', pronunciation: ['Priya: "PREE-yah"', 'Nair: "NY-eer"'], recording: 'Clean, close.' },
    look: { female: true, h: .97, w: .92, skin: 0xb88862, hair: 0x14100c, hairStyle: 'long', top: 0x6a4a8a, sleeves: 'long', bottom: 0x2a2a30, shoes: 0x3a2a1a, acc: ['bag', 'glasses'] }
  },
  DALE: {
    name: 'Dale Pruitt-Moss (landlord)', short: 'Dale', role: 'landlord (voicemail only)', color: '#c8c8c8',
    bio: 'The man who sold the room twice. Voicemail only.', voice: { description: 'Forties, casual and slippery.', direction: 'Breezy; he is not sorry.', accent: 'Local.', pace: 'Quick.', range: 'Narrow.', pronunciation: [], recording: 'Phone-style take is fine; the game applies the filter.' }
  },
  HOST: {
    name: 'Marty Quill (radio host)', short: 'Marty Quill', role: 'radio host, Alder FM', color: '#d0d0ff',
    bio: 'Afternoon-drive host on Alder FM.', voice: { description: 'Fifties, big radio voice.', direction: 'Warm, breezy, a little too pleased with himself.', accent: 'Radio American.', pace: 'Fast and flowing.', range: 'Wide.', pronunciation: ['Quill: "kwill"'], recording: 'Studio-bright. The game does not filter this character.' }
  },
  DISPATCH: {
    name: 'Police dispatcher', short: 'Dispatch', role: 'police radio', color: '#8ab0ff',
    bio: 'Port Alder PD dispatch.', voice: { description: 'Any adult.', direction: 'Clipped, procedural, bored.', accent: 'Neutral.', pace: 'Fast.', range: 'Narrow.', pronunciation: [], recording: 'Flat. The game adds the radio filter.' }
  },
  DUKE: {
    name: 'Duke Pelletier (talk host)', short: 'Duke', role: 'host of the Dead Air Hour, Harbor AM 1190', color: '#ffb35c',
    bio: 'A former ferry purser turned late-night broadcaster. Believes everything is connected and nothing is his fault. Radio only: he is never seen.',
    voice: { description: 'Mid fifties, gravelly, warm, permanently indignant.', direction: 'A man who has been awake thirty hours and thinks it is a talent. Commit completely to every absurd claim; never wink. The one serious moment (the lighthouse segment) drops the whole act.', accent: 'Port-town American, a little theatrical.', pace: 'Rolling and rambling; speeds up when outraged, slows right down for the punchline.', range: 'Wide: whisper to bellow.', pronunciation: ['Pelletier: "PEL-uh-tee-ay" (he insists)', 'Tibbets: "TIB-its"'], recording: 'Close, warm, loud-ish. Record each line with full commitment, then one calmer take.' }
  },
  ROLLO: {
    name: 'Rollo Teague (camera guy)', short: 'Rollo', role: 'camera operator for the Dead Air Hour video stream', color: '#9fc8a0',
    bio: 'Films the show for the four people who watch it. Speaks rarely, flatly and usually at exactly the wrong moment. Radio only.',
    voice: { description: 'Thirties, low, tired.', direction: 'Deadpan. Never plays the joke; says it like a weather report. Does not look up.', accent: 'Local, flat.', pace: 'Slow, with long pauses.', range: 'Very narrow.', pronunciation: ['Teague: "teeg"'], recording: 'Slightly off mic, as if across the studio. Keep the boredom.' }
  },
  MAGS: {
    name: 'Mags Fenwick (producer)', short: 'Mags', role: 'producer, sound desk and caller screener', color: '#e08acb',
    bio: 'Runs the studio: the board, the phones, the schedule, and every caller (all of them are her). Typing throughout. Radio only.',
    voice: { description: 'Forties, brisk, dry.', direction: 'The professional in a room of children. Her "caller" voices are deliberately terrible and she does not care.', accent: 'Local, clipped.', pace: 'Quick, efficient.', range: 'Medium; one comic falsetto for the callers.', pronunciation: ['Fenwick: "FEN-wick"'], recording: 'Record each caller line twice: once in the bad falsetto, once as Mags (the game uses the falsetto).' }
  },
  GUARD: {
    name: 'Depot guard', short: 'Guard', role: 'guard at Darius\'s depot', color: '#c0b090',
    bio: 'Not an ordinary employee.', voice: { description: 'Thirties, gruff.', direction: 'Suspicious, nervous around police.', accent: 'Local.', pace: 'Medium.', range: 'Narrow.', pronunciation: [], recording: 'Close.' },
    look: { female: false, h: 1.06, w: 1.25, belly: .2, skin: 0xc09070, hair: 0x14100c, hairStyle: 'bald', top: 0x2a2a2a, sleeves: 'long', bottom: 0x1a1a1e, shoes: 0x111111, acc: [] }
  }
};
export const SPEAKERS = Object.keys(CAST);
export const nameOf = id => (CAST[id] && (CAST[id].short || CAST[id].name)) || id;
export const HAS_BODY = id => !!(CAST[id] && CAST[id].look);
/** characters whose relationship with the player is tracked */
export const RELATIONSHIPS = ['EDDIE', 'MARA', 'ROWAN', 'DARIUS', 'JOJO', 'DANA', 'PRIYA', 'LUCILLE', 'WALT'];
