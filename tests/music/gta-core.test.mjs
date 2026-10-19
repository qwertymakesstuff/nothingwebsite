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
  const P = await import(new URL('pois.js', dir)), L = await import(new URL('layout.js', dir)), C = await import(new URL('coast.js', dir));
  const ids = P.POIS.map(p => p.id); assert.equal(new Set(ids).size, ids.length, 'duplicate POI ids');
  for (const p of P.POIS) {
    assert.ok(p.name && p.category && P.CATEGORIES[p.category] && p.glyph && p.icon, p.id + ' is missing a field');
    assert.ok(p.kind === 'coast' ? C.isLand(p.x, p.z) || C.onPier(p.x, p.z) : p.x > 0 && p.x < L.WORLD && p.z > 0 && p.z < L.WORLD, p.id + ' outside the world');
    assert.ok(!P.insideBuilding(p.x, p.z), p.id + ' is inside a building');
    if (p.category !== 'mission' && p.category !== 'health' && p.kind !== 'coast') { // somewhere a car can stop: within a road's width of a road centre line
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

test('coast: land inside the city, an irregular shoreline, and walls that only exist at the water', async () => {
  const C = await import(new URL('coast.js', dir)), L = await import(new URL('layout.js', dir));
  for (let x = 5; x < L.WORLD; x += 60) for (let z = 5; z < L.WORLD; z += 60) assert.ok(C.isLand(x, z), 'city ground is land');
  const far = C.limitToLand(-2000, 300, 1); assert.ok(far.hit && C.isLand(far.x, far.z), 'a point far out at sea is pushed back to shore');
  const free = C.limitToLand(300, 300, 1); assert.equal(free.hit, false);
  const poly = C.shorePolygon(6), dists = poly.map(p => Math.hypot(p[0] - L.WORLD / 2, p[1] - L.WORLD / 2));
  assert.ok(poly.length > 40 && Math.max(...dists) - Math.min(...dists) > 40, 'the shoreline is not a straight square');
  assert.ok(C.heightFromD(10) > C.SEA_LEVEL && C.heightFromD(-1) < C.SEA_LEVEL && C.heightFromD(0) >= C.SEA_LEVEL - .001, 'terrain crosses the sea level at the waterline');
  assert.ok(C.heightFromD(-30) > C.heightFromD(-60), 'the sea floor slopes down gradually');
});

test('crime ledger: unseen crimes report nothing, a witnessed shot is one star, repeats and chases escalate', async () => {
  const C = await import(new URL('crime.js', dir)), L = new C.CrimeLedger();
  assert.equal(L.report('gunshot', { x: 1, z: 1, time: 0 }), null, 'nobody saw or heard it');
  const shot = L.report('gunshot', { x: 1, z: 1, time: 1, witnesses: 2, visible: true });
  assert.ok(shot && C.starsFor(shot.heat) === 1, 'a witnessed gunshot is exactly one star');
  const burst = L.report('gunshot', { x: 1, z: 1, time: 2, witnesses: 2, visible: true });
  assert.ok(burst.heat < shot.heat / 2, 'a burst of the same crime adds little');
  const heard = new C.CrimeLedger().report('assault', { x: 0, z: 0, time: 0, heard: 3 });
  const seen = new C.CrimeLedger().report('assault', { x: 0, z: 0, time: 0, witnesses: 1, visible: true });
  assert.ok(heard.heat < seen.heat, 'only heard counts for less than seen');
  const chased = new C.CrimeLedger().report('assault', { x: 0, z: 0, time: 0, witnesses: 1, visible: true, pursued: true });
  assert.ok(chased.heat > seen.heat, 'crimes during a pursuit escalate');
  assert.ok(new C.CrimeLedger().report('assault_cop', { x: 0, z: 0, time: 0 }), 'attacking an officer is always reported');
  assert.ok(C.CRIMES.kill_cop.heat >= 45 && C.CRIMES.collision.heat < 15, 'killing a cop is serious, a bump is not a star by itself');
  assert.ok(L.report('steal_car', { x: 0, z: 0, time: 9, witnesses: 1, visible: true }).crime.suspect === 'player');
});

test('police state machine: warn, arrest, chase, search and shoot only when the offence warrants it', async () => {
  const A = await import(new URL('copAI.js', dir)), S = A.S;
  const w = (o = {}) => ({ stars: 1, dist: 20, sees: true, speed: 0, inCar: false, driving: false, canArrest: false, copAttackAgo: 999, ...o });
  const off = (st, o = {}) => ({ state: st, stT: 0, unseenT: 0, ...o });
  assert.equal(A.officerNext(off(S.INVESTIGATING), w({ dist: 30 })), S.APPROACHING_SUSPECT, 'walks up to a nonviolent suspect');
  assert.equal(A.officerNext(off(S.APPROACHING_SUSPECT), w({ dist: 12 })), S.ISSUING_WARNING);
  assert.equal(A.officerNext(off(S.ISSUING_WARNING), w({ dist: 2, canArrest: true })), S.ATTEMPTING_ARREST);
  assert.equal(A.officerNext(off(S.ISSUING_WARNING), w({ dist: 12, speed: 8 })), S.PURSUING_ON_FOOT, 'running makes them give chase');
  assert.equal(A.officerNext(off(S.ATTEMPTING_ARREST), w({ dist: 7, speed: 8 })), S.PURSUING_ON_FOOT, 'fleeing the arrest');
  assert.notEqual(A.officerNext(off(S.APPROACHING_SUSPECT), w({ dist: 10 })), S.ENGAGING_ACTIVE_THREAT, 'no gunfire for a minor offence');
  assert.equal(A.officerNext(off(S.APPROACHING_SUSPECT), w({ stars: 3, dist: 20 })), S.ENGAGING_ACTIVE_THREAT, 'three stars: active threat');
  assert.equal(A.officerNext(off(S.APPROACHING_SUSPECT), w({ stars: 2, dist: 20, copAttackAgo: 5 })), S.ENGAGING_ACTIVE_THREAT, 'attacking an officer escalates two stars');
  assert.equal(A.officerNext(off(S.PURSUING_ON_FOOT, { unseenT: 3 }), w({ sees: false, dist: 30 })), S.SEARCHING_LAST_KNOWN_LOCATION, 'lost sight: search');
  assert.equal(A.officerNext(off(S.SEARCHING_LAST_KNOWN_LOCATION, { stT: 99 }), w({ sees: false })), S.RETURNING_TO_PATROL, 'search ends');
  assert.equal(A.officerNext(off(S.ATTEMPTING_ARREST), w({ stars: 0 })), S.RETURNING_TO_PATROL, 'no stars: back to the cruiser');
  assert.equal(A.officerNext(off(S.APPROACHING_SUSPECT), w({ inCar: true, speed: 20 })), S.RETURNING_TO_PATROL, 'a speeding car cannot be chased on foot');
  // arrest needs the suspect to stand still, close and in the open
  let h = 0; for (let i = 0; i < 30; i++) h = A.arrestStep(h, { canArrest: true, speed: 0, dist: 2 }, .1);
  assert.ok(h >= A.TUNE.holdTime - 1e-9, 'standing still completes the arrest');
  assert.equal(A.arrestStep(1, { canArrest: false, speed: 0, dist: 2 }, .1) < 1, true, 'through a wall: no progress');
  assert.equal(A.arrestStep(1, { canArrest: true, speed: 5, dist: 2 }, .1) < 1, true, 'moving: no progress');
  assert.equal(A.arrestStep(1, { canArrest: true, speed: 0, dist: 9 }, .1) < 1, true, 'across the street: no progress');
  // cruisers
  const car = (st, o = {}) => ({ state: st, stT: 0, unseenT: 0, deployed: false, crewOut: 0, ...o });
  assert.equal(A.carNext(car(S.RESPONDING), w({ driving: false, dist: 30 })), S.INVESTIGATING, 'suspect on foot: park and send the crew');
  assert.equal(A.carNext(car(S.RESPONDING), w({ driving: true, speed: 20, dist: 60 })), S.PURSUING_IN_VEHICLE);
  assert.equal(A.carNext(car(S.PURSUING_IN_VEHICLE, { unseenT: 5 }), w({ sees: false, driving: true })), S.SEARCHING_LAST_KNOWN_LOCATION);
  assert.equal(A.carNext(car(S.PATROLLING), w()), S.RESPONDING);
  assert.equal(A.carNext(car(S.PURSUING_IN_VEHICLE), w({ stars: 0 })), S.RETURNING_TO_PATROL);
  // losing the police: higher stars take longer, being seen sets the clock back
  assert.ok(A.TUNE.loseTime[5] > A.TUNE.loseTime[1] * 2 && A.TUNE.vision[5] > A.TUNE.vision[1]);
  let e = 0; for (let i = 0; i < 100; i++) e = A.evadeStep(e, false, 2, .1);
  assert.ok(e > 9.9 && !A.evadedEnough(e, 2) && A.evadedEnough(e + 20, 2) && A.evadeStep(e, true, 2, .1) < e);
});

test('dispatch: one response per incident, nearby patrol first, otherwise a unit out of sight; the force is capped', async () => {
  const D = await import(new URL('dispatch.js', dir)), d = new D.Dispatcher();
  const crime = { type: 'gunshot', sev: 1, x: 100, z: 100, suspect: 'player' };
  const a = d.report(crime, 0), b = d.report({ ...crime, x: 110, z: 95 }, 5);
  assert.equal(a, b, 'the same incident is merged, not dispatched twice'); assert.equal(a.count, 2);
  assert.notEqual(d.report({ ...crime, x: 900, z: 900 }, 6), a, 'a far-away crime is its own incident');
  const d2 = new D.Dispatcher(); d2.report(crime, 0);
  const units = [{ id: 1, x: 150, z: 100, state: 'PATROLLING', inc: null, patrol: true, alive: true }, { id: 2, x: 700, z: 700, state: 'PATROLLING', inc: null, patrol: true, alive: true }];
  let spawned = 0; const W = { stars: 1, now: 1, suspect: { x: 100, z: 100 }, units, seen: false, carCount: 2, spawn: () => { spawned++; return null; } };
  d2.tick(.1, W);
  assert.equal(units[0].inc, 1, 'the nearby patrol is assigned'); assert.equal(units[1].inc, null); assert.equal(spawned, 0, 'no spawn when a patrol can take it');
  const d3 = new D.Dispatcher(); d3.report(crime, 0); const empty = []; let made = 0;
  const W3 = { stars: 2, now: 1, suspect: { x: 100, z: 100 }, units: empty, seen: false, carCount: 0, spawn: inc => { made++; const u = { id: 9 + made, x: 0, z: 0, state: 'RESPONDING', inc: null, alive: true }; empty.push(u); return u; } };
  for (let i = 0; i < 40; i++) { W3.now += .5; d3.tick(.5, W3); }
  assert.equal(made, D.FLEET.want[2], 'with no patrol a unit is spawned up to the wanted level, no more');
  const d4 = new D.Dispatcher(); d4.report(crime, 0); let m4 = 0; const u4 = [];
  for (let i = 0; i < 200; i++) d4.tick(.5, { stars: 5, now: i * .5, suspect: { x: 100, z: 100 }, units: u4, seen: false, carCount: u4.length, spawn: () => { m4++; const u = { id: m4, x: 0, z: 0, state: 'RESPONDING', inc: null, alive: true }; u4.push(u); return u; } });
  assert.ok(u4.length <= D.FLEET.cap[5] + 3 && u4.length >= D.FLEET.want[5], 'five stars: many units, but bounded: ' + u4.length);
  assert.ok(D.FLEET.cap.every((c, i) => i === 0 || c >= D.FLEET.cap[i - 1]) && D.FLEET.cap[5] <= 8);
  // spawn points: in the band, never in the player's view
  const nodes = [{ x: 50, z: 0 }, { x: 150, z: 0 }, { x: 160, z: 0 }, { x: 400, z: 0 }];
  const pick = D.pickSpawn(nodes, { px: 0, pz: 0, band: [100, 200], visible: x => x === 150 });
  assert.equal(pick.x, 160, 'skips the visible node, stays inside the distance band');
  assert.equal(D.pickSpawn(nodes, { px: 0, pz: 0, band: [100, 200], visible: () => true }), null);
  assert.ok(D.pickSpawn(nodes, { px: 0, pz: 0, band: [100, 200], visible: () => true, relax: true }), 'relaxed: never silently fails');
});

test('prop physics: light props yield, tall props fall past a threshold, heavy and static things stay solid', async () => {
  const P = await import(new URL('propPhysics.js', dir));
  const r = (k, v) => P.resolveImpact(k, v);
  assert.equal(r('cone', 1).outcome, 'push'); assert.ok(r('cone', 12).keep > .97, 'a cone barely slows the car');
  assert.equal(r('trash', 6).outcome, 'push');
  assert.equal(r('dumpster', 3).outcome, 'solid', 'a heavy bin hit gently is a wall'); assert.equal(r('dumpster', 9).outcome, 'push');
  assert.equal(r('lamp', 5).outcome, 'solid'); assert.equal(r('lamp', 9).outcome, 'bend'); assert.equal(r('lamp', 15).outcome, 'fall');
  assert.ok(r('lamp', 15).keep > .6 && r('lamp', 15).keep < 1, 'a lamp post takes some speed off the car but does not stop it');
  assert.equal(r('fence', 3).outcome, 'solid'); assert.equal(r('fence', 8).outcome, 'break');
  assert.equal(r('tree', 40).outcome, 'solid'); assert.equal(r('building', 40).outcome, 'solid', 'static things never move');
  assert.equal(r('sapling', 8).outcome, 'solid'); assert.equal(r('sapling', 17).outcome, 'fall');
  assert.equal(P.approachSpeed(10, 1, 0, 0, 1), 0, 'sideways contact does not count'); assert.ok(P.approachSpeed(10, 1, 0, 3, 0) === 10);
  // a falling pole ends lying flat and stops; a bend settles at a lean; nothing spins forever
  const f = { th: 0, w: 1.5, mode: 'fall', rest: false }; let n = 0; while (P.stepFall(f, 1 / 60, 6.4) && n++ < 2000);
  assert.ok(n < 600 && f.rest && Math.abs(f.th - Math.PI / 2) < 1e-6, 'falls and rests flat in ' + n + ' steps');
  const b = { th: 0, w: 1, mode: 'bend', target: .4, rest: false }; n = 0; while (P.stepFall(b, 1 / 60, 6.4) && n++ < 2000);
  assert.ok(b.rest && Math.abs(b.th - .4) < .02);
  const s = { x: 0, z: 0, vx: 8, vz: 0, spin: 3 }; n = 0; while (P.stepSlide(s, 1 / 60, 2.4) && n++ < 2000);
  assert.ok(s.rest && s.x > 1 && s.x < 8, 'a pushed prop slides to a stop: ' + s.x.toFixed(1));
  const v = P.pushVelocity('cone', 30, 1, 0); assert.ok(Math.hypot(v[0], v[1]) <= 14, 'nothing is launched');
});
