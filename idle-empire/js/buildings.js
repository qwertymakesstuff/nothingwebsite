// The building roster: from a market stall to an imperial mint. Pure data: names, prices,
// output and unlock rules live here so balancing never means touching the economy code.
// Costs and rates are plain numbers here and become BigNums in economy.js.
//   name, plural  display names (one / several)
//   kind          'worker' (people), 'machine' (industry) or 'business' (trade and money)
//   baseCost      price of the first one
//   growth        each one bought multiplies the next price by this
//                 (optional: defaults to ECONOMY.defaultGrowth in config.js)
//   baseRate      crowns per second produced by one
//   unlock        conditions (see conditions.js) to appear in the shop; built below as
//                 "own N of the previous building and have earned a quarter of this price"
//   icon          inner SVG markup for a 24 x 24 icon (drawn with currentColor)
//
// Balance: each building costs ~11-16x the previous one and makes ~5.5-7.5x as much, so a
// bare building's payback time (cost / base rate) rises from ~2 minutes for a stall to days at
// the top; upgrades, milestones and ranks bring that back down. A simulated player (3 clicks/s,
// best-payback buying, every affordable upgrade, no prestige) unlocks: Factory 5 min, Bank 22 min,
// Railway 1.1 h, Exchange 3.6 h, Airship 6 h, Refinery 11 h, Sky Colony 19 h, Imperial Mint 30 h.

const ROSTER = [
  {
    id: 'stall', kind: 'business',
    name: 'Market Stall', plural: 'Market Stalls',
    description: 'A folding table and a loud voice. Sells whatever the Mint presses.',
    baseCost: 15, baseRate: 0.1,
    icon: '<path d="M3 9h18l-2-5H5z"/><path d="M5 9v11h14V9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20v-6h6v6"/>',
  },
  {
    id: 'workshop', kind: 'worker',
    name: 'Workshop', plural: 'Workshops',
    description: 'A bench, a vice and an apprentice who never asks for a raise.',
    baseCost: 100, baseRate: 1,
    icon: '<path d="M14 3l7 7-3 3-2-2-8 8-3-3 8-8-2-2z"/><rect x="2" y="20" width="20" height="2"/>',
  },
  {
    id: 'foundry', kind: 'machine',
    name: 'Foundry', plural: 'Foundries',
    description: 'Melts scrap into fresh ingots around the clock.',
    baseCost: 1100, baseRate: 8,
    icon: '<path d="M4 8h16l-2 12H6z"/><path d="M8 4c0 2 2 2 2 4M13 3c0 2 2 2 2 5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  {
    id: 'factory', kind: 'machine',
    name: 'Factory', plural: 'Factories',
    description: 'Conveyor belts, whistles and shifts that never end.',
    baseCost: 12000, baseRate: 47,
    icon: '<path d="M2 21V11l6 4v-4l6 4V5h3v-2h3v18z"/>',
  },
  {
    id: 'tradehouse', kind: 'business',
    name: 'Trading House', plural: 'Trading Houses',
    description: 'Ships your goods to ports you will never visit.',
    baseCost: 130000, baseRate: 260,
    icon: '<path d="M12 2v18M5 6h14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 6l-3 7h6zM19 6l-3 7h6z"/><rect x="7" y="20" width="10" height="2"/>',
  },
  {
    id: 'bank', kind: 'business',
    name: 'Bank', plural: 'Banks',
    description: 'Lends your own crowns back to you, with interest.',
    baseCost: 1.4e6, baseRate: 1400,
    icon: '<path d="M12 2l10 5v2H2V7z"/><path d="M4 10h3v8H4zM10.5 10h3v8h-3zM17 10h3v8h-3z"/><rect x="2" y="19" width="20" height="3"/>',
  },
  {
    id: 'mine', kind: 'worker',
    name: 'Gold Mine', plural: 'Gold Mines',
    description: 'Crews with lamps and pickaxes dig the raw gold the Mint is hungry for.',
    baseCost: 2e7, baseRate: 7800,
    icon: '<path d="M3 7c4-4 14-4 18 0l-1.5 1.5C16 5.5 8 5.5 4.5 8.5z"/><path d="M11 6h2v15h-2z"/><circle cx="18" cy="18" r="3"/>',
  },
  {
    id: 'railway', kind: 'machine',
    name: 'Railway', plural: 'Railways',
    description: 'Steam engines haul ore in and crowns out, faster than any cart.',
    baseCost: 3.3e8, baseRate: 44000,
    icon: '<path d="M3 6h11v10H3zM14 9h4l3 4v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M5 2h3v4H5z"/>',
  },
  {
    id: 'shipyard', kind: 'worker',
    name: 'Shipyard', plural: 'Shipyards',
    description: 'Thousands of hands build the fleets that carry your trade overseas.',
    baseCost: 5.1e9, baseRate: 2.6e5,
    icon: '<path d="M11 2h2v12h-2z"/><path d="M13 3l7 9h-7zM11 5l-6 7h6z"/><path d="M2 15h20l-3 5H5z"/>',
  },
  {
    id: 'exchange', kind: 'business',
    name: 'Stock Exchange', plural: 'Stock Exchanges',
    description: 'Sells shares in the empire to people who will never see a dividend.',
    baseCost: 7.5e10, baseRate: 1.6e6,
    icon: '<path d="M2 20h20v2H2z"/><path d="M3 17l5-6 4 3 6-8 3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 3h5v5z"/>',
  },
  {
    id: 'airship', kind: 'machine',
    name: 'Airship Fleet', plural: 'Airship Fleets',
    description: 'Gilded zeppelins that deliver crowns to every corner of the map, and beyond.',
    baseCost: 1e12, baseRate: 1.2e7,
    icon: '<ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M8 15h8l-1 3H9z"/><path d="M9 13.5l1 1.5M15 13.5l-1 1.5" stroke="currentColor" stroke-width="1.5"/>',
  },
  {
    id: 'refinery', kind: 'machine',
    name: 'Aether Refinery', plural: 'Aether Refineries',
    description: 'Distils gold out of thin air. Nobody asks how.',
    baseCost: 1.2e13, baseRate: 8e7,
    icon: '<path d="M9 2h6v2h-1v5l6 10a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l6-10V4H9z"/><path d="M7 16h10l1.5 3h-13z" fill="#3a2608" opacity=".5"/>',
  },
  {
    id: 'colony', kind: 'worker',
    name: 'Sky Colony', plural: 'Sky Colonies',
    description: 'Whole cities on floating islands, every citizen on the payroll.',
    baseCost: 1.3e14, baseRate: 5.5e8,
    icon: '<path d="M2 13h20l-5 6h-3l-2 3-2-3H7z"/><path d="M5 13V9h3v4zM10 13V5h4v8zM16 13V8h3v5z"/>',
  },
  {
    id: 'imperial', kind: 'business',
    name: 'Imperial Mint', plural: 'Imperial Mints',
    description: 'The Mint, but the size of a continent. The empire strikes its own legend.',
    baseCost: 1.4e15, baseRate: 3.8e9,
    icon: '<path d="M4 9l2-6 4 3 2-4 2 4 4-3 2 6z"/><path d="M3 10h18v2H3zM5 13h3v6H5zM10.5 13h3v6h-3zM16 13h3v6h-3zM2 20h20v2H2z"/>',
  },
];

// tiered unlocks: early buildings need one of the previous building, later ones need five
export const BUILDINGS = ROSTER.map((b, i) => ({
  ...b,
  unlock: i === 0 ? [] : [
    { type: 'owned', building: ROSTER[i - 1].id, count: i < 6 ? 1 : 5 },
    { type: 'earned', amount: b.baseCost / 4 },
  ],
}));

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export const KIND_LABELS = { worker: 'workers', machine: 'machine', business: 'business' };
