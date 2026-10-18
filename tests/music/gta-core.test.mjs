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

test('layout: hospital and station are on real, solid blocks and corners lie on the pavement ring', async () => {
  const L = await import(new URL('layout.js', dir));
  assert.ok(!L.isOpen(...L.findBlocks('H')[0]) && !L.isOpen(...L.findBlocks('L')[0]));
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

test('city map: every block has a known type, special buildings are unique, and the districts hang together', async () => {
  const L = await import(new URL('layout.js', dir));
  assert.equal(L.MAP.length, L.N); assert.ok(L.MAP.every(r => r.length === L.N));
  for (const ch of new Set(L.MAP.join(''))) assert.ok(L.TYPES[ch], 'unknown block type ' + ch);
  for (const ch of 'LEHBTVXZ') assert.equal(L.findBlocks(ch).length, 1, ch + ' should appear once');
  for (const d of ['downtown', 'residential', 'commercial', 'industrial', 'port', 'emergency', 'outskirts']) assert.ok(L.MAP.join('').split('').some(c => L.TYPES[c].district === d), d + ' missing');
  // footprints stay inside the block and leave a through-lane where an alley is promised
  for (let j = 0; j < L.N; j++) for (let i = 0; i < L.N; i++) {
    const t = L.blockType(i, j), fps = L.footprints(i, j);
    for (const f of fps) assert.ok(f[0] >= L.blockX(i) + L.INSET - 1e-6 && f[2] <= L.blockX(i) + L.B - L.INSET + 1e-6 && f[1] >= L.blockZ(j) + L.INSET - 1e-6 && f[3] <= L.blockZ(j) + L.B - L.INSET + 1e-6, `footprint outside block ${i},${j}`);
    if (t.open) assert.equal(fps.length, 0);
    if (t.alley) assert.equal(fps.length, 2);
  }
});

test('highway: height profile, layers and the ground barriers', async () => {
  const H = await import(new URL('highway.js', dir)), L = await import(new URL('layout.js', dir));
  assert.equal(H.deckHeight(0), 0); assert.equal(H.deckHeight(H.HW.w1), H.HW_H); assert.equal(H.deckHeight(L.WORLD / 2), H.HW_H); assert.equal(H.deckHeight(L.WORLD), 0);
  let prev = -1; for (let x = H.HW.w0; x <= H.HW.w1; x += 2) { const h = H.deckHeight(x); assert.ok(h >= prev); prev = h; }
  const mid = H.HW_Z, onRamp = H.HW.w0 + 10;
  assert.equal(H.nextLayer(0, onRamp, mid), 1);                       // anything on a ramp is on the highway
  assert.equal(H.nextLayer(0, L.WORLD / 2, mid), 0);                  // a ground car under the deck stays on the ground
  assert.equal(H.nextLayer(1, L.WORLD / 2, mid), 1);                  // a deck car stays on the deck
  assert.equal(H.nextLayer(1, L.WORLD / 2, mid + 20), 0);             // anything outside the corridor is on the ground
  assert.equal(H.heightFor(0, L.WORLD / 2, mid), 0); assert.equal(H.heightFor(1, L.WORLD / 2, mid), H.HW_H);
  assert.ok(H.groundBlocked(H.HW.w1 + 1, H.HW.w1 - 1, mid)); assert.ok(!H.groundBlocked(H.HW.w1 + 5, H.HW.w1 + 3, mid)); assert.ok(!H.groundBlocked(H.HW.w1 + 1, H.HW.w1 - 1, mid + 30));
  assert.ok(H.walkBlocked(onRamp, mid)); assert.ok(!H.walkBlocked(L.WORLD / 2, mid));
});

test('roads: the whole graph stays connected with the highway rules, and the deck only has ramp exits', async () => {
  const R = await import(new URL('roads.js', dir)), L = await import(new URL('layout.js', dir)), H = await import(new URL('highway.js', dir));
  for (const to of [[0, 0], [L.N, L.N], [5, 5], [L.N, 0], [0, L.N], [10, 7], [1, 7]]) for (const from of [[0, 0], [L.N, L.N], [5, 7], [0, 7]]) assert.ok(R.nodePath(from, to).length > 0 || (from[0] === to[0] && from[1] === to[1]), `no path ${from} -> ${to}`);
  // climbing the west ramp from the corner, then riding the deck east, comes out on the east ground intersection
  const up = R.nodePath([0, 7], [L.N, 7]); assert.deepEqual(up[0], [1, 7]); assert.ok(up.length <= L.N);
  // a car already on the deck cannot turn off at a cross street
  assert.equal(R.dirAllowed(5, 7, true, [0, 1]), false); assert.equal(R.dirAllowed(5, 7, true, [1, 0]), true);
  // the ground can't enter the ramps from underneath
  assert.equal(R.dirAllowed(1, 7, false, [-1, 0]), false); assert.equal(R.dirAllowed(0, 7, false, [1, 0]), true);
  assert.equal(R.layerAfter(0, 7, false, [1, 0]), true); assert.equal(R.layerAfter(1, 7, true, [-1, 0]), false);
  assert.ok(R.isRampSegment(0, 7, [1, 0]) && !R.isRampSegment(3, 7, [1, 0]));
});

test('POIs: unique ids, inside the world, never inside a building, and reachable from a road', async () => {
  const P = await import(new URL('pois.js', dir)), L = await import(new URL('layout.js', dir));
  const ids = P.POIS.map(p => p.id); assert.equal(new Set(ids).size, ids.length, 'duplicate POI ids');
  for (const p of P.POIS) {
    assert.ok(p.name && p.category && P.CATEGORIES[p.category] && p.glyph && p.icon, p.id + ' is missing a field');
    assert.ok(p.x > 0 && p.x < L.WORLD && p.z > 0 && p.z < L.WORLD, p.id + ' outside the world');
    assert.ok(!P.insideBuilding(p.x, p.z), p.id + ' is inside a building');
    if (p.category !== 'mission' && p.category !== 'health') { // somewhere a car can stop: within a road's width of a road centre line
      const [rx, rz] = p.road, dx = Math.min(...Array.from({ length: L.N + 1 }, (_, k) => Math.abs(rx - L.rc(k)))), dz = Math.min(...Array.from({ length: L.N + 1 }, (_, k) => Math.abs(rz - L.rc(k))));
      assert.ok(Math.min(dx, dz) <= L.RD / 2, p.id + ' has no road access (' + rx.toFixed(0) + ',' + rz.toFixed(0) + ')');
    }
  }
  for (const c of ['police', 'hospital', 'fire', 'dealership', 'garage', 'gas', 'store', 'clothing', 'safehouse', 'mission', 'bank', 'warehouse', 'docks', 'parking', 'landmark', 'supermarket', 'restaurant']) assert.ok(P.poisOfCategory(c).length >= 1, 'no POI of category ' + c);
  assert.equal(P.getPoi('hospital').respawn, 'hospital'); assert.ok(P.getPoi('nope') === null);
  const near = P.nearestPoi(P.getPoi('police_hq').x + 3, P.getPoi('police_hq').z, 'police'); assert.equal(near.poi.category, 'police');
});

test('mission definitions only refer to places that exist, and every giver is a real POI', async () => {
  const P = await import(new URL('pois.js', dir)), M = await import(new URL('missionDefs.js', dir)), R = await import(new URL('roads.js', dir));
  const seen = new Set();
  for (const d of M.DEFS) {
    assert.ok(!seen.has(d.id), 'duplicate mission ' + d.id); seen.add(d.id);
    const refs = [d.from, d.to, ...(d.route || [])].filter(Boolean); assert.ok(refs.length >= 2, d.id + ' needs places');
    for (const r of refs) { const t = P.resolveTarget(r); assert.ok(t, d.id + ': cannot resolve ' + r); assert.ok(R.nearestNode(t.x, t.z), 'node'); }
    for (const g of d.givers) assert.ok(P.getPoi(g) && P.getPoi(g).category === 'mission', d.id + ': bad giver ' + g);
  }
  for (const g of P.poisOfCategory('mission')) assert.ok(M.defsFor(g.id).length >= 1);
  assert.deepEqual(P.resolveTarget('deck:3').y > 0, true); assert.equal(P.resolveTarget('nope:1'), null);
});
