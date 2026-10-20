// Route planning for the waypoint: pure functions over the same road graph the traffic and police use (roads.js), so the line the
// map draws is a drive that exists. If there is no route (the player or the target is off the road grid, or the graph has no path)
// the answer says so and the HUD falls back to a plain direction arrow; no route is ever invented.
import { WORLD, rc } from './layout.js';
import { nearestNode, nodePath, nodePos } from './roads.js';

const hyp = Math.hypot;
/** is (x, z) on the city's road grid (the outer ring road included), with a little slack for the kerb? */
export const inCity = (x, z, slack = 10) => x > -slack && x < WORLD + slack && z > -slack && z < WORLD + slack;

/**
 * Plan a drive from `from` to `to` ({ x, z }). `onDeck` starts on the highway layer.
 * -> { ok: true, pts: [[x, z], ...], length } or { ok: false, reason }
 */
export function planRoute(from, to, onDeck) {
  if (!inCity(from.x, from.z)) return { ok: false, reason: 'you are off the city roads' };
  if (!inCity(to.x, to.z)) return { ok: false, reason: 'the waypoint is off the city roads' };
  const a = nearestNode(from.x, from.z), b = nearestNode(to.x, to.z), path = nodePath(a, b, !!onDeck);
  if (!path.length && (a[0] !== b[0] || a[1] !== b[1])) return { ok: false, reason: 'no road route' };
  const nodes = [nodePos(a[0], a[1]), ...path.map(n => nodePos(n[0], n[1]))];
  // the nearest intersection can be behind the player (or past the target): skip it when the player is already between it and the next one
  const along = (p, q, x, z) => { const dx = q[0] - p[0], dz = q[1] - p[1]; return ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz || 1); };
  if (nodes.length > 1 && along(nodes[0], nodes[1], from.x, from.z) > 0) nodes.shift();
  if (nodes.length > 1 && along(nodes[nodes.length - 2], nodes[nodes.length - 1], to.x, to.z) < 1) nodes.pop();
  const pts = [[from.x, from.z], ...nodes, [to.x, to.z]];
  return { ok: true, pts: dedupe(simplify(pts)), length: lengthOf(pts) };
}
/** drop points that sit on the straight line between their neighbours */
function simplify(p) {
  const out = [p[0]];
  for (let i = 1; i < p.length - 1; i++) {
    const a = out[out.length - 1], b = p[i], c = p[i + 1];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) > 1e-3) out.push(b);
  }
  out.push(p[p.length - 1]); return out;
}
function dedupe(p) { return p.filter((q, i) => i === 0 || hyp(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) > .5); }
export function lengthOf(p) { let l = 0; for (let i = 1; i < p.length; i++) l += hyp(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; }

/** nearest point of a polyline: { d, i (segment), x, z } */
export function nearestOnRoute(pts, x, z) {
  let best = { d: Infinity, i: 0, x: pts[0][0], z: pts[0][1] };
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], az = pts[i - 1][1], dx = pts[i][0] - ax, dz = pts[i][1] - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + t * dx, pz = az + t * dz, d = hyp(x - px, z - pz);
    if (d < best.d) best = { d, i, x: px, z: pz };
  }
  return best;
}
/** has the player strayed from the route enough that it should be planned again? */
export const deviated = (pts, x, z, limit = 32) => !pts || pts.length < 2 || nearestOnRoute(pts, x, z).d > limit;
/** the part of the route still ahead of (x, z), starting at the point on the route nearest to it */
export function remaining(pts, x, z) { const n = nearestOnRoute(pts, x, z); return [[n.x, n.z], ...pts.slice(n.i)]; }

/** angle of the target from the view direction: 0 = straight ahead, positive = to the right (radians). dir is the camera's (x, z) forward. */
export function relativeBearing(dirX, dirZ, dx, dz) {
  const rx = -dirZ, rz = dirX;                                  // right-hand vector for a viewer looking along dir
  return Math.atan2(dx * rx + dz * rz, dx * dirX + dz * dirZ);
}
/** "340 m" / "1.2 km" */
export const fmtDist = m => m < 1000 ? Math.max(0, Math.round(m / 5) * 5) + ' m' : (m / 1000).toFixed(1) + ' km';
export { rc };
