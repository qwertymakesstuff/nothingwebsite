// Items: equipment (kept forever), consumables (stack, used up), key items (story progress)
// and Lost Property (collectibles found hidden around the building).

export const ITEMS = {
  // ---- equipment ----
  flashlight:   { name: 'Flashlight', kind: 'equip', desc: 'A heavy rubber torch. Dark floors stop being a problem, and things glint in corners.', price: 40 },
  crowbar:      { name: 'Crowbar', kind: 'equip', desc: 'For doors that stick and crates that were nailed shut by optimists.', price: 60 },
  multimeter:   { name: 'Multimeter', kind: 'equip', desc: 'Reads voltages. Fuse boxes show you which circuit is which (one free hint per fuse puzzle).', price: 80 },
  lockpicks:    { name: 'Lockpick Set', kind: 'equip', desc: 'Opens simple locks, mailboxes and the Records Archive.', price: 150 },
  radio:        { name: 'Old Transistor Radio', kind: 'equip', desc: 'Picks up stations that shouldn\'t exist. Warns you before strange floors and finds hidden broadcasts.', price: 120 },
  uv_lamp:      { name: 'UV Lamp', kind: 'equip', desc: 'Reveals invisible ink. Someone in this building wrote a lot of it.', price: 200 },
  gas_mask:     { name: 'Gas Mask', kind: 'equip', desc: 'Required on the Chemical Storage floor. Makes your breathing sound important.', price: 250 },
  bolt_cutters: { name: 'Bolt Cutters', kind: 'equip', desc: 'Cuts chains. There is a chained door at the very bottom of the shaft.', price: 300 },
  map:          { name: 'Building Map', kind: 'equip', desc: 'A folded fire-escape map. Shows every room on a floor as soon as you arrive.', price: 100 },
  keycard_blue: { name: 'Blue Keycard', kind: 'equip', desc: 'Level 1 staff access. Opens the Hospital Ward.' },
  keycard_red:  { name: 'Red Keycard', kind: 'equip', desc: 'Level 2 access. Opens the Server Room and the Research Lab.' },
  keycard_black:{ name: 'Black Keycard', kind: 'equip', desc: 'Level 3 access. The card has no name on it, only the number 13.' },
  // ---- key items ----
  override_key: { name: 'Elevator Override Key', kind: 'key', desc: 'A long brass key stamped CASTELLAN LIFT CO. Fits a keyhole on the service panel.' },
  lounge_key:   { name: 'Lounge Key', kind: 'key', desc: 'Given to you by the Attendant. "For when you need a sit down."' },
  brass_key:    { name: 'Old Brass Key', kind: 'key', desc: 'Tag reads: I.V. — STUDIO. A star is scratched into the bow.' },
  thirteenth_button: { name: 'The Thirteenth Button', kind: 'key', desc: 'A brass elevator button with 13 engraved on it. It is warm.' },
  janitor_keys: { name: 'Janitor\'s Keyring', kind: 'quest', desc: 'Forty keys and a bottle opener. Someone is looking for these.' },
  overdue_book: { name: 'Overdue Library Book', kind: 'quest', desc: '"A History of Vertical Transport", due back in 1958.' },
  sealed_letter:{ name: 'Sealed Letter', kind: 'quest', desc: 'Addressed to "The Occupant, Floor 13". No stamp.' },
  // ---- consumables ----
  coffee:   { name: 'Vending Coffee', kind: 'use', desc: 'Restores 25 composure.', heal: 25, price: 10 },
  sandwich: { name: 'Egg Sandwich', kind: 'use', desc: 'Restores 15 composure.', heal: 15, price: 8 },
  candy:    { name: 'Candy Bar', kind: 'use', desc: 'Restores 10 composure.', heal: 10, price: 5 },
  tea:      { name: 'Chamomile Tea', kind: 'use', desc: 'Restores 40 composure.', heal: 40, price: 20 },
  flare:    { name: 'Road Flare', kind: 'use', desc: 'Lights a dark floor until you leave it.', price: 12 },
  tuna:     { name: 'Can of Tuna', kind: 'use', desc: 'Not for you.', price: 5 },
  lucky_coin: { name: 'Lucky Coin', kind: 'use', desc: 'The next thing you search is guaranteed to have something worthwhile in it.' },
  stopwatch:  { name: 'Brass Stopwatch', kind: 'use', desc: 'Click it and the building forgets the last 45 minutes.' },
  skeleton_key: { name: 'Skeleton Key', kind: 'use', desc: 'Opens any one locked door, then crumbles.' },
  tickets:  { name: 'Arcade Tickets', kind: 'use', desc: 'Spend them at a prize counter.', nouse: true },
};

export const EQUIPMENT = Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'equip');
export const SUPPLY = ['flashlight', 'crowbar', 'multimeter', 'map', 'radio', 'lockpicks', 'uv_lamp', 'gas_mask', 'bolt_cutters', 'coffee', 'sandwich', 'tea', 'flare', 'tuna'];

// Varga's blueprint fragments: five pieces scattered across secret and hard-to-reach floors.
export const BLUEPRINTS = {
  bp1: { name: 'Blueprint Fragment I — Foundations', desc: 'Footings, the boiler, and a shaft that goes one level deeper than the building does.' },
  bp2: { name: 'Blueprint Fragment II — The Half Floor', desc: 'A crawlspace between six and seven, labelled "for cables, and for thinking".' },
  bp3: { name: 'Blueprint Fragment III — The Shaft', desc: 'The elevator shaft, drawn with fourteen landings instead of twelve.' },
  bp4: { name: 'Blueprint Fragment IV — Elevation', desc: 'The front of the building. Someone has added a window high up, then rubbed it out, then drawn it again.' },
  bp5: { name: 'Blueprint Fragment V — The Roof', desc: 'A roof garden. Benches. A telescope. Stamped REJECTED — BUDGET, 1930.' },
};

// Lost Property: hidden collectibles. cats = floor categories or floor ids where it can turn up.
// need = equipment required to actually retrieve it.
export const LOST = [
  { id: 'stapler', name: 'Engraved Stapler', cats: ['office'], desc: 'Engraved: PROPERTY OF D. MORROW — DO NOT TAKE. You take it.' },
  { id: 'okay_mug', name: 'World\'s Okayest Boss Mug', cats: ['office'], desc: 'There is still coffee in it. It is still warm.' },
  { id: 'eotm', name: 'Employee of the Month Plaque', cats: ['office', 'museum'], desc: 'March, 1987. The photo has been cut out neatly.' },
  { id: 'band_ball', name: 'Rubber Band Ball', cats: ['office', 'storage'], desc: 'Years of someone\'s boredom, compressed into a sphere.' },
  { id: 'dnd_sign', name: 'Signed Do Not Disturb Sign', cats: ['hotel'], desc: 'Signed by a jazz trumpeter you\'ve never heard of. "Thanks for the quiet."' },
  { id: 'shampoos', name: 'Tiny Shampoo Collection', cats: ['hotel', 'leisure'], desc: 'Fourteen miniature bottles, all from this hotel, all slightly different.' },
  { id: 'bell_whistle', name: 'Bellhop\'s Whistle', cats: ['hotel'], desc: 'Blowing it makes no sound. Somewhere far above, something hears it anyway.' },
  { id: 'postcard', name: 'Unsent Postcard', cats: ['hotel', 'residential'], desc: '"Having a lovely time. Can\'t find the way out. Weather fine." No address.' },
  { id: 'skate', name: 'Single Roller Skate', cats: ['retail', 'arcade'], desc: 'Left foot. The right one is presumably still rolling somewhere.' },
  { id: 'snowglobe', name: 'Snow Globe of the Building', cats: ['retail', 'museum'], desc: 'Shake it and the snow falls upward. Count the windows: thirteen rows.' },
  { id: 'gift_receipt', name: 'Gift Receipt for Nothing', cats: ['retail'], desc: 'ITEM: — QTY: 1 TOTAL: $0.00. "Thank you for shopping with us. Again."' },
  { id: 'mannequin_hand', name: 'Mannequin Hand', cats: ['retail'], desc: 'It is pointing up. You turn it around. It is pointing up again.' },
  { id: 'misc_box', name: 'Box Labelled "Misc"', cats: ['storage'], desc: 'Inside: another, smaller box labelled "Misc".' },
  { id: 'forklift', name: 'Forklift Licence', cats: ['storage', 'maintenance'], desc: 'Issued to "The Building". Photo: a window.' },
  { id: 'bubble_wrap', name: 'Pristine Bubble Wrap', cats: ['storage', 'retail'], desc: 'Not a single bubble popped. You feel the weight of responsibility.' },
  { id: 'mat_key', name: 'Spare Key from Under a Mat', cats: ['residential'], desc: 'Apartment 13B. There is no apartment 13B.' },
  { id: 'drawing', name: 'Child\'s Drawing of an Elevator', cats: ['residential', 'culture'], desc: 'Crayon. A smiling elevator with too many buttons. The top one is coloured gold.' },
  { id: 'magnet', name: 'Fridge Magnet "13"', cats: ['residential', 'food'], desc: 'From a set of numbers. Only the 13 is left.' },
  { id: 'crossword', name: 'Half-Finished Crossword', cats: ['residential', 'medical'], desc: '7 down: "Floor the building keeps for itself" (8). Someone wrote FORGOTEN and ran out of squares.' },
  { id: 'lollipop', name: 'Lollipop from the Nurse\'s Jar', cats: ['medical'], desc: 'Flavour: "Elevator". It tastes like a penny and a good mood.' },
  { id: 'xray', name: 'X-Ray of a Key', cats: ['medical'], desc: 'Patient name: VARGA, I. Diagnosis: "swallowed key (studio)".' },
  { id: 'getwell', name: 'Get-Well Card Signed by Everyone', cats: ['medical', 'office'], desc: 'Dozens of signatures. Every one of them is "The Attendant".' },
  { id: 'iv_card', name: 'High-Score Card "I.V."', cats: ['arcade'], desc: 'Top score on a machine that was never plugged in.' },
  { id: 'token13', name: 'Arcade Token #0013', cats: ['arcade'], desc: 'Numbered by hand. It doesn\'t fit any machine. It fits the elevator panel, almost.' },
  { id: 'plush', name: 'Plush Elevator', cats: ['arcade', 'retail'], desc: 'Won from a claw machine by nobody. Its little doors open and close.' },
  { id: 'reservation', name: 'Reservation Card: Table 13', cats: ['food'], desc: '"Party of one. Arriving: eventually."' },
  { id: 'matchbook', name: 'Matchbook from the Rooftop Bar', cats: ['food', 'hotel'], desc: 'The building has no rooftop bar. The matches are all already struck.' },
  { id: 'ladle', name: 'Gold-Plated Ladle', cats: ['food'], desc: 'Awarded for "Soup, Excellence In". Year illegible.' },
  { id: 'old_wrench', name: 'Wrench Older Than the Building', cats: ['maintenance'], desc: 'Stamped 1929. The building opened in 1931. It was here first.' },
  { id: 'do_not_fuse', name: 'Fuse Labelled "DO NOT"', cats: ['maintenance', 'experimental'], desc: 'You don\'t.' },
  { id: 'logbook13', name: 'Logbook Page 13', cats: ['maintenance', 'culture'], desc: 'Every line on the page says "All quiet." in a different hand.' },
  { id: 'quiet_jar', name: 'Jar of Quiet', cats: ['experimental'], desc: 'Unscrew it a little and the world goes soft for a moment.' },
  { id: 'back_watch', name: 'Pocket Watch, Running Backwards', cats: ['experimental', 'culture'], desc: 'It is perfectly accurate. Just backwards.' },
  { id: 'nametag', name: 'Lab Coat Name Tag', cats: ['experimental'], desc: 'DR. ? — DEPT. OF VERTICAL STUDIES.', need: 'uv_lamp' },
  { id: 'overdue', name: 'Overdue Notice from 1950', cats: ['culture'], desc: 'Fine owed: one floor. Payable to the building.' },
  { id: 'gold_star', name: 'Gold Star Sticker', cats: ['culture'], desc: 'For "Good Listening". You feel briefly proud.' },
  { id: 'ticket_stub', name: 'Museum Ticket Stub', cats: ['culture'], desc: 'Admit one. Exhibit: "Floors We Lost".' },
  { id: 'sweatband', name: 'Single Sweatband', cats: ['leisure'], desc: 'Still damp from a workout nobody had.' },
  { id: 'parking_ticket', name: 'Parking Ticket for Level 13', cats: ['leisure'], desc: 'Validated. By whom?', need: 'flashlight' },
  { id: 'kernel', name: 'Unpopped Kernel', cats: ['culture', 'food'], desc: 'The only one left in the machine. It has potential.' },
  { id: 'seashell', name: 'Dry Seashell', cats: ['ocean', 'leisure'], desc: 'Hold it to your ear: elevator music.' },
  { id: 'feather', name: 'Indoor Feather', cats: ['forest', 'sky', 'leisure'], desc: 'From a bird that has never seen the outside.' },
  { id: 'your_key', name: 'Your Own House Key', cats: ['home'], desc: 'You check your pocket. Yours is still there. So whose is this?' },
  { id: 'ceiling_star', name: 'Star from the Ceiling', cats: ['sky', 'upside'], desc: 'Warm, faintly humming, about the size of a coin.' },
  { id: 'party_hat', name: 'Party Hat', cats: ['party'], desc: 'It says HAPPY ___DAY. The blank is for you.' },
  { id: 'glow_star', name: 'Glow-in-the-Dark Star', cats: ['dark'], desc: 'Only found when the lights go out. Peeled off a ceiling somewhere.' },
  { id: 'blank_page', name: 'A Drawn Pencil', cats: ['blueprint', 'zero'], desc: 'A pencil, drawn in pencil. It writes.' },
  { id: 'doorknob', name: 'Doorknob Without a Door', cats: ['hallway', 'mirrors', 'waiting'], desc: 'Turn it and you hear a door open somewhere else.' },
];
export const LOST_BY_ID = Object.fromEntries(LOST.map(l => [l.id, l]));
