// City blocks: offices downtown, apartments with shopfronts around them, houses on the outskirts, an industrial corner.
// Everything in a block is merged per material, so a whole block costs a handful of draw calls.
import { scene } from '../render.js';
import { B, INSET, N, blockX, blockZ, isPark, HOSPITAL, STATION } from '../layout.js';
import { rng, pick } from '../util.js';
import { part, merge, xf, BOX, CYL, SPH } from './mesh.js';
import { vcStandard } from './materials.js';
import { facadeMat, boxFaces } from './facades.js';

const S = B - 2 * INSET, FLOOR = 3.2;
const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: .95 });
const BRICKS = [0x9a5a44, 0x8a4a3a, 0xa8764f, 0x7a5a4a], PLASTERS = [0xd8cdb4, 0xc9d0c0, 0xe0c8a8, 0xb8c6d0, 0xd6b8b0], CONCRETES = [0xa8a8a2, 0x9a9ea4, 0xb4b0a4], GLASSES = [0x4a7a9a, 0x3f6f78, 0x5a6f8a, 0x2f4f6a];

export const doors = []; // enterable shop doors, filled while building
class Acc {
  constructor() { this.map = new Map(); }
  add(geo, mat, keepUv) { const k = mat; if (!this.map.has(k)) this.map.set(k, { geos: [], uv: !!keepUv }); this.map.get(k).geos.push(geo); }
  box(w, h, d, x, y, z, kind, base, topMat) { // textured building mass sitting on the ground at (x,z) centre, y = bottom
    const f = boxFaces(w, h, d, kind); const mat = facadeMat(kind, base);
    this.add(xf(f.sides, { x, y: y + h / 2, z }), mat, true); this.add(xf(f.top, { x, y: y + h / 2, z }), topMat || roofMat, true);
  }
  vc(geo) { this.add(geo, vcStandard, false); }
  flush(shadow) {
    this.map.forEach((v, mat) => { const m = new THREE.Mesh(merge(v.geos, v.uv), mat); m.castShadow = !!shadow; m.receiveShadow = false; scene.add(m); });
  }
}
const D = (hex, f) => { const r = ((hex >> 16) & 255) * f, g = ((hex >> 8) & 255) * f, b = (hex & 255) * f; return (r << 16) | (g << 8) | b; };
const prism = (w, h, d) => { // gable roof: triangle across x, extruded along z
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
};
function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
  g.fillStyle = fg; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); return t;
}
const signMats = {};
export function signMat(text, bg, fg) { const k = text + bg + fg; return signMats[k] || (signMats[k] = new THREE.MeshBasicMaterial({ map: signTexture(text, bg, fg) })); }
const SHOPNAMES = [['PIZZA', '#7a1f1f', '#ffe9b0'], ['CAFE', '#2b3a2f', '#f0e6c8'], ['BOOKS', '#2a2f4a', '#e8d8a0'], ['PHARMACY', '#1f5a3a', '#e8fff0'], ['BARBER', '#1f2a4a', '#ffffff'], ['BANK', '#3a3a3a', '#e8d27a'], ['LAUNDRY', '#2f5f7a', '#ffffff'], ['NOODLES', '#6a2a1a', '#ffd7a0']];
const ENTERABLE = { mart: ['24H MART', '#1d4f2a', '#ffffff'], fashion: ['FASHION', '#4a1f5a', '#ffe8ff'], diner: ['DINER', '#7a1f1f', '#fff2c8'] };
const signQuad = (w, h) => new THREE.PlaneGeometry(w, h);

/** Orient helper: place things on one of the four faces of the block interior. face 0=north(z-) 1=south(z+) 2=west(x-) 3=east(x+) */
function onFace(face, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2;
  return { origin: [[cx, z0], [cx, z0 + S], [x0, cz], [x0 + S, cz]][face], normal: [[0, -1], [0, 1], [-1, 0], [1, 0]][face], ry: [Math.PI, 0, -Math.PI / 2, Math.PI / 2][face] };
}

function shopStrip(acc, x0, z0, face, R, enter) {
  const F = onFace(face, x0, z0), len = S - 2, h = 3.6, depth = .6;
  const along = face < 2 ? [1, 0] : [0, 1];
  const mat = facadeMat('shop', pick([0xe8dcc4, 0xd0d8e0, 0xe6d0c0, 0xc8d8c8]));
  // a thin textured slab in front of the building's ground floor
  const g = new THREE.BoxGeometry(face < 2 ? len : depth, h, face < 2 ? depth : len).toNonIndexed();
  const f = boxFaces(face < 2 ? len : depth, h, face < 2 ? depth : len, 'shop');
  acc.add(xf(f.sides, { x: F.origin[0] + F.normal[0] * depth / 2, y: h / 2, z: F.origin[1] + F.normal[1] * depth / 2 }), mat, true);
  acc.add(xf(f.top, { x: F.origin[0] + F.normal[0] * depth / 2, y: h / 2, z: F.origin[1] + F.normal[1] * depth / 2 }), roofMat, true);
  // signs above windows, random shop names
  for (let k = 0; k < 3; k++) {
    const nm = SHOPNAMES[Math.floor(R() * SHOPNAMES.length)], off = (k - 1) * (len / 3.2);
    const m = new THREE.Mesh(signQuad(5, 1.25), signMat(nm[0], nm[1], nm[2]));
    m.position.set(F.origin[0] + F.normal[0] * (depth + .03) + along[0] * off, h + .75, F.origin[1] + F.normal[1] * (depth + .03) + along[1] * off); m.rotation.y = F.ry; scene.add(m);
  }
  if (enter) {
    const E = ENTERABLE[enter], off = len * .22;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.6), new THREE.MeshBasicMaterial({ color: 0xcfe8ff }));
    const px = F.origin[0] + F.normal[0] * (depth + .04) + along[0] * off, pz = F.origin[1] + F.normal[1] * (depth + .04) + along[1] * off;
    door.position.set(px, 1.35, pz); door.rotation.y = F.ry; scene.add(door);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9), new THREE.MeshBasicMaterial({ color: 0x24282e })); frame.position.set(px - F.normal[0] * .015, 1.42, pz - F.normal[1] * .015); frame.rotation.y = F.ry; scene.add(frame);
    const sign = new THREE.Mesh(signQuad(5.2, 1.3), signMat(E[0], E[1], E[2])); sign.position.set(px + F.normal[0] * .02, 3.3, pz + F.normal[1] * .02); sign.rotation.y = F.ry; scene.add(sign);
    const open = new THREE.Mesh(signQuad(1.1, .35), signMat('OPEN', '#101010', '#46ff6a')); open.position.set(px + F.normal[0] * .03 + along[0] * 1.5, 1.7, pz + F.normal[1] * .03 + along[1] * 1.5); open.rotation.y = F.ry; scene.add(open);
    doors.push({ kind: enter, x: px + F.normal[0] * 1.6, z: pz + F.normal[1] * 1.6, nx: F.normal[0], nz: F.normal[1], name: E[0] });
  }
}

function roofClutter(acc, R, cx, cz, top, w, d) {
  for (let k = 0; k < 3; k++) {
    const x = cx + (R() - .5) * (w - 4), z = cz + (R() - .5) * (d - 4);
    if (R() < .5) acc.vc(part(BOX, 0x8a8e92, { sx: 2.2, sy: 1.2, sz: 1.6, x, y: top + .6, z })), acc.vc(part(CYL(.5, .5, .1, 8), 0x303236, { x, y: top + 1.25, z }));
    else acc.vc(part(CYL(.9, .9, 1.4, 8), 0x7a5a3a, { x, y: top + 1.2, z })), acc.vc(part(CYL(.95, 1.0, .1, 8), 0x3a2a1a, { x, y: top + 1.9, z }));
  }
}

function office(acc, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2, base = pick(CONCRETES), glass = pick(GLASSES);
  acc.box(S - 2, 6.4, S - 2, cx, 0, cz, 'concrete', base);                         // podium
  const n = 1 + Math.floor(R() * 2);
  for (let t = 0; t < n; t++) {
    const w = 12 + R() * 8, d = 12 + R() * 8, h = 30 + R() * 45, tx = n === 1 ? cx : cx + (t ? 7 : -7), tz = n === 1 ? cz : cz + (t ? -5 : 5);
    acc.box(w, h, d, tx, 6.4, tz, 'glass', glass);
    const w2 = w * .7, d2 = d * .7, h2 = 6 + R() * 10;
    acc.box(w2, h2, d2, tx, 6.4 + h, tz, 'glass', glass);
    const top = 6.4 + h + h2;
    acc.vc(part(CYL(.12, .2, 10 + R() * 8, 5), 0xb0b4b8, { x: tx, y: top + 6, z: tz })); acc.vc(part(SPH(.25, 6, 4), 0xff3030, { x: tx, y: top + 11, z: tz }));
    roofClutter(acc, R, tx, tz, top, w2, d2);
  }
  roofClutter(acc, R, cx, cz, 6.4, S - 4, S - 4);
}
function apartments(acc, R, x0, z0, face, enter) {
  const kind = pick(['brick', 'brick', 'plaster']), base = kind === 'brick' ? pick(BRICKS) : pick(PLASTERS), floors = 4 + Math.floor(R() * 4), h = floors * FLOOR + 3.6;
  const depth = 14 + R() * 6;
  // main slab along the chosen street face, plus a lower wing behind it
  const along = face < 2;
  const w = along ? S : depth, d = along ? depth : S;
  const px = face === 2 ? x0 + depth / 2 : face === 3 ? x0 + S - depth / 2 : x0 + S / 2, pz = face === 0 ? z0 + depth / 2 : face === 1 ? z0 + S - depth / 2 : z0 + S / 2;
  acc.box(w, h, d, px, 0, pz, kind, base);
  const bx = face === 2 ? x0 + depth + (S - depth) / 2 : face === 3 ? x0 + (S - depth) / 2 : x0 + S / 2, bz = face === 0 ? z0 + depth + (S - depth) / 2 : face === 1 ? z0 + (S - depth) / 2 : z0 + S / 2;
  acc.box(along ? S - 4 : S - depth - 1, h * .6, along ? S - depth - 1 : S - 4, bx, 0, bz, kind, D(base, .92));
  // balconies on the front face
  const F = onFace(face, x0, z0);
  for (let f = 1; f < floors; f++) for (let k = -1; k <= 1; k++) {
    const off = k * 9, y = 3.6 + f * FLOOR - 1.2, bxp = F.origin[0] + F.normal[0] * .6 + (along ? off : 0), bzp = F.origin[1] + F.normal[1] * .6 + (along ? 0 : off);
    acc.vc(part(BOX, 0x8a8a86, { sx: along ? 3.2 : 1.2, sy: .12, sz: along ? 1.2 : 3.2, x: bxp, y, z: bzp })); acc.vc(part(BOX, 0x2a2a2e, { sx: along ? 3.2 : .05, sy: .8, sz: along ? .05 : 3.2, x: bxp + F.normal[0] * .55, y: y + .45, z: bzp + F.normal[1] * .55 }));
  }
  acc.vc(part(BOX, 0x56565a, { sx: along ? S : .6, sy: .5, sz: along ? .6 : S, x: F.origin[0] - F.normal[0] * .3, y: h + .25, z: F.origin[1] - F.normal[1] * .3 })); // parapet
  roofClutter(acc, R, px, pz, h, w, d);
  shopStrip(acc, x0, z0, face, R, enter);
  // fire escape on the opposite side
  const O = onFace(face ^ 1, x0, z0);
  return { face };
}
function houses(acc, R, x0, z0) {
  const lot = S / 2;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const lx = x0 + a * lot, lz = z0 + b * lot, cx = lx + lot / 2, cz = lz + lot / 2;
    acc.vc(part(BOX, 0x4f8a45, { sx: lot - .4, sy: .04, sz: lot - .4, x: cx, y: .02, z: cz }));                  // lawn
    const w = 8 + R() * 2.5, d = 7 + R() * 2, h = 3.4 + R() * 1.2, wall = pick(PLASTERS), roof = pick([0x7a3a2a, 0x4a4a52, 0x5a3a28, 0x3a4a5a]);
    const hz = lz + lot * .32, hx = cx;
    acc.box(w, h, d, hx, .04, hz, 'house', wall);
    acc.vc(part(prism(w + .8, 2.2, d + .8), roof, { x: hx, y: h + .04, z: hz }));                               // gable roof
    acc.vc(part(BOX, D(wall, .8), { sx: 1.2, sy: 2.6, sz: 1.2, x: hx + w / 2 - 1.5, y: h + 1.9, z: hz - d / 4 }));  // chimney
    acc.vc(part(BOX, 0x5a3a28, { sx: 1.1, sy: 2.2, sz: .12, x: hx - w / 4, y: 1.15, z: hz + d / 2 + .03 }));       // front door
    acc.vc(part(BOX, 0x8a8a86, { sx: 2.6, sy: .2, sz: 1.6, x: hx - w / 4, y: .12, z: hz + d / 2 + .9 }));          // step / porch
    acc.vc(part(BOX, 0x6a6a6c, { sx: 3.2, sy: .04, sz: lot * .5, x: hx + w / 2 + 1.4, y: .05, z: lz + lot * .72 })); // driveway
    // picket fence along the lot front
    for (let p = 0; p < 10; p++) acc.vc(part(BOX, 0xf0eee8, { sx: .12, sy: .9, sz: .1, x: lx + .8 + p * (lot - 1.6) / 9, y: .45, z: lz + lot - .5 }));
    acc.vc(part(BOX, 0xf0eee8, { sx: lot - 1.6, sy: .08, sz: .08, x: cx, y: .7, z: lz + lot - .5 }));
    // a bush and a tree
    acc.vc(part(SPH(.7, 7, 5), 0x3a7a3a, { x: hx + w / 2 + .4, y: .5, z: hz + d / 2 + .2, sy: .8 }));
    const tx = lx + (a ? 2 : lot - 2), tz = lz + lot * .75;
    acc.vc(part(CYL(.18, .24, 1.8, 6), 0x5a3d22, { x: tx, y: .9, z: tz })); acc.vc(part(SPH(1.6, 8, 6), pick([0x3a7a3a, 0x4a8a3a, 0x2f6a35]), { x: tx, y: 3, z: tz })); acc.vc(part(SPH(1.1, 7, 5), 0x3f8a40, { x: tx + .6, y: 3.8, z: tz - .3 }));
  }
}
function industrial(acc, R, x0, z0) {
  const kind = 'metal', base = pick([0x8a949c, 0x7a8a84, 0x9a8a78]);
  acc.box(S - 8, 8, 16, x0 + S / 2, 0, z0 + 10, kind, base);                                                // warehouse
  acc.vc(part(prism(S - 7, 2.5, 16.6), 0x5a5e66, { rz: 0, x: x0 + S / 2, y: 8, z: z0 + 10, sy: 1 }));
  for (let k = 0; k < 3; k++) acc.vc(part(BOX, 0x3a4048, { sx: 4, sy: 4.4, sz: .15, x: x0 + 8 + k * 9, y: 2.3, z: z0 + 18.1 }));  // roller doors
  for (let k = 0; k < 3; k++) acc.vc(part(CYL(2.2, 2.2, 10, 12), 0xc8ccd0, { x: x0 + 5 + k * 5, y: 5, z: z0 + 26 })), acc.vc(part(SPH(2.2, 10, 5), 0xb8bcc0, { x: x0 + 5 + k * 5, y: 10, z: z0 + 26, sy: .5 })); // silos
  acc.vc(part(CYL(.9, 1.3, 16, 8), 0x8a4a3a, { x: x0 + S - 4, y: 8, z: z0 + 24 })); acc.vc(part(CYL(.95, .95, 1, 8), 0xe0e0e0, { x: x0 + S - 4, y: 14, z: z0 + 24 }));
  const cols = [0xb8322f, 0x2f5fb8, 0xd2a52f, 0x2f9a58, 0x8a8e96];
  for (let k = 0; k < 4; k++) { const cx = x0 + S - 10 + (k % 2) * 3, cz = z0 + 6 + Math.floor(k / 2) * 6.4; for (let l = 0; l < 1 + (k % 2); l++) acc.vc(part(BOX, pick(cols), { sx: 2.5, sy: 2.6, sz: 6, x: cx, y: 1.3 + l * 2.6, z: cz })); } // containers
  for (let p = 0; p < 14; p++) acc.vc(part(BOX, 0x70747a, { sx: .1, sy: 2, sz: .1, x: x0 + 1 + p * 2.4, y: 1, z: z0 + S - 1 })); acc.vc(part(BOX, 0x70747a, { sx: S - 2, sy: .08, sz: .08, x: x0 + S / 2, y: 1.7, z: z0 + S - 1 }));
}
function special(acc, R, x0, z0, which) {
  const base = which === 'hospital' ? 0xe6e8ec : 0x5a78b0;
  acc.box(S, 18, S, x0 + S / 2, 0, z0 + S / 2, 'hospital', base);
  const cross = which === 'hospital' ? 0xcc2222 : 0xe8e8ea;
  acc.vc(part(BOX, cross, { sx: 7, sy: 2, sz: .3, x: x0 + S / 2, y: 22, z: z0 + S + .15 })); acc.vc(part(BOX, cross, { sx: 2, sy: 7, sz: .3, x: x0 + S / 2, y: 22, z: z0 + S + .15 }));
  acc.vc(part(BOX, which === 'hospital' ? 0xf0f0f2 : 0x2a3a5a, { sx: S + 1, sy: 2, sz: 1, x: x0 + S / 2, y: 19, z: z0 + S + .5 }));
  acc.vc(part(BOX, 0x2a4a8a, { sx: S - 8, sy: .6, sz: 5, x: x0 + S / 2, y: 3.4, z: z0 + S + 2.5 }));
  roofClutter(acc, R, x0 + S / 2, z0 + S / 2, 18, S, S);
}
export function buildBlock(i, j, enterable) {
  const x0 = blockX(i) + INSET, z0 = blockZ(j) + INSET, R = rng(i * 131 + j * 17 + 5), acc = new Acc();
  const dc = Math.max(Math.abs(i - 3), Math.abs(j - 3));
  if (i === HOSPITAL[0] && j === HOSPITAL[1]) special(acc, R, x0, z0, 'hospital');
  else if (i === STATION[0] && j === STATION[1]) special(acc, R, x0, z0, 'station');
  else if (i <= 1 && j >= 4) industrial(acc, R, x0, z0);
  else if (dc <= 1) office(acc, R, x0, z0);
  else if (dc === 2) { const face = Math.abs(i - 3) >= Math.abs(j - 3) ? (i < 3 ? 3 : 2) : (j < 3 ? 1 : 0); apartments(acc, R, x0, z0, face, enterable || null); }
  else houses(acc, R, x0, z0);
  acc.flush(true);
}
export const ENTERABLE_BLOCKS = { '3,1': 'mart', '1,3': 'fashion', '5,3': 'diner', '3,5': 'mart', '2,1': 'diner', '4,1': 'fashion' };
