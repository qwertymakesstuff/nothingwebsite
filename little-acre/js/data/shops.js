// Shops. `hours` = [open, close) in minutes; `closed` = weekday the shop shuts. `stock` entries
// sell an item at `price` (seed entries are added automatically from crops.js); `upgrade`
// entries sell a one-off improvement. `buys` = item categories the keeper will buy from you
// (at the item's normal price).

import { CROPS, seedId } from './crops.js';

const h = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };

export const SHOPS = {
  pip: {
    name: "Pip's Provisions", keeper: 'pip', hours: [h('09:00'), h('17:00')], closed: 'Wed',
    greeting: 'Welcome to the Provisions! Seeds by the wall, bread by the smell.',
    stock: [
      ...CROPS.filter(c => !c.fair).map(c => ({ item: seedId(c.id), price: c.seedPrice, seasons: c.seasons, tier: c.tier })),
      { item: 'flour', price: 25 },
      { item: 'bread', price: 90 },
      { item: 'fertilizer', price: 20 },
      { item: 'bait', price: 5 },
      { upgrade: 'backpack', name: 'Large Backpack', desc: 'Carry 36 stacks instead of 24.', price: 2000 },
    ],
    buys: ['crop', 'forage', 'fish', 'artisan', 'food', 'ingredient'],
  },
  bram: {
    name: 'Ostrow Smithy', keeper: 'bram', hours: [h('09:00'), h('16:00')], closed: 'Fri',
    greeting: 'Upgrades, ore, coal. What do you need.',
    stock: [
      { item: 'coal', price: 75 },
      { item: 'copper_ore', price: 40 },
      { item: 'iron_ore', price: 90 },
      { upgrade: 'tool' },
    ],
    buys: ['resource'],
  },
  mabel: {
    name: "Fenn's Workshop", keeper: 'mabel', hours: [h('09:00'), h('17:00')], closed: 'Tue',
    greeting: 'What are we building today?',
    stock: [
      { item: 'wood', price: 10 },
      { item: 'stone', price: 10 },
      { item: 'fence', price: 15 },
      { item: 'wpath', price: 10 },
      { item: 'spath', price: 10 },
      { item: 'bench', price: 600 },
      { item: 'planter', price: 450 },
      { item: 'lamp', price: 900 },
      { upgrade: 'northfield', name: 'Clear the North Field', desc: 'Tear down the old fence and open up the north field: 24 x 6 more tiles to farm.', price: 2500, needs: { wood: 150, stone: 50 } },
      { upgrade: 'kitchen', name: 'Kitchen Renovation', desc: 'Fix up the farmhouse stove so you can cook meals.', price: 3000, needs: { wood: 100, hardwood: 10 } },
    ],
    buys: ['decor'],
  },
  fair: {
    name: 'Seedling Fair Stall', keeper: 'pip', festival: true,
    greeting: 'Fair specials! Strawberry seeds only today.',
    stock: [
      { item: 'seed_strawberry', price: 100 },
      { item: 'planter', price: 350 },
      { item: 'gnome', price: 1200 },
      { item: 'fertilizer', price: 15 },
    ],
    buys: [],
  },
};

// Tool upgrades at the smithy: level 1 = copper, level 2 = iron.
export const TOOL_UPGRADES = [
  null,
  { name: 'Copper', price: 1000, bars: { copper_bar: 5 } },
  { name: 'Iron', price: 3000, bars: { iron_bar: 5 } },
];
export const UPGRADABLE_TOOLS = ['hoe', 'can', 'axe', 'pickaxe', 'rod'];
