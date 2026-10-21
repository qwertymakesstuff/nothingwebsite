// The building roster. Pure data: names, prices and output live here so balancing
// never means touching the economy code. Costs and rates are plain numbers here and
// become BigNums in economy.js.
//   baseCost   price of the first one
//   growth     each one bought multiplies the next price by this
//   baseRate   crowns per second produced by one
//   icon       inner SVG markup for a 24 x 24 icon (drawn with currentColor)

export const BUILDINGS = [
  {
    id: 'stall',
    name: 'Market Stall',
    description: 'A folding table and a loud voice. Sells whatever the Mint presses.',
    baseCost: 15, growth: 1.15, baseRate: 0.1,
    icon: '<path d="M3 9h18l-2-5H5z"/><path d="M5 9v11h14V9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20v-6h6v6"/>',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'A bench, a vice and an apprentice who never asks for a raise.',
    baseCost: 100, growth: 1.15, baseRate: 1,
    icon: '<path d="M14 3l7 7-3 3-2-2-8 8-3-3 8-8-2-2z"/><rect x="2" y="20" width="20" height="2"/>',
  },
  {
    id: 'foundry',
    name: 'Foundry',
    description: 'Melts scrap into fresh ingots around the clock.',
    baseCost: 1100, growth: 1.15, baseRate: 8,
    icon: '<path d="M4 8h16l-2 12H6z"/><path d="M8 4c0 2 2 2 2 4M13 3c0 2 2 2 2 5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Conveyor belts, whistles and shifts that never end.',
    baseCost: 12000, growth: 1.15, baseRate: 47,
    icon: '<path d="M2 21V11l6 4v-4l6 4V5h3v-2h3v18z"/>',
  },
  {
    id: 'tradehouse',
    name: 'Trading House',
    description: 'Ships your goods to ports you will never visit.',
    baseCost: 130000, growth: 1.15, baseRate: 260,
    icon: '<path d="M12 2v18M5 6h14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 6l-3 7h6zM19 6l-3 7h6z"/><rect x="7" y="20" width="10" height="2"/>',
  },
  {
    id: 'bank',
    name: 'Bank',
    description: 'Lends your own crowns back to you, with interest.',
    baseCost: 1400000, growth: 1.15, baseRate: 1400,
    icon: '<path d="M12 2l10 5v2H2V7z"/><path d="M4 10h3v8H4zM10.5 10h3v8h-3zM17 10h3v8h-3z"/><rect x="2" y="19" width="20" height="3"/>',
  },
];

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
