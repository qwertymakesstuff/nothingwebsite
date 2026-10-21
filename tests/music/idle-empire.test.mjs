import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../idle-empire/js/', import.meta.url);
const { default: BigNum } = await import(new URL('bigNum.js', dir));
const { formatNumber } = await import(new URL('numberFormatter.js', dir));
const { createState } = await import(new URL('gameState.js', dir));
const economy = await import(new URL('economy.js', dir));
const { BUILDINGS, BUILDINGS_BY_ID } = await import(new URL('buildings.js', dir));

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
});

test('building costs: escalate by the growth factor and sum in closed form', () => {
  const stall = BUILDINGS_BY_ID.stall;
  assert.equal(economy.buildingCost(stall, 0).toNumber(), 15);
  assert.equal(economy.buildingCost(stall, 1).toNumber(), Math.ceil(15 * 1.15));
  assert.equal(economy.buildingCost(stall, 10).toNumber(), Math.ceil(15 * 1.15 ** 10));
  let sum = 0; for (let k = 3; k < 13; k++) sum += 15 * 1.15 ** k;
  assert.ok(Math.abs(economy.buildingCost(stall, 3, 10).toNumber() - Math.ceil(sum)) <= 1);
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
  const paid = economy.buyBuilding(s, 'stall');
  assert.equal(paid.toNumber(), 15);
  assert.equal(s.currency.toNumber(), 5);
  assert.equal(s.buildings.stall, 1);
  assert.equal(economy.nextCost(s, 'stall').toNumber(), 18);
  assert.equal(economy.buyBuilding(s, 'stall'), null); // 5 < 18
  assert.equal(s.currency.toNumber(), 5);
});

test('passive income follows owned buildings and elapsed time', () => {
  const s = createState();
  s.buildings.stall = 10; s.buildings.workshop = 2;
  assert.equal(economy.productionPerSecond(s).toNumber(), 3);
  economy.tick(s, 10);
  assert.equal(Math.round(s.currency.toNumber()), 30);
  assert.equal(Math.round(s.totalEarned.toNumber()), 30);
  for (const bad of [0, -5, NaN, Infinity]) economy.tick(s, bad);
  assert.equal(Math.round(s.currency.toNumber()), 30);
});

test('a long simulated session: buy greedily for an hour without breaking', () => {
  const s = createState();
  for (let t = 0; t < 3600; t++) {
    for (let c = 0; c < 5; c++) economy.click(s); // 5 clicks per second
    for (const def of [...BUILDINGS].reverse()) while (economy.buyBuilding(s, def.id)) { /* buy */ }
    economy.tick(s, 1);
    assert.ok(s.currency.sign() >= 0);
  }
  assert.ok(Number.isFinite(s.currency.toNumber()));
  assert.ok(economy.productionPerSecond(s).toNumber() > 100);
  assert.ok(s.totalEarned.gte(s.currency));
});
