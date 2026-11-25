import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../floor-13/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { Game } = await load('engine.js');
const { FLOORS, FLOOR_BY_ID, NORMAL_FLOORS, ANOMALY_FLOORS, SECRET_FLOORS } = await load('data/floors.js');
const { ENCOUNTERS, NPCS } = await load('data/encounters.js');
const { ACHIEVEMENTS, RARITY } = await load('data/achievements.js');
const { ITEMS, LOST, BLUEPRINTS } = await load('data/items.js');
const { CLUES, CLUES_FOR_13 } = await load('data/clues.js');
const { UPGRADES } = await load('data/upgrades.js');
const { makePuzzle, fusePress, chimeInput, valvesSolved, caesar, PUZZLE_TYPES } = await load('puzzles.js');
const { makeRng } = await load('rng.js');

const memStorage = () => ({ d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = String(v); }, removeItem(k) { delete this.d[k]; } });

test('every floor-13 module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 14);
  for (const f of files) assert.equal(spawnSync(process.execPath, ['--check', f]).status, 0, f);
});

test('a substantial, well-formed floor library', () => {
  assert.ok(FLOORS.length >= 45, `floors: ${FLOORS.length}`);
  assert.ok(NORMAL_FLOORS.length >= 30);
  assert.equal(SECRET_FLOORS.length, 4);
  assert.ok(ANOMALY_FLOORS.length >= 8);
  assert.equal(new Set(FLOORS.map(f => f.id)).size, FLOORS.length);
  for (const f of FLOORS) {
    assert.equal(f.pal.length, 4, f.id);
    if (f.id === 'thirteen' || f.dynamic) continue;
    assert.ok(f.rooms.length >= 3 && f.objects.length >= 4 && f.arrive.length >= 1, f.id);
    for (const r of f.rooms) assert.match(r, /^[^|]+\|.+/, `${f.id} room "${r}"`);
    if (f.req) assert.ok(ITEMS[f.req], `${f.id} req`);
  }
});

test('encounters, items, clues and achievements cross-reference correctly', () => {
  assert.ok(ENCOUNTERS.length >= 60, `encounters: ${ENCOUNTERS.length}`);
  assert.equal(new Set(ENCOUNTERS.map(e => e.id)).size, ENCOUNTERS.length);
  const places = new Set(['any', 'anomaly', ...FLOORS.map(f => f.id), ...FLOORS.map(f => f.cat)]);
  for (const e of ENCOUNTERS) {
    for (const w of e.where) assert.ok(places.has(w), `${e.id} where ${w}`);
    if (e.npc) assert.ok(NPCS[e.npc], `${e.id} npc`);
    if (Array.isArray(e.choices)) for (const c of e.choices) { if (c.needItem) assert.ok(ITEMS[c.needItem], `${e.id} needs ${c.needItem}`); if (c.puzzle) assert.ok(PUZZLE_TYPES.includes(c.puzzle)); }
  }
  assert.ok(ACHIEVEMENTS.length >= 40, `achievements: ${ACHIEVEMENTS.length}`);
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(RARITY[a.r], a.id);
  for (const r of Object.keys(RARITY)) assert.ok(ACHIEVEMENTS.some(a => a.r === r), r);
  assert.ok(LOST.length >= 40);
  for (const l of LOST) if (l.need) assert.ok(ITEMS[l.need], l.id);
  assert.ok(CLUES.length >= CLUES_FOR_13 + 10);
  for (const f of FLOORS) for (const fx of f.fixed || []) {
    if (fx.t === 'item') assert.ok(ITEMS[fx.id], fx.id);
    if (fx.t === 'bp') assert.ok(BLUEPRINTS[fx.id], fx.id);
  }
  for (const u of UPGRADES) assert.equal(u.cost.length, u.max, u.id);
});

test('puzzles are always solvable', () => {
  for (let s = 1; s < 300; s++) {
    const rng = makeRng(s);
    const tier = 1 + (s % 3);
    const f = makePuzzle('fuses', rng, tier);
    assert.ok(!f.grid.every(Boolean));
    let solved = false; for (const i of f.sol.slice()) solved = fusePress(f, i);
    assert.ok(solved, 'fuse solution lights everything');
    const v = makePuzzle('valves', rng, tier);
    const rec = (i) => { if (i === v.weights.length) return valvesSolved(v); for (let x = 0; x <= 5; x++) { v.set[i] = x; if (rec(i + 1)) return true; } return false; };
    assert.ok(rec(0), 'valves reachable');
    const c = makePuzzle('cipher', rng, tier);
    assert.equal(caesar(c.text, -c.shift), c.answer); assert.ok(c.options.includes(c.answer));
    assert.equal(new Set(c.options).size, 4);
    const ch = makePuzzle('chime', rng, tier);
    let r; for (const n of ch.seq) r = chimeInput(ch, n); assert.equal(r, 'done');
    assert.match(makePuzzle('keypad', rng, tier).code, /^\d{4}$/);
  }
});

test('nights generate valid floors and the save round-trips', () => {
  const storage = memStorage();
  const g = new Game(storage);
  g.newNight();
  assert.equal(Object.keys(g.R.assign).length, 12);
  for (const key of ['1', '2', '3', '4', 'R', 'R', 'R']) {
    const r = g.ride(key);
    assert.ok(r.ok, key);
    const f = g.floor();
    assert.ok(f.rooms.length >= 3);
    // every room reachable from the lift lobby
    const seen = new Set([0]), q = [0];
    while (q.length) for (const a of f.rooms[q.shift()].adj) if (!seen.has(a)) { seen.add(a); q.push(a); }
    assert.equal(seen.size, f.rooms.length, `${f.type} connected`);
    // keypad codes are always written down somewhere on the floor
    for (const room of f.rooms) if (room.lock?.puzzle?.type === 'keypad' && !room.fixedLock) assert.ok(f.rooms.some(r2 => r2.objs.some(o => o.loot.t === 'code' && o.loot.code === room.lock.puzzle.code)), 'code note placed');
    g.returnToLift();
  }
  const reloaded = new Game(storage);
  assert.equal(reloaded.S.night, 1);
  assert.equal(reloaded.R.rides, 7);
  reloaded.reset();
  assert.equal(new Game(storage).S.night, 0);
});

test('a long automated playthrough reaches Floor 13 and an ending without errors', () => {
  const g = new Game(memStorage());
  const pick = a => a[Math.floor(Math.random() * a.length)];
  for (let n = 0; n < 150 && !Object.keys(g.S.endings).length; n++) {
    g.newNight();
    for (let guard = 0; g.R && guard < 500; guard++) {
      if (!g.R.cur) {
        for (const u of UPGRADES) g.buyUpgrade(u.id);
        for (const s of ['flashlight', 'crowbar', 'lockpicks', 'map', 'bolt_cutters']) g.buySupply(s);
        const open = g.secretButtons().filter(b => b.ok).map(b => b.key);
        const key = open.includes('13') ? '13' : pick([...g.wiredButtons(), 'R', ...open]);
        assert.ok(g.ride(key).ok);
        if (g.settle()) break;
        continue;
      }
      const room = g.room();
      if (room.enc && !room.enc.done) {
        let v = g.openEncounter(room.enc.id, room);
        for (let d = 0; d < 4 && v && v.choices; d++) {
          const opts = v.choices.filter(c => !c.why); if (!opts.length) break;
          const c = opts.find(o => /stairs/.test(o.label)) || pick(opts);
          const res = g.chooseEncounter(c.ref);
          v = res.puzzle ? g.puzzleForEncounter(true, { type: res.puzzle, moves: 5, min: 3 }) : res;
          if (!v || v.done || v.ended) break;
        }
        g.closeEncounter();
        if (!g.R) break;
      }
      if (g.settle() || !g.R.cur) continue;
      const objs = room.objs.map((o, i) => [o, i]).filter(([o]) => !o.done);
      if (objs.length && Math.random() < 0.6) g.search(pick(objs)[1]);
      else {
        const to = pick(room.adj); const m = g.move(to);
        if (m.locked) m.room.lock.kind === 'item' ? g.unlockWith(to, 'item') : g.solveLock(to);
        if (Math.random() < 0.12) g.returnToLift();
      }
      for (const it of ['tea', 'coffee']) if (g.R && g.R.comp < 40 && g.has(it)) g.useItem(it);
      g.settle();
    }
    if (g.R) g.endNight('dawn');
  }
  assert.ok(g.S.floorsSeen.thirteen, 'reached Floor 13');
  assert.ok(g.S.endings.ground, 'saw an ending');
  assert.ok(Object.keys(g.S.achievements).length >= 20);
});
