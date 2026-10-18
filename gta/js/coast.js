// The coastline. The city square (0..WORLD) is unchanged; around it the land runs out to an organic shoreline made of a wavy
// base offset, a few bays / inlets / headlands, and small-scale noise. Everything here is pure maths (no rendering), so the
// terrain, water, collisions, minimap and tests all share one definition of "where is the shore".
//
//   d(x, z) > 0  : land, d metres from the water's edge      d < 0 : sea, -d metres from the shore
import { WORLD as W, rc, N } from './layout.js';

const TAU = Math.PI * 2, P4 = 4 * W;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* deterministic value noise */
function hash2(ix, iz) { let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), sx), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), sx), sz);
}
export const fbm = (x, z) => vnoise(x / 45, z / 45) * .55 + vnoise(x / 17, z / 17) * .3 + vnoise(x / 6, z / 6) * .15;

/* the square and where a point sits relative to it */
export const SQUARE = { x0: 0, z0: 0, x1: W, z1: W };
/** perimeter position s (0..4W, clockwise from the north-west corner) of a point on the square's edge */
export function perimeterS(px, pz) {
  if (pz <= 1e-6) return px;                  // north side
  if (px >= W - 1e-6) return W + pz;          // east
  if (pz >= W - 1e-6) return 2 * W + (W - px); // south
  return 3 * W + (W - pz);                    // west
}
/** the point on the perimeter at s and its outward normal */
export function perimeterPoint(s) {
  s = ((s % P4) + P4) % P4;
  if (s < W) return { x: s, z: 0, nx: 0, nz: -1 };
  if (s < 2 * W) return { x: W, z: s - W, nx: 1, nz: 0 };
  if (s < 3 * W) return { x: 3 * W - s, z: W, nx: 0, nz: 1 };
  return { x: 0, z: 4 * W - s, nx: -1, nz: 0 };
}

/** base distance from the square's edge to the shoreline at perimeter position s */
function baseOffset(s) {
  const u = s / P4;
  let c = 116 + 44 * Math.sin(TAU * 3 * u + .7) + 28 * Math.sin(TAU * 7 * u + 2.1) + 15 * Math.sin(TAU * 13 * u + 4);
  // the port on the south side wants deep water close to the quay: x from 590 down to 360
  const sp0 = 2 * W + (W - 590), sp1 = 2 * W + (W - 360);
  c = lerp(c, 24, smooth(sp0 - 50, sp0 + 20, s) * (1 - smooth(sp1 - 20, sp1 + 50, s)));
  return c;
}
// bays and inlets cut into the land (amp > 0), headlands push it out (amp < 0)
export const FEATURES = [
  { x: 800, z: 150, r: 130, amp: 58, name: 'north-east bay' },
  { x: -150, z: 430, r: 90, amp: 45, name: 'west cove' },
  { x: 150, z: -170, r: 110, amp: -55, name: 'north headland' },
  { x: 170, z: 760, r: 85, amp: 50, name: 'south-west inlet' },
  { x: 720, z: 520, r: 100, amp: -45, name: 'east point' },
  { x: -170, z: 240, r: 60, amp: 34, name: 'small cove' },
  { x: 460, z: -120, r: 80, amp: 30, name: 'harbour inlet' }
];
export function rockiness(x, z) { // 0..1, high on headlands and in a few patches
  let r = smooth(.62, .8, .5 + .5 * Math.sin(Math.atan2(z - W / 2, x - W / 2) * 5 + 1) + (vnoise(x / 60, z / 60) - .5) * .35);
  for (const f of FEATURES) if (f.amp < 0) { const t = clamp(1 - Math.hypot(x - f.x, z - f.z) / f.r, 0, 1); r = Math.max(r, smooth(.15, .6, t)); }
  return r;
}

const gx = [0, 0];
/** signed distance to the shoreline: > 0 on land, < 0 in the sea. Inside the city square it is always large and positive. */
export function shoreDist(x, z) {
  const px = clamp(x, 0, W), pz = clamp(z, 0, W), ex = x - px, ez = z - pz;
  if (ex === 0 && ez === 0) return 1000;
  const e = Math.hypot(ex, ez), s = perimeterS(px, pz), fade = smooth(0, 8, e);
  let d = baseOffset(s) - e;
  for (const f of FEATURES) { const t = clamp(1 - Math.hypot(x - f.x, z - f.z) / f.r, 0, 1); if (t > 0) d -= f.amp * t * t * (3 - 2 * t) * fade; }
  return d + (fbm(x + 31, z + 17) - .5) * 14 * fade;
}
export const isLand = (x, z) => shoreDist(x, z) > 0;
const gradD = (x, z) => { const h = 1.5, dx = shoreDist(x + h, z) - shoreDist(x - h, z), dz = shoreDist(x, z + h) - shoreDist(x, z - h), l = Math.hypot(dx, dz) || 1; gx[0] = dx / l; gx[1] = dz / l; };

/* things that stand out over the water but can be walked on */
export const piers = []; // { x, z, dx, dz, len, w } base point on land, unit direction, length, width
function inPier(p, x, z, grow) { // inside the pier's rectangle grown by `grow`
  const rx = x - p.x, rz = z - p.z, along = rx * p.dx + rz * p.dz, across = rx * -p.dz + rz * p.dx;
  return along > -grow && along < p.len + grow && Math.abs(across) < p.w / 2 + grow;
}
export const onPier = (x, z, grow) => piers.some(p => inPier(p, x, z, grow || 0));

/**
 * Keep a point of radius `margin` on dry land (or on a pier). Returns the corrected point; `.hit` says whether it moved.
 * Inside the city square nothing is ever changed, so existing gameplay is untouched.
 */
export function limitToLand(x, z, margin) {
  const out = { x, z, hit: false, nx: 0, nz: 0 };
  if (x > 0 && x < W && z > 0 && z < W) return out;
  for (const p of piers) {
    if (!inPier(p, x, z, 2.2)) continue;
    // on a pier: stay between the rails and inside its length
    const rx = x - p.x, rz = z - p.z; let along = rx * p.dx + rz * p.dz, across = rx * -p.dz + rz * p.dx;
    const a2 = clamp(along, -4, p.len - margin), c2 = clamp(across, -p.w / 2 + margin, p.w / 2 - margin);
    if (a2 !== along || c2 !== across || shoreDist(x, z) <= margin) { out.x = p.x + p.dx * a2 - p.dz * c2; out.z = p.z + p.dz * a2 + p.dx * c2; out.hit = out.x !== x || out.z !== z; }
    return out;
  }
  let d = shoreDist(x, z);
  if (d >= margin) return out;
  for (let k = 0; k < 8 && d < margin - .01; k++) { gradD(x, z); const push = margin - d; x += gx[0] * push; z += gx[1] * push; d = shoreDist(x, z); out.nx = gx[0]; out.nz = gx[1]; }
  out.hit = true; out.x = x; out.z = z; return out;
}

/** terrain height at (x, z): flat land, a gentle beach slope and then deeper water */
export const SEA_LEVEL = -.36;
export function heightFromD(d) {
  if (d >= 4) return -.03;
  const top = -.03 - .33 * clamp((4 - d) / 4, 0, 1);
  if (d >= 0) return top;
  return top - 3.2 * Math.pow(clamp(-d / 63, 0, 1), 1.4) - Math.max(0, -d - 63) * .06;
}

/** how wide the dry beach is at (x, z): narrow on rocky shores, wide and varied elsewhere */
export function beachWidth(x, z) { const r = rockiness(x, z); return lerp(16 + 46 * vnoise(x / 70 + 9, z / 70 - 4), 3, r); }

/* ---- shoreline helpers for placing things ---- */
/** walk from (x, z) in direction (dx, dz) until the shore distance drops to `target`; returns the point or null */
export function marchToDepth(x, z, dx, dz, target, maxLen) {
  let prev = shoreDist(x, z);
  for (let t = 1; t <= (maxLen || 600); t++) { const px = x + dx * t, pz = z + dz * t, d = shoreDist(px, pz); if (d <= target) return { x: lerp(px - dx, px, 0), z: lerp(pz - dz, pz, 0), t, d }; prev = d; }
  return null;
}

/* ---- planned coastal features: access roads, car parks, boardwalks, piers ---- */
function side(name) { return { north: { dx: 0, dz: -1 }, south: { dx: 0, dz: 1 }, west: { dx: -1, dz: 0 }, east: { dx: 1, dz: 0 } }[name]; }
export const SPURS = [], LOTS = [], BOARDWALKS = [], COAST_ROADS = [], PATHS = [];
const ROAD_W = 14;
function spur(name, x0, z0, dirName, inland, withPier, lotName) {
  const { dx, dz } = side(dirName), end = marchToDepth(x0, z0, dx, dz, inland, 700); if (!end) return null;
  const x1 = x0 + dx * end.t, z1 = z0 + dz * end.t, s = { name, x0, z0, x1, z1, dx, dz, w: ROAD_W, len: end.t };
  SPURS.push(s);
  const lot = { name: lotName, cx: x1 + dx * 14, cz: z1 + dz * 14, w: dx ? 26 : 44, d: dx ? 44 : 26, dx, dz };
  LOTS.push(lot);
  BOARDWALKS.push({ x: lot.cx + dx * (dx ? 13 : 0), z: lot.cz + dz * (dz ? 13 : 0), dx, dz, len: 44, w: 4.5 });
  if (withPier) { const b = marchToDepth(x1, z1, dx, dz, 6, 600); piers.push({ name: withPier, x: x1 + dx * 28, z: z1 + dz * 28, dx, dz, len: (b ? b.t : 40) - 28 + 52, w: 6 }); }
  return s;
}
// access roads leave the outer ring road at existing intersections
spur('north pier road', rc(5), 0, 'north', 26, 'Harbor Pier', 'Pier car park');
spur('west beach road', 0, rc(1), 'west', 30, null, 'West beach car park');
spur('east point road', W, rc(5), 'east', 30, 'East Jetty', 'East beach car park');
spur('north-east road', rc(7), 0, 'north', 40, null, 'North-east lookout');
spur('south-west road', 0, rc(9), 'west', 34, null, 'Cove car park');
// a coastal road that follows the shore on the west side and another on the east, joined to the spurs
function coastRoad(name, sideName, zFrom, zTo, inland) {
  const { dx } = side(sideName), pts = [];
  for (let z = zFrom; (zTo > zFrom ? z <= zTo : z >= zTo); z += (zTo > zFrom ? 12 : -12)) {
    const x0 = dx > 0 ? W : 0, m = marchToDepth(x0, z, dx, 0, inland, 700); if (m) pts.push([dx > 0 ? Math.max(W + 24, x0 + dx * m.t) : Math.min(-24, x0 + dx * m.t), z]);
  }
  if (pts.length > 3) COAST_ROADS.push({ name, pts, w: 9 });
}
coastRoad('west coast road', 'west', 60, 560, 34);
coastRoad('east coast road', 'east', 70, 420, 38);
for (const s of SPURS) { /* nothing: spurs stop at their car parks; the coast roads cross them where they meet */ }
// paths from the car parks to the sand
for (const l of LOTS) { const m = marchToDepth(l.cx, l.cz, l.dx, l.dz, 8, 200); if (m) PATHS.push({ x0: l.cx, z0: l.cz, x1: l.cx + l.dx * m.t, z1: l.cz + l.dz * m.t }); }

/** names, positions and categories of coastal points of interest (the POI registry adds these) */
export function coastalSpots() {
  const spots = [];
  for (const l of LOTS) spots.push({ id: l.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: l.name, category: 'parking', x: l.cx, z: l.cz });
  for (const p of piers) spots.push({ id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: p.name, category: 'beach', x: p.x + p.dx * 8, z: p.z + p.dz * 8 });
  return spots;
}
/** the polygon of the shoreline (d = 0), sampled by angle around the city, for the maps */
export function shorePolygon(step) {
  const pts = [], cx = W / 2, cz = W / 2, R = 700;
  for (let a = 0; a < 360; a += step || 3) { const r = a * Math.PI / 180, dx = Math.cos(r), dz = Math.sin(r), m = marchToDepth(cx + dx * 250, cz + dz * 250, dx, dz, 0, 800); if (m) pts.push([cx + dx * (250 + m.t), cz + dz * (250 + m.t)]); }
  return pts;
}
