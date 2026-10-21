import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../idle-empire/js/', import.meta.url);
const { default: BigNum } = await import(new URL('bigNum.js', dir));
const { formatNumber, formatGoal } = await import(new URL('numberFormatter.js', dir));
const { createState } = await import(new URL('gameState.js', dir));
const economy = await import(new URL('economy.js', dir));
const { BUILDINGS, BUILDINGS_BY_ID } = await import(new URL('buildings.js', dir));
const { ECONOMY } = await import(new URL('config.js', dir));
const progression = await import(new URL('progression.js', dir));
const milestones = await import(new URL('milestones.js', dir));
const unlockAll = s => { for (const b of BUILDINGS) s.buildingsUnlocked[b.id] = true; return s; };

test('every idle-empire module has valid syntax', () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 7);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('BigNum: arithmetic, comparison and values far past 1e308', () => {
  const n = x => BigNum.from(x);
  assert.equal(n(2).add(3).toNumber(), 5);
  assert.equal(n(10).sub(3).toNumber(), 7);
  assert.equal(n(3).sub(10).toNumber(), -7);
  assert.equal(n(6).mul(7).toNumber(), 42);
  assert.equal(n(1).div(4).toNumber(), 0.25);
  assert.ok(Math.abs(n(1.15).pow(10).toNumber() - 1.15 ** 10) < 1e-9);
  assert.deepEqual(n(1000).parts(), { m: 1, e: 3 });
  assert.equal(n(19).add(1).toNumber(), 20); // small values stay exact doubles
  assert.equal(n(10).sub(3).toNumber(), 7);
  assert.equal(n(0.1).add(0.2).toNumber().toFixed(10), '0.3000000000');
  const huge = n('1.5e400');
  assert.deepEqual(huge.parts(), { m: 1.5, e: 400 });
  assert.equal(huge.mul(huge).parts().e, 800);
  assert.equal(n(1e299).mul(1e299).parts().e, 598); // crosses into the large form
  assert.equal(n('1e400').div('1e399').toNumber(), 10); // and back again
  assert.equal(BigNum.from(n(1e21).toJSON()).toNumber(), 1e21);
  assert.equal(huge.toNumber(), Infinity);
  assert.ok(huge.gt(n(1e308)) && n(1e308).lt(huge));
  assert.equal(huge.add(1).toString(), huge.toString()); // tiny addend is dropped, not NaN
  assert.equal(BigNum.from(huge.toJSON()).toString(), huge.toString());
  assert.ok(n(-5).lt(n(2)) && n(-5).lt(n(-2)) && n(0).eq(n(0)));
  assert.equal(n(7.9).floor().toNumber(), 7); assert.equal(n(7.1).ceil().toNumber(), 8);
});

test('BigNum: invalid input never produces NaN or Infinity', () => {
  for (const bad of [NaN, Infinity, -Infinity, 'abc', '', null, undefined, {}, '1e']) {
    const v = BigNum.from(bad);
    assert.ok(v.isZero(), String(bad));
  }
  assert.ok(BigNum.from(5).div(0).isZero());
  assert.ok(Number.isFinite(BigNum.from(5).div(0).toNumber()));
});

test('formatNumber: small, separated, suffixed and scientific', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(0.1), '0.1');
  assert.equal(formatNumber(0.30000000000000004), '0.3');
  assert.equal(formatNumber(4.56), '4.5');
  assert.equal(formatNumber(15), '15');
  assert.equal(formatNumber(999.99), '999.9');
  assert.equal(formatNumber(12345), '12,345');
  assert.equal(formatNumber(999999), '999,999');
  assert.equal(formatNumber(1234567), '1.23 M');
  assert.equal(formatNumber(45678901234), '45.6 B');
  assert.equal(formatNumber(999999999999), '999 B'); // cut, never rounded up to 1000 B
  assert.equal(formatNumber(1e15), '1.00 Qa');
  assert.equal(formatNumber('1.234e70'), '1.23e70');
  assert.equal(formatNumber('4.5e123456'), '4.50e123456');
  assert.equal(formatNumber(-2500000), '-2.50 M');
  // goals drop trailing zeros
  assert.deepEqual([1e6, 1.5e9, 2.25e12, 1e15, 12345, 100, 0.5, '1e70', '1.5e70'].map(formatGoal),
    ['1 M', '1.5 B', '2.25 T', '1 Qa', '12,345', '100', '0.5', '1e70', '1.5e70']);
});

test('building costs: escalate by the growth factor and sum in closed form', () => {
  const stall = BUILDINGS_BY_ID.stall;
  assert.equal(economy.buildingCost(stall, 0).toNumber(), 15);
  assert.equal(economy.buildingCost(stall, 1).toNumber(), Math.ceil(15 * 1.15));
  assert.equal(economy.buildingCost(stall, 10).toNumber(), Math.ceil(15 * 1.15 ** 10));
  let sum = 0; for (let k = 3; k < 13; k++) sum += Math.ceil(15 * 1.15 ** k);
  assert.equal(economy.buildingCost(stall, 3, 10).toNumber(), sum); // bulk = exact sum of single prices
  const far = economy.buildingCost(stall, 10000); // 15 * 1.15^10000 is ~1e608
  assert.ok(far.parts().e > 600 && far.parts().e < 620);
  for (let i = 1; i < BUILDINGS.length; i++) assert.ok(BUILDINGS[i].baseCost > BUILDINGS[i - 1].baseCost);
});

test('clicking earns currency and counts clicks', () => {
  const s = createState();
  for (let i = 0; i < 20; i++) economy.click(s);
  assert.equal(s.currency.toNumber(), 20);
  assert.equal(s.totalEarned.toNumber(), 20);
  assert.equal(s.totalClicks, 20);
});

test('buying: validates funds, spends exactly the price, raises the next price', () => {
  const s = createState();
  assert.equal(economy.buyBuilding(s, 'stall'), null); // nothing in hand
  assert.equal(s.buildings.stall, 0);
  assert.equal(economy.buyBuilding(s, 'nope'), null);
  s.currency = BigNum.from(20);
  const bought = economy.buyBuilding(s, 'stall');
  assert.equal(bought.count, 1);
  assert.equal(bought.cost.toNumber(), 15);
  assert.equal(s.currency.toNumber(), 5);
  assert.equal(s.buildings.stall, 1);
  assert.equal(economy.nextCost(s, 'stall').toNumber(), 18);
  assert.equal(economy.buyBuilding(s, 'stall'), null); // 5 < 18
  assert.equal(s.currency.toNumber(), 5);
});

test('passive income follows owned buildings and elapsed time', () => {
  const s = createState();
  s.buildings.stall = 9; s.buildings.workshop = 2; // below the 10-owned milestone
  assert.equal(economy.productionPerSecond(s).toNumber(), 2.9);
  economy.tick(s, 10);
  assert.equal(Math.round(s.currency.toNumber()), 29);
  assert.equal(Math.round(s.totalEarned.toNumber()), 29);
  for (const bad of [0, -5, NaN, Infinity]) economy.tick(s, bad);
  assert.equal(Math.round(s.currency.toNumber()), 29);
});

test('a long simulated session: buy greedily for an hour without breaking', () => {
  const s = createState();
  for (let t = 0; t < 3600; t++) {
    for (let c = 0; c < 5; c++) economy.click(s); // 5 clicks per second
    progression.checkProgress(s);
    for (const def of [...BUILDINGS].reverse()) while (economy.buyBuilding(s, def.id)) { /* buy */ }
    economy.tick(s, 1);
    assert.ok(s.currency.sign() >= 0);
  }
  assert.ok(Number.isFinite(s.currency.toNumber()));
  assert.ok(economy.productionPerSecond(s).toNumber() > 100);
  assert.ok(s.totalEarned.gte(s.currency));
});

// ---- phase 2: bulk buying and the economy config ----

const sumSingles = (def, owned, count) => {
  let t = BigNum.from(0);
  for (let i = 0; i < count; i++) t = t.add(economy.buildingCost(def, owned + i, 1));
  return t;
};

test('bulk prices equal the sum of single prices, across the exact/closed-form boundary', () => {
  for (const def of BUILDINGS) {
    for (const [owned, count] of [[0, 1], [0, 10], [7, 100], [200, 100], [250, 40], [1000, 25]]) {
      const bulk = economy.buildingCost(def, owned, count), singles = sumSingles(def, owned, count);
      const rel = Math.abs(bulk.sub(singles).div(singles).toNumber());
      assert.ok(rel < 1e-12, `${def.id} ${owned}+${count}: ${bulk} vs ${singles}`);
    }
  }
  assert.ok(economy.buildingCost(BUILDINGS_BY_ID.stall, 0, 0).isZero());
  assert.ok(economy.buildingCost(BUILDINGS_BY_ID.stall, 0, -3).isZero());
  assert.ok(economy.buildingCost(BUILDINGS_BY_ID.stall, 0, NaN).isZero());
});

test('maxAffordable: cost(n) fits the budget and cost(n + 1) does not', () => {
  const budgets = [0, 14, 15, 16, 32, 33, 1000, 123456, 9.99e15, 1e20, 1e100, '1e400', '3.3e5000'];
  for (const def of BUILDINGS) for (const owned of [0, 1, 37, 300, 2000]) for (const b of budgets) {
    const money = BigNum.from(b);
    const n = economy.maxAffordable(def, owned, money);
    if (n > 0) assert.ok(economy.buildingCost(def, owned, n).lte(money), `${def.id} ${owned} ${b} n=${n}`);
    if (n < ECONOMY.maxPurchase) assert.ok(economy.buildingCost(def, owned, n + 1).gt(money), `${def.id} ${owned} ${b} n=${n}+1`);
  }
  assert.equal(economy.maxAffordable(BUILDINGS_BY_ID.stall, 0, 15 + 18), 2);
  assert.equal(economy.maxAffordable(BUILDINGS_BY_ID.stall, 0, 15 + 18 - 1), 1);
});

test('buy modes: x1 / x10 / x100 are all-or-nothing, Max buys everything affordable', () => {
  const s = createState();
  assert.equal(s.buyMode, 1);
  const cost10 = economy.buildingCost(BUILDINGS_BY_ID.stall, 0, 10);
  s.currency = cost10.sub(1);
  economy.setBuyMode(s, 10);
  assert.equal(economy.quote(s, 'stall').affordable, false);
  assert.equal(economy.buyBuilding(s, 'stall'), null); // can afford 9, not 10: buys nothing
  assert.equal(s.buildings.stall, 0);
  assert.ok(s.currency.eq(cost10.sub(1)));
  s.currency = s.currency.add(1);
  assert.equal(economy.buyBuilding(s, 'stall').count, 10);
  assert.equal(s.buildings.stall, 10);
  assert.ok(s.currency.isZero());

  // ten single buys cost exactly what one x10 buy cost
  const a = unlockAll(createState()), b = unlockAll(createState());
  a.currency = b.currency = BigNum.from(1e6);
  for (let i = 0; i < 10; i++) assert.ok(economy.buyBuilding(a, 'workshop', 1));
  assert.equal(economy.buyBuilding(b, 'workshop', 10).count, 10);
  assert.ok(a.currency.eq(b.currency));
  assert.equal(a.buildings.workshop, 10);

  const m = createState();
  m.currency = BigNum.from(5000);
  economy.setBuyMode(m, 'max');
  const q = economy.quote(m, 'stall');
  const got = economy.buyBuilding(m, 'stall');
  assert.equal(got.count, q.count);
  assert.ok(got.count > 1);
  assert.ok(m.currency.sign() >= 0);
  assert.ok(m.currency.lt(economy.nextCost(m, 'stall'))); // nothing more is affordable
  assert.equal(economy.buyBuilding(m, 'stall'), null); // Max with nothing affordable
  assert.equal(economy.quote(m, 'stall').count, 1);    // quotes the next single copy

  economy.setBuyMode(m, 7);
  assert.equal(m.buyMode, ECONOMY.defaultBuyMode); // unknown modes fall back
  assert.equal(economy.buyBuilding(m, 'stall', 'lots'), null);
});

test('Buy Max with an astronomically large treasury stays finite and exact', () => {
  const s = unlockAll(createState());
  s.currency = BigNum.from('1e3000');
  const got = economy.buyBuilding(s, 'bank', 'max');
  assert.ok(got.count > 40000 && got.count < 50000, String(got.count));
  assert.ok(s.currency.sign() >= 0);
  assert.ok(s.currency.lt(economy.nextCost(s, 'bank')));
  assert.equal(s.buildings.bank, got.count);
  assert.ok(Number.isFinite(economy.productionPerSecond(s).toNumber()));
});

test('economy config: a building without its own growth uses the default', () => {
  assert.equal(economy.growthOf({ baseCost: 10 }), ECONOMY.defaultGrowth);
  assert.equal(economy.growthOf({ baseCost: 10, growth: 1.2 }), 1.2);
  assert.equal(economy.growthOf({ baseCost: 10, growth: 0.5 }), ECONOMY.defaultGrowth); // must exceed 1
  assert.equal(economy.buildingCost({ baseCost: 10, growth: 2 }, 0, 4).toNumber(), 10 + 20 + 40 + 80);
});

// ---- phase 3: upgrades and multipliers ----

const { UPGRADES, UPGRADES_BY_ID, collectModifiers } = await import(new URL('upgrades.js', dir));
const up = await import(new URL('upgradeSystem.js', dir));
const near = (a, b, msg) => assert.ok(Math.abs(BigNum.from(a).toNumber() - b) <= Math.abs(b) * 1e-9, `${msg}: ${a} vs ${b}`);
const withUpgrades = (levels, buildings = {}) => { const s = createState(); s.upgrades = levels; Object.assign(s.buildings, buildings); return s; };

test('upgrade catalogue: unique ids, valid references, sane data', () => {
  assert.equal(new Set(UPGRADES.map(u => u.id)).size, UPGRADES.length);
  assert.ok(UPGRADES.length >= 30);
  const types = new Set(['buildingMult', 'globalMult', 'ownedBonus', 'clickAdd', 'clickMult', 'clickPps']);
  for (const u of UPGRADES) {
    assert.ok(!/Foundrys|Factorys/.test(u.description), u.id);
    assert.ok(u.name && u.description && u.icon && u.cost > 0, u.id);
    assert.ok(u.unlock.length > 0 && u.effects.length > 0, u.id);
    for (const c of u.unlock) if (c.type === 'owned') assert.ok(BUILDINGS_BY_ID[c.building], u.id);
    for (const e of u.effects) {
      assert.ok(types.has(e.type), `${u.id} ${e.type}`);
      if (e.building) assert.ok(BUILDINGS_BY_ID[e.building], u.id);
      if (e.per) assert.ok(BUILDINGS_BY_ID[e.per], u.id);
    }
    if (u.repeatable) assert.ok(u.repeatable.growth > 1 && u.repeatable.maxLevel > 1, u.id);
  }
  for (const b of BUILDINGS) assert.equal(UPGRADES.filter(u => u.effects.some(e => e.type === 'buildingMult' && e.building === b.id)).length, 5);
  for (const b of BUILDINGS.slice(1)) assert.ok(UPGRADES_BY_ID[`synergy-${b.id}`], `synergy for ${b.id}`);
});

test('unlocks: conditions on clicks, ownership, earnings and production; unlocks stick', () => {
  const s = createState();
  assert.deepEqual(up.checkUnlocks(s), []);
  for (let i = 0; i < 49; i++) economy.click(s);
  assert.deepEqual(up.checkUnlocks(s), []);
  economy.click(s);
  assert.deepEqual(up.checkUnlocks(s), ['click-1']);
  assert.deepEqual(up.checkUnlocks(s), []); // reported once
  s.buildings.stall = 1;
  assert.deepEqual(up.checkUnlocks(s), ['stall-1']);
  s.buildings.workshop = 250; // 250/s: needs pps >= 25 (Overtime) and >= 50 (Gilded Strike)
  const fresh = up.checkUnlocks(s);
  assert.ok(fresh.includes('rep-global') && fresh.includes('click-pps-1') && fresh.includes('workshop-3'), fresh.join());
  assert.ok(!fresh.includes('synergy-workshop')); // needs 25 stalls too
  s.buildings.workshop = 0; s.buildings.stall = 0; // conditions no longer hold...
  up.checkUnlocks(s);
  assert.ok(s.upgradesUnlocked['rep-global'] && s.upgradesUnlocked['stall-1']); // ...but stay unlocked
  s.totalEarned = BigNum.from(1e9);
  assert.ok(up.checkUnlocks(s).includes('global-3'));
});

test('buying upgrades: locked, unaffordable, one-time and spending rules', () => {
  const s = createState();
  s.currency = BigNum.from(1e6);
  assert.equal(up.buyUpgrade(s, 'stall-1'), null); // locked
  assert.equal(up.buyUpgrade(s, 'nope'), null);
  s.buildings.stall = 1; up.checkUnlocks(s);
  const before = s.upgrades;
  assert.equal(up.buyUpgrade(s, 'stall-1').toNumber(), 150);
  assert.equal(s.currency.toNumber(), 1e6 - 150);
  assert.notEqual(s.upgrades, before); // replaced, not edited (keeps the modifier cache honest)
  assert.equal(up.buyUpgrade(s, 'stall-1'), null); // one-time
  assert.equal(s.currency.toNumber(), 1e6 - 150);
  assert.ok(!up.availableUpgrades(s).some(a => a.def.id === 'stall-1'));
  s.buildings.stall = 10; up.checkUnlocks(s);
  s.currency = BigNum.from(749);
  assert.equal(up.buyUpgrade(s, 'stall-2'), null); // costs 750
  assert.equal(s.currency.toNumber(), 749);
});

test('repeatable upgrades: price grows per level, stops at the max level', () => {
  const s = createState();
  s.totalClicks = 100; up.checkUnlocks(s);
  s.currency = BigNum.from('1e30');
  const prices = [];
  for (let i = 0; i < 25; i++) { const p = up.buyUpgrade(s, 'rep-click'); if (!p) break; prices.push(p.toNumber()); }
  assert.equal(prices.length, 20);
  assert.deepEqual(prices.slice(0, 4), [200, 500, 1250, 3125]);
  assert.equal(up.levelOf(s, 'rep-click'), 20);
  assert.ok(up.isMaxed(s, 'rep-click'));
  assert.ok(!up.availableUpgrades(s).some(a => a.def.id === 'rep-click'));
  assert.equal(economy.clickValue(s).toNumber(), 21); // 1 base + 20
});

test('multipliers stack exactly as documented', () => {
  // building tiers multiply each other
  near(economy.unitRate(withUpgrades({ 'stall-1': 1 }), BUILDINGS_BY_ID.stall), 0.2, 'one tier');
  near(economy.unitRate(withUpgrades({ 'stall-1': 1, 'stall-2': 1, 'stall-3': 1 }), BUILDINGS_BY_ID.stall), 0.8, 'three tiers');
  // other buildings are untouched
  near(economy.unitRate(withUpgrades({ 'stall-1': 1 }), BUILDINGS_BY_ID.workshop), 1, 'other building');
  // global multipliers compound with each other and with building multipliers
  near(economy.unitRate(withUpgrades({ 'workshop-1': 1, 'global-1': 1, 'global-2': 1, 'rep-global': 3 }), BUILDINGS_BY_ID.workshop),
    1 * 2 * 1.1 * 1.15 * 1.05 ** 3, 'global stack');
  // conditional: +1% per stall owned, applied after the building multipliers
  // (9 workshops: below the 10-owned milestone, so only the synergy counts here)
  const syn = withUpgrades({ 'synergy-workshop': 1, 'workshop-1': 1 }, { stall: 30, workshop: 9 });
  near(economy.unitRate(syn, BUILDINGS_BY_ID.workshop), 1 * 2 * 1.3, 'synergy');
  near(economy.productionPerSecond(syn), 30 * 0.1 * 1.5 * 1.5 + 9 * 2.6, 'pps with synergy and stall milestones');
  syn.buildings.stall = 40; // grows with the condition, no re-purchase needed
  near(economy.unitRate(syn, BUILDINGS_BY_ID.workshop), 1 * 2 * 1.4, 'synergy follows ownership');
  // clicks: (base + adds) x mults + pps x fractions
  const c = withUpgrades({ 'rep-click': 2, 'click-1': 1, 'click-2': 1, 'click-pps-1': 1, 'click-pps-2': 1 }, { workshop: 100 });
  const ms100 = 1.5 * 1.5 * 1.5 * 2; // milestones at 10, 25, 50, 100
  near(economy.clickValue(c), (1 + 2) * 2 * 2 + 100 * ms100 * 0.03, 'click stack');
  // levels above the max are clamped, never trusted
  near(collectModifiers({ 'rep-global': 999 }).global, 1.05 ** 25, 'clamped');
});

test('the preview shown before purchase matches the result after', () => {
  const s = createState();
  Object.assign(s.buildings, { stall: 30, workshop: 12, foundry: 3 });
  s.totalClicks = 200; s.totalEarned = BigNum.from(1e7);
  up.checkUnlocks(s);
  s.currency = BigNum.from('1e20');
  for (const { def } of up.availableUpgrades(s)) {
    const p = up.previewUpgrade(s, def.id);
    assert.ok(p.pps[1].gte(p.pps[0]) && p.click[1].gte(p.click[0]), def.id);
    assert.ok(p.pps[1].gt(p.pps[0]) || p.click[1].gt(p.click[0]), `${def.id} has a visible effect`);
    up.buyUpgrade(s, def.id);
    near(economy.productionPerSecond(s), p.pps[1].toNumber(), `${def.id} pps`);
    near(economy.clickValue(s), p.click[1].toNumber(), `${def.id} click`);
  }
});

test('available upgrades are sorted cheapest first', () => {
  const s = createState();
  Object.assign(s.buildings, { stall: 25, workshop: 25, foundry: 25 });
  s.totalClicks = 500; s.totalEarned = BigNum.from(1e8);
  up.checkUnlocks(s);
  const costs = up.availableUpgrades(s).map(a => a.cost.toNumber());
  assert.ok(costs.length > 10);
  assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
});

test('a simulated session: buying upgrades speeds progress and nothing breaks', () => {
  const play = useUpgrades => {
    const s = createState();
    for (let t = 0; t < 1800; t++) {
      for (let c = 0; c < 5; c++) economy.click(s);
      progression.checkProgress(s);
      if (useUpgrades) for (const { def } of up.availableUpgrades(s)) up.buyUpgrade(s, def.id);
      for (const def of [...BUILDINGS].reverse()) while (economy.buyBuilding(s, def.id, 1)) { /* buy */ }
      economy.tick(s, 1);
      assert.ok(s.currency.sign() >= 0 && Number.isFinite(s.currency.toNumber()));
    }
    return s;
  };
  const plain = play(false), upgraded = play(true);
  assert.ok(economy.productionPerSecond(upgraded).gt(economy.productionPerSecond(plain).mul(1.5)));
  assert.ok(Object.keys(upgraded.upgrades).length > 5);
});

// ---- phase 4: the empire roster and progression ----

const { skylineLevel } = await import(new URL('skyline.js', dir));
const { allMet, conditionProgress } = await import(new URL('conditions.js', dir));

test('roster: 14 buildings, rising prices and output, every field present', () => {
  assert.equal(BUILDINGS.length, 14);
  assert.equal(new Set(BUILDINGS.map(b => b.id)).size, 14);
  const kinds = new Set(BUILDINGS.map(b => b.kind));
  assert.deepEqual([...kinds].sort(), ['business', 'machine', 'worker']);
  BUILDINGS.forEach((b, i) => {
    assert.ok(b.name && b.plural && b.description && b.icon, b.id);
    if (i === 0) { assert.deepEqual(b.unlock, []); return; }
    const prev = BUILDINGS[i - 1];
    assert.ok(b.baseCost > prev.baseCost * 5 && b.baseRate > prev.baseRate * 4, b.id);
    assert.ok(b.baseCost / b.baseRate >= prev.baseCost / prev.baseRate * 0.6, `${b.id} payback`); // later is never much better value
    assert.equal(b.unlock[0].building, prev.id);
  });
});

test('tiered unlocks: buildings open in order, locked ones cannot be bought', () => {
  const s = createState();
  assert.deepEqual(Object.keys(s.buildingsUnlocked), ['stall']);
  s.currency = BigNum.from(1e6);
  assert.equal(economy.buyBuilding(s, 'workshop', 1), null);
  assert.equal(s.buildings.workshop, 0);
  assert.equal(progression.nextLockedBuilding(s).id, 'workshop');
  assert.equal(progression.lockedCount(s), 13);
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'building'), []); // needs a stall
  economy.buyBuilding(s, 'stall', 1);
  s.totalEarned = BigNum.from(24);
  assert.ok(!progression.checkProgress(s).some(e => e.type === 'building')); // and 25 earned
  s.totalEarned = BigNum.from(25);
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'building'), [{ type: 'building', id: 'workshop' }]);
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'building'), []); // reported once
  assert.ok(economy.buyBuilding(s, 'workshop', 1));
  // later buildings need five of the previous one
  const late = unlockAll(createState());
  delete late.buildingsUnlocked.mine;
  late.buildings.bank = 4; late.totalEarned = BigNum.from(1e9);
  assert.ok(!allMet(late, BUILDINGS_BY_ID.mine.unlock));
  late.buildings.bank = 5;
  assert.ok(allMet(late, BUILDINGS_BY_ID.mine.unlock));
  assert.equal(conditionProgress(late, { type: 'owned', building: 'bank', count: 10 }), 0.5);
  assert.equal(conditionProgress(late, { type: 'earned', amount: 1e12 }), 0.001);
});

test('ownership milestones: multipliers stack, events report the highest with the combined bonus', () => {
  assert.equal(milestones.milestoneMult(0), 1);
  assert.equal(milestones.milestoneMult(9), 1);
  assert.equal(milestones.milestoneMult(10), 1.5);
  assert.equal(milestones.milestoneMult(100), 1.5 ** 3 * 2);
  assert.equal(milestones.milestoneMult(10000), milestones.OWNERSHIP_MILESTONES.reduce((m, x) => m * x.mult, 1));
  assert.equal(milestones.nextMilestone(0).count, 1);
  assert.equal(milestones.nextMilestone(25).count, 50);
  assert.equal(milestones.nextMilestone(500), null);
  const s = createState();
  s.buildings.stall = 1;
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'milestone'), [{ type: 'milestone', id: 'stall', count: 1, mult: 1 }]);
  s.buildings.stall = 60; // Max buying jumped past 10, 25 and 50
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'milestone'), [{ type: 'milestone', id: 'stall', count: 50, mult: 1.5 ** 3 }]);
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'milestone'), []);
  near(economy.unitRate(s, BUILDINGS_BY_ID.stall), 0.1 * 1.5 ** 3 * economy.achievementMult(s), 'milestones in the unit rate');
});

test('empire ranks: thresholds, +5% per rank, reported once', () => {
  assert.equal(milestones.rankIndex(0), 0);
  assert.equal(milestones.rankIndex(999), 0);
  assert.equal(milestones.rankIndex(1000), 1);
  assert.equal(milestones.rankIndex('1e300'), milestones.RANKS.length - 1);
  for (let i = 1; i < milestones.RANKS.length; i++) assert.ok(milestones.RANKS[i].earned > milestones.RANKS[i - 1].earned);
  const s = createState();
  s.buildings.workshop = 1;
  s.totalEarned = BigNum.from(1e5);
  const ranks = progression.checkProgress(s).filter(e => e.type === 'rank');
  assert.deepEqual(ranks, [{ type: 'rank', index: 2 }]);
  assert.equal(s.rank, 2);
  assert.deepEqual(progression.checkProgress(s).filter(e => e.type === 'rank'), []);
  near(economy.unitRate(s, BUILDINGS_BY_ID.workshop), 1 * 1.1 * economy.achievementMult(s), 'rank bonus');
  assert.ok(economy.achievementMult(s) > 1); // checkProgress granted achievements too
});

test('progression events include newly unlocked upgrades', () => {
  const s = createState();
  s.buildings.stall = 1;
  const ev = progression.checkProgress(s).find(e => e.type === 'upgrades');
  assert.deepEqual(ev.ids, ['stall-1']);
});

test('skyline levels grow on a log scale', () => {
  assert.deepEqual([0, 1, 3, 4, 10, 31, 32, 100, 316, 317, 5000].map(skylineLevel), [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 6]);
});

test('pacing: a simulated player opens the first nine buildings within two hours', () => {
  const s = createState();
  for (let t = 0; t < 2 * 3600; t++) {
    for (let c = 0; c < 3; c++) economy.click(s);
    progression.checkProgress(s);
    for (const { def } of up.availableUpgrades(s)) up.buyUpgrade(s, def.id);
    // cheapest building first, a crude but steady strategy
    for (let k = 0; k < 20; k++) {
      const open = BUILDINGS.filter(b => s.buildingsUnlocked[b.id]);
      const pick = open.map(b => ({ b, score: economy.nextCost(s, b.id).div(economy.unitRate(s, b)).toNumber() })).sort((x, y) => x.score - y.score)[0];
      if (!economy.buyBuilding(s, pick.b.id, 1)) break;
    }
    economy.tick(s, 1);
  }
  const open = BUILDINGS.filter(b => s.buildingsUnlocked[b.id]).length;
  assert.ok(open >= 9 && open <= 11, `${open} buildings open after 2 h`);
  assert.ok(s.rank >= 4, `rank ${s.rank}`);
});

// ---- phase 5: achievements ----

const { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, ACHIEVEMENT_BONUS } = await import(new URL('achievements.js', dir));
const ach = await import(new URL('achievementSystem.js', dir));
const store = await import(new URL('achievementStore.js', dir));
const NOON = new Date(2026, 5, 1, 12, 0, 0).getTime(), TWO_AM = new Date(2026, 5, 1, 2, 0, 0).getTime();

test('achievement catalogue: unique ids, every kind of goal, hidden ones', () => {
  assert.equal(ACHIEVEMENTS.length, 72);
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.name && a.description && a.icon && typeof a.check === 'function', a.id);
  assert.ok(ACHIEVEMENTS.filter(a => a.hidden).length >= 8);
  for (const g of ['Clicking', 'Earning', 'Production', 'Buildings', 'Upgrades', 'Progress', 'Hidden']) {
    assert.ok(ACHIEVEMENTS.some(a => a.group === g), g);
  }
});

test('achievements unlock once, with a timestamp, and nothing unlocks for nothing', () => {
  const s = createState();
  assert.deepEqual(ach.checkAchievements(s, NOON), []);
  economy.click(s, NOON);
  assert.deepEqual(ach.checkAchievements(s, NOON + 5), ['clicks-1']);
  assert.equal(s.achievements['clicks-1'], NOON + 5);
  assert.deepEqual(ach.checkAchievements(s, NOON + 10), []); // never again
  assert.equal(s.achievements['clicks-1'], NOON + 5);   // and the time is kept
  for (let i = 0; i < 99; i++) economy.click(s, NOON + 2000 * (i + 1));
  const got = ach.checkAchievements(s, NOON + 1e6);
  assert.ok(got.includes('clicks-100') && got.includes('earned-100'), got.join());
  assert.equal(ach.grant(s, 'clicks-100'), false);
  assert.equal(ach.grant(s, 'not-a-thing'), false);
  assert.ok(!('not-a-thing' in s.achievements));
  assert.equal(ach.unlockedCount(s), Object.keys(s.achievements).length);
});

test('achievement reward: +1% production each, counted once', () => {
  const s = createState();
  s.buildings.workshop = 5;
  near(economy.productionPerSecond(s), 5, 'none');
  for (const id of ['clicks-1', 'clicks-100', 'earned-100']) ach.grant(s, id, NOON);
  ach.grant(s, 'clicks-1', NOON); // a second grant changes nothing
  near(economy.achievementMult(s), 1 + 3 * ACHIEVEMENT_BONUS, 'mult');
  near(economy.productionPerSecond(s), 5 * 1.03, 'with three');
});

test('hidden achievements: unusual things are noticed', () => {
  const base = () => { const s = unlockAll(createState()); return s; };
  const ids = s => ach.checkAchievements(s, NOON);
  let s = base();
  for (let i = 0; i < 15; i++) economy.click(s, NOON + i * 50); // 15 clicks in 0.7 s
  assert.ok(ids(s).includes('hidden-burst'));
  s = base(); for (let i = 0; i < 15; i++) economy.click(s, NOON + i * 200); // 15 clicks over 2.8 s
  assert.ok(!ids(s).includes('hidden-burst'));
  s = base(); s.currency = BigNum.from(777.4); assert.ok(ids(s).includes('hidden-sevens'));
  s = base(); s.currency = BigNum.from(2e6); s.buildings.stall = 10; assert.ok(ids(s).includes('hidden-hoarder'));
  s = base(); s.totalEarned = BigNum.from(1e4); assert.ok(ids(s).includes('hidden-handson'));
  s = base(); s.buildings.stall = 100; assert.ok(ids(s).includes('hidden-mono'));
  s = base(); s.buildings.stall = 100; s.buildings.workshop = 1; assert.ok(!ids(s).includes('hidden-mono'));
  s = base(); s.currency = economy.buildingCost(BUILDINGS_BY_ID.bank, 0, 1); economy.buyBuilding(s, 'bank', 1);
  assert.ok(ids(s).includes('hidden-spent'));
  s = base(); s.currency = BigNum.from(1e9); economy.buyBuilding(s, 'stall', 'max'); assert.ok(ids(s).includes('hidden-bigmax'));
  s = base(); for (let i = 0; i < 25; i++) economy.buyBuilding(s, 'bank', 1); assert.ok(ids(s).includes('hidden-window'));
  s = base(); for (let i = 0; i < 20; i++) economy.setBuyMode(s, i % 2 ? 1 : 10); assert.ok(ids(s).includes('hidden-indecisive'));
  s = base(); economy.setBuyMode(s, 1); assert.equal(s.stats.modeSwitches, 0); // re-selecting the same mode isn't a switch
  s = base(); assert.ok(ach.checkAchievements(s, TWO_AM).includes('hidden-nightowl'));
});

test('achievement progress for the collection bars', () => {
  const s = createState();
  s.totalClicks = 250;
  assert.equal(ach.achievementProgress(s, 'clicks-1000', NOON), 0.25);
  assert.equal(ach.achievementProgress(s, 'hidden-burst', NOON), 0); // hidden ones show no progress
  ach.checkAchievements(s, NOON);
  assert.equal(ach.achievementProgress(s, 'clicks-100', NOON), 1);
});

test('progression reports achievements as events', () => {
  const s = createState();
  economy.click(s, NOON);
  const ev = progression.checkProgress(s, NOON).filter(e => e.type === 'achievement');
  assert.deepEqual(ev, [{ type: 'achievement', id: 'clicks-1' }]);
});

test('achievement store: survives a reload, rejects garbage, tolerates broken storage', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  try {
    assert.deepEqual(store.loadAchievements(NOON), {}); // nothing saved yet
    const s = createState();
    ach.grant(s, 'clicks-1', NOON); ach.grant(s, 'hidden-sevens', NOON + 1);
    assert.ok(store.saveAchievements(s.achievements));
    // "refresh": a brand-new state picks them back up, and the reward with them
    const fresh = createState();
    fresh.achievements = store.loadAchievements(NOON + 100);
    assert.deepEqual(fresh.achievements, { 'clicks-1': NOON, 'hidden-sevens': NOON + 1 });
    assert.equal(ach.unlockedCount(fresh), 2);
    near(economy.achievementMult(fresh), 1.02, 'reward after reload');
    assert.deepEqual(ach.checkAchievements(fresh, NOON + 200).filter(id => id === 'clicks-1'), []); // not granted twice
    // garbage is dropped, good entries kept
    mem.set(store.STORAGE_KEY, JSON.stringify({ version: 1, unlocked: { 'clicks-1': NOON, bogus: NOON, 'earned-100': 'yesterday', 'pps-1': -5, 'owned-1': NOON + 1e10 } }));
    assert.deepEqual(store.loadAchievements(NOON), { 'clicks-1': NOON });
    for (const bad of ['{not json', 'null', '42', '[]', JSON.stringify({ unlocked: 'x' })]) {
      mem.set(store.STORAGE_KEY, bad);
      assert.deepEqual(store.loadAchievements(NOON), {}, bad);
    }
    // a full or blocked storage doesn't throw
    globalThis.localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    assert.deepEqual(store.loadAchievements(NOON), {});
    assert.equal(store.saveAchievements({ 'clicks-1': NOON }), false);
  } finally {
    delete globalThis.localStorage;
  }
});

// ---- phase 6: statistics ----

const statsMod = await import(new URL('stats.js', dir));
const report = await import(new URL('statistics.js', dir));
const rel = (a, b) => { a = BigNum.from(a); b = BigNum.from(b); return b.isZero() ? a.abs().toNumber() : a.sub(b).div(b).abs().toNumber(); };

test('statistics: the books balance over a simulated session', () => {
  const s = createState();
  let t = NOON;
  for (let sec = 0; sec < 1800; sec++) {
    for (let c = 0; c < 4; c++) economy.click(s, (t += 250));
    progression.checkProgress(s, t);
    for (const { def } of up.availableUpgrades(s)) up.buyUpgrade(s, def.id);
    for (const def of [...BUILDINGS].reverse()) while (economy.buyBuilding(s, def.id, 1)) { /* buy */ }
    economy.tick(s, 1);
  }
  const st = s.stats;
  const produced = Object.values(st.producedBy).reduce((a, b) => a.add(b), BigNum.from(0));
  assert.ok(rel(st.clickEarned.add(produced), s.totalEarned) < 1e-9, 'earned = clicks + buildings');
  assert.ok(rel(s.totalEarned.sub(st.spent), s.currency) < 1e-9, 'in hand = earned - spent');
  assert.equal(st.buildingsBought, report.totalOwned(s));
  assert.equal(st.upgradesBought, Object.values(s.upgrades).reduce((a, b) => a + b, 0));
  assert.equal(st.playTime, 1800);
  assert.ok(st.highestPps.gte(economy.productionPerSecond(s).mul(0.999)));
  assert.ok(st.highestClick.gte(1));
  assert.ok(st.clickEarned.gte(7200)); // 4 clicks x 1800 s, each worth at least 1
});

test('statistics: records, refusals and invalid ticks', () => {
  const s = unlockAll(createState());
  economy.tick(s, NaN); economy.tick(s, -1); economy.tick(s, 0);
  assert.equal(s.stats.playTime, 0);
  s.buildings.workshop = 10;
  economy.tick(s, 2);
  const peak = s.stats.highestPps;
  assert.ok(peak.gt(0));
  assert.ok(rel(s.stats.producedBy.workshop, economy.productionPerSecond(s).mul(2)) < 1e-12);
  s.buildings.workshop = 1; economy.tick(s, 1);
  assert.ok(s.stats.highestPps.eq(peak)); // a record never goes down
  economy.buyBuilding(s, 'imperial', 1);
  s.upgradesUnlocked['global-6'] = true; up.buyUpgrade(s, 'global-6');
  assert.equal(s.stats.denied, 2);
  assert.ok(s.stats.spent.isZero());
});

test('statistics: save round trip keeps every value, garbage becomes zero', () => {
  const s = unlockAll(createState());
  s.stats.spent = BigNum.from('1.5e400');
  s.stats.clickEarned = BigNum.from(12345.5);
  s.stats.producedBy.bank = BigNum.from('7e320');
  Object.assign(s.stats, { buildingsBought: 42, upgradesBought: 7, playTime: 3600.5, bestBurst: 13, denied: 3, modeSwitches: 9 });
  s.stats.highestPps = BigNum.from(99);
  const json = JSON.parse(JSON.stringify(statsMod.serializeStats(s.stats)));
  const back = statsMod.deserializeStats(json);
  assert.deepEqual(statsMod.serializeStats(back), statsMod.serializeStats(s.stats));
  assert.equal(back.spent.toString(), '1.5e400');
  const junk = statsMod.deserializeStats({ spent: -5, clickEarned: 'lots', playTime: -1, buildingsBought: 'NaN', denied: 2.7, producedBy: { bank: null, stall: '30' } });
  assert.ok(junk.spent.isZero() && junk.clickEarned.isZero());
  assert.equal(junk.playTime, 0); assert.equal(junk.buildingsBought, 0); assert.equal(junk.denied, 2);
  assert.ok(junk.producedBy.bank.isZero()); assert.equal(junk.producedBy.stall.toNumber(), 30);
  for (const bad of [null, undefined, 'x', 42]) assert.deepEqual(statsMod.serializeStats(statsMod.deserializeStats(bad)), statsMod.serializeStats(statsMod.createStats()));
});

test('statistics: production history samples every 5 s and keeps 10 minutes', () => {
  const s = createState();
  s.buildings.workshop = 3;
  assert.ok(report.sampleHistory(s, 1e6));
  assert.ok(!report.sampleHistory(s, 1e6 + 4999));
  assert.ok(report.sampleHistory(s, 1e6 + 5000));
  for (let i = 2; i < 300; i++) report.sampleHistory(s, 1e6 + i * 5000);
  assert.equal(s.session.history.length, report.HISTORY_LENGTH);
  assert.equal(s.session.history.at(-1).t, 1e6 + 299 * 5000);
  assert.equal(s.session.history[0].pps.toNumber(), 3);
});

test('statistics reports: building shares, bonuses, progress, durations', () => {
  const s = unlockAll(createState());
  Object.assign(s.buildings, { stall: 10, workshop: 5, bank: 1 });
  const rows = report.buildingBreakdown(s);
  assert.equal(rows.length, BUILDINGS.length);
  assert.ok(Math.abs(rows.reduce((a, r) => a + r.share, 0) - 1) < 1e-9);
  assert.equal(rows.find(r => r.def.id === 'mine').share, 0);
  const locked = createState(); locked.buildings.stall = 2;
  assert.deepEqual(report.buildingBreakdown(locked).map(r => r.def.id), ['stall']);
  const bonuses = report.activeBonuses(s);
  assert.ok(bonuses.some(b => /rank/i.test(b.label)) && bonuses.some(b => /Achievements/.test(b.label)));
  const prog = report.progressSummary(s);
  assert.ok(prog.find(p => p.label === 'Buildings unlocked').value.startsWith(`${BUILDINGS.length} of`));
  assert.equal(prog.find(p => p.label === 'Ownership milestones').value, `${2 + 1 + 1} of ${BUILDINGS.length * milestones.OWNERSHIP_MILESTONES.length}`);
  assert.deepEqual([0, 12.9, 65, 3600, 3725, 90061].map(statsMod.formatDuration), ['0 s', '12 s', '1 m 05 s', '1 h 00 m', '1 h 02 m', '1 d 01 h']);
});
