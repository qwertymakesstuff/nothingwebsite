// The road graph: intersections at (rc(a), rc(b)), joined by straight roads, plus the highway layer on road HW_ROAD.
// Ground traffic can climb the ramp only from the two edge intersections; the deck has no exits except the ramps.
import { N, P, RD, rc } from './layout.js';
import { HW_ROAD } from './highway.js';
import { clamp } from './util.js';
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const LANE = 2.8;
export const nodePos = (a, b) => [rc(a), rc(b)];
export const nearestNode = (x, z) => [clamp(Math.round((x - RD / 2) / P), 0, N), clamp(Math.round((z - RD / 2) / P), 0, N)];
export const inGrid = (a, b) => a >= 0 && b >= 0 && a <= N && b <= N;
const onDeckNode = (a, b) => b === HW_ROAD && a >= 1 && a <= N - 1;

/** Is a car on layer hw (true = highway) at node (a,b) allowed to go in direction d? */
export function dirAllowed(a, b, hw, d) {
  const na = a + d[0], nb = b + d[1];
  if (!inGrid(na, nb)) return false;
  if (hw) return b === HW_ROAD && d[1] === 0 && onDeckNode(a, b) ? true : false; // deck: straight along the highway only
  if (b === HW_ROAD && d[1] === 0) { // ground road under the highway
    if (a === 1 && na === 0) return false;       // the west ramp can't be entered from underneath
    if (a === N - 1 && na === N) return false;   // nor the east one
  }
  return true;
}
/** Highway layer of a car after it arrives at node (a,b) travelling in direction d (from layer hw). */
export function layerAfter(a, b, hw, d) {
  const na = a + d[0], nb = b + d[1];
  if (nb !== HW_ROAD) return false;
  if (hw) return onDeckNode(na, nb);                       // arrive on deck, or back on the ground at the ends
  if (a === 0 && d[0] === 1) return true;                  // climbing the west ramp
  if (a === N && d[0] === -1) return true;                 // climbing the east ramp
  return false;
}
/** Is the segment from (a,b) in direction d part of a ramp (rises/falls)? */
export const isRampSegment = (a, b, d) => b === HW_ROAD && d[1] === 0 && ((a === 0 && d[0] === 1) || (a === 1 && d[0] === -1) || (a === N && d[0] === -1) || (a === N - 1 && d[0] === 1));

/** Shortest list of nodes from `from` to `to`, respecting the highway rules. fromHw: start on the deck. */
export function nodePath(from, to, fromHw) {
  const key = (n, h) => (n[0] * 32 + n[1]) * 2 + (h ? 1 : 0), start = key(from, !!fromHw);
  const prev = new Map([[start, null]]), q = [[from, !!fromHw]];
  let goal = null;
  for (let i = 0; i < q.length; i++) {
    const [n, h] = q[i];
    if (n[0] === to[0] && n[1] === to[1]) { goal = key(n, h); break; }
    for (const d of DIRS) {
      if (!dirAllowed(n[0], n[1], h, d)) continue;
      const m = [n[0] + d[0], n[1] + d[1]], mh = layerAfter(n[0], n[1], h, d), k = key(m, mh);
      if (prev.has(k)) continue; prev.set(k, [key(n, h), n, m]); q.push([m, mh]);
    }
  }
  if (goal == null) return [];
  const out = []; let k = goal;
  while (k !== start) { const p = prev.get(k); out.push(p[2]); k = p[0]; }
  return out.reverse();
}
