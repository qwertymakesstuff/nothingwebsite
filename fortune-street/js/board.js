// Meridian Bay: districts, every ownable asset, and the two board layouts.
// Pure data plus a few lookups; no game state lives here.

export const START_CASH = 1500;
export const CIRCUIT_BONUS = 200;
export const IMPOUND_FEE = 50;
export const MIN_BID = 10;
export const MAX_LEVEL = 4;
export const UNMORTGAGE_PERCENT = 110; // repaying a loan costs its value plus 10%

// development levels; index = level
export const LEVELS = [
  { name: 'Empty Lot', short: 'Lot' },
  { name: 'Storefront', short: 'Store' },
  { name: 'Business Hub', short: 'Hub' },
  { name: 'Apartments', short: 'Apts' },
  { name: 'Landmark Tower', short: 'Tower' },
];

// mults turn a property's base rent into its rent at levels 1-4.
// Cheap districts get the best return per crown spent, so they pay off early;
// premium districts cost more but their absolute rents dominate a long game.
export const DISTRICTS = {
  harbor: {
    name: 'Old Harbor', color: '#3a8fb7', ink: '#ffffff', devCost: 50, mults: [6, 18, 48, 72],
    blurb: 'Inexpensive waterfront shops and warehouses. Cheap to build up, quick to pay back.',
  },
  market: {
    name: 'Market Quarter', color: '#e0823d', ink: '#1d1208', devCost: 75, mults: [6, 16, 41, 59],
    blurb: 'Restaurants, boutiques and busy commercial streets.',
  },
  arts: {
    name: 'Arts District', color: '#c9437b', ink: '#ffffff', devCost: 100, mults: [5, 13, 33, 47],
    blurb: 'Theaters, galleries and late-night entertainment venues.',
  },
  midtown: {
    name: 'Midtown', color: '#6f63d4', ink: '#ffffff', devCost: 125, mults: [5, 12, 28, 39],
    blurb: 'Offices, apartments and professional firms.',
  },
  innovation: {
    name: 'Innovation Park', color: '#25a072', ink: '#ffffff', devCost: 150, mults: [5, 11, 25, 34],
    blurb: 'Technology companies and research campuses.',
  },
  skyline: {
    name: 'Skyline Row', color: '#d6a21e', ink: '#1d1503', devCost: 200, mults: [4, 11, 24, 33],
    blurb: 'Luxury addresses and landmark towers. The long-game prize.',
  },
};
export const DISTRICT_ORDER = Object.keys(DISTRICTS);

function prop(id, name, district, price, base, icon) {
  const d = DISTRICTS[district];
  return {
    id, name, kind: 'property', district, price, icon,
    rents: [base, ...d.mults.map(m => base * m)],
    devCost: d.devCost,
    mortgage: price / 2,
  };
}

export const TRANSIT_RENTS = [25, 50, 100, 200]; // by number of stations the owner holds
export const SERVICE_MULTS = [4, 10]; // dice total x this, by number of services owned

const LIST = [
  prop('netmakers', "Netmaker's Wharf", 'harbor', 60, 4, 'wharf'),
  prop('saltbox', 'Saltbox Warehouse', 'harbor', 60, 4, 'warehouse'),
  prop('crabhouse', 'Crabhouse Row', 'harbor', 80, 6, 'shop'),
  prop('spice', 'Spice Lane', 'market', 100, 7, 'awning'),
  prop('kettle', 'Copper Kettle Market', 'market', 100, 7, 'cup'),
  prop('lantern', 'Lantern Street', 'market', 120, 9, 'lantern'),
  prop('bazaar', 'Bazaar Arcade', 'market', 140, 10, 'arch'),
  prop('marionette', 'Marionette Theater', 'arts', 160, 12, 'theater'),
  prop('gallery', 'Gallery Steps', 'arts', 160, 12, 'frame'),
  prop('velvet', 'Velvet Playhouse', 'arts', 180, 14, 'mask'),
  prop('mural', 'Mural Alley', 'arts', 200, 16, 'brush'),
  prop('ledger', 'Ledger Plaza', 'midtown', 220, 18, 'columns'),
  prop('clocktower', 'Clocktower Offices', 'midtown', 220, 18, 'clock'),
  prop('brassbell', 'Brass Bell Apartments', 'midtown', 240, 20, 'apartment'),
  prop('exchange', 'Commerce Exchange', 'midtown', 260, 22, 'chart'),
  prop('quantum', 'Quantum Labs', 'innovation', 280, 24, 'atom'),
  prop('circuit', 'Circuit Commons', 'innovation', 280, 24, 'chip'),
  prop('helix', 'Helix Research', 'innovation', 300, 26, 'helix'),
  prop('foundry', 'Robotics Foundry', 'innovation', 320, 28, 'gear'),
  prop('opal', 'Opal Terrace', 'skyline', 350, 28, 'gem'),
  prop('crown', 'Crown Spire', 'skyline', 380, 32, 'spire'),
  prop('meridian', 'Meridian Tower', 'skyline', 420, 38, 'tower'),
  { id: 'ferry', name: 'Ferry Terminal', kind: 'transit', price: 200, mortgage: 100, icon: 'ferry' },
  { id: 'rail', name: 'Central Rail Station', kind: 'transit', price: 200, mortgage: 100, icon: 'train' },
  { id: 'tram', name: 'Skyway Tram Depot', kind: 'transit', price: 200, mortgage: 100, icon: 'tram' },
  { id: 'airport', name: 'Airport Express', kind: 'transit', price: 200, mortgage: 100, icon: 'plane' },
  { id: 'power', name: 'Tidewater Power', kind: 'service', price: 150, mortgage: 75, icon: 'bolt' },
  { id: 'fiber', name: 'Bay Fiber Net', kind: 'service', price: 150, mortgage: 75, icon: 'signal' },
];
export const ASSETS = Object.fromEntries(LIST.map(a => [a.id, a]));

export const CORNERS = {
  start: { name: 'Launch Pier', icon: 'pier', text: `Collect $${CIRCUIT_BONUS} every time you pass or land here.` },
  impound: { name: 'Impound Lot', icon: 'lock', text: `Just passing through, unless you were towed. Towed players pay $${IMPOUND_FEE}, use a Tow Waiver, or roll doubles to leave.` },
  park: { name: 'Lighthouse Park', icon: 'lighthouse', text: 'A quiet stop by the water. Nothing happens here.' },
  towzone: { name: 'Tow Zone', icon: 'tow', text: 'Your car is towed: go straight to the Impound Lot. You do not pass Launch Pier.' },
};

export const TAXES = {
  levy: { name: 'Harbor Levy', base: 100, perLevel: 10, text: 'Pay $100 plus $10 for every development level you own.' },
  luxury: { name: 'Luxury Assessment', base: 100, perLevel: 0, text: 'Pay $100.' },
};

const C = id => ({ type: 'corner', id });
const P = id => ({ type: ASSETS[id].kind, id });
const T = id => ({ type: 'tax', id });
const BULLETIN = { type: 'bulletin' };
const OPPORTUNITY = { type: 'opportunity' };

const LAYOUTS = {
  full: {
    name: 'Meridian Bay',
    spaces: [
      C('start'), P('netmakers'), BULLETIN, P('saltbox'), T('levy'), P('ferry'), P('crabhouse'), OPPORTUNITY, P('spice'), P('kettle'),
      C('impound'), P('lantern'), P('power'), P('bazaar'), P('marionette'), P('rail'), P('gallery'), BULLETIN, P('velvet'), P('mural'),
      C('park'), P('ledger'), OPPORTUNITY, P('clocktower'), P('brassbell'), P('tram'), P('exchange'), P('quantum'), P('fiber'), P('circuit'),
      C('towzone'), P('helix'), P('foundry'), BULLETIN, P('airport'), P('opal'), OPPORTUNITY, P('crown'), T('luxury'), P('meridian'),
    ],
  },
  quick: {
    name: 'Meridian Bay — Harbor Loop',
    spaces: [
      C('start'), P('netmakers'), BULLETIN, P('saltbox'), P('crabhouse'), P('ferry'), P('spice'),
      C('impound'), P('kettle'), OPPORTUNITY, P('lantern'), P('marionette'), P('power'), P('gallery'),
      C('park'), P('velvet'), T('levy'), P('quantum'), P('rail'), P('circuit'), P('helix'),
      C('towzone'), OPPORTUNITY, P('opal'), BULLETIN, P('airport'), T('luxury'), P('meridian'),
    ],
  },
};

const cache = {};
// Board facts derived from a layout: districts contain only the properties present on it,
// so completing a district on the quick board means owning its properties on that board.
export function getBoard(id) {
  if (cache[id]) return cache[id];
  const layout = LAYOUTS[id];
  if (!layout) throw new Error(`unknown board ${id}`);
  const spaces = layout.spaces;
  const indexOf = {};
  const ownables = [];
  const districts = {};
  spaces.forEach((s, i) => {
    if (s.type === 'corner') indexOf[s.id] = i;
    if (ASSETS[s.id]) {
      indexOf[s.id] = i;
      ownables.push(s.id);
      const a = ASSETS[s.id];
      if (a.kind === 'property') (districts[a.district] ||= []).push(s.id);
    }
  });
  const transitIndices = spaces.map((s, i) => (s.type === 'transit' ? i : -1)).filter(i => i >= 0);
  const board = {
    id, name: layout.name, spaces, size: spaces.length, side: spaces.length / 4,
    indexOf, ownables, districts, transitIndices,
    transits: ownables.filter(o => ASSETS[o].kind === 'transit'),
    services: ownables.filter(o => ASSETS[o].kind === 'service'),
  };
  cache[id] = board;
  return board;
}
export const BOARD_IDS = Object.keys(LAYOUTS);

export function spaceName(space) {
  if (!space) return '';
  if (space.type === 'corner') return CORNERS[space.id].name;
  if (space.type === 'tax') return TAXES[space.id].name;
  if (space.type === 'bulletin') return 'City Bulletin';
  if (space.type === 'opportunity') return 'Business Opportunity';
  return ASSETS[space.id].name;
}

export const TOKENS = [
  { id: 'sailboat', name: 'Sailboat' },
  { id: 'tram', name: 'Cable Tram' },
  { id: 'gull', name: 'Seagull' },
  { id: 'lighthouse', name: 'Lighthouse' },
  { id: 'key', name: 'Brass Key' },
  { id: 'teacup', name: 'Teacup' },
];
export const SEAT_COLORS = ['#e8573f', '#2f7de1', '#1f9e63', '#9a4fd0'];
