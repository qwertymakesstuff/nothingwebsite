import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// a tiny localStorage so the save module can run in Node
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const dir = new URL('../../gta/js/', import.meta.url);

test('every gta module has valid syntax', () => {
  const files = fs.readdirSync(dir, { recursive: true }).filter(f => String(f).endsWith('.js'));
  assert.ok(files.length >= 25);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('save: migrates the old separate keys, survives garbage, and never goes negative', async () => {
  mem.set('gta:money', '420'); mem.set('gta:bestRace', '51.5');
  const save = await import(new URL('save.js', dir));
  assert.equal(save.data.money, 420); assert.equal(save.data.bestRace, 51.5);
  save.persist(); assert.equal(JSON.parse(mem.get('gta:save')).money, 420);
  mem.set('gta:save', '{not json'); assert.equal(save.load().money, 0);
  mem.set('gta:save', JSON.stringify({ money: -5 })); assert.equal(save.load().money, 0);
  mem.set('gta:save', JSON.stringify({ money: 77, stats: { kills: 3 } })); const d = save.load();
  assert.equal(d.money, 77); assert.equal(d.stats.kills, 3); assert.equal(d.stats.jobs, 0);
});

test('state: money can be earned and spent but never overdrawn; stars follow heat', async () => {
  const save = await import(new URL('save.js', dir)), st = await import(new URL('state.js', dir));
  save.resetSave();
  st.addMoney(100); assert.equal(st.getMoney(), 100);
  assert.equal(st.spend(150), false); assert.equal(st.getMoney(), 100);
  assert.equal(st.spend(40), true); assert.equal(st.getMoney(), 60);
  assert.equal(st.loseMoney(1000), 60); assert.equal(st.getMoney(), 0);
  st.addMoney(-50); st.addMoney(NaN); assert.equal(st.getMoney(), 0);
  assert.deepEqual([0, 14, 15, 45, 90, 150, 230, 999].map(st.starsOf), [0, 0, 1, 2, 3, 4, 5, 5]);
  st.G.heat = 0; st.addHeat(9999); assert.equal(st.G.heat, 320);
});

test('roads: every intersection can reach every other and paths step one road at a time', async () => {
  const roads = await import(new URL('roads.js', dir)), L = await import(new URL('layout.js', dir));
  for (const [a, b] of [[0, 0], [L.N, L.N], [3, 5]]) {
    const path = roads.nodePath([0, 0], [a, b]);
    assert.equal(path.length, a + b);
    let prev = [0, 0]; for (const n of path) { assert.equal(Math.abs(n[0] - prev[0]) + Math.abs(n[1] - prev[1]), 1); prev = n; }
  }
  assert.deepEqual(roads.nearestNode(L.rc(2) + 3, L.rc(4) - 2), [2, 4]);
  assert.deepEqual(roads.nearestNode(-50, 9999), [0, L.N]);
});

test('layout: hospital and station are on real, non-park blocks and corners lie on the pavement ring', async () => {
  const L = await import(new URL('layout.js', dir));
  assert.ok(!L.isPark(...L.HOSPITAL) && !L.isPark(...L.STATION));
  for (let c = 0; c < 4; c++) { const [x, z] = L.corner(2, 2, c); assert.ok(x > L.blockX(2) && x < L.blockX(2) + L.B && z > L.blockZ(2) && z < L.blockZ(2) + L.B); }
});

test('signals: never green both ways, every road gets green and yellow, and the cycle repeats', async () => {
  const { lightPhase, CYCLE } = await import(new URL('signals.js', dir));
  for (const [a, b] of [[0, 0], [3, 4], [7, 7]]) {
    const seen = { x: new Set(), z: new Set() };
    for (let t = 0; t < CYCLE; t += .25) {
      const p = lightPhase(a, b, t);
      assert.ok(!(p.x === 'green' && p.z === 'green') && !(p.x !== 'red' && p.z !== 'red'), `conflict at ${t}`);
      seen.x.add(p.x); seen.z.add(p.z);
      assert.deepEqual(lightPhase(a, b, t + CYCLE), p);
    }
    for (const ax of ['x', 'z']) assert.deepEqual([...seen[ax]].sort(), ['green', 'red', 'yellow']);
  }
});

test('util.rng is deterministic (textures and buildings look the same on every load)', async () => {
  const { rng } = await import(new URL('util.js', dir));
  const a = rng(42), b = rng(42), c = rng(43);
  const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b), sc = Array.from({ length: 5 }, c);
  assert.deepEqual(sa, sb); assert.notDeepEqual(sa, sc); assert.ok(sa.every(v => v >= 0 && v < 1));
});
