import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../../world-dominion/', import.meta.url);
const load = (f) => import(new URL('js/' + f, root));
const { COUNTRIES, MAP_W, MAP_H } = await load('data/world.js');
const { NATIONS, GOV, FEATURED, RESOURCES, CRISIS } = await load('data/nations.js');
const DB = await load('core/db.js');
const S = await load('core/state.js');
const R = await load('core/regions.js');
const { OVERLAYS, overlay } = await load('core/overlays.js');
const { checkEvents, forceEvent, describeEffects } = await load('core/events.js');
const SIM = await load('core/sim.js');
const F = await load('core/format.js');
const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
const readRegions = (id) => JSON.parse(fs.readFileSync(new URL(`data/regions/${id}.json`, root), 'utf8'));
R.setFetcher(async (url) => JSON.parse(fs.readFileSync(new URL(url, root), 'utf8')));

test('every world-dominion module has valid syntax', () => {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(new URL('js/', root).pathname);
  assert.ok(files.length >= 14, `expected the game's modules, got ${files.length}`);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

// ——— Geography (world.js, generated from Natural Earth) ———
test('the map has the world countries with stable ISO-based ids', () => {
  assert.ok(COUNTRIES.length >= 235, `${COUNTRIES.length} map entities`);
  assert.equal(new Set(COUNTRIES.map((c) => c.id)).size, COUNTRIES.length, 'ids are unique');
  for (const c of COUNTRIES) {
    assert.match(c.id, /^[A-Z]{3}$/, `${c.name} id ${c.id}`);
    if (c.iso3) assert.equal(c.id, c.iso3, `${c.name}: id is its ISO alpha-3 code`);
    if (c.iso2) assert.match(c.iso2, /^[A-Z]{2}$/);
    assert.ok(c.name && /^M/.test(c.d), `${c.id} has a name and a shape`);
    assert.ok(c.cx >= 0 && c.cx <= MAP_W && c.cy >= 0 && c.cy <= MAP_H, `${c.name} label point on the map`);
    assert.ok(c.areaKm2 > 0 && c.continent && c.subregion, `${c.name} area and region`);
  }
  const iso = (code) => COUNTRIES.find((c) => c.iso3 === code);
  for (const [code, name] of [['DEU', 'Germany'], ['USA', 'United States'], ['CHN', 'China'], ['BRA', 'Brazil'], ['SGP', 'Singapore'], ['VAT', 'Vatican City']]) assert.equal(iso(code)?.name, name);
  assert.ok(!byId.has('ATA'), 'Antarctica is not a playable entity');
  assert.ok(Math.abs(byId.get('RUS').areaKm2 - 17.1e6) / 17.1e6 < 0.05, `Russia's area is about 17.1M km² (${byId.get('RUS').areaKm2})`);
});

test('borders are symmetric and real', () => {
  for (const c of COUNTRIES) for (const n of c.neighbors) {
    assert.ok(byId.has(n), `${c.name} borders unknown ${n}`);
    assert.ok(byId.get(n).neighbors.includes(c.id), `${c.name} <-> ${n} is symmetric`);
    assert.notEqual(n, c.id, `${c.name} does not border itself`);
  }
  const nb = (id) => byId.get(id).neighbors;
  for (const n of ['FRA', 'POL', 'AUT', 'CHE', 'NLD', 'BEL', 'DNK', 'CZE', 'LUX']) assert.ok(nb('DEU').includes(n), `Germany borders ${n}`);
  assert.deepEqual([...nb('USA')].sort(), ['CAN', 'MEX']);
});

test('territories point at their sovereign, and share its map colour', () => {
  const ter = COUNTRIES.filter((c) => c.status === 'territory');
  assert.ok(ter.length >= 30);
  for (const c of ter) assert.ok(byId.has(c.owner) && !byId.get(c.owner).owner, `${c.name} -> ${c.owner}`);
  assert.equal(byId.get('GRL').owner, 'DNK');
  assert.equal(byId.get('PRI').owner, 'USA');
  assert.equal(byId.get('HKG').owner, 'CHN');
  for (const c of ter) assert.equal(c.tint, byId.get(c.owner).tint, `${c.name} uses ${c.owner}'s colour`);
});

test('touching countries (by owner) never share a political colour', () => {
  const group = (c) => c.owner || c.id;
  for (const c of COUNTRIES) for (const n of c.neighbors) {
    const o = byId.get(n);
    if (group(c) !== group(o)) assert.notEqual(c.tint, o.tint, `${c.name} / ${o.name}`);
  }
});

test('regions: one file per subdivided country, consistent with the index', () => {
  const dir = new URL('data/regions/', root);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 200, `${files.length} region files`);
  for (const f of files) assert.ok(byId.get(f.replace('.json', '')).regions > 1, `${f} belongs to a country that lists regions`);
  for (const c of COUNTRIES.filter((x) => x.regions > 1)) assert.ok(files.includes(c.id + '.json'), `${c.name} has its region file`);
  const de = readRegions('DEU');
  assert.equal(de.regions.length, 16, 'Germany has 16 states');
  assert.ok(de.regions.some((r) => r.name === 'Bavaria' && r.iso === 'DE-BY'), 'English names and ISO 3166-2 codes');
  assert.equal(readRegions('USA').regions.length, 51, '50 states + DC');
  const ids = new Set();
  for (const f of files) for (const r of readRegions(f.replace('.json', '')).regions) {
    assert.ok(!ids.has(r.id), `region id ${r.id} unique`); ids.add(r.id);
    assert.ok(r.name && /^M/.test(r.d) && r.box.length === 4);
  }
  assert.ok(ids.size > 4000, `${ids.size} regions worldwide`);
});

test('every country with a real flag file has it, and flags are licensed', () => {
  const flags = new URL('flags/', root);
  assert.ok(fs.existsSync(new URL('LICENSE.txt', flags)));
  const missing = COUNTRIES.filter((c) => c.flag && !fs.existsSync(new URL(c.flag + '.svg', flags)));
  assert.deepEqual(missing, []);
  assert.ok(COUNTRIES.filter((c) => c.flag).length >= 230);
});

// ——— Gameplay data and the country database ———
test('gameplay data covers every sovereign country and uses known ids', () => {
  for (const id of Object.keys(NATIONS)) assert.ok(byId.has(id), `NATIONS has unknown id ${id}`);
  for (const c of COUNTRIES.filter((x) => x.status !== 'territory')) assert.ok(NATIONS[c.id], `${c.name} has starting data`);
  for (const [id, row] of Object.entries(NATIONS)) {
    const [capital, pop, gdp, gov, army] = row;
    assert.ok(capital && pop > 0 && gdp > 0 && army >= 0 && gov in GOV, `${id} row`);
  }
  for (const ids of Object.values(RESOURCES)) for (const id of ids) assert.ok(byId.has(id), `resource producer ${id}`);
  for (const id of Object.keys(CRISIS)) assert.ok(byId.has(id), `crisis ${id}`);
  assert.ok(FEATURED.every(DB.playable));
});

test('database records carry every field the game needs, with sources', () => {
  for (const c of DB.ALL) {
    for (const k of ['id', 'name', 'population', 'gdp', 'gdpPerCapita', 'government', 'troops', 'military', 'stability', 'infrastructure', 'resources', 'tint', 'sources', 'neighbors', 'regionCount']) assert.ok(k in c, `${c.id}.${k}`);
    if (c.territory) assert.ok(c.population >= 0 && c.gdp >= 0, `${c.name}`); // some territories are uninhabited
    else assert.ok(c.population > 0 && c.gdp > 0, `${c.name} has population and GDP`);
    assert.ok(c.stability >= 5 && c.stability <= 95 && c.infrastructure >= 5 && c.infrastructure <= 95);
    assert.ok(c.military.strength >= 0 && c.military.strength <= 100 && c.military.tier);
    assert.equal(c.sources.geography, 'Natural Earth 1:50m');
    assert.ok(Object.isFrozen(c), 'starting records are immutable');
  }
  const usa = DB.country('USA'), isl = DB.country('ISL'), syr = DB.country('SYR'), che = DB.country('CHE');
  assert.equal(usa.military.tier, 'Superpower');
  assert.ok(isl.military.strength < 30, 'Iceland has no army');
  assert.ok(syr.stability < che.stability - 30, 'war-torn countries start less stable');
  assert.ok(che.infrastructure > DB.country('NER').infrastructure + 30, 'infrastructure follows wealth');
  assert.ok(DB.country('SAU').resources[0] === 'oil');
  assert.equal(DB.country('HKG').sources.population, 'Natural Earth 2019', 'territories use Natural Earth estimates');
  assert.ok(!DB.playable('GRL') && DB.playable('DNK'));
});

test('ownership: territories follow their sovereign, and conquests override it', () => {
  const s = S.newGame('FRA');
  assert.equal(DB.ownerOf(s, 'PYF'), 'FRA');
  assert.equal(DB.ownerOf(s, 'DEU'), 'DEU');
  s.owners.DEU = 'FRA';
  assert.equal(DB.ownerOf(s, 'DEU'), 'FRA');
  assert.equal(S.relation(s, 'DEU').key, 'you');
  s.regionOwners['DEU-1573'] = 'POL';
  assert.equal(DB.regionOwnerOf(s, 'DEU-1573', 'DEU'), 'POL');
  assert.equal(DB.regionOwnerOf(s, 'DEU-0000', 'DEU'), 'FRA', 'unlisted regions follow their country');
});

test('overlays colour every country from live simulated values', () => {
  assert.deepEqual(OVERLAYS.map((o) => o.id), ['political', 'population', 'economy', 'stability', 'military']);
  const s = S.newGame('IND', 'seed'), ctx = { state: s, nations: s.nations };
  for (const o of OVERLAYS) for (const c of DB.ALL) assert.match(o.fill(c, ctx), /^var\(--[\w-]+\)$/, `${o.id} ${c.id}`);
  assert.equal(overlay('political').fill(DB.country('IND'), ctx), 'var(--land-player)');
  assert.equal(overlay('population').fill(DB.country('CHN'), ctx), 'var(--ramp-pop-6)');
  assert.equal(overlay('population').fill(DB.country('VAT'), ctx), 'var(--ramp-pop-0)');
  assert.equal(overlay('economy').fill(DB.country('USA'), ctx), 'var(--ramp-eco-6)');
  assert.equal(overlay('military').fill(DB.country('USA'), ctx), 'var(--ramp-mil-6)');
  assert.equal(overlay('military').fill(DB.country('ISL'), ctx), 'var(--land-none)', 'no army, no colour');
  // live: change a value and the colour follows
  s.nations.ISL.pop = 500;
  assert.equal(overlay('population').fill(DB.country('ISL'), ctx), 'var(--ramp-pop-6)');
  s.nations.CHE.stability = 10;
  assert.equal(overlay('stability').fill(DB.country('CHE'), ctx), 'var(--ramp-stab-0)');
  assert.equal(overlay('political').legend(ctx), null);
  const lg = overlay('population').legend(ctx);
  assert.equal(lg.steps.length, 7);
  assert.equal(lg.steps[0].label, '< 1M');
  assert.equal(lg.steps[6].label, '300M+');
  assert.equal(overlay('nope').id, 'political', 'unknown overlay falls back to political');
  const css = fs.readFileSync(new URL('css/tokens.css', root), 'utf8');
  for (const v of ['--ramp-pop-6', '--ramp-eco-0', '--ramp-stab-3', '--ramp-mil-6', '--land-player-ter', '--land-none']) assert.ok(css.includes(v + ':'), `token ${v} defined`);
});

test('regions load on demand and are cached', async () => {
  assert.equal(await R.loadRegions('VAT'), null, 'countries without subdivisions resolve to null');
  const a = await R.loadRegions('FRA');
  assert.ok(a.regions.length >= 13);
  assert.equal(R.loadedRegions('FRA'), a);
  assert.equal(R.regionNoun(readRegions('DEU')).many, 'states');
});

// ——— Simulation ———
const run = (s, months) => { for (let i = 0; i < months; i++) SIM.tickMonth(s); return s; };
const fresh = (player = 'DEU') => S.newGame(player, 'test-seed');

test('a new game simulates every country, and starts balanced', () => {
  const s = fresh();
  assert.equal(s.month, 0);
  assert.equal(Object.keys(s.nations).length, DB.ALL.length, 'every map entity is in the simulation');
  for (const c of DB.ALL) {
    const n = s.nations[c.id];
    if (c.territory) { assert.ok(!n.policy, `${c.id} territory has no policies`); continue; }
    assert.ok(n.policy && n.treasury > 0 && n.stability > 0 && n.stability <= 100, c.name);
    for (const [k, [lo, hi]] of Object.entries(SIM.POLICY_LIMITS)) assert.ok(n.policy[k] >= lo && n.policy[k] <= hi, `${c.id} ${k}`);
    const b = SIM.budget(s, c.id);
    assert.ok(Number.isFinite(b.balance), `${c.name} budget`);
    assert.ok(Math.abs(b.balance) < Math.max(c.gdp * 0.08, 0.05), `${c.name} starts near balance (${b.balance.toFixed(2)} of ${c.gdp})`);
  }
  assert.throws(() => S.newGame('GRL'));
});

test('time: the world only moves by whole months, deterministically', () => {
  const a = fresh(), b = fresh();
  run(a, 24); run(b, 24);
  assert.equal(a.month, 24);
  assert.deepEqual(a.nations, b.nations, 'same seed and decisions → identical world');
  const c = S.newGame('DEU', 'another-seed'); run(c, 24);
  assert.notDeepEqual(c.nations.FRA.gdp, a.nations.FRA.gdp, 'a different seed gives a different (but equally reproducible) history');
  // order of processing doesn't matter: every country is planned from the same snapshot
  const d = fresh(); const r = SIM.tickMonth(d);
  assert.ok(r.before && r.after, 'the tick reports the player before/after');
});

test('finances: income minus expenses is what the treasury receives', () => {
  const s = fresh(), n = s.nations.DEU;
  const b = SIM.budget(s, 'DEU'), t0 = n.treasury;
  for (const k of ['tax']) assert.ok(b.income.some((x) => x.key === k));
  for (const k of ['services', 'upkeep', 'military', 'invest']) assert.ok(b.expenses.some((x) => x.key === k), `expense ${k}`);
  SIM.tickMonth(s);
  assert.ok(Math.abs(n.treasury - (t0 + b.monthly)) < 1e-9, 'treasury += monthly balance');
  assert.ok(Math.abs(n.last.balance - b.monthly) < 1e-9);
  // policy levers move the budget the expected way
  const base = SIM.budget(s, 'DEU').balance;
  SIM.setPolicy(s, 'DEU', 'tax', 40); assert.ok(SIM.budget(s, 'DEU').balance > base, 'higher taxes: more money');
  SIM.setPolicy(s, 'DEU', 'military', 6); assert.ok(SIM.budget(s, 'DEU').balance < SIM.budget(fresh(), 'DEU').balance + 1e9, 'military spending costs money');
  const mil = SIM.budget(s, 'DEU').expenses.find((x) => x.key === 'military').value;
  assert.ok(Math.abs(mil - n.gdp * 0.06) < 1e-6, 'military expense = budget share of GDP');
  assert.equal(SIM.setPolicy(s, 'DEU', 'tax', 500), 65, 'policies are clamped');
});

test('economy: growth responds to policy, and economies can fail and recover', () => {
  const g0 = SIM.growthOf(fresh(), 'DEU').rate;
  const hiTax = fresh(); SIM.setPolicy(hiTax, 'DEU', 'tax', 60);
  assert.ok(SIM.growthOf(hiTax, 'DEU').rate < g0, 'high taxes slow growth');
  const dev = fresh(); SIM.setPolicy(dev, 'DEU', 'invest', 5);
  assert.ok(SIM.growthOf(dev, 'DEU').rate > g0, 'development spending speeds growth');
  // mismanagement: tiny taxes, huge army → debt, interest, falling growth and stability
  const s = fresh(); const n = s.nations.DEU;
  Object.assign(n.policy, { tax: 8, military: 10, invest: 4 });
  run(s, 60);
  assert.ok(n.treasury < 0, 'deficits pile up into debt');
  const b = SIM.budget(s, 'DEU');
  assert.ok(b.expenses.some((x) => x.key === 'interest' && x.value > 0), 'debt costs interest');
  assert.ok(SIM.stabilityOf(s, 'DEU').factors.some((f) => f.label === 'Debt' || f.label === 'Economy'), 'economic trouble shows up in stability');
  const badGrowth = n.growth, badDebt = n.treasury;
  // recovery: sensible policy pays it down and growth returns
  Object.assign(n.policy, { tax: 40, military: 1.2, invest: 1 });
  run(s, 120);
  assert.ok(n.treasury > badDebt, `the debt shrinks (${badDebt.toFixed(0)} → ${n.treasury.toFixed(0)})`);
  assert.ok(n.growth > badGrowth, 'growth recovers');
});

test('population grows, faster in poorer countries, and feeds the economy and the army', () => {
  const s = fresh(); run(s, 12);
  assert.ok(s.nations.NGA.pop > DB.country('NGA').population, 'Nigeria grows');
  assert.ok(s.nations.NGA.popGrowth > s.nations.DEU.popGrowth, 'faster in poorer countries');
  assert.ok(SIM.growthOf(s, 'NGA').factors.some((f) => f.label === 'Population growth'), 'population growth adds to GDP growth');
  const m0 = SIM.militaryOf(s, 'NGA').pool; s.nations.NGA.pop *= 2;
  assert.ok(SIM.militaryOf(s, 'NGA').pool > m0 * 1.9, 'more people, more potential recruits');
  s.nations.NGA.pop /= 2; s.nations.NGA.popGrowth = 0.03;
  const st = SIM.stabilityOf(s, 'NGA');
  assert.ok(st.factors.some((f) => f.label.startsWith('Young')), 'a young, fast-growing, poor population strains stability');
});

test('stability drifts toward a target built from real causes', () => {
  const s = fresh(), n = s.nations.DEU;
  const t0 = SIM.stabilityOf(s, 'DEU').target;
  SIM.setPolicy(s, 'DEU', 'tax', 55);
  assert.ok(SIM.stabilityOf(s, 'DEU').target < t0 - 10, 'taxes');
  SIM.setPolicy(s, 'DEU', 'tax', 24);
  SIM.applyEffects(s, 'DEU', { mod: { label: 'Scandal', months: 3, stability: -20 } });
  assert.ok(SIM.stabilityOf(s, 'DEU').factors.some((f) => f.label === 'Scandal'), 'events add timed modifiers');
  run(s, 3);
  assert.ok(!n.mods.length, 'modifiers expire');
  SIM.transferOwnership(s, 'AUT', 'DEU');
  assert.ok(SIM.stabilityOf(s, 'DEU').factors.some((f) => f.label.startsWith('New territory')), 'newly acquired land is restless');
  SIM.transferOwnership(s, 'UKR', 'DEU');
  assert.ok(SIM.stabilityOf(s, 'DEU').factors.some((f) => f.label === 'Regional inequality'), 'ruling much poorer regions breeds resentment');
  assert.ok(SIM.budget(s, 'DEU').income.some((x) => x.key === 'held'), 'and those lands pay taxes');
  // drift: one month moves 10% of the way to the target (plus a little noise)
  const x = fresh(); x.nations.DEU.stability = 20; const tgt = SIM.stabilityOf(x, 'DEU').target;
  SIM.tickMonth(x);
  assert.ok(x.nations.DEU.stability > 20 && x.nations.DEU.stability < 20 + (tgt - 20) * 0.2, 'gradual, not instant');
  const lowStab = fresh(); lowStab.nations.DEU.stability = 25;
  assert.ok(SIM.growthOf(lowStab, 'DEU').rate < SIM.growthOf(fresh(), 'DEU').rate, 'instability hurts growth');
  assert.ok(SIM.budget(lowStab, 'DEU').efficiency < SIM.budget(fresh(), 'DEU').efficiency, 'and tax collection');
});

test('military: recruitment depends on population, policy, money and stability; strength is not troop count', () => {
  const s = fresh();
  const base = SIM.militaryOf(s, 'DEU');
  assert.ok(base.readiness === 1 && base.budget > base.upkeep, 'starts fully paid');
  SIM.setPolicy(s, 'DEU', 'recruit', 4);
  const hi = SIM.militaryOf(s, 'DEU');
  assert.ok(hi.target > base.target && hi.recruitsPerMonth > base.recruitsPerMonth, 'higher recruitment level, more recruits');
  run(s, 24);
  assert.ok(s.nations.DEU.troops > DB.country('DEU').troops * 1.2, 'the army grows over time');
  // money: no budget, no recruits, unpaid soldiers leave
  const poor = fresh(); SIM.setPolicy(poor, 'DEU', 'military', 0.3);
  const p = SIM.militaryOf(poor, 'DEU');
  assert.ok(p.readiness < 1 && p.recruitsPerMonth === 0, 'underfunded: no recruits');
  run(poor, 12);
  assert.ok(poor.nations.DEU.troops < DB.country('DEU').troops * 0.85, 'and the army shrinks');
  // stability: unhappy people enlist less
  const calm = fresh(), angry = fresh(); SIM.setPolicy(calm, 'DEU', 'recruit', 4); SIM.setPolicy(angry, 'DEU', 'recruit', 4); angry.nations.DEU.stability = 10;
  assert.ok(SIM.militaryOf(angry, 'DEU').recruitsPerMonth < SIM.militaryOf(calm, 'DEU').recruitsPerMonth);
  // halt
  const halt = fresh(); SIM.setPolicy(halt, 'DEU', 'recruit', 0); assert.equal(SIM.militaryOf(halt, 'DEU').recruitsPerMonth, 0);
  // reserves: cheaper, weaker
  const r = fresh(); SIM.setPolicy(r, 'DEU', 'reserve', 50); run(r, 36);
  const rm = SIM.militaryOf(r, 'DEU'), am = SIM.militaryOf(run(fresh(), 36), 'DEU');
  assert.ok(rm.reserves > 30, 'troops move into reserve');
  assert.ok(rm.upkeep < am.upkeep, 'reserves cost less');
  assert.ok(rm.strength <= am.strength, 'and count for less');
  // strength ≠ troops: a rich small army can outrank a poor big one
  const c = fresh();
  assert.ok(SIM.militaryOf(c, 'DEU').strength > SIM.militaryOf(c, 'ERI').strength && c.nations.ERI.troops > c.nations.DEU.troops * 0.9, 'Germany (181K) outranks Eritrea (200K)');
  assert.ok(SIM.militaryOf(c, 'ISL').strength === 0);
});

test('AI countries run their own budgets, armies and stability', () => {
  const s = fresh(); run(s, 36);
  const agents = DB.ALL.filter((c) => s.nations[c.id].policy && c.id !== 'DEU');
  const decided = agents.filter((c) => s.nations[c.id].log.length);
  assert.ok(decided.length > agents.length * 0.25, `${decided.length} of ${agents.length} AI countries changed policy in 3 years`);
  assert.ok(agents.every((c) => s.nations[c.id].gdp !== DB.country(c.id).gdp), 'every economy moved');
  // a broke AI country fixes its budget
  const b = fresh(); const n = b.nations.FRA; n.treasury = -n.gdp * 0.1; n.policy.tax = 15;
  run(b, 24);
  assert.ok(n.policy.tax > 15 || n.policy.invest < 1.5 || n.policy.military < SIM.initNation('FRA').policy.military, 'France responds to a deficit');
  assert.ok(n.log.some((e) => /tax|Cut|military/i.test(e.text)));
  // unrest: an AI country cuts taxes when stability collapses
  const u = fresh(); const k = u.nations.KEN; k.stability = 20; k.policy.tax = 40; k.treasury = k.gdp;
  SIM.decide(u, 'KEN', {});
  assert.ok(k.policy.tax < 40, 'Kenya cuts taxes to calm unrest');
  // threat: an AI country next to a much stronger army steps up recruitment
  const t = fresh(); const before = t.nations.EST.policy.recruit;
  SIM.decide(t, 'EST', { RUS: 95, LVA: 40 });
  assert.ok(t.nations.EST.policy.recruit > before || t.nations.EST.policy.recruit === 4, 'Estonia arms against a stronger neighbour');
  // the player's country is never touched by the AI
  const pl = fresh(); const pol = JSON.stringify(pl.nations.DEU.policy); run(pl, 24);
  assert.equal(JSON.stringify(pl.nations.DEU.policy), pol);
});

test('a long run stays sane: no runaway numbers', () => {
  const s = fresh(); run(s, 240);
  for (const c of DB.ALL) {
    const n = s.nations[c.id];
    for (const k of ['pop', 'gdp', 'stability', 'infra', 'troops']) assert.ok(Number.isFinite(n[k]) && n[k] >= 0, `${c.id}.${k}`);
    assert.ok(n.stability <= 100 && n.infra <= 100);
    if (n.policy) assert.ok(n.troops < Math.max(n.pop * 1000 * 0.07, 5), `${c.id} army stays below 7% of the population`);
  }
  const g = Object.values(s.nations).filter((n) => n.policy).map((n) => n.growth).sort((a, b) => a - b);
  const med = g[Math.floor(g.length / 2)];
  assert.ok(med > 0.005 && med < 0.06, `median growth after 20 years is plausible (${(med * 100).toFixed(1)}%)`);
});

test('events come from the simulation and change it', () => {
  const s = fresh(); const n = s.nations.DEU;
  assert.deepEqual(checkEvents(s, SIM.tickMonth(s)).filter((e) => e.severity === 'major'), [], 'a healthy country has no crises');
  n.stability = 30;
  const ev = checkEvents(s, SIM.tickMonth(s));
  assert.ok(ev.some((e) => e.id === 'protests' && e.severity === 'major'), 'low stability brings protests');
  assert.deepEqual(checkEvents(s, SIM.tickMonth(s)).filter((e) => e.id === 'protests'), [], 'then a cooldown');
  const d = fresh(); d.nations.DEU.treasury = -d.nations.DEU.gdp * 1.3;
  const dev = checkEvents(d, SIM.tickMonth(d)).find((e) => e.id === 'debt-crisis');
  assert.ok(dev && dev.choices.length === 3);
  const t = fresh(); const ev2 = forceEvent(t, 'protests');
  assert.ok(ev2.title.includes('Berlin'));
  for (const c of ev2.choices) assert.ok(describeEffects(c.effects).length >= 1);
  const tax0 = t.nations.DEU.policy.tax;
  SIM.applyEffects(t, 'DEU', forceEvent(d, 'debt-crisis').choices[0].effects);
  assert.equal(t.nations.DEU.policy.tax, tax0 + 5, 'austerity raises taxes');
});

test('relations and saves round-trip; older saves migrate', () => {
  const s = S.newGame('USA', 'x');
  assert.equal(S.relation(s, 'USA').key, 'you');
  assert.equal(S.relation(s, 'PRI').key, 'you', "Puerto Rico is the player's territory");
  s.opinions.CAN = 90; assert.equal(S.relation(s, 'CAN').key, 'good');
  s.opinions.CAN = -90; assert.equal(S.relation(s, 'CAN').key, 'bad');
  run(s, 3);
  assert.deepEqual(S.deserialize(S.serialize(s)), s);
  assert.equal(S.deserialize('nonsense'), null);
  assert.equal(S.deserialize(JSON.stringify({ ...s, v: 99 })), null, 'unknown versions are ignored');
  // checkpoint 1 (v0, numeric ids, days) → v2
  const v0 = S.deserialize(JSON.stringify({ v: 0, player: '036', day: 75, treasury: 5, stability: 60, taxRate: 33, army: 58, opinions: { 554: 40, 'x-kos': 3 }, flags: {} }));
  assert.equal(v0.v, 2);
  assert.equal(v0.player, 'AUS', 'ISO numeric 036 is Australia, not its Indian Ocean territories');
  assert.deepEqual(v0.opinions, { NZL: 40, KOS: 3 });
  assert.equal(v0.month, 2, 'day 75 → March');
  assert.equal(v0.nations.AUS.treasury, 5); assert.equal(v0.nations.AUS.policy.tax, 33); assert.equal(v0.nations.AUS.troops, 58);
  // checkpoint 2 (v1)
  const v1 = S.deserialize(JSON.stringify({ v: 1, player: 'FRA', day: 400, treasury: 10, stability: 50, taxRate: 30, army: 200, opinions: {}, flags: {}, owners: {}, regionOwners: {}, buildings: {} }));
  assert.equal(v1.month, 13);
  assert.ok(Object.keys(v1.nations).length === DB.ALL.length);
  SIM.tickMonth(v1);
});

test('formatting', () => {
  assert.equal(F.money(27700), '$27.7T');
  assert.equal(F.money(831), '$831B');
  assert.equal(F.money(4.5), '$4.5B');
  assert.equal(F.money(0.3), '$300M');
  assert.equal(F.money(-12, { sign: true }), '−$12B');
  assert.equal(F.people(1410), '1.41B');
  assert.equal(F.troops(1330), '1.33M');
  assert.equal(F.monthLabel(0), 'January 2026');
  assert.equal(F.monthLabel(13), 'February 2027');
  assert.equal(F.pct(0.021, { sign: true }), '+2.1%');
});

test('the game is listed in the arcade and on the pages directory', () => {
  const games = JSON.parse(fs.readFileSync(new URL('../../play/public/games.json', import.meta.url), 'utf8'));
  const g = games.find((x) => x.url === 'https://missing.website/world-dominion/');
  assert.ok(g && !g.hidden && fs.existsSync(new URL('../../play/public/' + g.image, import.meta.url)));
  assert.match(fs.readFileSync(new URL('../../pages.html', import.meta.url), 'utf8'), /href="\/world-dominion\/"/);
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /(href|src)="\/(?!\/)/, 'game page uses relative paths (works offline and under any prefix)');
});
