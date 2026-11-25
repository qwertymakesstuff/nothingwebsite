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
const { protestEvent, describeEffects, SAMPLE_EVENT_DAY } = await load('core/events.js');
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

test('overlays colour every country and describe their legend', () => {
  assert.deepEqual(OVERLAYS.map((o) => o.id), ['political', 'population', 'economy']);
  const s = S.newGame('IND');
  for (const o of OVERLAYS) for (const c of DB.ALL) assert.match(o.fill(c, { state: s }), /^var\(--[\w-]+\)$/, `${o.id} ${c.id}`);
  assert.equal(overlay('political').fill(DB.country('IND'), { state: s }), 'var(--land-player)');
  assert.equal(overlay('population').fill(DB.country('CHN'), { state: s }), 'var(--ramp-pop-6)');
  assert.equal(overlay('population').fill(DB.country('VAT'), { state: s }), 'var(--ramp-pop-0)');
  assert.equal(overlay('economy').fill(DB.country('USA'), { state: s }), 'var(--ramp-eco-6)');
  assert.equal(overlay('political').legend({ state: s }), null);
  const lg = overlay('population').legend({ state: s });
  assert.equal(lg.steps.length, 7);
  assert.equal(lg.steps[0].label, '< 1M');
  assert.equal(lg.steps[6].label, '300M+');
  assert.equal(overlay('nope').id, 'political', 'unknown overlay falls back to political');
  const css = fs.readFileSync(new URL('css/tokens.css', root), 'utf8');
  for (const v of ['--ramp-pop-6', '--ramp-eco-0', '--land-player-ter', '--land-none']) assert.ok(css.includes(v + ':'), `token ${v} defined`);
});

test('regions load on demand and are cached', async () => {
  assert.equal(await R.loadRegions('VAT'), null, 'countries without subdivisions resolve to null');
  const a = await R.loadRegions('FRA');
  assert.ok(a.regions.length >= 13);
  assert.equal(R.loadedRegions('FRA'), a);
  assert.equal(R.regionNoun(readRegions('DEU')).many, 'states');
});

// ——— Game state ———
test('a new game starts sensibly for every playable nation', () => {
  for (const c of DB.ALL.filter((x) => DB.playable(x.id))) {
    const s = S.newGame(c.id);
    assert.equal(s.day, 0);
    assert.ok(s.treasury > 0 && s.stability > 0 && s.stability <= 100, c.name);
    assert.ok(Number.isFinite(S.budget(s).balance), `${c.name} budget`);
    for (const k of ['owners', 'regionOwners', 'buildings']) assert.deepEqual(s[k], {});
  }
  assert.throws(() => S.newGame('GRL'));
});

test('monthly tick, taxes and effects move the numbers the right way', () => {
  const s = S.newGame('DEU');
  const t0 = s.treasury, b = S.budget(s);
  S.monthTick(s);
  assert.equal(s.treasury, S.money2(t0 + b.balance));
  s.taxRate = 50;
  assert.ok(S.budget(s).balance > b.balance, 'higher taxes raise the balance');
  const st = s.stability; S.monthTick(s);
  assert.ok(s.stability < st, 'high taxes erode stability');
  S.applyEffects(s, { stability: 500 }); assert.equal(s.stability, 100, 'stability is clamped');
});

test('relations and saves round-trip; checkpoint-1 saves migrate', () => {
  const s = S.newGame('USA');
  assert.equal(S.relation(s, 'USA').key, 'you');
  assert.equal(S.relation(s, 'PRI').key, 'you', "Puerto Rico is the player's territory");
  s.opinions.CAN = 90; assert.equal(S.relation(s, 'CAN').key, 'good');
  s.opinions.CAN = -90; assert.equal(S.relation(s, 'CAN').key, 'bad');
  s.day = 40;
  assert.deepEqual(S.deserialize(S.serialize(s)), s);
  assert.equal(S.deserialize('nonsense'), null);
  assert.equal(S.deserialize(JSON.stringify({ ...s, v: 99 })), null, 'unknown versions are ignored');
  const old = S.deserialize(JSON.stringify({ v: 0, player: '036', day: 12, treasury: 5, stability: 60, taxRate: 30, army: 58, opinions: { 554: 40, 'x-kos': 3 }, flags: {} }));
  assert.equal(old.v, 1);
  assert.equal(old.player, 'AUS', 'ISO numeric 036 is Australia, not its Indian Ocean territories');
  assert.deepEqual(old.opinions, { NZL: 40, KOS: 3 });
});

test('the sample event is a major event with costed choices', () => {
  const s = S.newGame('BRA');
  const ev = protestEvent(s);
  assert.equal(ev.severity, 'major');
  assert.ok(ev.title.includes('Brasília'));
  assert.ok(ev.choices.length >= 2 && ev.choices.length <= 4, 'a handful of choices');
  for (const c of ev.choices) assert.ok(describeEffects(c.effects, F.money).length >= 1);
  assert.ok(SAMPLE_EVENT_DAY > 0);
});

test('formatting', () => {
  assert.equal(F.money(27700), '$27.7T');
  assert.equal(F.money(831), '$831B');
  assert.equal(F.money(4.5), '$4.5B');
  assert.equal(F.money(0.3), '$300M');
  assert.equal(F.money(-12, { sign: true }), '−$12B');
  assert.equal(F.people(1410), '1.41B');
  assert.equal(F.troops(1330), '1.33M');
  assert.equal(F.dateLabel(0), '1 Jan 2026');
  assert.equal(F.dateLabel(31), '1 Feb 2026');
});

test('the game is listed in the arcade and on the pages directory', () => {
  const games = JSON.parse(fs.readFileSync(new URL('../../play/public/games.json', import.meta.url), 'utf8'));
  const g = games.find((x) => x.url === 'https://missing.website/world-dominion/');
  assert.ok(g && !g.hidden && fs.existsSync(new URL('../../play/public/' + g.image, import.meta.url)));
  assert.match(fs.readFileSync(new URL('../../pages.html', import.meta.url), 'utf8'), /href="\/world-dominion\/"/);
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /(href|src)="\/(?!\/)/, 'game page uses relative paths (works offline and under any prefix)');
});
