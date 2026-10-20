// Civilian cars: parked ones, and traffic that glides along the right-hand lane of the road grid (and the highway deck).
// Each road has its own density, taken from the districts either side of it.
import { N, P, blockType, DISTRICTS, rc } from './layout.js';
import { DIRS, LANE, nodePos, nearestNode, inGrid, dirAllowed, layerAfter, isRampSegment } from './roads.js';
import { HW_ROAD, HW_Z, HW_H, deckHeight, deckSlope } from './highway.js';
import { clamp, rand, pick, angDiff } from './util.js';
import { cars, makeCar, showDriver } from './vehicles.js';
import { lightPhase } from './signals.js';
import { G } from './state.js';
import { player } from './player.js';
import { peds } from './people.js';
import { officers } from './police.js';
import { parkingSpots } from './models/kit.js';
import { sfx } from './audio.js';

export const trafficCount = () => cars.filter(c => c.ai && !c.ai.hw).length;
export const highwayCount = () => cars.filter(c => c.ai && c.ai.hw).length;
const dens = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? .3 : DISTRICTS[blockType(i, j).district].traffic;
/** traffic factor of the road segment from node (a,b) heading d: the average of the two blocks it runs between */
export function roadDensity(a, b, d) {
  if (d[0]) { const i = d[0] > 0 ? a : a - 1; return (dens(i, b - 1) + dens(i, b)) / 2; }
  const j = d[1] > 0 ? b : b - 1; return (dens(a - 1, j) + dens(a, j)) / 2;
}
const MAXD = 1.6;
const roadVariant = () => 1; // a hook for later: one-way streets, closed roads

export function spawnTraffic() {
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS);
    if (!inGrid(a + d[0], b + d[1]) || !dirAllowed(a, b, false, d)) continue;
    if (isRampSegment(a, b, d) && Math.random() < .5) continue;
    if (Math.random() * MAXD > roadDensity(a, b, d) * roadVariant()) continue;
    const s = rand(8, P - 8), p = nodePos(a, b), r = [-d[1], d[0]];
    const x = p[0] + d[0] * s + r[0] * LANE, z = p[1] + d[1] * s + r[1] * LANE;
    if (Math.hypot(x - player.x, z - player.z) < 45 || cars.some(c => Math.abs(c.y) < 2 && Math.hypot(c.x - x, c.z - z) < 8)) continue;
    const c = makeCar(x, z, Math.atan2(d[0], d[1]), 'traffic');
    c.ai = { a, b, d, s, cruise: rand(8, 14), stopT: 0, ghost: 0, hw: false }; c.driver = 'ai'; showDriver(c, true); applyY(c); return c;
  }
  return null;
}
export function spawnHighwayCar() {
  const a = 1 + Math.floor(Math.random() * (N - 2)), d = Math.random() < .5 ? [1, 0] : [-1, 0], s = rand(8, P - 8), p = nodePos(a, HW_ROAD), r = [-d[1], d[0]];
  const x = p[0] + d[0] * s + r[0] * LANE, z = p[1] + d[1] * s + r[1] * LANE;
  if (Math.hypot(x - player.x, z - player.z) < 45 || cars.some(c => Math.abs(c.y - HW_H) < 2 && Math.hypot(c.x - x, c.z - z) < 12)) return null;
  const c = makeCar(x, z, Math.atan2(d[0], d[1]), 'traffic');
  c.ai = { a, b: HW_ROAD, d, s, cruise: rand(17, 24), stopT: 0, ghost: 0, hw: true }; c.driver = 'ai'; showDriver(c, true); applyY(c); return c;
}
/** a parked car at a registered parking spot, or at the kerb if none is free */
export function spawnParked() {
  if (parkingSpots.length && Math.random() < .35) {
    for (let t = 0; t < 12; t++) { const s = pick(parkingSpots); if (Math.random() > s.weight || cars.some(c => Math.hypot(c.x - s.x, c.z - s.z) < 3.2) || Math.hypot(s.x - player.x, s.z - player.z) < 14) continue; return makeCar(s.x, s.z, s.yaw + (Math.random() - .5) * .08, 'parked'); }
  }
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS);
    if (!inGrid(a + d[0], b + d[1])) continue;
    if (b === HW_ROAD && d[1] === 0 && ((a === 0 && d[0] === 1) || (a === N && d[0] === -1))) continue;   // not on a ramp
    const f = DISTRICTS[blockType(Math.max(0, Math.min(N - 1, a - (d[0] < 0 ? 1 : 0))), Math.max(0, Math.min(N - 1, b - (d[1] < 0 ? 1 : 0)))).district].parked;
    if (Math.random() * 1.3 > f) continue;
    const s = rand(14, P - 14), p = nodePos(a, b), r = [-d[1], d[0]], side = Math.random() < .5 ? 1 : -1;
    const x = p[0] + d[0] * s + r[0] * 5.6 * side, z = p[1] + d[1] * s + r[1] * 5.6 * side;
    if (cars.some(c => Math.hypot(c.x - x, c.z - z) < 6) || Math.hypot(x - player.x, z - player.z) < 12) continue;
    return makeCar(x, z, Math.atan2(d[0], d[1]) + (Math.random() < .5 ? 0 : Math.PI), 'parked');
  }
  return null;
}

function applyY(c) {
  const A = c.ai, seg = A.hw || isRampSegment(A.a, A.b, A.d);
  c.layer = seg ? 1 : 0; c.y = seg ? deckHeight(c.x) : 0;
}
/** a stopped or parked car with its driver back at the wheel (or a thief at it) rejoins the traffic where it stands */
export function trafficTakeover(c, flee) {
  if (c.wreck || c.driver === 'player') return;
  const n = nearestNode(c.x, c.z), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let d = DIRS[0], bd = -9; for (const q of DIRS) { const v = q[0] * fx + q[1] * fz; if (v > bd) { bd = v; d = q; } }
  const p = nodePos(n[0], n[1]), s = clamp((c.x - p[0]) * d[0] + (c.z - p[1]) * d[1], 0, P - 4);
  c.ai = { a: n[0], b: n[1], d, s, cruise: flee ? rand(14, 18) : rand(8, 14), stopT: 0, ghost: 0, hw: false }; c.driver = 'ai'; c.kind = 'traffic'; c.cop = null; showDriver(c, true);
}
export function updateTraffic(c, dt) {
  const A = c.ai; A.ghost -= dt;
  let target = A.cruise + (A.flee > G.time ? 8 : 0) + (A.chase > G.time ? 5 : 0);
  if (A.chase > G.time && (!A.honkT || G.time > A.honkT)) { A.honkT = G.time + 1.6; c.honk = 1; sfx.horn(); }
  if (A.ghost <= 0) { // brake for anything in front on the same level; if it jams, ghost through for a moment
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const look = (x, z, lat, y) => { if (y != null && Math.abs(y - c.y) > 2.5) return; const dx = x - c.x, dz = z - c.z, al = dx * fx + dz * fz, la = Math.abs(dx * fz - dz * fx); if (al > 0 && al < 13 && la < lat) target = Math.min(target, Math.max(0, (al - 5.5) * 1.6)); };
    cars.forEach(o => { if (o !== c) look(o.x, o.z, 2.4, o.y); }); if (!A.hw) { peds.forEach(p => { if (!p.dead) look(p.x, p.z, 1.6); }); look(player.x, player.z, 2, player.car ? player.car.y : 0); officers.forEach(o => { if (!o.dead) look(o.x, o.z, 1.6); }); }
    else if (player.car && player.car.y > 2) look(player.x, player.z, 2, player.car.y);
  }
  // stop at red: look at the signal of the intersection ahead, for this car's direction of travel (not on the deck)
  if (!A.hw) { const ahead = P - A.s, na = A.a + A.d[0], nb = A.b + A.d[1]; if (ahead > 8 && ahead < 22 && A.ghost <= 0) { const ph = lightPhase(na, nb, G.time), st = A.d[0] ? ph.x : ph.z; if (st === 'red' || (st === 'yellow' && ahead > 12)) target = Math.min(target, Math.max(0, (ahead - 9) * 1.5)); } }
  if (A.hold > 0) { A.hold -= dt; target = 0; }                                // a driver who has just been hit sits there for a moment
  c.speed += clamp(target - c.speed, -26 * dt, 7 * dt);
  A.stopT = c.speed < .5 ? A.stopT + dt : 0; if (A.stopT > 5) { A.ghost = 2.5; A.stopT = 0; }
  A.s += Math.max(0, c.speed) * dt;
  if (A.s >= P) {
    const hwNext = layerAfter(A.a, A.b, A.hw, A.d);
    A.a += A.d[0]; A.b += A.d[1]; A.s -= P; A.hw = hwNext;
    const opts = DIRS.filter(d => !(d[0] === -A.d[0] && d[1] === -A.d[1]) && dirAllowed(A.a, A.b, A.hw, d) && Math.random() * MAXD < Math.max(.25, roadDensity(A.a, A.b, d) + .35));
    const straight = opts.some(d => d[0] === A.d[0] && d[1] === A.d[1]);
    const any = DIRS.filter(d => !(d[0] === -A.d[0] && d[1] === -A.d[1]) && dirAllowed(A.a, A.b, A.hw, d));
    A.d = opts.length ? (Math.random() < .55 && straight ? A.d : pick(opts)) : any.length ? pick(any) : [-A.d[0], -A.d[1]];
    if (A.chase > G.time && any.length) { const np = nodePos(A.a, A.b); let bestD = 1e9; for (const q of any) { const dd = Math.hypot(np[0] + q[0] * P - player.x, np[1] + q[1] * P - player.z); if (dd < bestD) { bestD = dd; A.d = q; } } }   // an angry driver follows the player for a few seconds
  }
  const p = nodePos(A.a, A.b), r = [-A.d[1], A.d[0]], tx = p[0] + A.d[0] * A.s + r[0] * LANE, tz = p[1] + A.d[1] * A.s + r[1] * LANE;
  const k = Math.min(1, dt * 5); c.x += (tx - c.x) * k; c.z += (tz - c.z) * k;
  c.yaw += angDiff(Math.atan2(A.d[0], A.d[1]), c.yaw) * Math.min(1, dt * 4);
  applyY(c);
  if (Math.hypot(tx - c.x, tz - c.z) > 12) { const n = nearestNode(c.x, c.z); A.a = n[0]; A.b = n[1]; A.s = 0; A.hw = false; A.d = A.d; }
}
