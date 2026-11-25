// Encounters: people, machines, events and oddities placed in rooms when a floor is generated.
// where: floor categories / ids ('any' = anywhere ordinary). w: weight. Flags:
//   rare (counts as a rare encounter), once (once ever), perRun (max per night), minNight,
//   cond(g) (extra eligibility), repeat (stays usable), trigger:'arrive' (fires as you step out).
// text(g) -> string. choices: [{ label, cost (cash), tokens, tickets, needItem, t (minutes),
//   if(g) (only shown when true), go(g) -> string | { text, choices } (next stage) }].
// The g object is the engine's effect API (see engine.js makeCtx).

const leave = (label = 'Leave it be', text = 'You leave it be.') => ({ label, go: () => text });
const money = n => '$' + n;

export const NPCS = {
  attendant: { name: 'The Attendant', desc: 'An elderly man in a lift operator\'s uniform and cap. Kind, tired, always exactly where you need him. Name badge: T. LISK.' },
  salesman: { name: 'Mr. Pell, the Salesman', desc: 'A man in a very good suit with a very large suitcase. Everything he sells is slightly wrong.' },
  janitor: { name: 'Dot, the Night Janitor', desc: 'Mops the building every night. Has done for "a while". Loses her keys constantly.' },
  cat: { name: 'The Grey Cat', desc: 'A grey cat who rides the lift without a ticket. Appears on any floor it likes.' },
  tenant: { name: 'Mrs. Abernathy (4B)', desc: 'A long-term resident. Makes excellent tea. Has opinions about the building.' },
  pianist: { name: 'The Lounge Pianist', desc: 'Plays requests. Has never been seen arriving or leaving.' },
  doctor: { name: 'Dr. Okafor', desc: 'Night doctor at the clinic. Treats "vertical displacement" with tea and kindness.' },
  chef: { name: 'Chef Marchetti', desc: 'Cooks for Table 13 every night. Will feed anyone who sits still long enough.' },
  guard: { name: 'Security Guard Hollis', desc: 'Checks IDs. Doesn\'t know what for anymore, but checks them.' },
  postman: { name: 'The Postman', desc: 'Delivers letters to floors that may or may not exist.' },
  librarian: { name: 'The Librarian', desc: 'Says "shh" before you\'ve said anything. Very fond of overdue fines.' },
  accountant: { name: 'Mr. Gray, Accounts', desc: 'Still balancing the building\'s books. They have never balanced.' },
  plumber: { name: 'The Plumber', desc: 'Knows every pipe in the building by its first name.' },
  inspector: { name: 'The Lift Inspector', desc: 'Comes once a decade with a clipboard. Very thorough.' },
  double: { name: 'Your Double', desc: 'Same clothes. Same face. Slightly more tired.' },
  floorseller: { name: 'The Man Who Sells Floors', desc: 'Has a briefcase full of deeds. Only ever met by chance.' },
  tourist: { name: 'The Lost Tourist', desc: 'Has been looking for the lobby since breakfast. Which breakfast is unclear.' },
  ines: { name: 'Ines Varga', desc: 'The architect. Met only at 3:13.' },
};

export const ENCOUNTERS = [
  // ─────────────────────── RECURRING PEOPLE ───────────────────────
  { id: 'attendant', name: 'The Attendant', npc: 'attendant', where: ['any'], w: 3, rare: true, perRun: 1, minNight: 1,
    cond: g => attStage(g) < 3 || g.chance(0.6),
    text: g => {
      const st = attStage(g);
      if (st === 0) return 'An old man in a lift operator\'s uniform is sitting on a folding stool, as if he has been waiting for you. His cap says CASTELLAN. "Evening," he says. "Or morning. Hard to tell in here."';
      if (st === 1) return 'The Attendant again, polishing a brass button on his sleeve. He brightens when he sees you. "Ah! Still going? Good. Good."';
      if (st === 2) return 'The Attendant is leaning on a wall, looking tired. "There you are. I was hoping you\'d come by. I have something for you."';
      return 'The Attendant tips his cap. "Evening again. Mind how you go."';
    },
    choices: [
      { label: 'Talk with him', t: 10, go: g => {
        const st = attStage(g); g.meet('attendant');
        if (st === 0) { g.clue('c_attendant_1'); return 'You talk for a while about nothing much: the weather, which he hasn\'t seen in years, and the lift, which he loves. (New journal entry.)'; }
        if (st === 1) { g.clue('c_attendant_2'); g.comp(15); return 'He tells you about the building\'s own floor, the thirteenth, where it keeps what people lose. You feel oddly comforted. (+15 composure, new journal entry.)'; }
        if (st === 2) { g.clue('c_attendant_3'); g.give('lounge_key'); return 'He presses a small key into your hand. "My lounge. Press L. The thing you\'re looking for is in the piano." (Got the Lounge Key — a new button appears on your panel.)'; }
        g.comp(10); return g.pick(['"Mrs Varga used to ride with me every evening. Always asked for the roof. I always said: \'One day, ma\'am.\'"', '"You\'ve got the look of someone who\'s nearly there. Don\'t rush the last bit."', '"I\'d like to retire, you know. Someone has to mind the lift, though."', '"3:13. She liked that time. Said it was when the building was most itself."', '"Five pieces, she tore those drawings into. Below, between, beside, behind, and in plain sight."']) + ' (+10 composure)';
      } },
      { label: 'Ask for directions', t: 5, go: g => { g.meet('attendant'); g.reveal(); g.comp(5); return 'He describes the floor so precisely you could draw it. (Map revealed.)'; } },
      leave('Nod and move on', 'He nods back. "Mind the gap."'),
    ] },
  { id: 'salesman', name: 'The Salesman', npc: 'salesman', where: ['any'], w: 5, perRun: 2,
    text: () => 'A man in a very good suit opens a very large suitcase on a desk. "Mr. Pell. Purveyor of unlikely goods. Everything you see is for sale, and some things you don\'t."',
    choices: [
      { label: 'Buy a mystery box', cost: 25, go: g => {
        g.meet('salesman'); g.clue('c_salesman');
        const roll = g.rand();
        if (roll < 0.3) { const n = g.int(30, 70); g.cash(n); return `Inside: an envelope of cash. ${money(n)}. "A return on investment! How unusual."`; }
        if (roll < 0.55) { const it = g.pick(['coffee', 'tea', 'flare', 'lucky_coin', 'stopwatch', 'skeleton_key']); g.give(it); return `Inside: ${g.itemName(it)}. "Excellent choice. You made it."`; }
        if (roll < 0.7) { const l = g.lost(); if (l) return `Inside, wrapped in tissue: ${l.name}. "That one\'s been looking for you."`; g.token(1); return 'Inside: a brass token. "Legal tender somewhere."'; }
        if (roll < 0.85) { g.token(1); return 'Inside: a single brass elevator token, still warm. (+1 token)'; }
        g.comp(-8); return 'Inside: another, smaller box. Inside that: a note saying "no refunds". (−8 composure)';
      } },
      { label: 'Buy bolt cutters', cost: 220, if: g => !g.has('bolt_cutters'), go: g => { g.meet('salesman'); g.give('bolt_cutters'); return '"Barely used. Only ever cut one chain. Well — not yet."'; } },
      { label: 'Buy a gas mask', cost: 180, if: g => !g.has('gas_mask'), go: g => { g.meet('salesman'); g.give('gas_mask'); return '"Fits most faces. Some faces it fits better than others."'; } },
      { label: 'Trade a coffee for a skeleton key', needItem: 'coffee', go: g => { g.meet('salesman'); g.take('coffee'); g.give('skeleton_key'); return '"A fair trade. The key\'s a little fragile — one door, then it\'s done."'; } },
      leave('No thank you', '"No thank you," he repeats, writing it down as though it were an order.'),
    ] },
  { id: 'janitor', name: 'The Night Janitor', npc: 'janitor', where: ['any'], w: 4, perRun: 1,
    cond: g => !g.flag('janitorDone') || g.chance(0.5),
    text: g => g.flag('janitorDone') ? 'Dot the janitor waves her mop at you. "My saviour! Keys still on the hook, look." She is mopping in tidy squares.' : 'A woman in overalls is patting all her pockets, mop under one arm. "Have you seen my keys? Big ring. Forty keys and a bottle opener. I put them down on some floor or other…"',
    choices: [
      { label: 'Give her the keyring', needItem: 'janitor_keys', if: g => !g.flag('janitorDone'), go: g => { g.meet('janitor'); g.take('janitor_keys'); g.setFlag('janitorDone', 1); g.cash(40); if (g.has('lockpicks')) { g.token(2); return '"Oh, you star!" She presses two brass tokens and some cash on you. (+2 tokens, +$40)'; } g.give('lockpicks'); return '"Oh, you star!" She takes the ring and gives you a small leather roll in return. "My old picks. For when keys aren\'t enough." (Got Lockpick Set, +$40)'; } },
      { label: 'Promise to look out for them', if: g => !g.flag('janitorDone') && !g.has('janitor_keys'), go: g => { g.meet('janitor'); g.setFlag('janitorAsked', 1); return '"Bless you. They\'ll turn up on one of these floors. They always do." (Her keys can now turn up when you search.)'; } },
      { label: 'Ask about the building', t: 5, go: g => { g.meet('janitor'); if (g.anyClue(['maintenance', 'office'])) return 'She leans on her mop and tells you about the things she finds after midnight. (New journal entry.)'; g.comp(8); return 'She tells you a long story about a lost umbrella that found its own way home. (+8 composure)'; } },
      leave('Leave her to it'),
    ] },
  { id: 'cat', name: 'The Grey Cat', npc: 'cat', where: ['any', 'anomaly'], w: 4, perRun: 2,
    text: g => g.flag('catAdopted') ? 'Your grey cat is waiting here, as if it arrived first on purpose. It blinks at you slowly.' : 'A grey cat is sitting in the middle of the floor, washing one paw. It pauses to look at you, decides you are acceptable, and continues.',
    choices: [
      { label: 'Pet the cat', t: 2, go: g => { g.meet('cat'); g.stat('catPets'); g.comp(8); return g.pick(['It leans into your hand and purrs like a lift motor. (+8 composure)', 'It permits exactly three strokes, then bites you very gently, as a formality. (+8 composure)', 'It rolls over. You know better. You pet it anyway. (+8 composure)']); } },
      { label: 'Offer it some tuna', needItem: 'tuna', go: g => {
        g.meet('cat'); g.take('tuna'); const fed = g.setFlag('catFed', (g.flag('catFed') || 0) + 1);
        if (fed >= 4 && !g.flag('catAdopted')) { g.setFlag('catAdopted', 1); g.ach('adopted'); return 'The cat eats, then sits on your foot and refuses to move. It has decided. From now on it rides the lift with you, and has a talent for finding things. (The cat has adopted you: searches find a little more.)'; }
        const r = g.pick(['coin', 'thing', 'clue']);
        if (r === 'coin') { const n = g.int(10, 30); g.cash(n); return `It eats delicately, then bats something out from under a cabinet for you: ${money(n)}.`; }
        if (r === 'clue' && g.anyClue(['any'])) return 'It eats, then trots off and returns with a scrap of paper in its mouth. (New journal entry.)';
        g.comp(20); return 'It eats every scrap and then falls asleep on your shoes. A good moment. (+20 composure)';
      } },
      leave('Let it be', 'The cat ignores your departure with great dignity.'),
    ] },
  { id: 'tenant', name: 'Mrs. Abernathy', npc: 'tenant', where: ['residential', 'hotel'], w: 6, perRun: 1,
    text: () => 'An old lady in a cardigan opens her door before you knock. "Oh, a night-lift person. Come in, come in, the kettle\'s just boiled. It\'s always just boiled."',
    choices: [
      { label: 'Have tea (20 min)', t: 20, go: g => { g.meet('tenant'); g.comp(35); const c = g.anyClue(['residential', 'culture']); return 'Tea, biscuits, and stories about the building in the old days.' + (c ? ' She mentions something you write down. (New journal entry.)' : '') + ' (+35 composure)'; } },
      { label: 'Ask for a snack for the road', go: g => { g.meet('tenant'); g.give('sandwich'); return '"Egg. Don\'t argue." (Got an Egg Sandwich.)'; } },
      leave('Politely decline', '"Another time, dear. There\'s always another time here."'),
    ] },
  { id: 'pianist', name: 'The Pianist', npc: 'pianist', where: ['hotel', 'food', 'culture', 'lounge'], w: 5, perRun: 1,
    text: () => 'A pianist in a dinner jacket is playing something slow and lovely to an empty room. Without stopping, he nods at a brandy glass on the piano with a few coins in it.',
    choices: [
      { label: 'Request a song (tip $5)', cost: 5, t: 10, go: g => { g.meet('pianist'); g.comp(25); return 'He plays something you didn\'t know you remembered. (+25 composure)'; } },
      { label: 'Ask about the four rising notes', go: g => { g.meet('pianist'); if (g.clue('c_chime')) return 'He smiles and plays four notes, rising: the lift chime, slowed down. He slides you the sheet music. (New journal entry.)'; g.comp(5); return 'He plays them again for you, then winks. "You know this one already." (+5 composure)'; } },
      { label: 'Just listen', t: 5, go: g => { g.comp(10); return 'You listen. For a few minutes, the building is just a nice place. (+10 composure)'; } },
    ] },
  { id: 'doctor', name: 'The Night Doctor', npc: 'doctor', where: ['medical'], w: 8, perRun: 1,
    text: () => 'Dr. Okafor looks up from a crossword. "Another night-lift case? Sit down. Let me guess: it was 4, but it wasn\'t 4."',
    choices: [
      { label: 'Get a check-up ($20)', cost: 20, t: 10, go: g => { g.meet('doctor'); g.comp(60); return '"Pulse fine, nerves frayed, perfectly normal for this building. Tea, rest, and don\'t count the floors." (+60 composure)'; } },
      { label: 'Ask for a lollipop', go: g => { g.meet('doctor'); g.comp(5); g.give('candy'); return 'She hands you a lollipop and a candy bar "for later". (+5 composure, got Candy Bar)'; } },
      { label: 'Ask about your symptoms', go: g => { g.meet('doctor'); if (g.clue('c_doctor')) return 'She shows you a form from another patient with your exact symptoms. (New journal entry.)'; return '"Vertical displacement. Very common. Very treatable. Mostly."'; } },
    ] },
  { id: 'chef', name: 'The Chef', npc: 'chef', where: ['food'], w: 8, perRun: 1,
    text: () => 'A chef in whites bursts through the swing doors with three plates. "You! Sit! Taste! Table 13 is late again and I will not waste this."',
    choices: [
      { label: 'Try the soup', go: g => { g.meet('chef'); g.comp(20); return 'It tastes like the first cold day of autumn, in a good way. (+20 composure)'; } },
      { label: 'Try the mystery dish', go: g => { g.meet('chef'); if (g.chance(0.6)) { g.comp(35); return 'It\'s extraordinary. You can\'t describe it. The chef weeps a little. (+35 composure)'; } g.comp(-10); return 'It is… very ambitious. "Too much saffron?" he asks. You nod, eyes watering. (−10 composure)'; } },
      { label: 'Ask about Table 13', go: g => { g.meet('chef'); if (g.clue('c_menu')) return 'He gives you a menu and taps the back page. (New journal entry.)'; g.give('sandwich'); return '"Table 13 is for whoever needs it." He packs you a sandwich. (Got Egg Sandwich)'; } },
    ] },
  { id: 'guard', name: 'Security Checkpoint', npc: 'guard', where: ['office', 'medical', 'experimental', 'maintenance', 'storage'], w: 5, perRun: 1,
    text: () => 'A security guard behind a little desk holds up a hand. "ID, please." He has clearly said this to thousands of empty corridors.',
    choices: [
      { label: 'Show a keycard', if: g => g.has('keycard_blue') || g.has('keycard_red') || g.has('keycard_black'), go: g => { g.meet('guard'); g.reveal(); g.cash(15); return '"Very good. Very official." He waves you through, hands you a map of the floor and a lost-property reward from his drawer. (Map revealed, +$15)'; } },
      { label: 'Bribe him ($15)', cost: 15, go: g => { g.meet('guard'); g.reveal(); return 'He pockets it without looking. "Didn\'t see you." He points out every room. (Map revealed.)'; } },
      { label: 'Explain you\'re lost', t: 10, go: g => { g.meet('guard'); if (g.chance(0.5)) { g.comp(10); return '"Aren\'t we all." He offers you a biscuit. (+10 composure)'; } g.comp(-5); return 'He makes you fill in a form in triplicate. (−5 composure)'; } },
    ] },
  { id: 'postman', name: 'The Postman', npc: 'postman', where: ['any'], w: 3, perRun: 1,
    text: g => g.has('sealed_letter') ? 'The postman again, sorting letters on his knee. He glances at the sealed letter in your pocket and goes pale. "Oh — you\'ve got one of mine."' : 'A postman with an enormous bag is checking addresses against a list. "Floor 13… Floor 13… don\'t suppose you know the way?"',
    choices: [
      { label: 'Hand over the sealed letter', needItem: 'sealed_letter', go: g => { g.meet('postman'); g.take('sealed_letter'); g.token(2); g.cash(50); return '"Signed for! First one in ninety years!" He gives you two brass tokens and a $50 postal reward. (+2 tokens, +$50)'; } },
      { label: 'Offer to help sort', t: 15, if: g => !g.has('sealed_letter'), go: g => { g.meet('postman'); g.clue('c_postman'); if (g.chance(0.5)) { g.give('sealed_letter'); return 'You help. He shows you the returned letters, and gives you one: "If you ever find the place, deliver it." (Got Sealed Letter, new journal entry.)'; } g.cash(12); return 'You help, he tips you $12 and shows you the oldest letter in the bag. (New journal entry.)'; } },
      leave('Wish him luck', '"Luck is a parcel that arrives eventually," he says, and shuffles off.'),
    ] },
  { id: 'librarian', name: 'The Librarian', npc: 'librarian', where: ['culture'], w: 7, perRun: 1,
    text: () => 'A librarian looks up over her half-moon glasses. "Shh." You haven\'t said anything yet. "Pre-emptively."',
    choices: [
      { label: 'Return the overdue book', needItem: 'overdue_book', go: g => { g.meet('librarian'); g.take('overdue_book'); g.token(1); g.cash(30); return '"Overdue since 1958. The fine is… waived." She smiles for the first time in decades and gives you a reward from the fines jar. (+1 token, +$30)'; } },
      { label: 'Ask for a recommendation', t: 10, go: g => { g.meet('librarian'); if (g.anyClue(['culture', 'museum'])) return 'She hands you a thin folder from a locked drawer. "You\'ll want this one." (New journal entry.)'; g.comp(10); return 'She recommends a book of poems about stairs. You read one. (+10 composure)'; } },
      { label: 'Ask if anything is overdue', if: g => !g.has('overdue_book') && !g.flag('bookQuest'), go: g => { g.meet('librarian'); g.setFlag('bookQuest', 1); return '"\'A History of Vertical Transport\'. Borrowed 1958. Somewhere in this building. If you find it, I\'ll make it worth your while." (Overdue book can now turn up.)'; } },
    ] },
  { id: 'accountant', name: 'Mr. Gray, Accounts', npc: 'accountant', where: ['office'], w: 7, perRun: 1,
    text: g => { const a = g.int(13, 49), b = g.int(13, 49), c = g.int(2, 9); g.local.sum = { a, b, c, ans: (a + b) * c }; return `A thin man in a cardigan sits behind a mountain of ledgers. "You! Can you check something for me? (${a} + ${b}) × ${c}. I keep getting a different answer every night."`; },
    choices: [
      { label: 'Work it out', t: 5, go: g => {
        const { ans } = g.local.sum; const opts = g.shuffle([ans, ans + g.pick([-13, 13, 10, -10]), ans + g.pick([1, -1, 2, -2]) * g.local.sum.c]);
        return { text: 'He slides the ledger over. Which is right?', choices: opts.map(o => ({ label: String(o), go: g2 => { g2.meet('accountant'); if (o === ans) { g2.stat('puzzleSolved'); g2.stat('mathSolved'); const n = g2.int(25, 45); g2.cash(n); return `"It balances! It BALANCES!" He pays you ${money(n)} in a consultant\'s fee, from petty cash.`; } g2.comp(-5); return '"No… no, that\'s what I got yesterday." He sighs. (−5 composure)'; } })) };
      } },
      leave('Back away from the ledgers'),
    ] },
  { id: 'plumber', name: 'The Plumber', npc: 'plumber', where: ['maintenance', 'residential', 'food', 'leisure'], w: 5, perRun: 1,
    text: () => 'A plumber has her head inside a cupboard under a sink. "Hand me that spanner? Ta. These pipes go to every floor, you know. Including the one they don\'t."',
    choices: [
      { label: 'Help with the pipes', t: 15, go: g => { g.meet('plumber'); g.cash(g.int(15, 30)); if (g.anyClue(['maintenance'])) return 'You hold the torch, she fixes the leak, and she shows you a tag on a pipe. She pays you, too. (New journal entry.)'; return 'Together you fix the leak. She pays you for your trouble.'; } },
      { label: 'Ask about the thirteenth floor', go: g => { g.meet('plumber'); g.comp(5); return '"Pipe 13 runs hot every night at 3:13 on the dot. Always has. Hot water for a floor that isn\'t there." (+5 composure)'; } },
      leave(),
    ] },
  { id: 'tourist', name: 'The Lost Tourist', npc: 'tourist', where: ['any'], w: 3, perRun: 1,
    text: () => 'A man in a sunhat with a camera round his neck is turning a map upside down. "Excuse me! Do you know the way to the lobby? I\'ve been looking since breakfast."',
    choices: [
      { label: 'Give him your Building Map copy', if: g => g.has('map'), go: g => { g.meet('tourist'); g.cash(35); return 'You sketch him the route on the back of his map. He pays you in a foreign currency that turns into $35 when you look away.'; } },
      { label: 'Point him to the lift', go: g => { g.meet('tourist'); g.comp(5); if (g.chance(0.3)) { g.token(1); return '"Wonderful!" He presses a souvenir token into your hand. (+1 token, +5 composure)'; } return '"Of course! The lift!" He hurries off, the wrong way. (+5 composure)'; } },
      { label: 'Take his photo for him', t: 5, go: g => { g.meet('tourist'); g.comp(8); return 'He poses by a fire extinguisher, delighted. In the viewfinder there are two people behind him wearing caps. You decide not to mention it. (+8 composure)'; } },
    ] },

  // ─────────────────────── MACHINES & OBJECTS ───────────────────────
  { id: 'vending', name: 'Vending Machine', where: ['any'], w: 8, repeat: true,
    text: g => {
      if (!g.local.stock) {
        const pool = [['coffee', 8], ['sandwich', 6], ['candy', 3], ['tea', 16], ['tuna', 4], ['flare', 10], ['lucky_coin', 30], ['stopwatch', 45], ['skeleton_key', 40]];
        g.local.stock = g.shuffle(pool).slice(0, 3).map(([id, p]) => ({ id, p: g.int(Math.ceil(p * 0.8), Math.ceil(p * 1.3)), n: g.int(1, 2) }));
      }
      return 'A vending machine hums under its own light. Some of the spirals hold things no vending machine should sell. ' + (g.local.stock.every(s => s.n <= 0) ? 'It\'s sold out.' : '');
    },
    choices: g => [
      ...(g.local.stock || []).filter(s => s.n > 0).map(s => ({ label: `Buy ${g.itemName(s.id)}`, cost: s.p, go: g2 => { s.n--; g2.give(s.id); g2.stat('vendingBuys'); return `Ka-chunk. ${g2.itemName(s.id)} drops into the tray.`; } })),
      { label: 'Shake it', t: 2, go: g2 => { if (g2.chance(0.25)) { const it = g2.pick(['candy', 'coffee']); g2.give(it); return `Something drops! ${g2.itemName(it)}, free.`; } g2.comp(-3); return 'It wobbles ominously and you stop. (−3 composure)'; } },
      leave('Walk away', 'The machine hums to itself.'),
    ] },
  { id: 'phone', name: 'Ringing Telephone', where: ['any'], w: 7, trigger: 'arrive', perRun: 3,
    text: () => 'A telephone on the wall by the lift is ringing. An old one, with a heavy handset. It keeps ringing.',
    choices: [
      { label: 'Answer it', t: 3, go: g => {
        g.stat('phoneCalls');
        const roll = g.rand();
        if (roll < 0.22) { const c = g.pick(['c_phone_1', 'c_phone_2', 'c_phone_3']); if (g.clue(c)) return 'A voice speaks, then hangs up. You write down what it said. (New journal entry.)'; }
        if (roll < 0.4) { g.reveal(); return '"Front desk. Your floor\'s been tidied. Rooms are as follows…" A voice lists every room. (Map revealed.)'; }
        if (roll < 0.55) { g.time(-15); return 'A speaking clock: "At the third stroke, it will be… earlier than you think." Your watch agrees: 15 minutes earlier.'; }
        if (roll < 0.7) { const n = g.int(10, 25); g.cash(n); return `"Congratulations, you are our 13th caller!" A slot in the phone pays out ${money(n)}.`; }
        if (roll < 0.85) { g.comp(-6); return 'Breathing. Then very quiet elevator music. Then nothing. (−6 composure)'; }
        g.comp(10); return 'A child\'s voice: "Is this the moon?" You say yes. They are delighted. (+10 composure)';
      } },
      leave('Let it ring', 'It rings thirteen times and stops.'),
    ] },
  { id: 'payphone', name: 'Payphone', where: ['leisure', 'retail', 'hotel', 'food'], w: 4, perRun: 1,
    text: () => 'A payphone with a list of numbers scratched into the paint beside it. One reads: "LOBBY — 0", another "13 — ???".',
    choices: [
      { label: 'Dial 0 ($1)', cost: 1, go: g => { g.stat('phoneCalls'); g.comp(8); return '"Lobby. Nothing to report. Doors are locked till morning. Hang in there." (+8 composure)'; } },
      { label: 'Dial 1-3-1-3', cost: 1, go: g => { g.stat('phoneCalls'); if (g.clue('c_three_thirteen')) return 'Static. Then a woman\'s voice, amused: "Not yet. 3:13." Click. (New journal entry.)'; return 'A woman laughs softly. "Patience." Click.'; } },
      { label: 'Check the coin return', go: g => { if (g.chance(0.5)) { const n = g.int(2, 8); g.cash(n); return `${money(n)} in quarters.`; } return 'Empty. Of course.'; } },
    ] },
  { id: 'photobooth', name: 'Photo Booth', where: ['retail', 'arcade', 'leisure'], w: 5, perRun: 1,
    text: () => 'A photo booth with a curtain. FOUR POSES — $2. The little light inside is on.',
    choices: [
      { label: 'Get your photo taken ($2)', cost: 2, go: g => { g.stat('photos'); if (g.chance(0.35)) { g.meet('attendant'); g.anyClue(['any']); return 'The strip drops out. In the fourth photo, an old man in a cap is standing behind you, smiling. On the back, someone has written a note. (New journal entry, perhaps.)'; } g.comp(8); return 'Four photos of you, looking progressively more lost and then, in the last one, laughing. (+8 composure)'; } },
      leave('Not tonight'),
    ] },
  { id: 'fortune', name: 'Fortune-Telling Machine', where: ['arcade', 'retail', 'leisure'], w: 5, perRun: 1,
    text: () => 'A glass cabinet with a mechanical fortune teller in a turban. Her eyes light up as you approach. "CROSS MY PALM WITH SILVER."',
    choices: [
      { label: 'Insert a coin ($3)', cost: 3, go: g => {
        const f = g.pick([['The thing you seek is behind a door that wants a year.', 0], ['Your luck is changing. Up, specifically.', 1], ['A cat will choose you. Accept.', 0], ['Beware the RANDOM button. Embrace it too.', 0], ['Thirteen is a lucky number if you\'re standing on it.', 0], ['You will find what was lost. Including you.', 1]]);
        if (f[1]) g.give('lucky_coin');
        g.comp(5); return `A card slides out: "${f[0]}"` + (f[1] ? ' A coin is taped to the back. (Got Lucky Coin)' : '') + ' (+5 composure)';
      } },
      leave(),
    ] },
  { id: 'claw', name: 'Claw Machine', where: ['arcade'], w: 8, repeat: true,
    text: () => 'A claw machine stuffed with plush elevators, plush cats and one plush… you? Three tries for $5.',
    choices: [
      { label: 'Play ($5)', cost: 5, go: g => {
        g.stat('clawPlays'); const r = g.rand();
        if (r < 0.12) { const l = g.lost(['arcade', 'retail']); if (l) return `The claw grips! It drops ${l.name} into the chute. You can\'t believe it.`; }
        if (r < 0.4) { const n = g.int(3, 10); g.give('tickets', n); return `You win a small plush and ${n} tickets.`; }
        return 'The claw grips, lifts, and lets go at the last second, as is tradition.';
      } },
      leave('Walk away (wise)'),
    ] },
  { id: 'prizes', name: 'Prize Counter', where: ['arcade'], w: 6, repeat: true,
    text: g => `A prize counter with a bored-looking plush bear behind it. You have ${g.count('tickets')} tickets.`,
    choices: [
      { label: 'Candy Bar (5 tickets)', tickets: 5, go: g => { g.give('candy'); return 'The bear slides it over.'; } },
      { label: 'Lucky Coin (20 tickets)', tickets: 20, go: g => { g.give('lucky_coin'); return 'A shiny coin with a lift on one side.'; } },
      { label: 'Brass Token (40 tickets)', tickets: 40, go: g => { g.token(1); return 'The bear hands over a token with unusual ceremony.'; } },
      { label: 'Mystery Plush (60 tickets)', tickets: 60, go: g => { const l = g.lost(); if (l) return `It\'s ${l.name}, oddly. The bear shrugs.`; g.token(2); return 'Inside the plush: two tokens. (+2 tokens)'; } },
      leave('Save your tickets'),
    ] },
  { id: 'cabinet', name: 'Arcade Cabinet', where: ['arcade'], w: 7, repeat: true,
    text: () => 'An upright cabinet called "GOING UP!" — catch the falling floors. Its attract mode is hypnotic.',
    choices: [
      { label: 'Play a credit ($1)', cost: 1, t: 5, go: g => { const score = g.int(0, 13); const n = Math.max(1, Math.floor(score / 2)); g.give('tickets', n); if (score === 13) { g.ach('high_score'); g.give('tickets', 20); return 'PERFECT GAME — 13 FLOORS! The machine spits tickets for a full minute. (+20 bonus tickets)'; } return `You catch ${score} floors. ${n} tickets.`; } },
      leave(),
    ] },
  { id: 'jukebox', name: 'Jukebox', where: ['food', 'arcade', 'hotel', 'residential'], w: 4, perRun: 1,
    text: () => 'A jukebox glows like a cathedral. Every song title is a floor number.',
    choices: [
      { label: 'Play "13" ($1)', cost: 1, go: g => { if (g.has('radio') && g.clue('c_radio')) return 'The jukebox plays static, and your radio answers, picking up a broadcast. (New journal entry.)'; g.comp(12); return 'A slow song about lifts and leaving. (+12 composure)'; } },
      { label: 'Play something cheerful ($1)', cost: 1, go: g => { g.comp(15); return 'You dance a little. Nobody\'s watching. Probably. (+15 composure)'; } },
    ] },
  { id: 'copier', name: 'Jammed Photocopier', where: ['office'], w: 7, perRun: 1,
    text: () => 'A photocopier is flashing PAPER JAM IN TRAY 13. There are only four trays.',
    choices: [
      { label: 'Fix the jam', t: 8, go: g => { if (g.chance(0.6)) { if (g.anyClue(['office', 'culture'])) return 'You free a crumpled page and the copier prints a clean copy of it, unprompted. (New journal entry.)'; g.cash(g.int(5, 15)); return 'You free the jam. Coins were stuck in the rollers.'; } g.comp(-6); return 'Toner everywhere. Everywhere. (−6 composure)'; } },
      { label: 'Kick it', go: g => { if (g.chance(0.3)) { g.give('coffee'); return 'It prints a voucher. You redeem it at a nearby coffee machine.'; } return 'It prints a single page that says OW.'; } },
      leave(),
    ] },
  { id: 'cooler', name: 'Water Cooler Voices', where: ['office'], w: 5, perRun: 1,
    text: () => 'By the water cooler, two voices are chatting. The cooler is the only thing there.',
    choices: [
      { label: 'Listen in', t: 5, go: g => { if (g.anyClue(['office'])) return 'They\'re talking about the building, and you catch something important. (New journal entry.)'; g.comp(-3); return 'They\'re talking about you. Nicely, but still. (−3 composure)'; } },
      { label: 'Join the conversation', go: g => { g.comp(10); return 'The voices welcome you. You talk about the weekend. Nobody mentions which weekend. (+10 composure)'; } },
    ] },
  { id: 'terminal', name: 'Green-Screen Terminal', where: ['experimental', 'office', 'maintenance'], w: 5, perRun: 1,
    text: () => 'A terminal blinks: LOGIN: _ . A sticky note on the monitor says "password is the floor the building keeps".',
    choices: [
      { label: 'Type 13', go: g => { g.stat('puzzleSolved'); g.stat('termSolved'); const c = g.anyClue(['experimental', 'maintenance', 'secret']); g.reveal(); return 'ACCESS GRANTED. The building\'s floor plan scrolls past.' + (c ? ' A file opens on its own. (New journal entry.)' : '') + ' (Map revealed.)'; } },
      { label: 'Type 12', go: g => { g.comp(-4); return 'ACCESS DENIED. THE BUILDING HAS TWELVE FLOORS. (it types, unconvincingly) (−4 composure)'; } },
      leave('Log off'),
    ] },
  { id: 'fridge', name: 'Specimen Fridge', where: ['experimental', 'medical'], w: 4, perRun: 1,
    text: () => 'A fridge with a glass door, full of labelled jars: "1 MINUTE (SPARE)", "HICCUP", "A GOOD IDEA (EXPIRED)".',
    choices: [
      { label: 'Take "1 MINUTE (SPARE)"', go: g => { g.time(-20); return 'You open it. Time hiccups. Your watch is 20 minutes earlier.'; } },
      { label: 'Take "A GOOD IDEA"', go: g => { if (g.anyClue(['any'])) return 'Slightly past its date, but it still works. You suddenly understand something. (New journal entry.)'; g.comp(5); return 'It\'s just a nice thought. (+5 composure)'; } },
      leave('Close the fridge'),
    ] },
  { id: 'mailboxes', name: 'Wall of Mailboxes', where: ['residential', 'hotel', 'office'], w: 5, perRun: 1,
    text: () => 'A wall of small brass mailboxes. Box 13 has something in it; you can see the corner of an envelope.',
    choices: [
      { label: 'Pick the lock', needItem: 'lockpicks', t: 5, go: g => { g.stat('locksPicked'); if (g.chance(0.4) && !g.has('sealed_letter')) { g.give('sealed_letter'); return 'Inside: a sealed letter addressed to "The Occupant, Floor 13". (Got Sealed Letter)'; } if (g.anyClue(['residential', 'hotel'])) return 'Inside: a letter, already opened. You read it. (New journal entry.)'; g.cash(g.int(10, 30)); return 'Inside: a birthday card with cash in it. Many happy returns.'; } },
      { label: 'Fish with your fingers', t: 3, go: g => { if (g.chance(0.3)) { g.cash(g.int(3, 9)); return 'You fish out a few coins from a jammed box.'; } g.comp(-3); return 'Your fingers get stuck for an embarrassing minute. (−3 composure)'; } },
    ] },
  { id: 'freezer', name: 'Walk-In Freezer', where: ['food'], w: 4, perRun: 1,
    text: () => 'The walk-in freezer door is open. Inside, on a shelf at the back, something glints.',
    choices: [
      { label: 'Go in and grab it', t: 5, go: g => {
        if (g.chance(0.5)) return { text: 'The door swings shut behind you. Click. It\'s cold. The handle on this side is broken.', choices: [
          { label: 'Pry the door with the crowbar', needItem: 'crowbar', go: g2 => { g2.cash(g2.int(20, 40)); return 'The door pops open. You also kept hold of the glinting thing: a tin of cash.'; } },
          { label: 'Bang on the door and wait', t: 30, go: g2 => { g2.comp(-15); g2.cash(g2.int(20, 40)); return 'After half an hour the chef lets you out, tutting. You kept the tin of cash. (−15 composure)'; } },
        ] };
        g.cash(g.int(20, 40)); return 'A tin of tips, frozen solid. You take it and get out quickly.';
      } },
      leave('Not worth it'),
    ] },
  { id: 'crate', name: 'Nailed Crate', where: ['storage', 'maintenance'], w: 6, perRun: 1,
    text: () => 'A wooden crate stencilled FRAGILE — DO NOT OPEN UNTIL 13TH FLOOR. It is nailed shut.',
    choices: [
      { label: 'Crowbar it open', needItem: 'crowbar', t: 5, go: g => { const r = g.rand(); if (r < 0.35) { g.token(1); g.cash(g.int(20, 50)); return 'Straw, and nestled in it: a brass token and an envelope of cash.'; } if (r < 0.7) { const l = g.lost(); if (l) return `Straw, and inside: ${l.name}.`; } g.give(g.pick(['flare', 'coffee', 'skeleton_key'])); return 'Straw, and a useful-looking item someone packed with love.'; } },
      { label: 'Shake it', go: g => { g.comp(-2); return 'Something inside rattles, then says "ow". (−2 composure)'; } },
    ] },
  { id: 'auction', name: 'Storage Unit Auction', where: ['storage'], w: 6, perRun: 1,
    text: () => 'An auctioneer\'s podium in front of three closed units. A recorded voice: "Unit sale! Contents unseen! No refunds!"',
    choices: [
      { label: 'Bid $20 on the small unit', cost: 20, go: g => { const r = g.rand(); if (r < 0.5) { const n = g.int(20, 45); g.cash(n); return `Boxes of old records. You sell them to a voice in the dark for ${money(n)}.`; } g.give('candy'); return 'It\'s full of candy bars from 1979. You take one. It\'s still good, somehow.'; } },
      { label: 'Bid $60 on the big unit', cost: 60, go: g => { const r = g.rand(); if (r < 0.25) { g.token(2); g.cash(60); return 'A vintage lift-operator\'s trunk: brass tokens and a fat envelope. (+2 tokens, +$60)'; } if (r < 0.6) { const n = g.int(60, 110); g.cash(n); return `Antique furniture. You flog it to a dealer who appears from nowhere: ${money(n)}.`; } return 'It is entirely full of folding chairs.'; } },
      leave('Keep your money'),
    ] },
  { id: 'wishingwell', name: 'Wishing Fountain', where: ['retail', 'leisure', 'hotel'], w: 4, perRun: 1,
    text: g => `A fountain glittering with coins. A small plaque: "THE BUILDING REMEMBERS EVERY WISH." So far you have thrown in ${money(g.flag('wellTotal') || 0)}.`,
    choices: [
      { label: 'Throw in $5', cost: 5, go: g => wish(g, 5) },
      { label: 'Throw in $20', cost: 20, go: g => wish(g, 20) },
      { label: 'Fish out a coin', go: g => { g.comp(-8); return 'You feel the whole building disapprove. You put it back. (−8 composure)'; } },
    ] },
  { id: 'treadmill', name: 'The Running Treadmill', where: ['leisure'], w: 5, perRun: 1,
    text: () => 'A treadmill is running at a steady pace with nobody on it. The display says DISTANCE: 13.0 km.',
    choices: [
      { label: 'Hop on for a while', t: 15, go: g => { g.comp(20); return 'You run. It feels good to be going somewhere in a straight line. (+20 composure)'; } },
      { label: 'Turn it off', go: g => { if (g.chance(0.4)) { g.cash(g.int(5, 15)); return 'Coins fly off the belt as it stops.'; } return 'It turns back on as you walk away.'; } },
    ] },
  { id: 'car', name: 'The Old Sedan', where: ['leisure'], w: 5, perRun: 1,
    text: () => 'An old sedan with the keys in the ignition. The radio is on, very quietly.',
    choices: [
      { label: 'Sit and listen to the radio', t: 10, go: g => { if (g.clue('c_radio')) return 'Between stations, a late-night DJ talks about Floor 13 like it\'s a place you can visit. (New journal entry.)'; g.comp(15); return 'A late-night DJ plays three songs in a row you love. (+15 composure)'; } },
      { label: 'Check the glovebox', go: g => { g.cash(g.int(5, 20)); if (g.chance(0.3)) g.give('flare'); return 'Change, receipts, and maybe a road flare.'; } },
      { label: 'Honk the horn', go: g => { g.comp(-3); return 'HONK. Every car on the level honks back. (−3 composure)'; } },
    ] },
  { id: 'projector', name: 'The Projector', where: ['culture'], w: 4, perRun: 1,
    text: () => 'A film is running in an empty screening room. It\'s a documentary about the building, narrated by a calm woman.',
    choices: [
      { label: 'Watch to the end (25 min)', t: 25, go: g => { const c = g.anyClue(['culture', 'museum', 'secret']); g.comp(10); return 'You learn more than you expected.' + (c ? ' (New journal entry.)' : '') + ' (+10 composure)'; } },
      { label: 'Watch the trailer', t: 5, go: g => { g.comp(5); return '"COMING SOON: THE ROOF." (+5 composure)'; } },
    ] },
  { id: 'chalkboard', name: 'Unsolved Chalkboard', where: ['culture', 'experimental'], w: 5, perRun: 1,
    text: g => { const n = g.int(3, 9); g.local.seq = { n, ans: n * 13 }; return `A chalkboard with a sequence: 13, 26, 39, … and a question: "What is the ${['', '', '', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][n]} floor of the hidden staircase?"`; },
    choices: [
      { label: 'Write an answer', go: g => { const { ans } = g.local.seq; const opts = g.shuffle([ans, ans + 13, ans - 1]); return { text: 'Chalk in hand, you write…', choices: opts.map(o => ({ label: String(o), go: g2 => { if (o === ans) { g2.stat('puzzleSolved'); g2.stat('mathSolved'); g2.cash(20); g2.give('candy'); return 'A gold star appears next to it in a teacher\'s hand. A drawer pops open: $20 and a candy bar.'; } g2.comp(-4); return 'A red X appears. (−4 composure)'; } })) }; } },
      leave(),
    ] },
  { id: 'jigsaw', name: 'Half-Done Jigsaw', where: ['medical', 'residential', 'culture'], w: 4, perRun: 1,
    text: () => 'A 1,000-piece jigsaw of the Varga Building, almost finished. One piece left on the table.',
    choices: [
      { label: 'Finish it (10 min)', t: 10, go: g => { g.comp(15); g.stat('jigsaws'); return 'The last piece is the top of the building. It shows a garden, which isn\'t on the box. (+15 composure)'; } },
      leave(),
    ] },
  { id: 'piano_room', name: 'Practice Piano', where: ['residential', 'culture', 'hotel'], w: 4, perRun: 1,
    text: () => 'An upright piano with a sheet of music on its stand: four notes, rising.',
    choices: [
      { label: 'Play the four notes', go: g => { g.sfx('chime'); if (g.chance(0.5) && g.clue('c_chime')) return 'The notes sound exactly like the lift arriving. Inside the piano stool: the sheet music, annotated. (New journal entry.)'; g.comp(8); return 'Ding-ding-ding-ding. Somewhere a lift arrives in answer. (+8 composure)'; } },
      leave(),
    ] },

  // ─────────────────────── FLOOR EVENTS ───────────────────────
  { id: 'outage', name: 'Power Outage', where: ['any'], w: 4, trigger: 'arrive', perRun: 1, minNight: 1,
    cond: g => !g.F.dark,
    text: () => 'As you step out, the lights die with a fading hum. Darkness. The lift doors stay open behind you, a rectangle of light. Somewhere, a fuse box clicks.',
    choices: [
      { label: 'Switch on your flashlight', needItem: 'flashlight', go: g => { g.F.dark = true; g.F.lit = true; return 'Your beam cuts the dark. Things glint in corners that never glint in the light. (Dark floor, but you can see.)'; } },
      { label: 'Light a flare', needItem: 'flare', go: g => { g.take('flare'); g.F.dark = true; g.F.lit = true; return 'Red light, hissing. Shadows jump. You can see fine.'; } },
      { label: 'Feel your way in the dark', go: g => { g.F.dark = true; g.F.lit = false; g.setRflag('darkNoLight', g.F.key); g.comp(-5); return 'You put a hand on the wall and go on. Searching will be slow and uncertain, but some things only show up in the dark. (−5 composure)'; } },
      { label: 'Wait for the lights (20 min)', t: 20, go: g => { g.comp(-3); return 'Twenty long minutes, then the tubes stutter back on, one by one. (−3 composure)'; } },
    ] },
  { id: 'echo', name: 'Footsteps', where: ['any'], w: 3, perRun: 1,
    text: () => 'Footsteps behind you, matching yours exactly. When you stop, they stop a step later.',
    choices: [
      { label: 'Turn around', go: g => { if (g.chance(0.5)) { g.meet('cat'); g.comp(5); return 'It\'s the grey cat. It looks offended you were worried. (+5 composure)'; } g.comp(-6); return 'Nobody. The footsteps walk away from you, briskly, into a wall. (−6 composure)'; } },
      { label: 'Walk faster', go: g => { g.comp(-3); g.time(-3); return 'They walk faster too. You arrive somewhere a little sooner. (−3 composure)'; } },
      { label: 'Say "good evening"', go: g => { g.comp(8); return '"Good evening," says the corridor, politely, and the footsteps stop. (+8 composure)'; } },
    ] },
  { id: 'lostfound', name: 'Lost & Found Desk', where: ['hotel', 'retail', 'leisure', 'office'], w: 4, perRun: 1,
    text: g => `A desk with a bell and a sign: LOST & FOUND — RETURNS REWARDED. A clerk appears the moment you look at it. "Got anything for us? You\'ve recovered ${g.lostCount()} lost items so far, I see."`,
    choices: [
      { label: 'Ask for a finder\'s fee', go: g => { const n = g.lostCount(); if (n === 0) return '"Nothing yet? Keep your eyes open."'; const pay = 5 + n * 3; if (g.rflag('lfPaid')) return '"Once a night, I\'m afraid."'; g.setRflag('lfPaid', 1); g.cash(pay); return `"For your excellent recovery record:" ${money(pay)}. (She doesn\'t take the items — they\'re yours to keep.)`; } },
      { label: 'Ask what\'s been handed in', go: g => { if (g.chance(0.35)) { const l = g.lost(); if (l) return `"This came in with your name on it." ${l.name}.`; } return '"Three hundred umbrellas and a sense of déjà vu."'; } },
    ] },
  { id: 'roomservice', name: 'Room Service Cart', where: ['hotel', 'food'], w: 6, perRun: 1,
    text: () => 'A room service cart sits in the corridor, under a silver cloche. A card: "COMPLIMENTARY — FOR THE GUEST WHO IS LOST."',
    choices: [
      { label: 'Lift the cloche', go: g => { if (g.chance(0.7)) { g.comp(25); return 'A full English breakfast, at 2 AM, still hot. (+25 composure)'; } g.give('tea'); return 'A pot of chamomile tea and a note: "for later". (Got Chamomile Tea)'; } },
      leave('Respect the card'),
    ] },
  { id: 'mannequin', name: 'The Mannequin', where: ['retail'], w: 5, perRun: 1,
    text: () => 'A mannequin in a nice coat stands in the aisle. It wasn\'t in the aisle a minute ago. Its hand is held out, palm up.',
    choices: [
      { label: 'Shake its hand', go: g => { g.comp(5); g.cash(g.int(5, 15)); return 'It\'s a firm handshake. When you let go, there\'s money in your palm. (+5 composure)'; } },
      { label: 'Give it a candy bar', needItem: 'candy', go: g => { g.take('candy'); const l = g.lost(['retail']); if (l) return `It closes its hand. When it opens again, there\'s ${l.name} in it.`; g.token(1); return 'It closes its hand. When it opens: a brass token. (+1 token)'; } },
      { label: 'Walk around it', go: g => { g.comp(-3); return 'When you look back, it\'s facing you again. (−3 composure)'; } },
    ] },
  { id: 'dryer', name: 'Spinning Dryer', where: ['residential'], w: 6, perRun: 1,
    text: () => 'Dryer 13 is spinning. Something heavy clunks around inside with every turn.',
    choices: [
      { label: 'Wait for it to finish (15 min)', t: 15, go: g => { const l = g.lost(['residential']); if (l) return `It stops. Among warm towels: ${l.name}.`; g.cash(g.int(10, 25)); return 'It stops. Warm towels and a handful of coins.'; } },
      { label: 'Open it mid-cycle', go: g => { g.comp(-5); g.cash(g.int(2, 8)); return 'Hot towels everywhere. A few coins clatter out. (−5 composure)'; } },
    ] },
  { id: 'pool_bottom', name: 'Something at the Bottom', where: ['pool', 'ocean'], w: 10, perRun: 1,
    text: () => 'Something glints at the bottom of the water, round and bright.',
    choices: [
      { label: 'Dive for it', t: 10, go: g => { g.comp(-10); if (g.chance(0.5)) { const l = g.lost(['leisure', 'ocean']); if (l) return `Cold! But you surface with ${l.name}. (−10 composure)`; } g.token(1); return 'Cold! But you surface with a brass token. (−10 composure, +1 token)'; } },
      { label: 'Fish for it with a pole', t: 15, go: g => { if (g.chance(0.4)) { g.token(1); return 'After a patient while, you hook it: a brass token. (+1 token)'; } return 'It always seems a little further away than the pole.'; } },
      leave(),
    ] },
  { id: 'cookie', name: 'Fortune Cookie', where: ['food'], w: 6, perRun: 1,
    text: () => 'A single fortune cookie on a tray, still warm.',
    choices: [
      { label: 'Crack it open', go: g => { const lines = ['"The door upstairs wants the year on the stone."', '"You will soon go up in the world. Literally."', '"Your lucky floor is not on the panel."', '"A grey friend will choose you."', '"Five pieces make a roof."']; g.comp(5); if (g.chance(0.25)) g.give('lucky_coin'); return lines[g.int(0, lines.length - 1)] + ' (+5 composure)'; } },
    ] },
  { id: 'fuse_event', name: 'Tripped Breaker', where: ['maintenance', 'storage', 'office', 'experimental'], w: 4, perRun: 1,
    text: () => 'A breaker panel buzzes angrily. Half the switches are tripped, and the lift indicator by the door is flickering.',
    choices: [
      { label: 'Reset the breakers', puzzle: 'fuses', go: g => { g.cash(g.int(15, 30)); g.time(-10); return 'The panel hums happily. A grateful building gives you back ten minutes, and a facilities envelope with a tip in it.'; } },
      leave(),
    ] },
  { id: 'valves', name: 'Pressure Valves', where: ['maintenance', 'experimental', 'leisure'], w: 4, perRun: 1,
    text: () => 'A bank of valve wheels and one big gauge with a red line. A sign: "SET TO EXACT PRESSURE OR THE TEA URN WON\'T WORK."',
    choices: [
      { label: 'Balance the pressure', puzzle: 'valves', go: g => { g.comp(15); g.give('tea'); return 'The gauge settles on the line. Somewhere, a tea urn starts to sing. Someone leaves a cup out for you. (+15 composure, got Chamomile Tea)'; } },
      leave(),
    ] },
  { id: 'cipher_wall', name: 'Coded Graffiti', where: ['any'], w: 3, perRun: 1,
    text: () => 'Neat letters painted on a wall, in a code. Beneath: "SHIFT EVERY LETTER BACK".',
    choices: [
      { label: 'Decode it', puzzle: 'cipher', go: g => { if (g.anyClue(['any'])) return 'Decoded, it\'s a message somebody wanted found. (New journal entry.)'; g.cash(15); return 'Decoded, it says "LOOK UNDER THE BENCH". There\'s $15 under the bench.'; } },
      leave(),
    ] },

  // ─────────────────────── RARE & PERMANENT ───────────────────────
  { id: 'inspector', name: 'The Lift Inspector', npc: 'inspector', where: ['any'], w: 1.2, rare: true, once: true, minNight: 2,
    text: () => 'A man with a clipboard and a hard hat is waiting by the lift doors. "Castellan Lift Company, annual inspection. Well — decennial. Mind if I ride with you?"',
    choices: [
      { label: 'Let him inspect the lift (30 min)', t: 30, go: g => { g.meet('inspector'); g.setFlag('inspected', 1); g.token(3); return 'He tuts, tightens things, oils things, and signs a certificate. "Good as new. Better." He leaves three brass tokens "for the honesty box". (+3 tokens; the lift is permanently faster: rides take 2 fewer minutes.)'; } },
      { label: 'Decline', go: g => { g.meet('inspector'); return '"Suit yourself. Next inspection: ten years." He vanishes into a stairwell.'; } },
    ] },
  { id: 'double', name: 'Your Double', npc: 'double', where: ['any', 'anomaly'], w: 0.9, rare: true, once: true, minNight: 3,
    text: () => 'Someone is coming down the corridor towards you. Same clothes. Same face. Same tired walk. They stop, look at you, and say, "Oh. It\'s Tuesday, is it?"',
    choices: [
      { label: 'Talk to yourself', t: 10, go: g => { g.meet('double'); g.clue('c_other_you'); g.ach('other_you'); return 'You talk. You agree about everything. Before leaving, they give you a note in your own handwriting. (New journal entry.)'; } },
      { label: 'Swap something', go: g => { g.meet('double'); g.ach('other_you'); g.setFlag('swapped', 1); g.token(2); g.give('lucky_coin'); g.give('stopwatch'); return 'You swap jackets. In the pockets of theirs: two brass tokens, a lucky coin and a brass stopwatch. You never see your jacket again. (Permanent: you\'re wearing someone else\'s jacket now.)'; } },
      { label: 'Walk past without a word', go: g => { g.meet('double'); g.ach('other_you'); g.comp(-10); return 'You both pretend not to have seen each other. Very British. (−10 composure)'; } },
    ] },
  { id: 'floorseller', name: 'The Man Who Sells Floors', npc: 'floorseller', where: ['any'], w: 0.8, rare: true, once: true, minNight: 2,
    text: () => 'A man in a camel coat stands beside an open briefcase full of deeds, each one tied with ribbon. "Looking to buy a floor? I have some lovely floors. Barely walked on."',
    choices: [
      { label: 'Buy a floor ($150 + 1 token)', cost: 150, tokens: 1, go: g => { g.meet('floorseller'); g.clue('c_floor_seller'); g.setFlag('deed', 1); g.ach('deed_holder'); return 'He hands you a deed. From tonight, the RANDOM button is fond of you: rare and strange floors turn up more often. (Permanent.)'; } },
      { label: 'Ask how one sells a floor', go: g => { g.meet('floorseller'); g.comp(5); return '"Carefully. And never the thirteenth. That one\'s spoken for." He snaps the briefcase shut and is gone. (+5 composure)'; } },
    ] },
  { id: 'clock', name: 'The Backwards Clock', where: ['any'], w: 1, rare: true, once: true,
    text: () => 'A grandfather clock stands alone in the room, its pendulum swinging. Its hands are going backwards. There is a winding key in the door.',
    choices: [
      { label: 'Wind it backwards', go: g => { g.setFlag('clockWound', 1); g.time(-60); return 'The clock whirs. An hour un-happens. And it keeps on helping: every night from now on starts with a little extra time. (−60 min tonight; permanent +20 min per night.)'; } },
      { label: 'Stop the pendulum', go: g => { g.setFlag('clockStopped', 1); g.comp(30); return 'The ticking stops and the whole building seems to relax. Your composure will start every night a little higher. (+30 now; permanent +10 max composure.)'; } },
      leave('Leave it ticking'),
    ] },
  { id: 'birthday', name: 'A Birthday Party', where: ['any'], w: 1.2, rare: true, perRun: 1,
    text: () => 'Balloons. A cake with candles lit. A banner: HAPPY BIRTHDAY. Party hats on every chair. Nobody is here, but there\'s a slice cut and on a plate, with a fork.',
    choices: [
      { label: 'Eat the cake', go: g => { g.comp(30); g.stat('cakes'); return 'It\'s lemon. It\'s perfect. Somebody, somewhere, sings, very quietly. (+30 composure)'; } },
      { label: 'Blow out the candles', go: g => { g.give('lucky_coin'); g.comp(10); return 'You make a wish. A coin rolls out from under the cake plate. (+10 composure, got Lucky Coin)'; } },
      { label: 'Take a balloon', go: g => { const l = g.lostById('party_hat'); return l ? 'The balloon\'s string is tied to a party hat. You take both. (Lost property found.)' : 'The balloon floats away, upward, through the ceiling.'; } },
    ] },
  { id: 'door_wasnt', name: 'A Door That Wasn\'t There', where: ['any'], w: 1.5, rare: true, perRun: 1,
    text: () => 'There is a door in this wall. There wasn\'t a door in this wall. It\'s painted the same colour as the wall, and it\'s slightly ajar.',
    choices: [
      { label: 'Go through', t: 10, go: g => { const r = g.rand(); if (r < 0.4) { const l = g.lost(); if (l) return `A tiny room, a single shelf, and on it: ${l.name}. When you step back out, the door is gone.`; } if (r < 0.7) { g.token(2); return 'A broom cupboard, with two brass tokens on a nail. (+2 tokens) The door is gone behind you.'; } if (g.anyClue(['any'])) return 'A small office with a single file on the desk. You read it. (New journal entry.) The door is gone behind you.'; g.cash(50); return 'A cloakroom. In one coat: $50.'; } },
      leave('Leave it alone', 'You blink, and it\'s just a wall.'),
    ] },
  { id: 'umbrella', name: 'The Umbrella Stand', where: ['any'], w: 2, perRun: 1,
    text: () => 'An umbrella stand holding a single umbrella, dripping wet, though it hasn\'t rained in the building for — well. A label: "RETURN TO FLOOR 13".',
    choices: [
      { label: 'Open it', go: g => { g.comp(-5); g.cash(g.int(10, 25)); return 'Bad luck, they say. Coins fall out of its folds. (−5 composure)'; } },
      { label: 'Read the label closely', go: g => { if (g.clue('c_lost_umbrellas')) return 'On the back, an inventory of lost things. (New journal entry.)'; return 'It just says RETURN TO FLOOR 13.'; } },
    ] },
  { id: 'radio_station', name: 'Hidden Broadcast', where: ['any', 'anomaly'], w: 2, perRun: 1, cond: g => g.has('radio'),
    text: () => 'Your radio crackles in your pocket and finds a station by itself. A late-night voice: "…and to whoever is listening on the night lift…"',
    choices: [
      { label: 'Listen closely', t: 10, go: g => { if (g.clue('c_radio')) return 'The DJ talks about Floor 13 as if it were a place you could visit. (New journal entry.)'; const c = g.anyClue(['any']); if (c) return 'The DJ reads out a letter that clearly isn\'t meant for the general public. (New journal entry.)'; g.comp(15); return 'They play your favourite song. Of course they do. (+15 composure)'; } },
      leave('Switch it off'),
    ] },
  { id: 'gas_leak', name: 'Strange Smell', where: ['experimental', 'maintenance'], w: 3, perRun: 1,
    text: () => 'A sweet smell drifts from a vent. Your thoughts slow down pleasantly. Too pleasantly.',
    choices: [
      { label: 'Put on the gas mask', needItem: 'gas_mask', go: g => { g.cash(g.int(10, 30)); return 'Safe behind the mask, you follow the vent to a forgotten locker with a pay packet in it.'; } },
      { label: 'Hold your breath and hurry', go: g => { g.comp(-10); g.time(-5); return 'You stagger out the other side, light-headed. (−10 composure)'; } },
      { label: 'Breathe it in', go: g => { g.comp(-20); g.time(30); return 'You wake on the floor thirty minutes later, smiling about nothing. (−20 composure)'; } },
    ] },
  { id: 'kite', name: 'The Paper Lift', where: ['any'], w: 2.5, perRun: 1,
    text: () => 'A paper aeroplane drifts down from the ceiling and lands at your feet. It\'s been folded from a memo.',
    choices: [
      { label: 'Unfold it', go: g => { if (g.anyClue(['office', 'any'])) return 'It\'s a memo, with a coffee ring and something important on it. (New journal entry.)'; g.comp(5); return 'It says "WHEEEE". (+5 composure)'; } },
      { label: 'Throw it back up', go: g => { g.comp(8); return 'It sails up and doesn\'t come down. (+8 composure)'; } },
    ] },
  { id: 'janitor_cart', name: 'Abandoned Mop Bucket', where: ['any'], w: 3, perRun: 1, cond: g => g.flag('janitorAsked') && !g.flag('janitorDone') && !g.has('janitor_keys'),
    text: () => 'A mop bucket on wheels, abandoned mid-corridor. Hanging from the handle: a huge ring of keys and a bottle opener.',
    choices: [{ label: 'Take the keys', go: g => { g.give('janitor_keys'); return 'Forty keys and a bottle opener. Dot will be pleased. (Got Janitor\'s Keyring)'; } }] },
  { id: 'book_found', name: 'Book on a Radiator', where: ['any'], w: 3, perRun: 1, cond: g => g.flag('bookQuest') && !g.has('overdue_book') && !g.flag('bookDone'),
    text: () => 'A library book sits on a radiator, gently warming. "A History of Vertical Transport". Due back: 1958.',
    choices: [{ label: 'Take it', go: g => { g.give('overdue_book'); g.setFlag('bookDone', 1); return 'You tuck it under your arm. (Got Overdue Library Book)'; } }] },

  // ─────────────────────── ANOMALY-SPECIFIC ───────────────────────
  { id: 'zero_note', name: 'The Folded Note', where: ['zero'], w: 50, perRun: 1,
    text: () => 'On the chair, a folded note. On the outside it says: "For the one who keeps going."',
    choices: [{ label: 'Read it', go: g => { g.comp(40); g.token(1); return '"You\'re doing fine. Really. — The Building." (+40 composure, +1 token)'; } }] },
  { id: 'party_guest', name: 'The Winking Guest', where: ['party'], w: 50, perRun: 1,
    text: () => 'One guest isn\'t frozen. She lowers her glass and whispers, "Don\'t tell the others. They\'re having such a nice time."',
    choices: [
      { label: 'Ask whose party it is', go: g => { g.comp(15); g.anyClue(['any']); return '"The building\'s. Ninety-five today, give or take. You\'re the only guest who RSVP\'d." (+15 composure)'; } },
      { label: 'Ask for a dance', t: 10, go: g => { g.comp(30); return 'You dance in a room of statues. It\'s wonderful. (+30 composure)'; } },
    ] },
  { id: 'home_mail', name: 'Your Post', where: ['home'], w: 50, perRun: 1,
    text: () => 'A letter on your own doormat, addressed to you, in your handwriting.',
    choices: [{ label: 'Open it', go: g => { g.comp(50); g.token(3); return '"You\'ll get home. Keep the key. It opens more than one door." Three tokens fall out. (+50 composure, +3 tokens)'; } }] },
  { id: 'blueprint_pencil', name: 'The Pencil', where: ['blueprint'], w: 50, perRun: 1,
    text: () => 'A pencil hovers in the air over the drawing, sketching. It pauses, as if to ask if you\'d like a turn.',
    choices: [
      { label: 'Draw a door', go: g => { g.token(3); g.reveal(); return 'You draw a door. It opens. Behind it: everything on this floor, labelled, and three tokens. (+3 tokens, map revealed)'; } },
      { label: 'Draw a roof garden', go: g => { g.comp(50); g.setFlag('drewGarden', 1); return 'You draw benches, a telescope, flowers. The pencil seems pleased. Somewhere far above, something changes. (+50 composure)'; } },
    ] },
  { id: 'forest_deer', name: 'The Deer', where: ['forest'], w: 30, perRun: 1,
    text: () => 'A deer with a lanyard round its neck — STAFF — looks at you, then walks towards an oak tree and waits.',
    choices: [{ label: 'Follow it', t: 10, go: g => { const l = g.lost(['forest']); if (l) return `At the oak, in a knot-hole: ${l.name}.`; g.token(2); return 'At the oak, in a knot-hole: two brass tokens. (+2 tokens)'; } }, leave('Let it go')] },
  { id: 'sky_star', name: 'The Telescope', where: ['sky'], w: 30, perRun: 1,
    text: () => 'The brass telescope is pointed at one star. A label: LOOK.',
    choices: [{ label: 'Look', t: 5, go: g => { g.comp(25); if (g.anyClue(['any'])) return 'Through it you see a roof garden on top of a building just like this one, and someone waving. (New journal entry, +25 composure)'; return 'A roof garden on top of a building just like this one. Someone waves. (+25 composure)'; } }] },
  { id: 'hall_doors', name: 'Door 13,013', where: ['hallway'], w: 40, perRun: 1,
    text: () => 'You walk for a long time. Door 13,013 is open.',
    choices: [{ label: 'Go in', t: 20, go: g => { g.token(2); g.cash(40); return 'An empty room. On the bed, a tip envelope: "Thanks for staying with us." (+2 tokens, +$40)'; } }, leave('Turn back')] },
  { id: 'upside_fall', name: 'Falling Up', where: ['upside'], w: 30, perRun: 1,
    text: () => 'A pile of things that fell upward has collected on the floor-that-is-a-ceiling.',
    choices: [{ label: 'Rummage', t: 5, go: g => { const l = g.lost(['upside', 'sky']); if (l) return `You find ${l.name}.`; g.cash(g.int(20, 50)); return 'Coins, which fell up out of a thousand pockets.'; } }] },
  { id: 'office13', name: 'The Office of the Building', where: ['thirteen'], w: 0, repeat: true,
    text: g => 'The lamp is on. On the desk: a ledger open to a fresh page with your name at the top, a pen, and a small brass bell. The cap on the hook is the Attendant\'s. A note under the bell, in his handwriting: "Whatever you choose is the right floor."' + (g.isHour() ? ' Across the street, in the lit window, a woman at a drawing board looks up, and waves.' : '') + (g.blueprints() >= 5 ? ' Your five blueprint pieces feel warm in your bag.' : ''),
    choices: [
      { label: 'Take the stairs down, and go home', go: g => g.ending('ground') },
      { label: 'Put on the cap', go: g => g.ending('cap') },
      { label: 'Lay the five blueprint pieces on the desk', if: g => g.blueprints() >= 5, go: g => g.ending('roof') },
      { label: 'Wave back to the woman in the window', if: g => g.isHour(), go: g => g.ending('hour') },
      { label: 'Not yet — keep exploring', go: () => ({ text: 'You leave everything where it is. The office will wait. It is very good at waiting.', end: true }) },
    ] },
  { id: 'ocean_buoy', name: 'The Buoy Bell', where: ['ocean'], w: 30, perRun: 1,
    text: () => 'The red buoy bobs. Its bell rings the lift chime with each wave.',
    choices: [{ label: 'Ring it yourself', go: g => { g.comp(20); g.time(-10); return 'Ding. The sea goes very calm. Time seems to slow. (+20 composure, −10 min)'; } }] },
];

// how far along the Attendant's story you are: 0 = never talked, 3 = done
function attStage(g) {
  if (!g.S.clues.c_attendant_1) return 0;
  if (!g.S.clues.c_attendant_2) return 1;
  if (!g.has('lounge_key') && !g.has('thirteenth_button')) return 2;
  return 3;
}

function wish(g, n) {
  const total = g.setFlag('wellTotal', (g.flag('wellTotal') || 0) + n);
  g.comp(5);
  if (total >= 100 && !g.flag('wellGranted')) { g.setFlag('wellGranted', 1); g.ach('wishing_well'); g.token(3); return `Splash. The fountain glows gold. Your wishes total $${total}, and the building grants one: three brass tokens rise to the surface, and from now on you'll find a little more money everywhere. (+3 tokens, permanent +10% cash)`; }
  return `Splash. You make a wish. (Total wished: $${total}) (+5 composure)`;
}

export const ENC_BY_ID = Object.fromEntries(ENCOUNTERS.map(e => [e.id, e]));
