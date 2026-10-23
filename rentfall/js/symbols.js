// The symbol catalogue. Each symbol is data (name, rarity, base income, tags, text) plus optional
// hooks for the four resolution phases, run by effects.js in this fixed order:
//
//   1. setup  — destruction, eating, transforming, disabling (before anything earns)
//   2. earn   — flat bonuses and penalties (+n / −n)
//   3. boost  — multipliers (×n), applied after every flat bonus
//   4. after  — counters, storage, growth and new symbols (after the spin's value is settled)
//
// Inside a phase, symbols act in reading order (left to right, top to bottom) unless they have a
// `priority` for that phase (lower acts first). Hooks only talk to the board through `ctx`
// (see effects.js), never to the DOM or the save.

// Tags used for synergies:
//   money, person, production, office, appliance, animal, pet, pest, insect, bird, plant, food,
//   drink, fruit, craft, tool, container, charm, light, decor, electric, cursed, junk, utility
//
// Categories (for the collection screen): income, multiplier, synergy, risk, utility, special.

const adjTag = (ctx, c, tag) => ctx.adj(c).filter(x => ctx.is(x, tag));
const adjId = (ctx, c, id) => ctx.adj(c).filter(x => x.id === id);
const counter = (c, key = 'count') => (c.inst.data[key] = (c.inst.data[key] || 0));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const SYMBOLS = [
  // ── Basic income ────────────────────────────────────────────────────────────
  {
    id: 'coin', name: 'Coin', rarity: 'common', base: 1, tags: ['money'], category: 'income',
    desc: 'A plain old coin. Wallets, Piggy Banks and Lucky Charms love these.',
    trigger: 'Always',
  },
  {
    id: 'wallet', name: 'Wallet', rarity: 'common', base: 1, tags: ['money'], category: 'income',
    desc: '+1 for each adjacent money symbol.',
    trigger: 'Adjacent money',
    earn(ctx, c) { const n = adjTag(ctx, c, 'money').length; if (n) ctx.bonus(c, n, c, `${plural(n, 'money symbol')} nearby`); },
  },
  {
    id: 'apple', name: 'Apple', rarity: 'common', base: 2, tags: ['food', 'fruit'], category: 'income',
    desc: 'Earns 2. +2 more if a person is adjacent (an apple a day).',
    trigger: 'Adjacent person',
    earn(ctx, c) { if (adjTag(ctx, c, 'person').length) ctx.bonus(c, 2, c, 'eaten on a break'); },
  },
  {
    id: 'flower', name: 'Flower', rarity: 'common', base: 2, tags: ['plant'], category: 'income',
    desc: 'Earns 2. +1 for each adjacent Bee.',
    trigger: 'Adjacent Bee',
    earn(ctx, c) { const n = adjId(ctx, c, 'bee').length; if (n) ctx.bonus(c, n, c, `pollinated by ${plural(n, 'bee')}`); },
  },
  {
    id: 'pigeon', name: 'Pigeon', rarity: 'common', base: 1, tags: ['animal', 'bird'], category: 'income',
    desc: '+1 for every other Pigeon on the grid (up to +4). They flock.',
    trigger: 'Other Pigeons anywhere',
    earn(ctx, c) { const n = Math.min(4, ctx.all().filter(x => x !== c && x.id === 'pigeon').length); if (n) ctx.bonus(c, n, c, 'flocking'); },
  },
  {
    id: 'candle', name: 'Candle', rarity: 'common', base: 3, tags: ['light'], category: 'income',
    desc: 'Earns 3, but burns down: destroyed after its 6th appearance.',
    trigger: 'Counts appearances',
    after(ctx, c) {
      const n = counter(c) + 1; c.inst.data.count = n;
      if (n >= 6) ctx.destroy(c, c, 'burned out'); else ctx.note(c, `${6 - n} burns left`);
    },
  },

  // ── Money and containers ───────────────────────────────────────────────────
  {
    id: 'tip_jar', name: 'Tip Jar', rarity: 'uncommon', base: 0, tags: ['money', 'container'], category: 'synergy',
    desc: '+1 for every person anywhere on the grid.',
    trigger: 'People anywhere',
    earn(ctx, c) { const n = ctx.all().filter(x => ctx.is(x, 'person')).length; if (n) ctx.bonus(c, n, c, `tips from ${plural(n, 'person')}`); },
  },
  {
    id: 'piggy_bank', name: 'Piggy Bank', rarity: 'uncommon', base: 0, tags: ['money', 'container'], category: 'synergy',
    desc: 'Earns nothing, but saves ¤1 per adjacent Coin (at least ¤1) every spin. When smashed by a Hammer it pays out double its savings.',
    trigger: 'Adjacent Coins; destroyed by Hammer',
    after(ctx, c) {
      const n = Math.max(1, adjId(ctx, c, 'coin').length);
      c.inst.data.stored = (c.inst.data.stored || 0) + n;
      ctx.note(c, `saved ¤${n} (¤${c.inst.data.stored} inside)`);
    },
    onDestroy(ctx, c) { const s = (c.inst.data.stored || 0) * 2; if (s) ctx.payout(s, c, `smashed open: ¤${s}`); },
  },
  {
    id: 'safe', name: 'Safe', rarity: 'rare', base: 0, tags: ['money', 'container'], category: 'synergy',
    desc: 'Locked. Puts ¤4 inside every spin. Pays out everything inside when opened by an adjacent Key (or destroyed some other way).',
    trigger: 'Opened by Key',
    after(ctx, c) { c.inst.data.stored = (c.inst.data.stored || 0) + 4; ctx.note(c, `¤${c.inst.data.stored} locked inside`); },
    onDestroy(ctx, c) { const s = c.inst.data.stored || 0; if (s) ctx.payout(s, c, `opened: ¤${s}`); },
  },
  {
    id: 'key', name: 'Key', rarity: 'common', base: 1, tags: ['tool'], category: 'synergy',
    desc: 'Opens adjacent Safes and makes adjacent Suspicious Packages always hold valuables. Used up when it opens something.',
    trigger: 'Adjacent Safe or Package (acts first)',
    priority: { setup: -2 },
    setup(ctx, c) {
      let used = false;
      for (const t of adjId(ctx, c, 'safe')) if (ctx.destroy(t, c, 'unlocked')) used = true;
      for (const t of adjId(ctx, c, 'package')) { t.inst.data.keyed = true; ctx.note(t, 'the Key fits the lock'); used = true; }
      if (used) ctx.destroy(c, c, 'used up');
    },
  },
  {
    id: 'hammer', name: 'Hammer', rarity: 'common', base: 1, tags: ['tool'], category: 'synergy',
    desc: 'Smashes adjacent Piggy Banks open. Breaks up adjacent Junk for +2 each.',
    trigger: 'Adjacent Piggy Bank or Junk',
    setup(ctx, c) {
      for (const t of adjId(ctx, c, 'piggy_bank')) ctx.destroy(t, c, 'smashed');
      for (const t of adjId(ctx, c, 'junk')) if (ctx.destroy(t, c, 'broken up')) ctx.bonus(c, 2, c, 'broke up Junk');
    },
  },

  // ── Office and production ──────────────────────────────────────────────────
  {
    id: 'worker', name: 'Worker', rarity: 'common', base: 1, tags: ['person'], category: 'synergy',
    desc: 'Adjacent production symbols earn +2.',
    trigger: 'Adjacent production',
    earn(ctx, c) { for (const t of adjTag(ctx, c, 'production')) ctx.bonus(t, 2, c, 'Worker on shift'); },
  },
  {
    id: 'manager', name: 'Manager', rarity: 'rare', base: 2, tags: ['person', 'office'], category: 'synergy',
    desc: 'Every Worker on the grid earns +2. Workers adjacent to the Manager earn +2 more.',
    trigger: 'Workers anywhere',
    earn(ctx, c) {
      const near = new Set(ctx.adj(c));
      for (const t of ctx.all()) if (t.id === 'worker') ctx.bonus(t, near.has(t) ? 4 : 2, c, near.has(t) ? 'supervised closely' : 'managed');
    },
  },
  {
    id: 'coffee', name: 'Coffee', rarity: 'common', base: 1, tags: ['drink', 'food'], category: 'multiplier',
    desc: 'Adjacent people earn ×2.',
    trigger: 'Adjacent person',
    boost(ctx, c) { for (const t of adjTag(ctx, c, 'person')) ctx.mult(t, 2, c, 'caffeinated'); },
  },
  {
    id: 'typewriter', name: 'Typewriter', rarity: 'common', base: 1, tags: ['production', 'office'], category: 'synergy',
    desc: '+1 for each other office symbol in the same row.',
    trigger: 'Office symbols in its row',
    earn(ctx, c) { const n = ctx.row(c).filter(x => ctx.is(x, 'office')).length; if (n) ctx.bonus(c, n, c, `${plural(n, 'office symbol')} in the row`); },
  },
  {
    id: 'calculator', name: 'Calculator', rarity: 'uncommon', base: 0, tags: ['office'], category: 'multiplier',
    desc: 'Adjacent production symbols earn ×2.',
    trigger: 'Adjacent production',
    boost(ctx, c) { for (const t of adjTag(ctx, c, 'production')) ctx.mult(t, 2, c, 'double-checked'); },
  },
  {
    id: 'overtime_clock', name: 'Overtime Clock', rarity: 'uncommon', base: 0, tags: ['production', 'office'], category: 'synergy',
    desc: 'Earns +1 for every time it has appeared before (up to +12). It never forgets.',
    trigger: 'Scales with appearances',
    earn(ctx, c) { const n = Math.min(12, counter(c)); if (n) ctx.bonus(c, n, c, `${plural(n, 'shift')} logged`); },
    after(ctx, c) { c.inst.data.count = counter(c) + 1; },
  },
  {
    id: 'sewing_machine', name: 'Sewing Machine', rarity: 'uncommon', base: 1, tags: ['production', 'appliance'], category: 'synergy',
    desc: '+2 for each adjacent Yarn.',
    trigger: 'Adjacent Yarn',
    earn(ctx, c) { const n = adjId(ctx, c, 'yarn').length; if (n) ctx.bonus(c, n * 2, c, `stitching ${plural(n, 'Yarn')}`); },
  },
  {
    id: 'microwave', name: 'Microwave', rarity: 'uncommon', base: 1, tags: ['appliance', 'production'], category: 'multiplier',
    desc: 'Adjacent food earns ×2.',
    trigger: 'Adjacent food',
    boost(ctx, c) { for (const t of adjTag(ctx, c, 'food')) ctx.mult(t, 2, c, 'reheated'); },
  },

  // ── Cats, mice and yarn ────────────────────────────────────────────────────
  {
    id: 'cat', name: 'Cat', rarity: 'common', base: 1, tags: ['animal', 'pet'], category: 'synergy',
    desc: 'Eats adjacent Mice for +6 each. +2 if next to Yarn.',
    trigger: 'Adjacent Mouse or Yarn',
    setup(ctx, c) { for (const t of adjId(ctx, c, 'mouse')) if (ctx.destroy(t, c, 'eaten by a Cat')) ctx.bonus(c, 6, c, 'caught a Mouse'); },
    earn(ctx, c) { if (adjId(ctx, c, 'yarn').length) ctx.bonus(c, 2, c, 'playing with Yarn'); },
  },
  {
    id: 'mouse', name: 'Mouse', rarity: 'common', base: 1, tags: ['animal', 'pest'], category: 'synergy',
    desc: 'Eats adjacent Cheese for +4 each. Two Mice side by side have a 20% chance to breed a new Mouse.',
    trigger: 'Adjacent Cheese or Mouse',
    setup(ctx, c) { for (const t of adjId(ctx, c, 'cheese')) if (ctx.destroy(t, c, 'nibbled away')) ctx.bonus(c, 4, c, 'ate Cheese'); },
    after(ctx, c) { if (adjId(ctx, c, 'mouse').length && ctx.chance(0.2)) ctx.add('mouse', c, 'the Mice had a baby'); },
  },
  {
    id: 'yarn', name: 'Yarn', rarity: 'common', base: 1, tags: ['craft'], category: 'synergy',
    desc: '+1 for each adjacent pet.',
    trigger: 'Adjacent pets',
    earn(ctx, c) { const n = adjTag(ctx, c, 'pet').length; if (n) ctx.bonus(c, n, c, `batted around by ${plural(n, 'pet')}`); },
  },
  {
    id: 'milk', name: 'Milk Bottle', rarity: 'common', base: 1, tags: ['drink', 'food'], category: 'synergy',
    desc: 'Adjacent pets earn +2.',
    trigger: 'Adjacent pets',
    earn(ctx, c) { for (const t of adjTag(ctx, c, 'pet')) ctx.bonus(t, 2, c, 'a saucer of milk'); },
  },
  {
    id: 'cheese', name: 'Cheese', rarity: 'common', base: 2, tags: ['food'], category: 'synergy',
    desc: 'Earns 2, and +1 more for every 3 times it has appeared (up to +4). Mice eat it.',
    trigger: 'Ages with appearances',
    earn(ctx, c) { const n = Math.min(4, Math.floor(counter(c) / 3)); if (n) ctx.bonus(c, n, c, 'nicely aged'); },
    after(ctx, c) { c.inst.data.count = counter(c) + 1; },
  },
  {
    id: 'dog', name: 'Dog', rarity: 'uncommon', base: 2, tags: ['animal', 'pet'], category: 'synergy',
    desc: '+2 for each adjacent person. Chases off adjacent Cats (they do nothing this spin). Acts first.',
    trigger: 'Adjacent people or Cats',
    priority: { setup: -1 },
    setup(ctx, c) { if (ctx.relic('cat_cafe')) return; for (const t of adjId(ctx, c, 'cat')) ctx.disable(t, c, 'chased off by a Dog'); },
    earn(ctx, c) { const n = adjTag(ctx, c, 'person').length; if (n) ctx.bonus(c, n * 2, c, `walked by ${plural(n, 'person')}`); },
  },

  // ── Garden ─────────────────────────────────────────────────────────────────
  {
    id: 'seed', name: 'Seed', rarity: 'common', base: 0, tags: ['plant'], category: 'synergy',
    desc: 'Grows into a Flower after 3 appearances (instantly if next to a Watering Can).',
    trigger: 'Counts appearances; Watering Can',
    after(ctx, c) {
      let step = adjId(ctx, c, 'watering_can').length ? 3 : 1;
      if (ctx.relic('green_thumb')) step *= 2;
      const n = counter(c) + step; c.inst.data.count = n;
      if (n >= 3) ctx.transform(c, 'flower', c, 'bloomed into a Flower'); else ctx.note(c, `growing (${n}/3)`);
    },
  },
  {
    id: 'watering_can', name: 'Watering Can', rarity: 'uncommon', base: 1, tags: ['tool'], category: 'synergy',
    desc: 'Adjacent plants earn +2. Adjacent Seeds sprout at once.',
    trigger: 'Adjacent plants',
    earn(ctx, c) { for (const t of adjTag(ctx, c, 'plant')) ctx.bonus(t, 2, c, 'watered'); },
  },
  {
    id: 'bee', name: 'Bee', rarity: 'uncommon', base: 1, tags: ['animal', 'insect'], category: 'synergy',
    desc: '+1 for each adjacent plant. Every 3rd time it appears next to a Flower, it makes a Honey Jar.',
    trigger: 'Adjacent plants and Flowers',
    earn(ctx, c) { const n = adjTag(ctx, c, 'plant').length; if (n) ctx.bonus(c, n, c, `${plural(n, 'plant')} to visit`); },
    after(ctx, c) {
      if (!adjId(ctx, c, 'flower').length) return;
      const n = counter(c, 'honey') + 1; c.inst.data.honey = n;
      if (n % 3 === 0) ctx.add('honey', c, 'made a Honey Jar'); else ctx.note(c, `honey ${n % 3}/3`);
    },
  },
  {
    id: 'honey', name: 'Honey Jar', rarity: 'uncommon', base: 3, tags: ['food'], category: 'income',
    desc: 'Earns 3. +3 if a Bee is adjacent.',
    trigger: 'Adjacent Bee',
    earn(ctx, c) { if (adjId(ctx, c, 'bee').length) ctx.bonus(c, 3, c, 'fresh from the hive'); },
  },
  {
    id: 'clover', name: 'Four-Leaf Clover', rarity: 'rare', base: 1, tags: ['charm', 'plant'], category: 'multiplier',
    desc: 'The best-earning adjacent symbol earns ×3.',
    trigger: 'Best adjacent symbol',
    boost(ctx, c) {
      const best = ctx.adj(c).filter(x => !x.disabled && ctx.valueOf(x) > 0).sort((a, b) => ctx.valueOf(b) - ctx.valueOf(a) || a.i - b.i)[0];
      if (best) ctx.mult(best, 3, c, 'lucky clover');
    },
  },

  // ── Kitchen ────────────────────────────────────────────────────────────────
  {
    id: 'bread', name: 'Bread', rarity: 'common', base: 1, tags: ['food'], category: 'synergy',
    desc: 'Adjacent birds earn +2.',
    trigger: 'Adjacent birds',
    earn(ctx, c) { for (const t of adjTag(ctx, c, 'bird')) ctx.bonus(t, 2, c, 'crumbs'); },
  },
  {
    id: 'lunchbox', name: 'Lunchbox', rarity: 'uncommon', base: 1, tags: ['container'], category: 'risk',
    desc: 'Packs (destroys) adjacent food and earns 3× each one\'s base value. Big now, gone forever.',
    trigger: 'Adjacent food',
    setup(ctx, c) {
      for (const t of adjTag(ctx, c, 'food')) { const v = t.def.base * 3; if (ctx.destroy(t, c, 'packed for lunch') && v) ctx.bonus(c, v, c, `packed ${t.def.name}`); }
    },
  },

  // ── Multipliers and decor ──────────────────────────────────────────────────
  {
    id: 'lucky_charm', name: 'Lucky Charm', rarity: 'uncommon', base: 0, tags: ['charm'], category: 'multiplier',
    desc: 'Adjacent money symbols earn ×2.',
    trigger: 'Adjacent money',
    boost(ctx, c) { for (const t of adjTag(ctx, c, 'money')) ctx.mult(t, 2, c, 'lucky'); },
  },
  {
    id: 'golden_ticket', name: 'Golden Ticket', rarity: 'legendary', base: 0, tags: ['charm'], category: 'multiplier',
    desc: 'One random other symbol that is earning something earns ×5. Acts last.',
    trigger: 'Any symbol (acts last)',
    priority: { boost: 9 },
    boost(ctx, c) {
      const pool = ctx.all().filter(x => x !== c && !x.disabled && ctx.valueOf(x) > 0);
      if (pool.length) ctx.mult(ctx.pick(pool), 5, c, 'Golden Ticket!');
    },
  },
  {
    id: 'spotlight', name: 'Spotlight', rarity: 'rare', base: 0, tags: ['light', 'decor'], category: 'multiplier',
    desc: 'The symbol directly below earns ×4 (on the bottom row: the one above).',
    trigger: 'Symbol below',
    boost(ctx, c) { const t = ctx.below(c) || ctx.above(c); if (t && !t.disabled) ctx.mult(t, 4, c, 'in the spotlight'); },
  },
  {
    id: 'neon_sign', name: 'Neon Sign', rarity: 'uncommon', base: 1, tags: ['light', 'decor', 'appliance'], category: 'synergy',
    desc: 'Every other symbol in its row earns +1.',
    trigger: 'Its row',
    earn(ctx, c) { for (const t of ctx.row(c)) ctx.bonus(t, 1, c, 'neon glow'); },
  },
  {
    id: 'battery', name: 'Unstable Battery', rarity: 'uncommon', base: 0, tags: ['electric'], category: 'risk',
    desc: 'Adjacent appliances earn ×3. Each spin a 1-in-6 chance it shorts out: destroyed, and adjacent symbols do nothing this spin. Acts first.',
    trigger: 'Adjacent appliances; random short',
    priority: { setup: -3 },
    setup(ctx, c) {
      if (ctx.relic('fuse') || !ctx.chance(1 / 6)) return;
      if (ctx.destroy(c, c, 'shorted out!')) for (const t of ctx.adj(c)) ctx.disable(t, c, 'zapped by the Battery');
    },
    boost(ctx, c) { for (const t of adjTag(ctx, c, 'appliance')) ctx.mult(t, 3, c, 'supercharged'); },
  },

  // ── Risk and reward ────────────────────────────────────────────────────────
  {
    id: 'cursed_idol', name: 'Cursed Idol', rarity: 'legendary', base: 12, tags: ['cursed'], category: 'risk',
    desc: 'Earns 12. Adjacent symbols earn −1. 15% chance each spin to destroy a random adjacent symbol.',
    trigger: 'Always; random curse',
    setup(ctx, c) {
      const pool = ctx.adj(c).filter(x => !ctx.is(x, 'cursed'));
      if (pool.length && ctx.chance(0.15)) ctx.destroy(ctx.pick(pool), c, 'claimed by the Idol');
    },
    earn(ctx, c) { for (const t of ctx.adj(c)) ctx.bonus(t, -1, c, 'cursed'); },
  },
  {
    id: 'package', name: 'Suspicious Package', rarity: 'uncommon', base: 0, tags: ['container'], category: 'risk',
    desc: 'Opens when it appears: 45% valuables (¤8 + 2 per deadline), 30% a random uncommon symbol, 25% just Junk. With an adjacent Key: always rich valuables.',
    trigger: 'Opens on appearing',
    setup(ctx, c) {
      const d = ctx.deadline;
      if (c.inst.data.keyed) { ctx.payout(14 + 4 * d, c, 'unlocked: valuables!'); ctx.destroy(c, c, 'emptied'); return; }
      const r = ctx.random();
      if (r < 0.45) { ctx.payout(8 + 2 * d, c, 'valuables inside'); ctx.destroy(c, c, 'emptied'); }
      else if (r < 0.75) { const id = ctx.randomSymbol('uncommon', ['package']); ctx.add(id, c, `a ${SYMBOL_BY_ID[id].name} was inside`); ctx.destroy(c, c, 'unpacked'); }
      else ctx.transform(c, 'junk', c, 'it was just Junk');
    },
  },
  {
    id: 'loan_shark', name: 'Loan Shark', rarity: 'rare', base: 10, tags: ['person'], category: 'risk',
    desc: 'Earns 10, but every time he shows up your current rent goes up by ¤5.',
    trigger: 'Always',
    after(ctx, c) { ctx.rentUp(5, c, 'interest: rent +¤5'); },
  },
  {
    id: 'black_cat', name: 'Black Cat', rarity: 'uncommon', base: 3, tags: ['animal', 'pet', 'cursed'], category: 'risk',
    desc: 'Earns 3. Jinxes adjacent charms: they do nothing this spin. Acts first.',
    trigger: 'Adjacent charms',
    priority: { setup: -1 },
    setup(ctx, c) { if (ctx.relic('horseshoe')) return; for (const t of adjTag(ctx, c, 'charm')) ctx.disable(t, c, 'jinxed by a Black Cat'); },
  },
  {
    id: 'gremlin', name: 'Gremlin', rarity: 'uncommon', base: 0, tags: ['cursed'], category: 'risk',
    desc: 'Destroys one adjacent appliance and sells it for parts: +10. With nothing to break it sulks: −2.',
    trigger: 'Adjacent appliances',
    setup(ctx, c) {
      const pool = adjTag(ctx, c, 'appliance');
      if (pool.length && ctx.destroy(ctx.pick(pool), c, 'taken apart by a Gremlin')) ctx.bonus(c, 10, c, 'sold the parts');
      else ctx.bonus(c, -2, c, 'nothing to break');
    },
  },
  {
    id: 'moth', name: 'Moth', rarity: 'common', base: 1, tags: ['animal', 'insect', 'pest'], category: 'synergy',
    desc: '+3 if next to a light. Eats adjacent Yarn for +2 each.',
    trigger: 'Adjacent lights or Yarn',
    setup(ctx, c) { for (const t of adjId(ctx, c, 'yarn')) if (ctx.destroy(t, c, 'eaten by a Moth')) ctx.bonus(c, 2, c, 'ate Yarn'); },
    earn(ctx, c) { if (adjTag(ctx, c, 'light').length) ctx.bonus(c, 3, c, 'drawn to the light'); },
  },

  // ── Junk ───────────────────────────────────────────────────────────────────
  {
    id: 'junk', name: 'Junk', rarity: 'common', base: 0, tags: ['junk'], category: 'special', draftable: false,
    desc: 'Worthless clutter that takes up a slot. Raccoons, Hammers and Recycling Bins deal with it.',
    trigger: 'Never',
  },
  {
    id: 'raccoon', name: 'Raccoon', rarity: 'uncommon', base: 1, tags: ['animal'], category: 'synergy',
    desc: 'Eats adjacent Junk for +5 each.',
    trigger: 'Adjacent Junk',
    setup(ctx, c) { for (const t of adjId(ctx, c, 'junk')) if (ctx.destroy(t, c, 'eaten by a Raccoon')) ctx.bonus(c, 5, c, 'ate Junk'); },
  },
  {
    id: 'recycling_bin', name: 'Recycling Bin', rarity: 'uncommon', base: 1, tags: ['container'], category: 'synergy',
    desc: 'Turns adjacent Junk into Coins (permanently). Acts before Raccoons and Hammers.',
    trigger: 'Adjacent Junk',
    priority: { setup: -1 },
    setup(ctx, c) { for (const t of adjId(ctx, c, 'junk')) ctx.transform(t, 'coin', c, 'recycled into a Coin'); },
  },

  // ── Utility ────────────────────────────────────────────────────────────────
  {
    id: 'eraser', name: 'Eraser', rarity: 'uncommon', base: 0, tags: ['utility', 'office'], category: 'utility',
    desc: 'Erases the lowest-value adjacent symbol from your collection, then itself, and pays ¤3.',
    trigger: 'Adjacent symbols',
    setup(ctx, c) {
      const t = ctx.adj(c).filter(x => x.id !== 'eraser').sort((a, b) => a.def.base - b.def.base || a.i - b.i)[0];
      if (!t) return;
      if (ctx.destroy(t, c, 'erased')) { ctx.destroy(c, c, 'worn down'); ctx.payout(3, c, 'tidy collection'); }
    },
  },
  {
    id: 'alarm_clock', name: 'Alarm Clock', rarity: 'rare', base: 1, tags: ['utility'], category: 'utility',
    desc: 'The first time it appears each deadline, you get +1 spin before rent is due.',
    trigger: 'Once per deadline',
    after(ctx, c) {
      if (c.inst.data.deadline === ctx.deadline) return;
      c.inst.data.deadline = ctx.deadline;
      ctx.extraSpin(c, 'rang early: +1 spin');
    },
  },
  {
    id: 'coupon', name: 'Coupon', rarity: 'uncommon', base: 1, tags: ['utility', 'paper'], category: 'utility',
    desc: 'While in your collection, shop prices are 10% lower (Coupons stack to 30%).',
    trigger: 'Passive (in collection)',
    passive: { discount: 0.1 },
  },
  {
    id: 'fortune_cookie', name: 'Fortune Cookie', rarity: 'common', base: 0, tags: ['food', 'utility'], category: 'utility',
    desc: 'Cracks open when it appears: pays ¤1 and gives you a free reroll (shop or delivery). Single use.',
    trigger: 'Opens on appearing',
    setup(ctx, c) { if (ctx.destroy(c, c, 'cracked open')) { ctx.payout(1, c, 'a lucky fortune'); ctx.gainReroll(1, c, '+1 free reroll'); } },
  },
  {
    id: 'mailbox', name: 'Mailbox', rarity: 'uncommon', base: 1, tags: ['utility'], category: 'utility',
    desc: 'While in your collection, deliveries offer one more choice (Mailboxes stack to 5 choices).',
    trigger: 'Passive (in collection)',
    passive: { deliveryChoices: 1 },
  },

  // ── Special (never in a collection) ────────────────────────────────────────
  {
    id: 'landlord', name: 'The Landlord', rarity: 'legendary', base: -5, tags: ['person'], category: 'special', draftable: false, board: true,
    desc: 'Final Notice: the Landlord stands in one slot every spin, earning −5.',
    trigger: 'Final deadline only',
  },
];

export const SYMBOL_BY_ID = Object.fromEntries(SYMBOLS.map(s => [s.id, s]));
export const DRAFTABLE = SYMBOLS.filter(s => s.draftable !== false);
export const PHASES = ['setup', 'earn', 'boost', 'after'];
export const CATEGORY_LABELS = {
  income: 'Basic income', multiplier: 'Multipliers', synergy: 'Synergies', risk: 'Risk & reward', utility: 'Utility', special: 'Special',
};
export const hasTag = (id, tag) => !!SYMBOL_BY_ID[id]?.tags.includes(tag);
