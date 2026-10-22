// Relics (permanent rule changes for one run), supplies (single-use items you hold, up to three)
// and services (permanent upgrades to a single symbol). Relic hooks are called by effects.js:
//   earn(ctx, cell)  — in the earn phase, after every symbol's own earn effect, once per cell
//   spin(ctx)        — once per spin, after all four phases (spin-level payouts)
//   destroyed(ctx, cell) — whenever a symbol in the grid is destroyed
// Numeric fields (`rentMult`, `deliveryChoices`, ...) are read by rent.js, state.js and shop.js.

const is = (ctx, c, tag) => ctx.is(c, tag);

export const RELICS = [
  {
    id: 'rent_control', name: 'Rent-Control Lease', price: 40, icon: 'lease',
    desc: 'Every rent from now on is 12% lower.',
    rentMult: 0.88,
  },
  {
    id: 'coin_purse', name: 'Coin Purse', price: 22, icon: 'purse',
    desc: 'Coins earn +1.',
    earn(ctx, c) { if (c.id === 'coin') ctx.bonus(c, 1, null, 'Coin Purse'); },
  },
  {
    id: 'cat_cafe', name: 'Cat Café Licence', price: 24, icon: 'cafe',
    desc: 'Pets earn +1. Cats can no longer be chased off by Dogs.',
    earn(ctx, c) { if (is(ctx, c, 'pet')) ctx.bonus(c, 1, null, 'Cat Café'); },
  },
  {
    id: 'green_thumb', name: 'Green Thumb', price: 24, icon: 'thumb',
    desc: 'Plants earn +1. Seeds grow twice as fast.',
    earn(ctx, c) { if (is(ctx, c, 'plant')) ctx.bonus(c, 1, null, 'Green Thumb'); },
  },
  {
    id: 'union_card', name: 'Union Card', price: 26, icon: 'union',
    desc: 'People earn +1. Production symbols earn +1.',
    earn(ctx, c) {
      if (is(ctx, c, 'person') && c.id !== 'landlord') ctx.bonus(c, 1, null, 'Union Card');
      if (is(ctx, c, 'production')) ctx.bonus(c, 1, null, 'Union Card');
    },
  },
  {
    id: 'minimalist', name: "Minimalist's Manual", price: 30, icon: 'manual',
    desc: 'Every empty slot on the grid earns ¤2. Small collections pay.',
    spin(ctx) { const n = ctx.empties(); if (n) ctx.payout(n * 2, null, `${n} empty slots × ¤2 (Minimalist)`); },
  },
  {
    id: 'hoarder', name: "Hoarder's Garage", price: 30, icon: 'garage',
    desc: 'Every symbol that did not fit on the grid this spin earns ¤1.',
    spin(ctx) { const n = ctx.leftOver(); if (n) ctx.payout(n, null, `${n} symbols in the garage × ¤1 (Hoarder)`); },
  },
  {
    id: 'insurance', name: 'Insurance Policy', price: 26, icon: 'policy',
    desc: 'Whenever one of your symbols is destroyed, gain ¤3.',
    destroyed(ctx, c) { ctx.payout(3, null, `insured ${c.def.name}`); },
  },
  {
    id: 'night_shift', name: 'Night Shift', price: 34, icon: 'moon',
    desc: 'The last spin before each rent payment earns ×2.',
  },
  {
    id: 'fuse', name: 'Heavy-Duty Fuse', price: 22, icon: 'fuse',
    desc: 'Unstable Batteries never short out. Appliances earn +1.',
    earn(ctx, c) { if (is(ctx, c, 'appliance')) ctx.bonus(c, 1, null, 'Heavy-Duty Fuse'); },
  },
  {
    id: 'horseshoe', name: 'Lucky Horseshoe', price: 45, icon: 'horseshoe',
    desc: 'Charm multipliers are one higher (×2 becomes ×3). Black Cats can no longer jinx charms.',
    charmBonus: 1,
  },
  {
    id: 'bulk_mail', name: 'Bulk Mail Permit', price: 20, icon: 'mail',
    desc: 'Deliveries offer one more choice, and skipping a delivery pays ¤(3 + deadline number).',
    deliveryChoices: 1,
  },
  {
    id: 'second_mortgage', name: 'Second Mortgage', price: 0, icon: 'mortgage',
    desc: 'Pays you ¤45 right now. Every rent from now on is 15% higher.',
    rentMult: 1.15, grant: 45,
  },
  {
    id: 'compound_interest', name: 'Compound Interest', price: 32, icon: 'interest',
    desc: 'After each rent payment, gain 12% of the money you have left (up to ¤60).',
    interest: { rate: 0.12, cap: 60 },
  },
];

export const ITEMS = [
  { id: 'overtime_pass', name: 'Overtime Pass', price: 14, icon: 'pass', desc: '+1 spin before the current rent is due.', when: 'spin' },
  { id: 'double_shift', name: 'Double Shift', price: 18, icon: 'double', desc: 'Your next spin earns ×2.', when: 'spin' },
  { id: 'bribe', name: 'Envelope for the Landlord', price: 16, icon: 'envelope', desc: 'The current rent is 15% lower.', when: 'any' },
  { id: 'pest_control', name: 'Pest Control', price: 8, icon: 'spray', desc: 'Removes every Mouse, Moth and Junk from your collection.', when: 'any' },
  { id: 'lucky_coin', name: 'Lucky Penny', price: 10, icon: 'penny', desc: 'Adds two Coins to your collection.', when: 'any' },
];

export const SERVICES = [
  { id: 'polish', name: 'Polish', icon: 'polish', desc: 'One symbol permanently earns +1 base.', price: 7, priceStep: 3, target: true },
  { id: 'laminate', name: 'Laminate', icon: 'laminate', desc: 'One symbol can no longer be destroyed by other symbols (it can still use itself up).', price: 9, priceStep: 3, target: true },
  { id: 'photocopy', name: 'Photocopy', icon: 'copy', desc: 'Adds a fresh copy of one of your symbols to the collection.', price: 6, priceStep: 4, target: true, rarityPrice: true },
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]));
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(r => [r.id, r]));
export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map(r => [r.id, r]));
