// Pure layout numbers for the city: an N x N grid of blocks separated by roads, and a map saying what each block is.
// No rendering in here, so it can be unit-tested.
export const N = 11, B = 40, RD = 14, P = B + RD, WORLD = N * P + RD, INSET = 3, S = B - 2 * INSET;
export const rc = k => k * P + RD / 2;               // centre line of road k (k = 0..N)
export const blockX = i => i * P + RD;
export const blockZ = j => j * P + RD;

/** What every block is. One character per block, rows are j (north -> south), columns are i (west -> east). */
export const MAP = [
  'oohhwhcLEHl',
  'ohhahaaRVCo',
  'ohShaahMNFf',
  'oahpDDDXRCc',
  'oaahDBGsFRo',
  'ohhaDZDsCRo',
  'fhahTDDsaaf',
  'IIYUIIWPPWo',
  'IYIUIWPPPWo',
  'IIYUUWPKPKo',
  'oIIoooKKKKo'
];
// type -> { district, name, open: no solid footprint (park/plaza/lot), alley: gap through the block }
export const TYPES = {
  o: { district: 'outskirts', name: 'empty lot', open: true },
  f: { district: 'outskirts', name: 'farmstead' },
  c: { district: 'outskirts', name: 'construction site' },
  l: { district: 'outskirts', name: 'lighthouse point', open: true },
  h: { district: 'residential', name: 'houses', lots: true },
  S: { district: 'residential', name: 'safehouse', lots: true },
  a: { district: 'residential', name: 'apartments', alley: 'ns' },
  s: { district: 'residential', name: 'corner stores' },
  p: { district: 'residential', name: 'park', open: true },
  w: { district: 'residential', name: 'waterfront park', open: true },
  D: { district: 'downtown', name: 'office block' },
  T: { district: 'downtown', name: 'Harbor Tower' },
  B: { district: 'downtown', name: 'bank' },
  G: { district: 'downtown', name: 'parking garage' },
  Z: { district: 'downtown', name: 'city plaza', open: true },
  M: { district: 'commercial', name: 'supermarket', bld: [34, 15] },
  N: { district: 'commercial', name: 'car park', open: true },
  F: { district: 'commercial', name: 'gas station', bld: [12, 8, 'w'] },
  V: { district: 'commercial', name: 'vehicle dealership', bld: [34, 12] },
  R: { district: 'commercial', name: 'restaurants' },
  C: { district: 'commercial', name: 'clothing stores' },
  X: { district: 'commercial', name: 'repair garage', bld: [22, 13, 'w'] },
  I: { district: 'industrial', name: 'warehouses', alley: 'ew' },
  Y: { district: 'industrial', name: 'factory' },
  U: { district: 'industrial', name: 'truck depot', bld: [16, 10, 'w'] },
  P: { district: 'port', name: 'container yard', alley: 'ns' },
  W: { district: 'port', name: 'port warehouse' },
  K: { district: 'port', name: 'docks', bld: [34, 13] },
  H: { district: 'emergency', name: 'hospital' },
  L: { district: 'emergency', name: 'police station', bld: [34, 16] },
  E: { district: 'emergency', name: 'fire station', bld: [34, 15] }
};
// densities per district: traffic, pedestrians and parked cars (1 = normal)
export const DISTRICTS = {
  downtown:    { name: 'Downtown',        color: '#b4a58a', traffic: 1.6, peds: 1.8, parked: 1.0 },
  residential: { name: 'Residential',     color: '#8fb07a', traffic: .8,  peds: 1.0, parked: 1.3 },
  commercial:  { name: 'Commercial',      color: '#d0a070', traffic: 1.3, peds: 1.3, parked: 1.2 },
  industrial:  { name: 'Industrial',      color: '#8a8f98', traffic: .8,  peds: .25, parked: .6 },
  port:        { name: 'Port',            color: '#6f93a8', traffic: .7,  peds: .25, parked: .4 },
  emergency:   { name: 'Civic centre',    color: '#7f8fcf', traffic: 1.0, peds: .8,  parked: .8 },
  outskirts:   { name: 'Outskirts',       color: '#a8a070', traffic: .35, peds: .2,  parked: .3 }
};
export const blockChar = (i, j) => (j >= 0 && j < N && i >= 0 && i < N) ? MAP[j][i] : 'o';
export const blockType = (i, j) => TYPES[blockChar(i, j)];
export const districtOf = (i, j) => blockType(i, j).district;
export const isOpen = (i, j) => !!blockType(i, j).open;
export const findBlocks = ch => { const out = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (MAP[j][i] === ch) out.push([i, j]); return out; };
/** which district a world position is in (roads count as the district of the nearest block) */
export const districtAt = (x, z) => districtOf(Math.max(0, Math.min(N - 1, Math.floor((x - RD / 2) / P))), Math.max(0, Math.min(N - 1, Math.floor((z - RD / 2) / P))));

/**
 * Solid footprints of a block in world coordinates: [x0, z0, x1, z1] rectangles inside the pavement ring.
 * open blocks have none; 'lots' are four separate lots with 2 m gaps; 'alley' splits the block with a 6 m lane;
 * blocks with a `bld` size only have that building in the north (the rest is a car park or yard).
 */
export function footprints(i, j) {
  const t = blockType(i, j), x0 = blockX(i) + INSET, z0 = blockZ(j) + INSET, h = S / 2;
  if (t.open) return [];
  if (t.lots) return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => [x0 + a * h + (a ? 1 : 0), z0 + b * h + (b ? 1 : 0), x0 + (a ? S : h - 1), z0 + (b ? S : h - 1)]);
  if (t.alley === 'ns') return [[x0, z0, x0 + h - 3, z0 + S], [x0 + h + 3, z0, x0 + S, z0 + S]];
  if (t.alley === 'ew') return [[x0, z0, x0 + S, z0 + h - 3], [x0, z0 + h + 3, x0 + S, z0 + S]];
  if (t.bld) { const [w, d, al] = t.bld, bx = al === 'w' ? x0 : x0 + (S - w) / 2; return [[bx, z0, bx + w, z0 + d]]; }
  return [[x0, z0, x0 + S, z0 + S]];
}
/** shop door on a shopfront strip. origin = middle of the facade, n = outward normal. Same formula the builders use. */
export function doorAt(origin, n, len, off) {
  const along = n[0] ? [0, 1] : [1, 0], o = off == null ? len * .22 : off, depth = .6;
  const door = [origin[0] + n[0] * (depth + .04) + along[0] * o, origin[1] + n[1] * (depth + .04) + along[1] * o];
  return { door, stand: [door[0] + n[0] * 1.6, door[1] + n[1] * 1.6], normal: n };
}
/** Where the main entrance of a block's building is: the facade middle, outward normal and facade length. */
export function entrance(i, j) {
  const t = blockType(i, j), x0 = blockX(i) + INSET, z0 = blockZ(j) + INSET;
  if (t.bld) { const [w, d, al] = t.bld, bx = al === 'w' ? x0 : x0 + (S - w) / 2; return { origin: [bx + w / 2, z0 + d], n: [0, 1], len: Math.min(w - 2, S - 2) }; }
  if (t.alley === 'ns') return { origin: [x0 + (S / 2 - 3) / 2, z0 + S], n: [0, 1], len: S / 2 - 3 - 2 };
  return { origin: [x0 + S / 2, z0 + S], n: [0, 1], len: S - 2 };
}
// corners of the pavement ring around a block, c = 0..3 (top-left, top-right, bottom-right, bottom-left)
export const corner = (i, j, c) => {
  const sx = [-1, 1, 1, -1][c], sz = [-1, -1, 1, 1][c];
  return [blockX(i) + B / 2 + sx * (B / 2 - 1.5), blockZ(j) + B / 2 + sz * (B / 2 - 1.5)];
};
// kept for older callers: parks and plazas are the open green/paved blocks
export const isPark = (i, j) => { const c = blockChar(i, j); return c === 'p' || c === 'w' || c === 'Z'; };
