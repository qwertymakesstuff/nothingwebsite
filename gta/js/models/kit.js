// Shared building kit: a per-block accumulator that merges parts by material, tiny primitives, signs and shopfronts.
import { scene } from '../render.js';
import { doorAt } from '../layout.js';
import { pick } from '../util.js';
import { part, merge, xf, BOX, CYL, SPH } from './mesh.js';
import { vcStandard } from './materials.js';
import { facadeMat, boxFaces } from './facades.js';

export const FLOOR = 3.2;
export const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: .95 });
export const BRICKS = [0x9a5a44, 0x8a4a3a, 0xa8764f, 0x7a5a4a], PLASTERS = [0xd8cdb4, 0xc9d0c0, 0xe0c8a8, 0xb8c6d0, 0xd6b8b0], CONCRETES = [0xa8a8a2, 0x9a9ea4, 0xb4b0a4], GLASSES = [0x4a7a9a, 0x3f6f78, 0x5a6f8a, 0x2f4f6a];
export const D = (hex, f) => { const r = ((hex >> 16) & 255) * f, g = ((hex >> 8) & 255) * f, b = (hex & 255) * f; return ((r > 255 ? 255 : r) << 16) | ((g > 255 ? 255 : g) << 8) | (b > 255 ? 255 : b); };

// registries filled while the city is built (read by main, shops, zones)
export const doors = [];        // enterable shop doors { kind, x, z, nx, nz, name, poi }
export const parkingSpots = []; // { x, z, yaw, weight, district } where parked cars may stand
export const staticCars = [];   // cars that belong to a place: { x, z, yaw, type, color, kind }
export const lots = [];          // car parks { x0, z0, w, rows } so the ground texture can paint bay lines
export const circles = [];       // solid round obstacles [x, z, r] registered by builders
export const spinners = [];      // things that rotate: { mesh, speed, axis }
export const decor = { blocks: [] };
export const fenceSegs = [];     // wooden fence sections { x, z, yaw }, drawn and made breakable by props.js
export const track = [];          // loose meshes (signs, clock faces...) made while one block is built, so the block can hide them with the rest
export function put(m) { scene.add(m); track.push(m); return m; }

export class Acc {
  constructor() { this.map = new Map(); }
  add(geo, mat, keepUv) { if (!this.map.has(mat)) this.map.set(mat, { geos: [], uv: !!keepUv }); this.map.get(mat).geos.push(geo); }
  box(w, h, d, x, y, z, kind, base, topMat) { // textured building mass; (x,z) centre, y bottom
    const f = boxFaces(w, h, d, kind), mat = facadeMat(kind, base);
    this.add(xf(f.sides, { x, y: y + h / 2, z }), mat, true); this.add(xf(f.top, { x, y: y + h / 2, z }), topMat || roofMat, true);
  }
  vc(geo) { this.add(geo, vcStandard, false); }
  /** coloured box / cylinder / sphere in one call */
  b(hex, w, h, d, x, y, z, t) { this.vc(part(BOX, hex, Object.assign({ sx: w, sy: h, sz: d, x, y: y + h / 2, z }, t || {}))); }
  c(hex, rt, rb, h, x, y, z, seg) { this.vc(part(CYL(rt, rb, h, seg || 8), hex, { x, y: y + h / 2, z })); }
  s(hex, r, x, y, z, sy) { this.vc(part(SPH(r, 8, 6), hex, { x, y, z, sy: sy || 1 })); }
  flush(shadow) { const meshes = []; this.map.forEach((v, mat) => { const m = new THREE.Mesh(merge(v.geos, v.uv), mat); m.castShadow = !!shadow; scene.add(m); meshes.push(m); }); return meshes; }
}
export const prism = (w, h, d) => { // gable roof: triangle across x, extruded along z
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
};
const signTex = (text, bg, fg) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
  g.fillStyle = fg; let fs = 34; g.font = 'bold ' + fs + 'px monospace'; while (fs > 14 && g.measureText(text).width > 228) { fs -= 2; g.font = 'bold ' + fs + 'px monospace'; }   // long names shrink to fit the plate
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34);
  return new THREE.CanvasTexture(c);
};
const signMats = {};
export function signMat(text, bg, fg) { const k = text + bg + fg; return signMats[k] || (signMats[k] = new THREE.MeshBasicMaterial({ map: signTex(text, bg, fg) })); }
/** a flat sign on a facade or pole. (x,y,z) centre, ry facing */
export function sign(text, bg, fg, w, h, x, y, z, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(text, bg, fg)); m.position.set(x, y, z); m.rotation.y = ry || 0; put(m); return m; }
export const faceYaw = n => Math.atan2(n[0], n[1]);
const SHOPNAMES = [['PIZZA', '#7a1f1f', '#ffe9b0'], ['CAFE', '#2b3a2f', '#f0e6c8'], ['BOOKS', '#2a2f4a', '#e8d8a0'], ['PHARMACY', '#1f5a3a', '#e8fff0'], ['BARBER', '#1f2a4a', '#ffffff'], ['LAUNDRY', '#2f5f7a', '#ffffff'], ['NOODLES', '#6a2a1a', '#ffd7a0'], ['FLORIST', '#4a2a4a', '#ffd0f0'], ['PHONES', '#202020', '#40d0ff'], ['BAKERY', '#6a4a2a', '#fff0d0']];
const ENTER = { mart: ['24H MART', '#1d4f2a', '#ffffff'], fashion: ['FASHION', '#4a1f5a', '#ffe8ff'], diner: ['DINER', '#7a1f1f', '#fff2c8'] };

/**
 * Shopfront slab on a facade: windows + awning texture, signs, and (if `enter`) a real door that the shop system uses.
 * origin = facade middle, n = outward normal, len = width. enter = { kind, title, poi, name }.
 */
export function shopStrip(acc, R, origin, n, len, enter, opts) {
  opts = opts || {}; const h = opts.h || 3.6, depth = .6, ry = faceYaw(n), along = n[0] ? [0, 1] : [1, 0];
  const mat = facadeMat('shop', pick([0xe8dcc4, 0xd0d8e0, 0xe6d0c0, 0xc8d8c8])), cx = origin[0] + n[0] * depth / 2, cz = origin[1] + n[1] * depth / 2;
  const f = boxFaces(n[0] ? depth : len, h, n[0] ? len : depth, 'shop');
  acc.add(xf(f.sides, { x: cx, y: h / 2, z: cz }), mat, true); acc.add(xf(f.top, { x: cx, y: h / 2, z: cz }), roofMat, true);
  const count = Math.max(1, Math.floor(len / 11));
  for (let k = 0; k < count; k++) {
    const nm = opts.names ? opts.names[k % opts.names.length] : SHOPNAMES[Math.floor(R() * SHOPNAMES.length)], off = (k - (count - 1) / 2) * (len / count) * .9;
    if (enter && k === Math.floor(count / 2) && count > 1) continue;
    sign(nm[0], nm[1], nm[2], 5, 1.25, origin[0] + n[0] * (depth + .03) + along[0] * off, h + .75, origin[1] + n[1] * (depth + .03) + along[1] * off, ry);
  }
  if (!enter) return null;
  const E = ENTER[enter.kind] || ENTER.mart, dp = doorAt(origin, n, len), px = dp.door[0], pz = dp.door[1], title = enter.title || E[0];
  sign('', '#cfe8ff', '#cfe8ff', 1.9, 2.6, px, 1.35, pz, ry);
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9), new THREE.MeshBasicMaterial({ color: 0x24282e })); fr.position.set(px - n[0] * .015, 1.42, pz - n[1] * .015); fr.rotation.y = ry; put(fr);
  sign(title, E[1], E[2], 5.2, 1.3, px + n[0] * .02, 3.3, pz + n[1] * .02, ry);
  sign('OPEN', '#101010', '#46ff6a', 1.1, .35, px + n[0] * .03 + along[0] * 1.5, 1.7, pz + n[1] * .03 + along[1] * 1.5, ry);
  doors.push({ kind: enter.kind, x: dp.stand[0], z: dp.stand[1], nx: n[0], nz: n[1], name: enter.name || title, poi: enter.poi || null });
  return dp;
}
export function roofClutter(acc, R, cx, cz, top, w, d) {
  for (let k = 0; k < 3; k++) {
    const x = cx + (R() - .5) * (w - 4), z = cz + (R() - .5) * (d - 4);
    if (R() < .5) { acc.b(0x8a8e92, 2.2, 1.2, 1.6, x, top, z); acc.c(0x303236, .5, .5, .1, x, top + 1.2, z); }
    else { acc.c(0x7a5a3a, .9, .9, 1.4, x, top + .5, z); acc.c(0x3a2a1a, .95, 1.0, .1, x, top + 1.9, z); }
  }
}
/** painted bay lines + parked-car slots for a rectangular lot. cars stand in `slots`; weight scales how likely each is filled */
export function parkingBays(x0, z0, w, d, rows, district, weight) {
  lots.push({ x0, z0, w, rows }); const bayW = 2.8, per = Math.floor(w / bayW);
  for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
    const x = x0 + bayW / 2 + k * bayW + (w - per * bayW) / 2, z = z0 + 3 + r * 11.2;
    parkingSpots.push({ x, z, yaw: Math.PI / 2 * 0 + (r % 2 ? Math.PI : 0), weight: weight || 1, district });
  }
}
