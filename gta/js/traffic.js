// Civilian cars: parked ones, and traffic that glides along the right-hand lane of the road grid.
import { N, P } from './layout.js';
import { DIRS, LANE, nodePos, nearestNode, inGrid } from './roads.js';
import { clamp, rand, pick, angDiff } from './util.js';
import { cars, makeCar } from './vehicles.js';
import { player } from './player.js';
import { peds } from './people.js';
import { officers } from './police.js';

export const trafficCount = () => cars.filter(c => c.ai).length;

export function spawnTraffic() {
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS);
    if (!inGrid(a + d[0], b + d[1])) continue;
    const s = rand(8, P - 8), p = nodePos(a, b), r = [-d[1], d[0]];
    const x = p[0] + d[0] * s + r[0] * LANE, z = p[1] + d[1] * s + r[1] * LANE;
    if (Math.hypot(x - player.x, z - player.z) < 45 || cars.some(c => Math.hypot(c.x - x, c.z - z) < 8)) continue;
    const c = makeCar(x, z, Math.atan2(d[0], d[1]), 'traffic');
    c.ai = { a, b, d, s, cruise: rand(8, 14), stopT: 0, ghost: 0 }; c.driver = 'ai'; return c;
  }
  return null;
}
export function spawnParked() {
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS);
    if (!inGrid(a + d[0], b + d[1])) continue;
    const s = rand(14, P - 14), p = nodePos(a, b), r = [-d[1], d[0]], side = Math.random() < .5 ? 1 : -1;
    const x = p[0] + d[0] * s + r[0] * 5.6 * side, z = p[1] + d[1] * s + r[1] * 5.6 * side;
    if (cars.some(c => Math.hypot(c.x - x, c.z - z) < 6) || Math.hypot(x - player.x, z - player.z) < 12) continue;
    return makeCar(x, z, Math.atan2(d[0], d[1]) + (Math.random() < .5 ? 0 : Math.PI), 'parked');
  }
  return null;
}

export function updateTraffic(c, dt) {
  const A = c.ai; A.ghost -= dt;
  let target = A.cruise;
  if (A.ghost <= 0) { // brake for anything in front; if it jams, ghost through for a moment
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const look = (x, z, lat) => { const dx = x - c.x, dz = z - c.z, al = dx * fx + dz * fz, la = Math.abs(dx * fz - dz * fx); if (al > 0 && al < 13 && la < lat) target = Math.min(target, Math.max(0, (al - 5.5) * 1.6)); };
    cars.forEach(o => { if (o !== c) look(o.x, o.z, 2.4); }); peds.forEach(p => { if (!p.dead) look(p.x, p.z, 1.6); });
    look(player.x, player.z, 2); officers.forEach(o => { if (!o.dead) look(o.x, o.z, 1.6); });
  }
  c.speed += clamp(target - c.speed, -26 * dt, 7 * dt);
  A.stopT = c.speed < .5 ? A.stopT + dt : 0; if (A.stopT > 5) { A.ghost = 2.5; A.stopT = 0; }
  A.s += Math.max(0, c.speed) * dt;
  if (A.s >= P) {
    A.a += A.d[0]; A.b += A.d[1]; A.s -= P;
    const opts = DIRS.filter(d => !(d[0] === -A.d[0] && d[1] === -A.d[1]) && inGrid(A.a + d[0], A.b + d[1]));
    A.d = opts.length ? (Math.random() < .55 && opts.some(d => d[0] === A.d[0] && d[1] === A.d[1]) ? A.d : pick(opts)) : [-A.d[0], -A.d[1]];
  }
  const p = nodePos(A.a, A.b), r = [-A.d[1], A.d[0]], tx = p[0] + A.d[0] * A.s + r[0] * LANE, tz = p[1] + A.d[1] * A.s + r[1] * LANE;
  const k = Math.min(1, dt * 5); c.x += (tx - c.x) * k; c.z += (tz - c.z) * k;
  c.yaw += angDiff(Math.atan2(A.d[0], A.d[1]), c.yaw) * Math.min(1, dt * 4);
  if (Math.hypot(tx - c.x, tz - c.z) > 12) { const n = nearestNode(c.x, c.z); A.a = n[0]; A.b = n[1]; A.s = 0; }
}
