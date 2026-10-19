// One generator per block type. Each adds merged geometry to the block's accumulator and registers things the world needs
// (shop doors, parking spots, cars that belong to a place, solid circles, things that spin).
import { scene } from '../render.js';
import { S, B, INSET, blockX, blockZ, WORLD, entrance, blockType, doorAt } from '../layout.js';
import { pick, rng } from '../util.js';
import { part, merge, xf, BOX, CYL, SPH } from './mesh.js';
import { facadeMat } from './facades.js';
import { put, Acc, D, BRICKS, PLASTERS, CONCRETES, GLASSES, FLOOR, prism, sign, signMat, shopStrip, roofClutter, parkingBays, parkingSpots, staticCars, circles, spinners, doors } from './kit.js';
import { APARTMENT_SHOP_BLOCKS } from '../pois.js';
import { scaffold, rooftop, balcony, awning, gantryCrane, floodlight, gatehouse, loadingBay, parapet, hvac, ledge } from './archetypes.js';
import { STYLE } from './style.js';

const H2 = S / 2;
const fence = (a, x0, z0, x1, z1, hex, gap) => { // posts + rails along a rectangle outline; gap = {side:'s', c, w} leaves an opening
  hex = hex || 0x70747a; const post = (x, z) => a.b(hex, .1, 2, .1, x, 0, z);
  const run = (ax, az, bx, bz, skipFrom, skipTo) => { const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.4)); for (let k = 0; k <= n; k++) { const t = k / n, d = t * len; if (skipFrom != null && d > skipFrom && d < skipTo) continue; post(ax + (bx - ax) * t, az + (bz - az) * t); }
    const hx = Math.abs(bx - ax) > Math.abs(bz - az); const segs = skipFrom == null ? [[0, len]] : [[0, skipFrom], [skipTo, len]];
    segs.forEach(([s0, s1]) => { if (s1 - s0 < .2) return; const t0 = s0 / len, t1 = s1 / len, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2; a.b(hex, hx ? s1 - s0 : .06, .06, hx ? .06 : s1 - s0, mx, 1.5, mz); a.b(hex, hx ? s1 - s0 : .06, .06, hx ? .06 : s1 - s0, mx, .8, mz); }); };
  const g = gap || {};
  run(x0, z0, x1, z0, g.side === 'n' ? g.c - g.w / 2 - x0 : null, g.side === 'n' ? g.c + g.w / 2 - x0 : null); run(x0, z1, x1, z1, g.side === 's' ? g.c - g.w / 2 - x0 : null, g.side === 's' ? g.c + g.w / 2 - x0 : null);
  run(x0, z0, x0, z1); run(x1, z0, x1, z1);
};
const tree = (a, x, z, s) => { s = s || 1; a.c(0x5a3d22, .16 * s, .24 * s, 2.2 * s, x, 0, z, 6); a.s(pick([0x3a7a3a, 0x4a8a3a, 0x2f6a35]), 1.5 * s, x, 3.4 * s, z, 1.05); a.s(0x4a8a3a, 1.0 * s, x + .7 * s, 4.3 * s, z + .2 * s); };
const container = (a, hex, x, y, z, rot) => { const w = rot ? 2.5 : 6, d = rot ? 6 : 2.5; a.b(hex, w, 2.6, d, x, y, z); for (let k = 0; k < 3; k++) a.b(D(hex, .78), rot ? 2.52 : .08, 2.5, rot ? .08 : 2.52, x + (rot ? 0 : -2.4 + k * 2.4), y + .05, z + (rot ? -2.4 + k * 2.4 : 0)); a.b(D(hex, .6), rot ? 2.3 : .1, 2.3, rot ? .1 : 2.3, x + (rot ? 0 : 3), y + .15, z + (rot ? 3 : 0)); };
const CONT = [0xb8322f, 0x2f5fb8, 0xd2a52f, 0x2f9a58, 0x8a8e96, 0xe0702a, 0x6a2430];
const LINES = [[0xb8322f, 0xd04a3f], [0x2f5fb8, 0x4a78d0], [0xd2a52f, 0xe4bc4a], [0x2f9a58, 0x4ab070], [0x8a8e96, 0xa4a8b0], [0xe0702a, 0xf08a40], [0x6a2430, 0x8a3a48]];   // shipping lines: a main colour and a lighter one
const wheelOfPoints = []; // keeps nothing; here to make the intent obvious: only the Ferris wheel spins

/* ---------- outskirts ---------- */
function outskirt(a, R, x0, z0) {
  const v = Math.floor(R() * 3);
  for (let k = 0; k < 4 + Math.floor(R() * 4); k++) tree(a, x0 + 3 + R() * (S - 6), z0 + 3 + R() * (S - 6), .8 + R() * .5);
  if (v === 0) { for (const x of [x0 + 8, x0 + 14]) a.b(0x6a4a2a, .15, 2.4, .15, x, 0, z0 + S - 2); sign('FOR SALE', '#f4f4f0', '#b02a2a', 6, 1.4, x0 + 11, 2.1, z0 + S - 2 + .12, 0); }
  else if (v === 1) {
    const x = x0 + 9, z = z0 + 10; for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) a.b(0x6a6e74, .14, 8, .14, x + dx, 0, z + dz);
    a.c(0x8a6a4a, 2.4, 2.4, 3.6, x, 8, z, 12); a.c(0x4a3a2a, 0, 2.7, 1.2, x, 11.6, z, 12); circles.push([x, z, 2]);
    a.b(0x8a7a5a, 5, 3, 4, x0 + 24, 0, z0 + 22); a.vc(part(prism(5.6, 1.6, 4.6), 0x5a4030, { x: x0 + 24, y: 3, z: z0 + 22 })); circles.push([x0 + 24, z0 + 22, 3]);
  } else { for (const x of [x0 + 6, x0 + 28]) a.b(0x55585e, .4, 9, .4, x, 0, z0 + S - 4); a.b(0x2a2a2e, 24, 7, .3, x0 + 17, 9, z0 + S - 4); sign('VISIT HARBOR CITY', '#1f4f8a', '#fff3c8', 22, 5.6, x0 + 17, 12.4, z0 + S - 3.8, 0); circles.push([x0 + 6, z0 + S - 4, .4], [x0 + 28, z0 + S - 4, .4]); }
}
function farm(a, R, x0, z0) {
  fence(a, x0 + .5, z0 + .5, x0 + S - .5, z0 + S - .5, 0x6a4a2a, { side: 's', c: x0 + S / 2, w: 5 });
  a.b(0x9a2f2a, 12, 6, 9, x0 + 12, 0, z0 + 12); a.vc(part(prism(13.4, 4.2, 9.8), 0x4a3a30, { x: x0 + 12, y: 6, z: z0 + 12 })); a.b(0xf0ece0, 4, 4.2, .1, x0 + 12, 0, z0 + 17.1);
  a.c(0xc8ccd0, 2.1, 2.1, 11, x0 + 26, 0, z0 + 8, 12); a.s(0xb8bcc0, 2.1, x0 + 26, 11, z0 + 8, .55); circles.push([x0 + 26, z0 + 8, 2.4]);
  a.b(0xd8cdb4, 8, 3.4, 6, x0 + 24, 0, z0 + 25); a.vc(part(prism(9, 2.2, 6.8), 0x7a3a2a, { x: x0 + 24, y: 3.4, z: z0 + 25 }));
  for (let k = 0; k < 6; k++) a.c(0xd8c070, 1.1, 1.1, 1.2, x0 + 5 + (k % 3) * 2.6, 0, z0 + 27 + Math.floor(k / 3) * 2.6, 9);
}
function construction(a, R, x0, z0) {
  fence(a, x0 + .5, z0 + .5, x0 + S - .5, z0 + S - .5, 0xe0a030, { side: 's', c: x0 + S / 2, w: 6 });
  a.s(0x8a7050, 4, x0 + 9, 0, z0 + 27, .45); a.b(0x7a6a50, 40, .05, 40, x0 + S / 2, 0, z0 + S / 2, { sx: 33, sz: 33 });
  const fx = x0 + 14, fz = z0 + 12;
  for (let lv = 0; lv < 3; lv++) { a.b(0x9a9a94, 12, .4, 10, fx, lv * 3.4 + 3, fz); for (const [dx, dz] of [[-5.5, -4.5], [5.5, -4.5], [-5.5, 4.5], [5.5, 4.5], [0, -4.5], [0, 4.5]]) a.b(0x8a8a84, .5, 3.4, .5, fx + dx, lv * 3.4, fz + dz); }
  for (let k = 0; k < 8; k++) a.b(0xe0702a, .08, .5, .08, fx - 5.5 + k * 1.6, 10.2, fz - 4.8);
  scaffold(a, fx, fz + 5.2, 12, 10.2, 1.1);
  const cx = x0 + 27, cz = z0 + 12; a.b(0xe8b020, 1.6, 30, 1.6, cx, 0, cz); a.b(0xe8b020, 1, 1, 30, cx, 30, cz - 8); a.b(0x55585e, 2.4, 2.4, 3, cx, 29, cz + 8); a.b(0x2a2a2e, .1, 8, .1, cx, 20, cz - 14); circles.push([cx, cz, 1.2]);
  a.b(0xdedede, 6, 2.6, 2.4, x0 + 26, 0, z0 + 27); a.b(0x2a4a8a, 6.02, .2, 2.42, x0 + 26, 1.1, z0 + 27);
  for (let k = 0; k < 4; k++) for (let n = 0; n < 4; n++) a.b(n % 2 ? 0xf4f4f0 : 0xe05020, .5, .8, .08, x0 + 3 + k * 2.6 + n * .5, 0, z0 + S - 3 + (n % 2) * .01);
}
function lighthouse(a, R, x0, z0) {
  const x = x0 + S / 2, z = z0 + S / 2;
  for (let k = 0; k < 6; k++) a.c(k % 2 ? 0xc02a2a : 0xf4f4f0, 3 - k * .22, 3.2 - k * .22, 4, x, k * 4, z, 14);
  a.c(0x2a2a2e, 3.4, 3.4, .4, x, 24, z, 14); a.c(0xfff0b0, 1.5, 1.5, 2.2, x, 24.4, z, 12); a.c(0xc02a2a, 0, 2.2, 1.6, x, 26.6, z, 12); circles.push([x, z, 3.4]);
  a.b(0xd8cdb4, 7, 3.2, 6, x - 9, 0, z + 5); a.vc(part(prism(8, 2, 6.8), 0x7a3a2a, { x: x - 9, y: 3.2, z: z + 5 })); circles.push([x - 9, z + 5, 4]);
  for (let k = 0; k < 8; k++) a.s(0x70747a, 1 + R() * 1.4, x0 + 3 + R() * (S - 6), .3, z0 + S - 2 + R() * 1.5, .6);
}

/* ---------- residential ---------- */
function apartmentsAlley(a, R, x0, z0, i, j) {
  const kind = pick(['brick', 'brick', 'plaster']), w = S / 2 - 3, shop = APARTMENT_SHOP_BLOCKS[i + ',' + j];
  [0, 1].forEach(side => {
    const base = kind === 'brick' ? pick(BRICKS) : pick(PLASTERS), floors = 4 + Math.floor(R() * 4), h = floors * FLOOR + 3.6, cx = side ? x0 + S - w / 2 : x0 + w / 2;
    a.box(w, h, S, cx, 0, z0 + S / 2, kind, base);
    a.b(0x56565a, w, .5, .6, cx, h, z0 + .3); a.b(0x56565a, w, .5, .6, cx, h, z0 + S - .3);
    for (let f = 1; f < floors; f++) for (let k = 0; k < 3; k++) balcony(a, cx - w / 3 + k * w / 3, 3.6 + f * FLOOR - 1.2, z0 + S, 2.8, [0, 1]);
    ledge(a, STYLE.building.trim, cx, z0 + S / 2, 3.6, w, S, .35, .2); rooftop(a, R, cx, z0 + S / 2, h + .5, w, S);
    const inner = side ? cx - w / 2 : cx + w / 2; // fire escape on the alley wall
    for (let f = 1; f < floors; f++) { a.b(0x2a2a2e, 1.4, .1, 3, inner + (side ? -.7 : .7), 3.6 + f * FLOOR - 1, z0 + 8 + (f % 2) * 10); a.b(0x2a2a2e, .1, FLOOR, .1, inner + (side ? -1.3 : 1.3), 3.6 + (f - 1) * FLOOR, z0 + 8 + (f % 2) * 10); }
    if (side === 0) { const en = entrance(i, j); shopStrip(a, R, en.origin, en.n, en.len, shop ? { kind: shop.interior, title: shop.title, name: shop.name, poi: i + ',' + j } : null); }
    else shopStrip(a, R, [cx, z0 + S], [0, 1], w - 2, null);
  });
  a.b(0x2f6a3f, 1.9, 1.1, 1.0, x0 + H2, 0, z0 + 8); a.b(0x6a6a6c, 5, .03, S, x0 + H2, 0, z0 + H2);
  for (let k = 0; k < 3; k++) a.c(0x3a5a8a, .4, .4, .9, x0 + H2 - 1 + k * 1.1, 0, z0 + 24, 8);
}
function cornerStores(a, R, x0, z0, i, j) {
  const base = pick(BRICKS), h = 3 * FLOOR + 3.6;
  a.box(S, h, S, x0 + S / 2, 0, z0 + S / 2, 'brick', base); a.b(0x56565a, S, .5, .6, x0 + S / 2, h, z0 + .3);
  roofClutter(a, R, x0 + S / 2, z0 + S / 2, h, S, S);
  const en = entrance(i, j); shopStrip(a, R, en.origin, en.n, en.len, { kind: 'mart', title: '24H MART', name: 'Corner Mart', poi: i + ',' + j });
  shopStrip(a, R, [x0 + S / 2, z0], [0, -1], S - 2, null); shopStrip(a, R, [x0, z0 + S / 2], [-1, 0], S - 2, null); shopStrip(a, R, [x0 + S, z0 + S / 2], [1, 0], S - 2, null);
  a.b(0x2a2a2e, 8, 3, .4, x0 + S / 2, h + .5, z0 + S - 1); sign('MART', '#1d4f2a', '#ffffff', 7.4, 2.6, x0 + S / 2, h + 2, z0 + S - .75, 0);
}
function park(a, R, x0, z0) {
  // playground in one corner: swing frame, slide, sandpit, benches
  const px = x0 + 7, pz = z0 + 7;
  a.b(0x3a5a8a, .15, 3, .15, px - 1.4, 0, pz); a.b(0x3a5a8a, .15, 3, .15, px + 1.4, 0, pz); a.b(0x3a5a8a, 3, .15, .15, px, 3, pz);
  for (const o of [-.7, .7]) { a.b(0x222222, .04, 2.1, .04, px + o, .9, pz); a.b(0xd04a2a, .6, .08, .3, px + o, .85, pz); }
  a.b(0xd8c070, 5, .1, 4, px + 9, 0, pz + 1); a.b(0xe0b020, 1.2, 2.4, 1.2, px + 5, 0, pz + 6); a.b(0xd04a2a, 1, .1, 3.2, px + 5, 1.3, pz + 8, { rx: .6 });
  circles.push([px, pz, 1.8], [px + 5, pz + 6, 1.2]);
}
function waterfront(a, R, x0, z0) {
  a.b(0x9a8a70, S, .2, S, x0 + S / 2, 0, z0 + S / 2);                                   // boardwalk
  for (let k = 0; k < 17; k++) a.b(0x7a6a52, .04, .21, S, x0 + k * 2, 0, z0 + S / 2);
  a.b(0xc8cdd2, 4, 3, 3, x0 + 6, .2, z0 + S - 6); a.vc(part(prism(4.6, 1.2, 3.6), 0xb02a2a, { x: x0 + 6, y: 3.2, z: z0 + S - 6 })); sign('ICE CREAM', '#f4a0c0', '#5a1a3a', 3.6, 1, x0 + 6, 2.6, z0 + S - 4.45, 0); circles.push([x0 + 6, z0 + S - 6, 2.5]);
  // the Ferris wheel: its own mesh so it can turn
  const cx = x0 + S / 2 + 2, cz = z0 + S / 2 - 2, r = 12, parts = [];
  parts.push(part(CYL(.35, .35, 2 * r, 10), 0xe8e8ee, { x: 0, y: 0, z: 0, rx: 0 }).rotateX(Math.PI / 2));
  for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; parts.push(part(BOX, 0xd8d8e0, { sx: .12, sy: r, sz: .12, x: Math.cos(an) * r / 2, y: Math.sin(an) * r / 2, rz: an + Math.PI / 2 })); }
  for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; parts.push(part(BOX, 0xd8d8e0, { sx: .12, sy: 2 * Math.PI * r / 24 + .1, sz: .12, x: Math.cos(an) * r, y: Math.sin(an) * r, rz: an })); }
  const cols = [0xe03a3a, 0x3a7ae0, 0xe0c43a, 0x3ac26a, 0xc060e0, 0xe0802a];
  for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; parts.push(part(BOX, cols[k % 6], { sx: 1.8, sy: 1.5, sz: 1.5, x: Math.cos(an) * r, y: Math.sin(an) * r - 1.2 })); }
  const wheel = new THREE.Mesh(merge(parts), a.mat || new THREE.MeshLambertMaterial({ vertexColors: true })); wheel.position.set(cx, r + 3.2, cz); wheel.castShadow = true; put(wheel); spinners.push({ mesh: wheel, speed: .12, axis: 'z' });
  for (const s of [-1, 1]) { a.b(0xd8d8e0, .5, r + 3.5, .5, cx, 0, cz + s * 2.6, { rz: s * .22 }); a.b(0xd8d8e0, .5, r + 3.5, .5, cx, 0, cz + s * 2.6, { rz: -s * .22 }); }
  a.b(0x55585e, 6, 1, 6, cx, 0, cz); circles.push([cx, cz, 3.4]);
}

/* ---------- downtown ---------- */
function tower(a, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2, glass = GLASSES[0];
  a.box(S - 4, 8, S - 4, cx, 0, cz, 'concrete', CONCRETES[0]);
  a.box(18, 45, 18, cx, 8, cz, 'glass', glass); a.box(14, 25, 14, cx, 53, cz, 'glass', glass); a.box(9, 16, 9, cx, 78, cz, 'glass', GLASSES[2]);
  a.c(0xb0b4b8, .15, .25, 22, cx, 94, cz, 6); a.s(0xff3030, .35, cx, 116, cz); a.b(0x2a2a30, 5, .6, 5, cx, 53 - .3, cz);
  roofClutter(a, R, cx, cz, 8, S - 8, S - 8);
}
function bank(a, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2;
  a.box(S - 2, 14, S - 8, cx, .8, cz - 2, 'concrete', 0xc8c2b0);
  a.b(0xb8b2a0, S, .8, S - 4, cx, 0, cz); for (let k = 0; k < 8; k++) a.c(0xe0dcd0, .7, .7, 12.5, x0 + 4 + k * 3.7, .8, z0 + S - 3.5, 12);
  a.vc(part(prism(S, 3.4, 4), 0xc8c2b0, { x: cx, y: 13.3, z: z0 + S - 3.5 })); a.b(0xc8c2b0, S, .8, 4.4, cx, 13.3 - .8, z0 + S - 3.5);
  sign('HARBOR BANK', '#3a3226', '#e8c76a', 14, 2.2, cx, 11.6, z0 + S - .9, 0);
  for (let k = 0; k < 4; k++) a.b(0xd8d4c4, S - 4 - k * 2, .3, 1, cx, .8 + k * .3, z0 + S - .3 + k * .5 - 1);
  roofClutter(a, R, cx, cz, 14.8, S - 6, S - 10);
}
function garage(a, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2, lv = 5;
  for (let k = 0; k < lv; k++) { a.b(0x9a9a94, S, .5, S, cx, k * 3.1 + 3.1, cz); a.b(0x7a7a76, S, .9, .3, cx, k * 3.1 + 3.6, z0 + .15); a.b(0x7a7a76, S, .9, .3, cx, k * 3.1 + 3.6, z0 + S - .15); a.b(0x7a7a76, .3, .9, S, x0 + .15, k * 3.1 + 3.6, cz); a.b(0x7a7a76, .3, .9, S, x0 + S - .15, k * 3.1 + 3.6, cz); }
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 4; iz++) a.b(0x8a8a86, .9, lv * 3.1 + 3.1, .9, x0 + 2 + ix * 10, 0, z0 + 2 + iz * 10);
  a.b(0x2a2a2e, S, 1.4, .3, cx, 1, z0 + S + .15); a.b(0xe0b020, S, .3, .35, cx, 0, z0 + S + .15 - .0);
  a.b(0x1f4f9a, 6, 6, .3, cx + 8, 12, z0 + S + .3); sign('P', '#1f4f9a', '#ffffff', 5, 5, cx + 8, 12, z0 + S + .5, 0);
  sign('CENTRAL PARKING', '#101010', '#ffd23f', 12, 2, cx - 5, 3.3, z0 + S + .5, 0);
  for (let k = 0; k < lv; k++) for (let m = 0; m < 6; m++) a.b(pick([0x4a5a8a, 0x8a4a4a, 0xcfcfcf, 0x2a2a30]), 1.8, 1.1, 4, x0 + 4 + m * 5, k * 3.1 + 3.6, z0 + 6 + (m % 2) * 18);
}
function plaza(a, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2;
  a.b(0xbfb8a6, S, .08, S, cx, 0, cz);
  a.c(0x9a9a94, 4, 4.2, .9, cx, 0, cz, 16); a.c(0x3a78a8, 3.6, 3.6, .8, cx, .1, cz, 16); a.c(0xdedede, .3, .5, 3, cx, .8, cz, 8); a.s(0xe0f0ff, .6, cx, 3.8, cz); circles.push([cx, cz, 4.2]);
  // clock tower at the north end
  const tx = cx, tz = z0 + 7; a.b(0x9a8a70, 5, 18, 5, tx, 0, tz); a.vc(part(CYL(0, 4, 4, 4), 0x6a3a2a, { x: tx, y: 20, z: tz, ry: Math.PI / 4 })); a.b(0x9a8a70, 5.6, .8, 5.6, tx, 17.8, tz); circles.push([tx, tz, 3.2]);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ map: clockTex() })); 
  [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([nx, nz]) => { const f = face.clone(); f.position.set(tx + nx * 2.55, 15, tz + nz * 2.55); f.rotation.y = Math.atan2(nx, nz); put(f); });
  for (const [dx, dz] of [[-11, -2], [11, -2], [-11, 12], [11, 12]]) { a.b(0x7a7a76, 3, .6, 3, cx + dx, 0, cz + dz); tree(a, cx + dx, cz + dz, .8); }
  for (const dx of [-8, 8]) { a.b(0x8a8a86, .8, 2, .8, cx + dx, 0, cz + 8); a.s(0xc8a060, .7, cx + dx, 2.7, cz + 8, 1.4); }
}
function clockTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 4; g.stroke(); for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; g.beginPath(); g.moveTo(64 + Math.sin(an) * 50, 64 - Math.cos(an) * 50); g.lineTo(64 + Math.sin(an) * 58, 64 - Math.cos(an) * 58); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 28); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); return new THREE.CanvasTexture(c); }

/* ---------- commercial ---------- */
const lotGround = (a, x0, z0, w, d, hex) => a.b(hex || 0x4a4a46, w, .03, d, x0 + w / 2, 0, z0 + d / 2);
function supermarket(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld, bx = x0 + (S - w) / 2;
  a.box(w, 8, d, bx + w / 2, 0, z0 + d / 2, 'plaster', 0xe8e0c8); a.b(0x2a6a3a, w + .4, 1.4, d + .4, bx + w / 2, 8, z0 + d / 2);
  sign('FRESH MARKET', '#1d6a3a', '#ffffff', 16, 3, bx + w / 2, 6.6, z0 + d + .05, 0);
  const en = entrance(i, j); shopStrip(a, R, en.origin, en.n, en.len, { kind: 'mart', title: 'SUPERMARKET', name: 'Fresh Market', poi: 'supermarket' }, { h: 4, names: [['FRESH', '#1d6a3a', '#fff'], ['DELI', '#7a2a1a', '#fff'], ['BAKERY', '#6a4a2a', '#fff0d0']] });
  parkingBays(x0, z0 + d + 2, S, 22, 2, 'commercial', 1.3);
  for (let k = 0; k < 3; k++) a.b(0x8a8e96, .7, .9, 1.6, x0 + 6 + k * .9, 0, z0 + d + 8);
  roofClutter(a, R, bx + w / 2, z0 + d / 2, 9.4, w, d);
}
function carPark(a, R, x0, z0) { parkingBays(x0, z0 + 2, S, 30, 3, 'commercial', 1.2); a.b(0x2a2a2e, 1.6, 2.4, 1.6, x0 + S - 3, 0, z0 + S - 3); a.b(0xe0b020, 3, .1, .1, x0 + S - 5, 1, z0 + S - 3); sign('P', '#1f4f9a', '#fff', 2, 2, x0 + S - 3, 3.4, z0 + S - 2.2, 0); circles.push([x0 + S - 3, z0 + S - 3, 1]); }
function gas(a, R, x0, z0, i, j) {
  const cx = x0 + S / 2 + 3, cz = z0 + 21;
  a.b(0xdedede, 11, 3.4, 7, x0 + 6, 0, z0 + 4); a.b(0xc02a2a, 11.2, .6, 7.2, x0 + 6, 3.4, z0 + 4); sign('PETRO STOP', '#c02a2a', '#ffffff', 8, 1.2, x0 + 6, 3.7, z0 + 7.65, 0); circles.push([x0 + 6, z0 + 4, 5]);
  for (const [dx, dz] of [[-10, -4], [10, -4], [-10, 4], [10, 4]]) a.b(0xdedede, .5, 5.2, .5, cx + dx, 0, cz + dz); a.b(0xc02a2a, 22, .5, 10, cx, 5.2, cz); a.b(0xf4f4f0, 22.2, .25, 10.2, cx, 5.0, cz);
  for (const dx of [-5, 5]) { a.b(0xe8e8ee, .8, 1.5, .5, cx + dx, 0, cz); a.b(0xc02a2a, .85, .25, .55, cx + dx, 1.5, cz); a.b(0x222222, .8, .5, .06, cx + dx, 1.0, cz + .27); circles.push([cx + dx, cz, .6]); }
  for (const dx of [-5, 5]) staticCars.push({ x: cx + dx + 2.2, z: cz, yaw: 0, type: pick(['sedan', 'hatch', 'suv']), kind: 'parked', chance: .6 });
  a.b(0x55585e, .4, 7, .4, x0 + S - 3, 0, z0 + S - 2); a.b(0x2a2a2e, 3, 2.8, .4, x0 + S - 3, 7, z0 + S - 2); sign('FUEL', '#101010', '#ffd23f', 2.6, 1, x0 + S - 3, 8.4, z0 + S - 1.75, 0); sign('1.89', '#101010', '#60ff80', 2.6, 1, x0 + S - 3, 7.3, z0 + S - 1.75, 0); circles.push([x0 + S - 3, z0 + S - 2, .5]);
}
function dealership(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld, bx = x0 + (S - w) / 2;
  a.box(w, 5, d, bx + w / 2, 0, z0 + d / 2, 'glass', 0x8aa8b8); a.b(0x2a2a30, w + .4, .8, d + .4, bx + w / 2, 5, z0 + d / 2);
  sign('HARBOR MOTORS', '#101a2a', '#40d0ff', 14, 2, bx + w / 2, 6.4, z0 + d + .05, 0);
  const en = entrance(i, j); doorAt(en.origin, en.n, en.len);
  const dp = doorAt(en.origin, en.n, en.len); sign('SALES', '#101a2a', '#ffffff', 4, 1, dp.door[0], 3.2, dp.door[1], 0);
  [[8, 'sports', 0xd8c020], [14, 'suv', 0x2f5fb8], [20, 'sedan', 0xb83a3a], [26, 'hatch', 0x2f9a58]].forEach(([dx, type, color]) => { a.b(0x9a9a98, 5.4, .25, 7, x0 + dx, 0, z0 + d + 6); staticCars.push({ x: x0 + dx, z: z0 + d + 6, yaw: .3, type, color, kind: 'display', y: .25 }); });
  for (const dx of [3, S - 3]) { a.b(0x55585e, .15, 9, .15, x0 + dx, 0, z0 + d + 3); a.b(0xd02a2a, 2.4, 1.4, .05, x0 + dx + 1.2, 7.6, z0 + d + 3); }
  parkingBays(x0, z0 + d + 15, S, 8, 1, 'commercial', .6); roofClutter(a, R, bx + w / 2, z0 + d / 2, 5.8, w, d);
}
function strip(kind, title) { // restaurants and clothing blocks: 3-storey frontage with one real door
  return function (a, R, x0, z0, i, j) {
    const base = pick(kind === 'diner' ? BRICKS : PLASTERS), h = 3 * FLOOR + 3.6;
    a.box(S, h, S, x0 + S / 2, 0, z0 + S / 2, kind === 'diner' ? 'brick' : 'plaster', base); a.b(0x56565a, S, .5, .6, x0 + S / 2, h, z0 + .3);
    const en = entrance(i, j); shopStrip(a, R, en.origin, en.n, en.len, { kind, title, name: title, poi: i + ',' + j });
    shopStrip(a, R, [x0 + S / 2, z0], [0, -1], S - 2, null); shopStrip(a, R, [x0, z0 + S / 2], [-1, 0], S - 2, null); shopStrip(a, R, [x0 + S, z0 + S / 2], [1, 0], S - 2, null);
    a.b(0x2a2a2e, 10, 3.6, .4, x0 + S / 2, h + .6, z0 + S - 1); sign(title, kind === 'diner' ? '#7a1f1f' : '#4a1f5a', '#fff', 9.4, 3.2, x0 + S / 2, h + 2.4, z0 + S - .75, 0);
    roofClutter(a, R, x0 + S / 2, z0 + S / 2, h, S, S);
  };
}
function repairGarage(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld, bx = x0;
  a.box(w, 6, d, bx + w / 2, 0, z0 + d / 2, 'concrete', 0xc8c2b0); a.b(0xc02a2a, w + .4, .8, d + .4, bx + w / 2, 6, z0 + d / 2);
  for (const k of [0, 1]) a.b(0x3a4048, 5, 4.4, .2, bx + 6 + k * 8, 0, z0 + d + .1);
  sign('VALE AUTO', '#1f2a3a', '#ffd23f', 10, 2, bx + w / 2, 7.3, z0 + d + .05, 0);
  staticCars.push({ x: bx + 6, z: z0 + d - 4, yaw: Math.PI, type: 'sedan', color: 0x9aa0a8, kind: 'display', y: 1.1 }); a.b(0x55585e, 3, 1.1, 5, bx + 6, 0, z0 + d - 4);
  for (let k = 0; k < 3; k++) a.c(0x15151a, .5, .5, .35, bx + w + 3, k * .36, z0 + 6, 10); for (let k = 0; k < 2; k++) a.c(0x15151a, .5, .5, .35, bx + w + 4, k * .36, z0 + 7.2, 10);
  a.b(0x2f6a3f, 1.9, 1.1, 1.0, bx + w + 5, 0, z0 + 3); circles.push([bx + w + 3, z0 + 6, .9]);
  parkingBays(x0 + w + 1, z0 + d + 2, S - w - 1, 8, 1, 'commercial', .8);
  const dp = doorAt([bx + w / 2, z0 + d], [0, 1], w); void dp;
}

/* ---------- emergency ---------- */
function policeStation(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld;
  a.box(w, 11, d, x0 + w / 2, 0, z0 + d / 2, 'hospital', 0x5a78b0); a.b(0x1f3a7a, w + .4, 1, d + .4, x0 + w / 2, 11, z0 + d / 2);
  sign('POLICE', '#14203a', '#ffffff', 11, 2.2, x0 + w / 2, 9, z0 + d + .05, 0); a.b(0x2a4a9a, 6, .6, 3, x0 + w / 2, 3.6, z0 + d + 1.5);
  a.c(0xf4f4f0, .15, .2, 8, x0 + 4, 11, z0 + 4, 6); a.b(0x2a4a9a, 2.4, 1.4, .05, x0 + 5.4, 17, z0 + 4);
  fence(a, x0 + 1, z0 + d + 2, x0 + S - 1, z0 + S - 1, 0x55585e, { side: 'n', c: x0 + S / 2, w: 7 }); a.b(0x3a3a3c, S - 3, .03, S - d - 4, x0 + S / 2, 0, z0 + d + 2 + (S - d - 3) / 2);
  [[8, 24, 0], [14, 24, 0], [20, 24, 0], [26, 24, 0]].forEach(([dx, dz, yaw]) => staticCars.push({ x: x0 + dx, z: z0 + dz, yaw: Math.PI / 2 * 0 + .15, type: 'cruiser', color: 0x1c2a4a, kind: 'parked', chance: .85 }));
  a.b(0x6a6e74, 4, 3, 4, x0 + S - 5, 0, z0 + S - 4); sign('HOLDING', '#6a6e74', '#ffd0d0', 3.6, .8, x0 + S - 5, 2.4, z0 + S - 1.95, 0); circles.push([x0 + S - 5, z0 + S - 4, 2.8]);
  roofClutter(a, R, x0 + w / 2, z0 + d / 2, 12, w, d);
}
function fireStation(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld;
  a.box(w, 8, d, x0 + w / 2, 0, z0 + d / 2, 'brick', 0xa04a3a); a.b(0x55585e, w + .4, .8, d + .4, x0 + w / 2, 8, z0 + d / 2);
  for (let k = 0; k < 3; k++) { a.b(0xd8d8d4, 6.4, 5, .25, x0 + 6 + k * 11, 0, z0 + d + .12); a.b(0xc02a2a, 5.6, 4.4, .3, x0 + 6 + k * 11, .2, z0 + d + .15); }
  sign('FIRE STATION 3', '#c02a2a', '#ffffff', 12, 2, x0 + w / 2, 6.8, z0 + d + .05, 0);
  a.b(0xa04a3a, 4, 20, 4, x0 + S - 4, 0, z0 + 4); a.b(0x55585e, 4.6, .6, 4.6, x0 + S - 4, 20, z0 + 4); circles.push([x0 + S - 4, z0 + 4, 2.6]);
  staticCars.push({ x: x0 + 14, z: z0 + d + 8, yaw: 0, type: 'truck', color: 0xc02a2a, kind: 'parked', chance: 1 });
  a.b(0xdedede, 5, 1.6, 2, x0 + 14, 3.6, z0 + d + 8 - 2); roofClutter(a, R, x0 + w / 2, z0 + d / 2, 8.8, w, d);
}

/* ---------- industrial ---------- */
function warehouses(a, R, x0, z0) {
  [0, 1].forEach(side => {
    const z = side ? z0 + S - 7 : z0 + 7, base = pick(STYLE.building.metal), facing = side ? -1 : 1;
    a.box(S - 2, 8, 14, x0 + S / 2, 0, z, 'metal', base);
    for (let k = 0; k < 4; k++) a.vc(part(prism(S / 4, 1.8, 14.6), D(base, .75), { x: x0 + 4.5 + k * (S - 2) / 4, y: 8, z }));
    for (let k = 0; k < 3; k++) loadingBay(a, x0 + S / 2 - 9 + k * 9, z + facing * 7.1, facing, 4);
    for (let k = 0; k < 4; k++) { a.c(0x9a9ea2, .35, .35, .9, x0 + 4.5 + k * 7.5, 9.7, z, 8); a.c(0x6a6e72, .5, .5, .1, x0 + 4.5 + k * 7.5, 10.6, z, 8); }         // ridge vents
    if (side === 0) { a.box(8, 4.5, 11, x0 + 5, 8.4, z, 'plaster', 0xd0c8b8); parapet(a, 0x8a8a86, x0 + 5, z, 12.9, 8, 11); hvac(a, R, x0 + 4, 12.9, z); }   // the office section rising over the shed
    a.b(0xe0b020, 3, .03, 9, x0 + S / 2 + 4, .03, z + facing * 12); a.b(0xe0b020, 3, .03, 9, x0 + S / 2 - 14, .03, z + facing * 12);                                    // marked bays
  });
  for (let k = 0; k < 4; k++) a.c(pick([0x2f5fb8, 0xb8322f, 0x777b82]), .45, .45, .9, x0 + 8 + k * .8, 0, z0 + H2 + 1, 8);
  a.b(0xa0824a, 1.2, .15, 1.2, x0 + 24, 0, z0 + H2 - 1); a.b(0xa0824a, 1.2, 1, 1.2, x0 + 24, .15, z0 + H2 - 1); a.b(0x2f6a3f, 1.9, 1.1, 1.0, x0 + 28, 0, z0 + H2 + 1.5);
  floodlight(a, x0 + S - 2, z0 + H2, 11);
}
function factory(a, R, x0, z0) {
  a.box(S - 6, 12, 22, x0 + S / 2, 0, z0 + 14, 'metal', 0x8a8e96); a.b(0x55585e, S - 5.6, .5, 22.4, x0 + S / 2, 12, z0 + 14);
  for (let k = 0; k < 3; k++) { a.c(k % 2 ? 0xc02a2a : 0xe8e8e4, 1.3, 1.5, 28, x0 + 8 + k * 7, 12, z0 + 7, 10); a.c(0x2a2a2e, 1.4, 1.4, .8, x0 + 8 + k * 7, 40, z0 + 7, 10); circles.push([x0 + 8 + k * 7, z0 + 7, 1.6]); }
  for (let k = 0; k < 3; k++) { a.c(0xc8ccd0, 3, 3, 8, x0 + 8 + k * 8, 0, z0 + 29, 14); a.s(0xb8bcc0, 3, x0 + 8 + k * 8, 8, z0 + 29, .4); circles.push([x0 + 8 + k * 8, z0 + 29, 3.1]); }
  a.b(0x3a4048, 5, 4.4, .2, x0 + S / 2, 0, z0 + 25.1); a.b(0xa0824a, .3, .3, 12, x0 + S - 5, 5, z0 + 22); sign('STEEL WORKS', '#2a2a30', '#ff9a40', 12, 2, x0 + S / 2, 10.4, z0 + 25.15, 0);
}
function depot(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld;
  a.box(w, 4.5, d, x0 + w / 2, 0, z0 + d / 2, 'metal', 0x9a8a78); sign('TRUCK DEPOT', '#2a2a30', '#ffd23f', 8, 1.6, x0 + w / 2, 3.6, z0 + d + .05, 0);
  fence(a, x0 + .5, z0 + d + 1, x0 + S - .5, z0 + S - .5, 0x70747a, { side: 's', c: x0 + S / 2, w: 7 });
  a.b(0x3a3a3c, S - 1, .03, S - d - 2, x0 + S / 2, 0, z0 + d + 1 + (S - d - 2) / 2);
  for (let k = 0; k < 4; k++) staticCars.push({ x: x0 + 5 + k * 7.5, z: z0 + d + 8 + (k % 2) * 8, yaw: k % 2 ? Math.PI : 0, type: 'truck', color: pick([0xdcdee2, 0x2f5fb8, 0xb8322f, 0xd2a52f]), kind: 'parked', chance: .9 });
  for (let k = 0; k < 3; k++) a.b(pick([0xdcdee2, 0x8a8e96]), 2.5, 2.8, 8, x0 + 6 + k * 9, 0, z0 + S - 5);
  gatehouse(a, x0 + S / 2 + 5.5, z0 + S - 2.6, 0); floodlight(a, x0 + 2, z0 + d + 4, 10);
  a.c(0xb8bcc0, 1.5, 1.5, 4, x0 + S - 3, 0, z0 + d + 4, 12); circles.push([x0 + S - 3, z0 + d + 4, 1.6]);
}

/* ---------- port ---------- */
function containerYard(a, R, x0, z0) {
  // two stacking areas either side of the lane. Rows share a shipping line, stacks step down towards the lane, and the odd slot is empty
  [0, 1].forEach(side => {
    const cx = side ? x0 + S - 7 : x0 + 7;
    for (let c = 0; c < 3; c++) for (let r = 0; r < 5; r++) {
      if (R() < .1) continue; const line = LINES[(r + c * 3 + side * 2) % LINES.length], stack = Math.max(1, 3 - Math.abs(c - (side ? 0 : 2)) - (r % 2 ? 0 : 0) + (R() < .3 ? 1 : 0) - (R() < .3 ? 1 : 0));
      for (let lv = 0; lv < Math.min(3, stack); lv++) container(a, R() < .8 ? line[0] : line[1], cx + (c - 1) * 3.4, lv * 2.6, z0 + 3.4 + r * 6.4, true);
    }
  });
  const gz = z0 + S / 2; for (const dx of [-14, 14]) { a.b(0xe0a020, .8, 14, .8, x0 + S / 2 + dx, 0, gz - 3); a.b(0xe0a020, .8, 14, .8, x0 + S / 2 + dx, 0, gz + 3); } a.b(0xe0a020, 30, 1.2, 1.2, x0 + S / 2, 14, gz - 3); a.b(0xe0a020, 30, 1.2, 1.2, x0 + S / 2, 14, gz + 3); a.b(0x2a2a2e, 3, 2, 8, x0 + S / 2 + 4, 12, gz); a.b(0x2a2a2e, .2, 4, .2, x0 + S / 2 + 4, 8, gz - 2.5); a.b(0x2a2a2e, .2, 4, .2, x0 + S / 2 + 4, 8, gz + 2.5);
  floodlight(a, x0 + 1.5, z0 + 1.5, 14); floodlight(a, x0 + S - 1.5, z0 + S - 1.5, 14);
}
function portWarehouse(a, R, x0, z0) {
  a.box(S - 2, 8, S - 2, x0 + S / 2, 0, z0 + S / 2, 'metal', 0x6a8aa8); a.vc(part(CYL(S / 2 - .5, S / 2 - .5, S - 2, 14), 0x5a7a9a, { x: x0 + S / 2, y: 8, z: z0 + S / 2, rx: Math.PI / 2, sy: 1, sz: .35 }));
  for (let k = 0; k < 4; k++) a.b(0x3a4048, 5, 4.6, .2, x0 + 5 + k * 8, 0, z0 + S - .9); sign('PORT AUTHORITY 7', '#14202a', '#40d0ff', 14, 2, x0 + S / 2, 7, z0 + S - .85, 0);
}
function docks(a, R, x0, z0, i, j) {
  const [w, d] = blockType(i, j).bld;
  a.box(w, 7, d, x0 + w / 2, 0, z0 + d / 2, 'metal', 0x7a828c); a.vc(part(prism(w, 2, d + .6), 0x4a4e54, { x: x0 + w / 2, y: 7, z: z0 + d / 2 }));
  for (let k = 0; k < 3; k++) loadingBay(a, x0 + 6 + k * 9, z0 + d + .1, 1, 4); for (let k = 0; k < 4; k++) { a.c(0x9a9ea2, .35, .35, .9, x0 + 5 + k * 8, 8.6, z0 + d / 2, 8); a.c(0x6a6e72, .5, .5, .1, x0 + 5 + k * 8, 9.5, z0 + d / 2, 8); }
  a.b(0x9a9a94, S, .3, S - d - 2, x0 + S / 2, 0, z0 + d + 1 + (S - d - 2) / 2);
  for (let k = 0; k < 7; k++) a.c(0x2a2a30, .3, .35, .8, x0 + 2 + k * 5, 0, z0 + S - 1, 8);
  for (let k = 0; k < 3; k++) container(a, pick(CONT), x0 + 8 + k * 9, 0, z0 + d + 6, false);
  const cx = x0 + S - 10, cz = z0 + S - 6; gantryCrane(a, cx, cz, 0, 1, 0xe0a020); for (const sx of [-1, 1]) for (const sz of [-1, 1]) circles.push([cx + sx * 5, cz + sz * 2.6, .7]);
  floodlight(a, x0 + 3, z0 + d + 3, 12); a.b(0xe0b020, S - 2, .03, .3, x0 + S / 2, .32, z0 + S - 2.2);
}
export const BUILDERS = {
  o: outskirt, f: farm, c: construction, l: lighthouse, a: apartmentsAlley, s: cornerStores, p: park, w: waterfront,
  T: tower, B: bank, G: garage, Z: plaza, M: supermarket, N: carPark, F: gas, V: dealership,
  R: strip('diner', 'DINER'), C: strip('fashion', 'FASHION'), X: repairGarage, L: policeStation, E: fireStation,
  I: warehouses, Y: factory, U: depot, P: containerYard, W: portWarehouse, K: docks
};
