// The campaign's shifts. Each one is data: venue, date, opening hours, how long the timer runs,
// the rules (and when they change), the hand-written guests on the roster and how many generated
// guests fill the queue around them. Roster `expect` says what the right call is at arrival — the
// tests check that the judge agrees.
//
// New rules arrive one at a time over the first five shifts; later shifts combine them.

const DRESS_SMART = ['sneakers', 'sportswear', 'hat', 'tanktop', 'flipflops'];
const DRESS_FORMAL = ['sneakers', 'sportswear', 'hat', 'tanktop', 'flipflops', 'denim', 'tshirt', 'shorts'];

export const SHIFTS = {
  'lantern-1': {
    id: 'lantern-1', title: 'First Night', venue: 'lantern', date: '2031-03-07', clock: ['21:00', '01:00'],
    duration: 300, target: 50, strikes: 4, fillers: 3, flawRate: 0.35, startQueue: 2, patience: 1.3, tutorial: true,
    rules: [{ id: 'age', params: { min: 21 } }], newRules: ['age'],
    briefing: { from: 'dee', text: 'One rule tonight, love: twenty-one or over, and no ID means no entry. Read the date of birth, do the sums, make the call. Don\'t let me lose my licence on your first night.' },
    roster: [
      { p: 'gus', pos: 0.0, expect: 'admit' },
      { p: 'lou', pos: 0.15, expect: 'refuse' },
      { p: 'maya', pos: 0.3, mods: { bday: 0 }, expect: 'admit' },
      { p: 'dex', pos: 0.45, expect: 'admit' },
      { p: 'tobias', pos: 0.6, mods: { bday: 1 }, expect: 'refuse' },
      { p: 'priya', pos: 0.8, expect: 'admit' },
      { p: 'hattie', pos: 0.95, expect: 'admit' },
    ],
  },
  'lantern-2': {
    id: 'lantern-2', title: 'Old Faces', venue: 'lantern', date: '2031-03-08', clock: ['21:00', '01:00'],
    duration: 300, target: 55, strikes: 4, fillers: 5, flawRate: 0.4, startQueue: 2, patience: 1.25, focus: ['expiry'],
    rules: [{ id: 'age', params: { min: 21 } }, { id: 'expiry' }], newRules: ['expiry'],
    briefing: { from: 'dee', text: 'Expired cards are as good as no card. The council fined the Crown & Anchor two grand last month for exactly that. I don\'t care if it\'s the Pope — check the expiry.' },
    roster: [
      { p: 'rosa', pos: 0.05, expect: 'admit' },
      { p: 'wendell', pos: 0.2, mods: { expiresIn: 0 }, expect: 'admit' },
      { p: 'ana', pos: 0.38, mods: { expiresIn: -34 }, expect: 'refuse' },
      { p: 'gus', pos: 0.55, mods: { expiresIn: -12 }, story: 'gus', expect: 'refuse' },
      { p: 'kit', pos: 0.75, mods: { expiresIn: -1 }, expect: 'refuse' },
    ],
  },
  'lantern-3': {
    id: 'lantern-3', title: 'Borrowed Faces', venue: 'lantern', date: '2031-03-14', clock: ['21:00', '01:00'],
    duration: 320, target: 60, strikes: 4, fillers: 6, flawRate: 0.4, startQueue: 2, patience: 1.2, focus: ['identity'],
    rules: [{ id: 'age', params: { min: 21 } }, { id: 'expiry' }, { id: 'identity' }], newRules: ['identity'],
    briefing: { from: 'kwame', text: 'Dee asked me to show you something. Kids borrow their big brother\'s card. Look at the face, not the haircut — face shape, nose, brows, eyes, skin. Then check height on the door frame and the eye colour on the card.' },
    incidents: [{ at: 0.45, id: 'spill' }],
    roster: [
      { p: 'rafael', pos: 0.05, mods: { photo: { facial: 'beard' } }, expect: 'admit' },
      { p: 'marcus', pos: 0.2, mods: { idName: 'Darnell Bell', idAge: 26 }, flaws: ['photo'], expect: 'refuse' },
      { p: 'ellie', pos: 0.35, mods: { photo: { hair: 'long', hairColor: 'black' } }, expect: 'admit' },
      { p: 'oskar', pos: 0.5, mods: { idName: 'Erik Lind', idAge: 23 }, flaws: ['height'], expect: 'refuse' },
      { p: 'bea', pos: 0.68, mods: { idName: 'Clara Hollis', idAge: 24 }, flaws: ['eyes'], expect: 'refuse' },
      { p: 'hattie', pos: 0.85, expect: 'admit' },
    ],
  },
  'sump-1': {
    id: 'sump-1', title: 'Moth & Static', venue: 'sump', date: '2031-03-21', clock: ['20:00', '00:30'],
    duration: 330, target: 60, strikes: 4, fillers: 7, flawRate: 0.42, startQueue: 3, patience: 1.1, focus: ['pass'],
    rules: [
      { id: 'age', params: { min: 18 } }, { id: 'expiry' }, { id: 'identity' },
      { id: 'pass', params: { accept: ['ticket'], event: 'MOTH & STATIC', codePrefix: 'MS-', decoyEvents: ['VELVET RIOT', 'SUNDAY SERMON'] } },
    ],
    newRules: ['pass'],
    briefing: { from: 'saffron', text: 'Ticketed show, sold out. Ticket must say MOTH & STATIC, tonight\'s date, a code starting MS-, and the same name as the ID. All-ages-ish: eighteen and up down here.' },
    roster: [
      { p: 'zed', pos: 0.02, expect: 'admit' },
      { p: 'coco', pos: 0.18, flaws: ['ticketdate'], mods: { ticketShift: 7 }, expect: 'refuse' },
      { p: 'lena', pos: 0.32, expect: 'admit' },
      { p: 'pip', pos: 0.48, flaws: ['noticket'], expect: 'refuse' },
      { p: 'ravi', pos: 0.62, mods: { ticketHolder: 'Sam Okonkwo' }, flaws: ['ticketname'], expect: 'refuse' },
      { p: 'grace', pos: 0.8, expect: 'admit' },
    ],
  },
  'sump-2': {
    id: 'sump-2', title: 'Print Run', venue: 'sump', date: '2031-03-22', clock: ['20:00', '00:30'],
    duration: 340, target: 62, strikes: 4, fillers: 7, flawRate: 0.45, startQueue: 3, patience: 1.05, focus: ['forgery'],
    rules: [
      { id: 'age', params: { min: 18 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'pass', params: { accept: ['ticket'], event: 'MOTH & STATIC', codePrefix: 'MS-', decoyEvents: ['VELVET RIOT', 'GUTTER CHOIR'] } },
    ],
    changes: [{ at: 0.4, message: 'Saffron radios: the support band\'s guest list just landed. Listed names get in without a ticket.', rules: { pass: { accept: ['ticket', 'guestlist'], guests: ['Arlo Finch', 'Imogen Reyes', 'Teddy Nakamura', 'Bex Achterberg'] } } }],
    newRules: ['forgery'],
    briefing: { from: 'kwame', text: 'Somebody\'s printing fakes and selling them round the colleges. Good ones. Check every card against the reference sheet: header wording, number format, hologram, colour, and whether the dates make sense.' },
    incidents: [{ at: 0.55, id: 'fight' }],
    roster: [
      { p: 'grace', pos: 0.04, expect: 'admit' },
      { p: 'tess', pos: 0.2, mods: { idAge: 20 }, flaws: ['hologram'], expect: 'refuse' },
      { p: 'danny', pos: 0.33, mods: { age: 17, idAge: 19 }, flaws: ['number'], story: 'danny', expect: 'refuse' },
      { p: 'arlo', pos: 0.6, mods: { guest: true }, flaws: ['noticket'], expect: 'admit', expectAt: 'change' },
      { p: 'nico', pos: 0.72, flaws: ['noticket'], expect: 'refuse' },
      { p: 'zed', pos: 0.88, expect: 'admit' },
    ],
  },
  'halcyon-1': {
    id: 'halcyon-1', title: 'Thirty-One Floors Up', venue: 'halcyon', date: '2031-03-28', clock: ['21:00', '02:00'],
    duration: 350, target: 64, strikes: 4, fillers: 8, flawRate: 0.45, startQueue: 3, patience: 1.0, focus: ['dress'],
    rules: [
      { id: 'age', params: { min: 23 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'dress', params: { banned: DRESS_SMART } },
    ],
    newRules: ['dress'],
    briefing: { from: 'victor', text: 'Halcyon is twenty-three and over, and we have standards. No trainers — designer or otherwise — no sportswear, no hats, no tank tops, no flip-flops. Everyone. Even the famous ones. Especially the famous ones.' },
    incidents: [{ at: 0.32, id: 'press' }],
    roster: [
      { p: 'harold', pos: 0.05, expect: 'admit' },
      { p: 'kiki', pos: 0.25, story: 'kiki', expect: 'refuse' },
      { p: 'sunny', pos: 0.42, expect: 'refuse' },
      { p: 'jasper', pos: 0.58, mods: { idAge: 24 }, flaws: ['color'], expect: 'refuse' },
      { p: 'marguerite', pos: 0.75, expect: 'admit' },
    ],
  },
  'halcyon-2': {
    id: 'halcyon-2', title: 'Fully Booked', venue: 'halcyon', date: '2031-03-29', clock: ['21:00', '02:00'],
    duration: 360, target: 66, strikes: 4, fillers: 9, flawRate: 0.45, startQueue: 3, patience: 0.95, focus: ['booking'],
    inside: 104, outflow: 22,
    rules: [
      { id: 'age', params: { min: 23 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'dress', params: { banned: DRESS_SMART } },
      { id: 'booking', params: { before: 60, after: 90, reservations: [], vip: ['Kiki Lumen', 'Harold Vance', 'Edith Nkemelu'] } },
    ],
    changes: [{ at: 0.5, message: 'Fire marshal on the roof: capacity is capped at 112 for the rest of the night. VIPs are exempt.', rules: { capacity: { max: 112, exempt: ['Kiki Lumen', 'Harold Vance', 'Edith Nkemelu'] } } }],
    newRules: ['booking'],
    briefing: { from: 'victor', text: 'Reservations only tonight. The booking has to be in the name on the ID, and they get an hour early to ninety minutes late. VIPs on my list walk straight in. Watch the clock — it matters tonight.' },
    incidents: [{ at: 0.28, id: 'rain' }, { at: 0.36, id: 'victor-call', if: { flag: 'victor_deal' } }],
    roster: [
      { p: 'omar', pos: 0.06, mods: { reservation: 'valid' }, expect: 'admit' },
      { p: 'celeste', pos: 0.22, mods: { reservation: 'early' }, flaws: ['early'], expect: 'refuse' },
      { p: 'brock', pos: 0.4, mods: { bribe: 40 }, flaws: ['noreservation'], story: 'brock', expect: 'refuse' },
      { p: 'tamsin', pos: 0.44, mods: { bribe: 40 }, flaws: ['noreservation'], story: 'tamsin', expect: 'refuse' },
      { p: 'kiki', pos: 0.7, mods: { outfit: ['dress-cocktail', 'heels'], vip: true }, expect: 'admit' },
      { p: 'marguerite', pos: 0.85, mods: { reservation: 'valid' }, expect: 'admit' },
    ],
  },
  'voltage-1': {
    id: 'voltage-1', title: 'Pulse', venue: 'voltage', date: '2031-04-04', clock: ['22:00', '04:00'],
    duration: 390, target: 66, strikes: 4, fillers: 11, flawRate: 0.45, startQueue: 4, patience: 0.9, wristbandRate: 0.25, focus: ['sober', 'pass'],
    rules: [
      { id: 'age', params: { min: 21 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'pass', params: { accept: ['ticket', 'wristband'], event: 'VOLTAGE: PULSE', codePrefix: 'VP-', wristband: { color: 'green', pattern: 'triangles' }, oldBands: [{ color: 'pink', pattern: 'dots' }, { color: 'green', pattern: 'stripes' }, { color: 'blue', pattern: 'triangles' }], decoyEvents: ['VOLTAGE: SURGE', 'NIGHT FERRY'] } },
      { id: 'sober' },
    ],
    newRules: ['sober'],
    briefing: { from: 'kwame', text: 'Big room, fast line. Tickets for PULSE start VP-. Smokers coming back show tonight\'s wristband: green, triangles. Last week\'s bands are still floating around. And nobody falling-down drunk gets in — that\'s on our licence too.' },
    roster: [
      { p: 'sal', pos: 0.03, expect: 'admit' },
      { p: 'fern', pos: 0.18, mods: { wristband: 'valid' }, expect: 'admit' },
      { p: 'ray', pos: 0.32, mods: { intoxicated: true }, flaws: ['drunk'], expect: 'refuse' },
      { p: 'bodhi', pos: 0.48, mods: { wristband: 'old' }, flaws: ['oldband'], expect: 'refuse' },
      { p: 'mira', pos: 0.62, mods: { ticketHolder: 'Mira Solbeg' }, flaws: ['ticketname'], expect: 'refuse' },
      { p: 'nadia', pos: 0.78, story: 'nadia', expect: 'admit' },
    ],
  },
  'halcyon-3': {
    id: 'halcyon-3', title: 'The Launch', venue: 'halcyon', date: '2031-04-04', clock: ['21:00', '02:00'],
    duration: 380, target: 66, strikes: 4, fillers: 10, flawRate: 0.5, startQueue: 4, patience: 0.9, guestListOnly: true, focus: ['sober', 'booking'],
    inside: 70, outflow: 30,
    rules: [
      { id: 'age', params: { min: 23 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'booking', params: { before: 60, after: 90, reservations: [], vip: ['Edith Nkemelu', 'Kiki Lumen', 'Harold Vance', 'Graham Vane', 'Nadia Ross'] } },
      { id: 'dress', params: { banned: DRESS_SMART } },
      { id: 'sober' },
      { id: 'capacity', params: { max: 140, exempt: ['Edith Nkemelu', 'Graham Vane'] } },
    ],
    newRules: ['sober'],
    briefing: { from: 'victor', text: 'The Lark & Vane launch. Guest list only — no bookings, no walk-ups. Investors, press, the council. Nobody visibly drunk on my roof... within reason. Head door means you make the calls. Make the right ones.' },
    roster: [
      { p: 'edith', pos: 0.05, expect: 'admit' },
      { p: 'harold', pos: 0.2, expect: 'admit' },
      { p: 'jasper', pos: 0.34, mods: { idAge: 24 }, flaws: ['header', 'noreservation'], expect: 'refuse' },
      { p: 'graham', pos: 0.5, mods: { intoxicated: true }, flaws: ['drunk'], story: 'graham', expect: 'refuse' },
      { p: 'kiki', pos: 0.66, mods: { outfit: ['dress-sequin', 'heels'] }, expect: 'admit' },
      { p: 'nadia', pos: 0.82, story: 'nadia', expect: 'admit' },
    ],
  },
  'voltage-2': {
    id: 'voltage-2', title: 'Afterdark', venue: 'voltage', date: '2031-04-11', clock: ['22:00', '04:00'],
    duration: 400, target: 68, strikes: 4, fillers: 12, flawRate: 0.48, startQueue: 4, patience: 0.88, wristbandRate: 0.22, focus: ['banned'], bannedDecoys: 3,
    rules: [
      { id: 'age', params: { min: 21 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'pass', params: { accept: ['ticket', 'wristband'], event: 'VOLTAGE: AFTERDARK', codePrefix: 'VA-', wristband: { color: 'orange', pattern: 'stripes' }, oldBands: [{ color: 'green', pattern: 'triangles' }, { color: 'orange', pattern: 'dots' }, { color: 'yellow', pattern: 'stripes' }], decoyEvents: ['VOLTAGE: PULSE', 'BASS COLLECTIVE'] } },
      { id: 'sober' },
      { id: 'banned', params: { entries: [] } },
    ],
    changes: [{ at: 0.55, message: 'Management: re-entry is closed from now on. Wristbands no longer get anyone back in.', rules: { pass: { accept: ['ticket'] } } }],
    newRules: ['banned'],
    briefing: { from: 'kwame', text: 'Banned list is live. Faces, not names — banned people bring other people\'s cards. Re-entry band tonight is orange with stripes, and management may shut re-entry later. Also: word is the licensing office is testing doors this month.' },
    incidents: [{ at: 0.08, id: 'inspector' }, { at: 0.45, id: 'medical' }],
    roster: [
      { p: 'sal', pos: 0.04, expect: 'admit' },
      { p: 'bodhi', pos: 0.2, mods: { wristband: 'valid' }, expect: 'admit' },
      { p: 'ollie', pos: 0.36, mods: { idName: 'Jonas Brandt', idAge: 24 }, flaws: ['photo'], story: 'decoy', expect: 'refuse' },
      { p: 'ray', pos: 0.5, expect: 'admit' },
      { p: 'fern', pos: 0.82, mods: { wristband: 'valid' }, expect: 'refuse', expectAt: 'change' },
    ],
  },
  'orchid-1': {
    id: 'orchid-1', title: 'Members Only', venue: 'orchid', date: '2031-04-18', clock: ['20:00', '01:00'],
    duration: 380, target: 68, strikes: 4, fillers: 11, flawRate: 0.48, startQueue: 3, patience: 0.95, sponsoredRate: 0.35, focus: ['membership'],
    rules: [
      { id: 'age', params: { min: 25 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'membership', params: { sponsored: [], suspended: [] } },
      { id: 'dress', params: { banned: DRESS_FORMAL } },
    ],
    newRules: ['membership'],
    briefing: { from: 'kwame', text: 'The Orchid Room. Twenty-five and over, members and their sponsored guests only. Member cards are OR and four digits, same name as the ID, not lapsed. The dress code is strict: no denim, no T-shirts, nothing sporty.' },
    roster: [
      { p: 'corvina', pos: 0.04, mods: { member: 'valid' }, expect: 'admit' },
      { p: 'felix', pos: 0.12, mods: { sponsored: true }, expect: 'admit' },
      { p: 'tomasz', pos: 0.35, mods: { member: 'valid' }, flaws: ['memberexpired'], expect: 'refuse' },
      { p: 'harold', pos: 0.55, mods: { member: 'valid' }, expect: 'admit' },
      { p: 'jasper', pos: 0.75, mods: { idAge: 25, member: 'valid' }, flaws: ['membername'], expect: 'refuse' },
    ],
  },
  'orchid-2': {
    id: 'orchid-2', title: 'The Printer', venue: 'orchid', date: '2031-04-19', clock: ['20:00', '01:00'],
    duration: 400, target: 70, strikes: 4, fillers: 11, flawRate: 0.5, startQueue: 3, patience: 0.9, sponsoredRate: 0.35, focus: ['forgery'], bannedDecoys: 3,
    rules: [
      { id: 'age', params: { min: 25 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'membership', params: { sponsored: ['Theodore Vale'], suspended: [] } },
      { id: 'dress', params: { banned: DRESS_FORMAL } },
      { id: 'sober' },
      { id: 'banned', params: { entries: [] } },
    ],
    changes: [{ at: 0.42, message: 'The club secretary calls down: membership OR-2210 is suspended with immediate effect.', rules: { membership: { suspended: ['OR-2210'] } } }],
    newRules: [],
    briefing: { from: 'kwame', text: 'Everything you\'ve learned, all at once. The Orchid\'s hosting a charity dinner and Nadia thinks the Printer will try to get in tonight. He makes near-perfect cards. Near.' },
    incidents: [{ at: 0.62, id: 'power' }],
    roster: [
      { p: 'corvina', pos: 0.03, mods: { member: 'valid' }, expect: 'admit' },
      { p: 'graham', pos: 0.22, mods: { member: 'valid', intoxicated: true }, flaws: ['drunk'], expect: 'refuse' },
      { p: 'theo', pos: 0.4, mods: { idName: 'Theodore Vale', sponsored: true, idAge: 31 }, flaws: ['dates'], story: 'printer', expect: 'refuse' },
      { p: 'tomasz', pos: 0.55, mods: { member: 'valid' }, expect: 'admit' },
      { p: 'rupert', pos: 0.75, mods: { member: 'valid', memberNumber: 'OR-2210' }, expect: 'refuse', expectAt: 'change' },
    ],
  },
  'lantern-finale': {
    id: 'lantern-finale', title: 'Last Call', venue: 'lantern', date: '2031-04-25', clock: ['21:00', '02:00'],
    duration: 420, target: 70, strikes: 4, fillers: 12, flawRate: 0.48, startQueue: 4, patience: 0.9, focus: ['forgery', 'age'], bannedDecoys: 3,
    inside: 44, outflow: 26,
    rules: [
      { id: 'age', params: { min: 21 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' },
      { id: 'sober' },
      { id: 'banned', params: { entries: [] } },
      { id: 'capacity', params: { max: 52, exempt: ['Ilse Varga'] } },
    ],
    changes: [{ at: 0.58, message: 'Dee: from now on it\'s the private farewell party — guest list only. Everyone else, thank them and send them home.', rules: { pass: { accept: ['guestlist'], guests: ['Hattie Sloane', 'Rosa Delgado', 'Ilse Varga', 'Kit Navarro'] } } }],
    newRules: [],
    briefing: { from: 'dee', text: 'Licensing review is tonight. One underage kid, one fake, one drunk, and they take the licence and Lark & Vane get the building for pennies. After one o\'clock it\'s my farewell party — guest list only. Make me proud, love.' },
    incidents: [{ at: 0.3, id: 'juno-assist', if: { flag: 'juno_ally' } }, { at: 0.5, id: 'printer-crew' }],
    roster: [
      { p: 'gus', pos: 0.02, expect: 'admit' },
      { p: 'ama', pos: 0.14, expect: 'admit' },
      { p: 'skye', pos: 0.28, mods: { idAge: 22 }, flaws: ['hologram'], story: 'skye', expect: 'refuse' },
      { p: 'benny', pos: 0.4, flaws: ['noid'], story: 'benny', expect: 'refuse' },
      { p: 'varga', pos: 0.52, story: 'varga', expect: 'admit' },
      { p: 'hattie', pos: 0.7, expect: 'admit', expectAt: 'change' },
      { p: 'rafael', pos: 0.86, expect: 'refuse', expectAt: 'change' },
    ],
  },
};

// The campaign order. A branch entry picks a shift from a story flag.
export const CAMPAIGN = [
  'lantern-1', 'lantern-2', 'lantern-3', 'sump-1', 'sump-2', 'halcyon-1', 'halcyon-2',
  { flag: 'career', options: { kwame: 'voltage-1', victor: 'halcyon-3' }, fallback: 'voltage-1' },
  'voltage-2', 'orchid-1', 'orchid-2', 'lantern-finale',
];

export function shiftIdAt(index, flags = {}) {
  const e = CAMPAIGN[index];
  if (e == null) return null;
  if (typeof e === 'string') return e;
  return e.options[flags[e.flag]] ?? e.fallback;
}
