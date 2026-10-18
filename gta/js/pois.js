// Points of interest: one registry that the minimap, the map, missions, interactions and the world builders all read.
// Everything here is plain data computed from the city map, so positions can be tested without a renderer.
import { N, B, S, INSET, MAP, blockX, blockZ, corner, findBlocks, districtOf, footprints, entrance, doorAt, rc } from './layout.js';
import { HW_H, HW_ROAD } from './highway.js';

/** category -> label, colour, map glyph (a letter, so it also draws without an emoji font) and a display emoji */
export const CATEGORIES = {
  police:      { label: 'Police',          color: '#4f78ff', glyph: 'P', icon: '🚓' },
  hospital:    { label: 'Hospital',        color: '#ff5b5b', glyph: '+', icon: '🏥' },
  fire:        { label: 'Fire station',    color: '#ff8a2a', glyph: 'F', icon: '🚒' },
  dealership:  { label: 'Dealership',      color: '#35c9c9', glyph: '$', icon: '🚗' },
  garage:      { label: 'Repair garage',   color: '#c9a135', glyph: 'R', icon: '🔧' },
  gas:         { label: 'Gas station',     color: '#e0e04a', glyph: 'G', icon: '⛽' },
  store:       { label: 'Convenience store', color: '#5ad87a', glyph: 'S', icon: '🏪' },
  supermarket: { label: 'Supermarket',     color: '#5ad87a', glyph: 'M', icon: '🛒' },
  clothing:    { label: 'Clothing shop',   color: '#d066ff', glyph: 'C', icon: '👕' },
  restaurant:  { label: 'Restaurant',      color: '#ff9f5a', glyph: 'D', icon: '🍔' },
  safehouse:   { label: 'Safehouse',       color: '#ffffff', glyph: 'H', icon: '🏠' },
  mission:     { label: 'Job',             color: '#ffd23f', glyph: '!', icon: '❗' },
  bank:        { label: 'Bank',            color: '#e8c76a', glyph: 'B', icon: '🏦' },
  warehouse:   { label: 'Warehouse',       color: '#9aa4b0', glyph: 'W', icon: '📦' },
  factory:     { label: 'Factory',         color: '#9aa4b0', glyph: 'X', icon: '🏭' },
  depot:       { label: 'Truck depot',     color: '#9aa4b0', glyph: 'T', icon: '🚚' },
  docks:       { label: 'Docks',           color: '#5ab8e0', glyph: 'K', icon: '⚓' },
  parking:     { label: 'Parking',         color: '#8a9ab0', glyph: 'p', icon: '🅿️' },
  landmark:    { label: 'Landmark',        color: '#ff7ad8', glyph: '*', icon: '⭐' },
  park:        { label: 'Park',            color: '#6ac85a', glyph: 't', icon: '🌳' },
  site:        { label: 'Site',            color: '#b89a6a', glyph: 's', icon: '🚧' },
  health:      { label: 'Health',          color: '#ff4466', glyph: '+', icon: '❤️', hidden: true }
};

export const FACE = { N: 0, S: 1, W: 2, E: 3 };
const NORMAL = [[0, -1], [0, 1], [-1, 0], [1, 0]];
/** pavement point at the middle of a block side (where people stand to use a building) */
export function frontPoint(i, j, face) { const bx = blockX(i), bz = blockZ(j); return [[bx + B / 2, bz + 1.5], [bx + B / 2, bz + B - 1.5], [bx + 1.5, bz + B / 2], [bx + B - 1.5, bz + B / 2]][face]; }
/** point on the road next to the middle of a block side (respawn / delivery spot) */
export function roadPoint(i, j, face) { const bx = blockX(i), bz = blockZ(j); return [[bx + B / 2, bz - 3.5], [bx + B / 2, bz + B + 3.5], [bx - 3.5, bz + B / 2], [bx + B + 3.5, bz + B / 2]][face]; }
// what each kind of block contributes. face: which side the entrance is on. interior: a shop interior kind. zone: a functional interaction.
const SPEC = {
  L: [{ id: 'police_hq', name: 'Harbor Police HQ', category: 'police', face: FACE.S, exteriorOnly: true, respawn: 'station' }, { id: 'police_holding', name: 'Police holding yard', category: 'police', face: FACE.N, exteriorOnly: true }],
  E: [{ id: 'fire_station', name: 'Fire Station 3', category: 'fire', face: FACE.S, exteriorOnly: true }],
  H: [{ id: 'hospital', name: "St. Mary's Hospital", category: 'hospital', face: FACE.S, exteriorOnly: true, respawn: 'hospital' }],
  V: [{ id: 'dealership', name: 'Harbor Motors', category: 'dealership', face: FACE.S, zone: 'dealership' }],
  X: [{ id: 'repair_garage', name: 'Quick Fix Garage', category: 'garage', face: FACE.S, zone: 'repair' }],
  F: [{ name: 'Petro Stop', category: 'gas', face: FACE.S, exteriorOnly: true }],
  M: [{ id: 'supermarket', name: 'Fresh Market', category: 'supermarket', face: FACE.S, interior: 'mart', title: 'SUPERMARKET' }],
  s: [{ name: 'Corner Mart', category: 'store', face: FACE.S, interior: 'mart', title: '24H MART' }],
  R: [{ name: 'Diner', category: 'restaurant', face: FACE.S, interior: 'diner', title: 'DINER' }],
  C: [{ name: 'Fashion', category: 'clothing', face: FACE.S, interior: 'fashion', title: 'FASHION' }],
  B: [{ id: 'bank', name: 'Harbor Bank', category: 'bank', face: FACE.S, exteriorOnly: true }],
  G: [{ id: 'garage_central', name: 'Central Parking', category: 'parking', face: FACE.S, exteriorOnly: true }],
  T: [{ id: 'harbor_tower', name: 'Harbor Tower', category: 'landmark', face: FACE.S, exteriorOnly: true }],
  Z: [{ id: 'city_plaza', name: 'City Plaza clock tower', category: 'landmark', face: FACE.S, exteriorOnly: true }],
  w: [{ id: 'harbor_wheel', name: 'Harbor Wheel', category: 'landmark', face: FACE.S, exteriorOnly: true }],
  l: [{ id: 'lighthouse', name: 'North Point Lighthouse', category: 'landmark', face: FACE.S, exteriorOnly: true }],
  S: [{ id: 'safehouse', name: 'Safehouse', category: 'safehouse', face: FACE.S, zone: 'safehouse' }],
  I: [{ name: 'Warehouse', category: 'warehouse', face: FACE.S, exteriorOnly: true }],
  Y: [{ name: 'Steel Factory', category: 'factory', face: FACE.S, exteriorOnly: true }],
  U: [{ name: 'Truck Depot', category: 'depot', face: FACE.S, exteriorOnly: true }],
  P: [{ name: 'Container Yard', category: 'warehouse', face: FACE.S, exteriorOnly: true }],
  W: [{ name: 'Port Warehouse', category: 'warehouse', face: FACE.S, exteriorOnly: true }],
  K: [{ name: 'Docks', category: 'docks', face: FACE.S, exteriorOnly: true }],
  N: [{ name: 'Public Car Park', category: 'parking', face: FACE.S, exteriorOnly: true }],
  c: [{ name: 'Construction site', category: 'site', face: FACE.S, exteriorOnly: true }],
  p: [{ name: 'Park', category: 'park', face: FACE.S, exteriorOnly: true }]
};
// extra shops on some apartment blocks so the residential streets have corner shops of their own
const APARTMENT_SHOPS = { '1,3': { name: 'Corner Mart', category: 'store', interior: 'mart', title: '24H MART' }, '4,2': { name: 'Diner', category: 'restaurant', interior: 'diner', title: 'DINER' }, '2,4': { name: 'Fashion', category: 'clothing', interior: 'fashion', title: 'FASHION' } };
export const APARTMENT_SHOP_BLOCKS = APARTMENT_SHOPS;

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
/** The whole registry as a list. Pure, deterministic. */
export function buildPois() {
  const out = [], used = new Set(), counts = {};
  const add = o => {
    let id = o.id || slug(o.name); if (used.has(id)) { counts[id] = (counts[id] || 1) + 1; id = id + '_' + counts[id]; } used.add(id); counts[o.id || slug(o.name)] = counts[o.id || slug(o.name)] || 1;
    const cat = CATEGORIES[o.category];
    out.push(Object.assign({ id, district: districtOf(o.i, o.j), radius: 6, icon: cat.icon, glyph: cat.glyph, color: cat.color, exteriorOnly: false }, o, { id }));
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const specs = (SPEC[MAP[j][i]] || []).slice(), ex = APARTMENT_SHOPS[i + ',' + j]; if (ex && MAP[j][i] === 'a') specs.push(Object.assign({ face: FACE.S }, ex));
    for (const sp of specs) {
      let pt;
      const en = entrance(i, j), dp = doorAt(en.origin, en.n, en.len);
      if (sp.interior || sp.zone) { pt = dp.stand; sp.door = dp.door; sp.normal = dp.normal; }
      else if (sp.id === 'police_holding') pt = frontPoint(i, j, FACE.N); else pt = frontPoint(i, j, sp.face);
      add(Object.assign({}, sp, { i, j, x: pt[0], z: pt[1], road: roadPoint(i, j, sp.id === 'police_holding' ? FACE.N : sp.face), name: sp.name }));
    }
  }
  // job givers on pavement corners all over the city
  const giverSpots = [['Z', 0, 'City Plaza job'], ['K', 1, 'Docks job'], ['U', 0, 'Depot job'], ['N', 0, 'Car park job'], ['w', 0, 'Waterfront job'], ['p', 1, 'Park job'], ['o', 0, 'Outskirts job'], ['D', 0, 'Downtown job']];
  giverSpots.forEach(([ch, c, name], k) => { const [i, j] = findBlocks(ch)[0]; const p = corner(i, j, c); add({ id: 'job_' + (k + 1), name, category: 'mission', i, j, x: p[0], z: p[1], radius: 3.5, kind: 'giver', exteriorOnly: true, road: [p[0], p[1]] }); });
  // health pickups
  findBlocks('p').concat(findBlocks('w'), findBlocks('Z')).forEach(([i, j], k) => { const p = corner(i, j, 0); add({ id: 'health_' + (k + 1), name: 'Health', category: 'health', i, j, x: p[0] + 3, z: p[1] + 3, radius: 2.2, kind: 'pickup', exteriorOnly: true, road: [p[0], p[1]] }); });
  return out;
}
// only the first of each bulk category (warehouse, factory, depot, docks, site) is a flagship marker; the rest are minor (still valid mission targets)
const POIS_ALL = buildPois(), seen = new Set();
POIS_ALL.forEach(p => { if (['warehouse', 'factory', 'depot', 'docks', 'site', 'gas', 'parking', 'store', 'restaurant', 'clothing'].includes(p.category)) { const k = p.category + '|' + (p.category === 'warehouse' || p.category === 'depot' || p.category === 'factory' || p.category === 'docks' || p.category === 'site' ? '' : p.district); p.minor = seen.has(k); seen.add(k); } });
export const POIS = POIS_ALL;
const byId = new Map(POIS.map(p => [p.id, p]));
export const getPoi = id => byId.get(id) || null;
export const poisOfCategory = c => POIS.filter(p => p.category === c);
export const poisInDistrict = d => POIS.filter(p => p.district === d);
export const visiblePois = () => POIS.filter(p => !CATEGORIES[p.category].hidden);
export const mapPois = () => POIS.filter(p => !CATEGORIES[p.category].hidden && !p.minor);
export function nearestPoi(x, z, category) { let best = null, bd = Infinity; for (const p of POIS) { if (category && p.category !== category) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best ? { poi: best, dist: bd } : null; }
/**
 * Resolve a reference used by missions: 'poi:<id>', 'cat:<category>' (a random one of that category), or 'district:<name>' (a random POI there).
 * Returns a POI, or null.
 */
export function resolveRef(ref, rand = Math.random) {
  const [kind, val] = String(ref).split(':');
  if (kind === 'poi') return getPoi(val);
  const list = kind === 'cat' ? poisOfCategory(val) : kind === 'district' ? poisInDistrict(val).filter(p => p.category !== 'health' && p.category !== 'mission') : [];
  return list.length ? list[Math.floor(rand() * list.length)] : null;
}
/** is a point inside a building footprint (used to keep spawns and markers clear of buildings) */
export function insideBuilding(x, z) {
  const i = Math.floor((x - 7) / (B + 14)), j = Math.floor((z - 7) / (B + 14));
  if (i < 0 || j < 0 || i >= N || j >= N) return false;
  return footprints(i, j).some(f => x > f[0] && x < f[2] && z > f[1] && z < f[3]);
}

/**
 * A mission destination: { x, z, y, name, poi }. Refs: 'poi:<id>', 'cat:<category>', 'district:<name>' (random matching POI, use the
 * road point so a car can reach it), 'node:<a>,<b>' (an intersection) and 'deck:<a>' (an intersection on the highway deck).
 */
export function resolveTarget(ref, rand = Math.random) {
  const [kind, val] = String(ref).split(':');
  if (kind === 'node') { const [a, b] = val.split(',').map(Number); return { x: rc(a), z: rc(b), y: 0, name: 'intersection ' + a + '/' + b, poi: null }; }
  if (kind === 'deck') { const a = Number(val); return { x: rc(a), z: rc(HW_ROAD), y: HW_H, name: 'the highway', poi: null }; }
  const poi = resolveRef(ref, rand); if (!poi) return null;
  const r = poi.road || [poi.x, poi.z];
  return { x: r[0], z: r[1], y: 0, name: poi.name, poi: poi.id };
}
