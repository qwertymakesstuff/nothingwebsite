import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const dir = new URL('../../gta/js/', import.meta.url);
const R = await import(new URL('navroute.js', dir));
const L = await import(new URL('layout.js', dir));
const P = await import(new URL('prefs.js', dir));

const onRoadGrid = ([x, z]) => { const nearLine = v => { const k = Math.round((v - L.RD / 2) / L.P); return Math.abs(v - L.rc(k)) < 1.5; }; return nearLine(x) || nearLine(z); };

test('a route between two junctions follows the road grid with axis-aligned legs', () => {
  const a = { x: L.rc(1), z: L.rc(1) }, b = { x: L.rc(8), z: L.rc(6) }, r = R.planRoute(a, b, false);
  assert.ok(r.ok); assert.deepEqual(r.pts[0], [a.x, a.z]); assert.deepEqual(r.pts[r.pts.length - 1], [b.x, b.z]);
  for (let i = 1; i < r.pts.length; i++) { const p = r.pts[i - 1], q = r.pts[i]; assert.ok(Math.abs(p[0] - q[0]) < 1e-6 || Math.abs(p[1] - q[1]) < 1e-6, 'leg ' + i + ' runs along a road'); assert.ok(onRoadGrid(p) && onRoadGrid(q)); }
  const manhattan = Math.abs(a.x - b.x) + Math.abs(a.z - b.z); assert.ok(r.length >= manhattan - 1e-6 && r.length < manhattan * 1.3 + 40, 'about the shortest way: ' + r.length + ' vs ' + manhattan);
});

test('a player between two junctions is not sent backwards first', () => {
  const a = { x: L.rc(2) + 10, z: L.rc(2) }, b = { x: L.rc(6), z: L.rc(2) }, r = R.planRoute(a, b, false);
  assert.ok(r.ok); assert.ok(r.length < Math.abs(a.x - b.x) + 8, 'straight along the road, no detour: ' + r.length);
});

test('no route is invented off the road grid', () => {
  assert.equal(R.planRoute({ x: -200, z: 100 }, { x: 100, z: 100 }, false).ok, false);
  assert.equal(R.planRoute({ x: 100, z: 100 }, { x: L.WORLD + 150, z: 100 }, false).ok, false);
  assert.match(R.planRoute({ x: 100, z: 100 }, { x: -50, z: 100 }, false).reason, /off the city roads/);
});

test('deviation and trimming', () => {
  const pts = [[0, 0], [100, 0], [100, 100]];
  assert.equal(R.deviated(pts, 50, 10), false); assert.equal(R.deviated(pts, 50, 60), true); assert.equal(R.deviated(null, 0, 0), true);
  const rest = R.remaining(pts, 100, 40); assert.deepEqual(rest[0].map(Math.round), [100, 40]); assert.equal(rest.length, 2);
  assert.equal(Math.round(R.lengthOf(pts)), 200);
});

test('bearing is relative to the view direction, positive to the right', () => {
  assert.ok(Math.abs(R.relativeBearing(0, -1, 0, -50)) < 1e-9, 'ahead');
  assert.ok(R.relativeBearing(0, -1, 50, 0) > 1.5 && R.relativeBearing(0, -1, 50, 0) < 1.6, 'a camera looking north (-z) sees +x on its right');
  assert.ok(R.relativeBearing(0, -1, -50, 0) < -1.5, 'left');
  assert.ok(Math.abs(Math.abs(R.relativeBearing(0, -1, 0, 50)) - Math.PI) < 1e-9, 'behind');
  assert.equal(R.fmtDist(42), '40 m'); assert.equal(R.fmtDist(1234), '1.2 km');
});

test('preferences are clamped, persisted and key bindings swap instead of colliding', () => {
  P.setPref('master', 5); assert.equal(P.prefs.master, 1); P.setPref('mouse', 0); assert.equal(P.prefs.mouse, .25); P.setPref('shadows', 'bogus'); assert.equal(P.prefs.shadows, 'high');
  assert.equal(P.setPref('binds', {}), false, 'binds only change through setBind');
  assert.deepEqual(JSON.parse(mem.get('gta:save')).prefs.mouse, .25);
  assert.equal(P.codeOf('horn'), 'KeyH'); assert.equal(P.isKey('interact', 'KeyF'), true, 'the fixed alternate still works');
  const r = P.setBind('horn', 'KeyE'); assert.ok(r.ok); assert.equal(r.swapped, 'interact'); assert.equal(P.codeOf('horn'), 'KeyE'); assert.equal(P.codeOf('interact'), 'KeyH');
  assert.equal(P.setBind('horn', 'Escape').ok, false, 'Esc is reserved');
  const codes = ACTIONS_CODES(); assert.equal(new Set(codes).size, codes.length, 'no two actions share a key');
  P.resetBinds(); assert.equal(P.codeOf('horn'), 'KeyH'); assert.equal(P.keyName('KeyH'), 'H'); assert.equal(P.keyName('ArrowUp'), '↑');
});
function ACTIONS_CODES() { return P.ACTIONS.map(a => P.codeOf(a.id)); }
