import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../../world-dominion/', import.meta.url);
const load = (f) => import(new URL('js/' + f, root));
const { COUNTRIES, MAP_W, MAP_H } = await load('data/world.js');
const { NATIONS, GOV, FEATURED } = await load('data/nations.js');
const S = await load('core/state.js');
const { protestEvent, describeEffects, SAMPLE_EVENT_DAY } = await load('core/events.js');
const F = await load('core/format.js');

test('every world-dominion module has valid syntax', () => {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(new URL('js/', root).pathname);
  assert.ok(files.length >= 10, `expected the game's modules, got ${files.length}`);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('the map has well-formed countries with symmetric borders', () => {
  assert.ok(COUNTRIES.length >= 170, `${COUNTRIES.length} countries`);
  const ids = new Set(COUNTRIES.map((c) => c.id));
  assert.equal(ids.size, COUNTRIES.length, 'ids are unique');
  for (const c of COUNTRIES) {
    assert.ok(c.name && /^M/.test(c.d), `${c.id} has a name and a path`);
    assert.ok(c.cx >= 0 && c.cx <= MAP_W && c.cy >= 0 && c.cy <= MAP_H, `${c.name} label point on the map`);
    assert.ok(c.box[0] <= c.cx + 1 && c.cx - 1 <= c.box[2], `${c.name} label inside its main landmass`);
    assert.ok(c.tint >= 0 && c.tint <= 5, `${c.name} tint`);
    for (const n of c.neighbors) {
      assert.ok(ids.has(n), `${c.name} borders unknown ${n}`);
      assert.ok(COUNTRIES.find((x) => x.id === n).neighbors.includes(c.id), `${c.name} <-> ${n} is symmetric`);
    }
  }
  const de = COUNTRIES.find((c) => c.name === 'Germany');
  for (const n of ['France', 'Poland', 'Austria']) assert.ok(de.neighbors.includes(COUNTRIES.find((c) => c.name === n).id), `Germany borders ${n}`);
});

test('bordering countries never share a map tint where avoidable', () => {
  let clashes = 0;
  for (const c of COUNTRIES) for (const n of c.neighbors) if (COUNTRIES.find((x) => x.id === n).tint === c.tint) clashes++;
  assert.equal(clashes, 0, 'six tints are enough for a proper colouring');
});

test('every map entity has nation data, and territories point at a real owner', () => {
  for (const c of COUNTRIES) {
    const row = NATIONS[c.id];
    assert.ok(row, `${c.name} (${c.id}) has data`);
    const [capital, pop, gdp, gov, army, owner] = row;
    assert.ok(capital && pop > 0 && gdp > 0 && army >= 0, `${c.name} numbers`);
    assert.ok(gov in GOV, `${c.name} government ${gov}`);
    if (gov === 'ter') assert.ok(S.playable(owner), `${c.name} owner ${owner} is playable`);
  }
  assert.ok(FEATURED.every(S.playable), 'featured starts are playable');
  assert.ok(!S.playable('304'), 'Greenland (a territory) is not playable');
});

test('a new game starts sensibly for every playable nation', () => {
  for (const c of COUNTRIES.filter((x) => S.playable(x.id))) {
    const s = S.newGame(c.id);
    assert.equal(s.day, 0);
    assert.ok(s.treasury > 0 && s.stability > 0 && s.stability <= 100, c.name);
    assert.ok(Number.isFinite(S.budget(s).balance), `${c.name} budget`);
    for (const n of c.neighbors) { const o = S.opinion(s, n); assert.ok(o >= -100 && o <= 100); }
  }
  assert.throws(() => S.newGame('304'));
});

test('monthly tick, taxes and effects move the numbers the right way', () => {
  const s = S.newGame('276');
  const t0 = s.treasury, b = S.budget(s);
  S.monthTick(s);
  assert.equal(s.treasury, S.money2(t0 + b.balance));
  s.taxRate = 50;
  assert.ok(S.budget(s).balance > b.balance, 'higher taxes raise the balance');
  const st = s.stability; S.monthTick(s);
  assert.ok(s.stability < st, 'high taxes erode stability');
  S.applyEffects(s, { stability: 500 }); assert.equal(s.stability, 100, 'stability is clamped');
});

test('relations and saves round-trip', () => {
  const s = S.newGame('840');
  assert.equal(S.relation(s, '840').key, 'you');
  assert.equal(S.relation(s, '630').key, 'you', "Puerto Rico is the player's territory");
  s.opinions['124'] = 90; assert.equal(S.relation(s, '124').key, 'good');
  s.opinions['124'] = -90; assert.equal(S.relation(s, '124').key, 'bad');
  s.day = 40;
  const back = S.deserialize(S.serialize(s));
  assert.deepEqual(back, s);
  assert.equal(S.deserialize('nonsense'), null);
  assert.equal(S.deserialize(JSON.stringify({ ...s, v: 99 })), null, 'other save versions are ignored');
});

test('the sample event is a major event with costed choices', () => {
  const s = S.newGame('076');
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
