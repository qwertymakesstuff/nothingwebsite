// The road graph: intersections at (rc(a), rc(b)), joined by straight roads.
import { N, P, RD, rc } from './layout.js';
import { clamp } from './util.js';
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const LANE = 2.8;
export const nodePos = (a, b) => [rc(a), rc(b)];
export const nearestNode = (x, z) => [clamp(Math.round((x - RD / 2) / P), 0, N), clamp(Math.round((z - RD / 2) / P), 0, N)];
export const inGrid = (a, b) => a >= 0 && b >= 0 && a <= N && b <= N;
export function nodePath(from, to) {
  const key = n => n[0] * 20 + n[1], prev = new Map([[key(from), null]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const n = q[i]; if (n[0] === to[0] && n[1] === to[1]) break;
    for (const [dx, dz] of DIRS) { const m = [n[0] + dx, n[1] + dz]; if (!inGrid(m[0], m[1]) || prev.has(key(m))) continue; prev.set(key(m), n); q.push(m); }
  }
  const out = []; let n = to; if (!prev.has(key(n))) return out;
  while (n && !(n[0] === from[0] && n[1] === from[1])) { out.push(n); n = prev.get(key(n)); }
  return out.reverse();
}
