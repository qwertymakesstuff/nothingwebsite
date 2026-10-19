// Reusable building parts and archetypes: rooftop equipment, parapets, awnings, balconies, tower/slab/classic/mixed-use office
// buildings, house variants, and the port's gantry cranes, floodlights and gates. Everything is merged into the block's accumulator
// (one draw call per material), so adding variety here costs geometry but no extra draw calls.
import { part, BOX, CYL, SPH } from './mesh.js';
import { D, prism, sign } from './kit.js';
import { lampMat } from './materials.js';
import { STYLE, pickFrom } from './style.js';
import { lightMats } from './props.js';

const { floor: FL, ground: GF } = STYLE.scale;

/** thin parapet wall around a rectangular roof */
export function parapet(a, hex, cx, cz, top, w, d, h) {
  h = h || STYLE.scale.parapet; const t = .35;
  a.b(hex, w, h, t, cx, top, cz - d / 2 + t / 2); a.b(hex, w, h, t, cx, top, cz + d / 2 - t / 2); a.b(hex, t, h, d - 2 * t, cx - w / 2 + t / 2, top, cz); a.b(hex, t, h, d - 2 * t, cx + w / 2 - t / 2, top, cz);
}
/** water tank on legs (the classic New York rooftop silhouette) */
export function waterTank(a, x, top, z, s) {
  s = s || 1; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a.b(0x4a3a2a, .22 * s, 2.2 * s, .22 * s, x + dx * 1.1 * s, top, z + dz * 1.1 * s);
  a.c(0x7a5a3a, 1.6 * s, 1.6 * s, 2.6 * s, x, top + 2.2 * s, z, 12); a.c(0x4a3a2a, .1, 1.7 * s, .8 * s, x, top + 4.8 * s, z, 12);
  for (let k = 0; k < 3; k++) a.c(0x2a2a2c, 1.62 * s, 1.62 * s, .08 * s, x, top + (2.7 + k * .8) * s, z, 12);
}
export function hvac(a, R, x, top, z) {
  const w = 1.6 + R() * 1.6, d = 1.2 + R() * 1.2;
  a.b(0x9a9ea2, w, 1.1, d, x, top, z); a.c(0x2c2e30, .45, .45, .1, x - w * .22, top + 1.1, z, 10); if (w > 2.4) a.c(0x2c2e30, .45, .45, .1, x + w * .22, top + 1.1, z, 10);
  a.b(0x6a6e72, w + .1, .12, d + .1, x, top + .02, z);
}
export function mast(a, x, top, z, h, red) { a.c(0xb0b4b8, .1, .18, h, x, top, z, 5); a.b(0xb0b4b8, 1.6, .06, .06, x, top + h * .72, z); a.b(0xb0b4b8, .06, .06, 1.1, x, top + h * .5, z); if (red) a.add(part(SPH(.26, 6, 4), 0xff3a2a, { x, y: top + h + .2, z }), lampMat); }
export function solarPanels(a, x, top, z) { for (let k = 0; k < 3; k++) a.vc(part(BOX, 0x1f3a5a, { sx: 2.2, sy: .06, sz: 1.2, x: x + k * 2.5, y: top + .55, z, rx: -.45 })), a.b(0x6a6e72, .1, .5, .1, x + k * 2.5, top, z); }
export function shed(a, x, top, z, w, d) { a.b(0x8a8e92, w, 2.4, d, x, top, z); a.b(0x4a4e52, w + .3, .2, d + .3, x, top + 2.4, z); a.b(0x2a2a2e, .9, 1.9, .06, x, top, z + d / 2 + .02); }
/** the clutter on top of a building: picks a believable subset for its size */
export function rooftop(a, R, cx, cz, top, w, d, o) {
  o = o || {}; const nx = Math.max(.3, w / 2 - 2), nz = Math.max(.3, d / 2 - 2), at = () => [cx + (R() * 2 - 1) * nx, cz + (R() * 2 - 1) * nz];
  parapet(a, o.parapet || 0x8a8a86, cx, cz, top, w, d);
  const n = 2 + Math.floor(R() * 3); for (let k = 0; k < n; k++) { const [x, z] = at(); hvac(a, R, x, top, z); }
  if (R() < (o.tank == null ? .45 : o.tank)) { const [x, z] = at(); waterTank(a, x, top, z, .9 + R() * .3); }
  if (R() < .55) { const [x, z] = at(); shed(a, x, top, z, 2.6, 2.2); }
  if (R() < .35 && w > 8) { const [x, z] = at(); solarPanels(a, Math.max(cx - nx, Math.min(cx + nx - 5, x)), top, z); }
  if (R() < (o.antenna == null ? .5 : o.antenna)) { const [x, z] = at(); mast(a, x, top, z, 5 + R() * 6, R() < .6); }
  if (o.helipad) { a.c(0x3a3e44, 4.2, 4.2, .12, cx, top, cz, 20); a.c(0xe8e8e4, 3.6, 3.6, .14, cx, top, cz, 20); a.c(0x3a3e44, 3.2, 3.2, .16, cx, top, cz, 20); a.b(0xe8e8e4, 1.8, .18, .3, cx, top, cz); a.b(0xe8e8e4, .3, .18, 1.5, cx - .45, top, cz); a.b(0xe8e8e4, .3, .18, 1.5, cx + .45, top, cz); }
}
/** a striped awning above a window or door (one of four traditional colours) */
export function awning(a, R, x, y, z, w, facing) { // facing: [nx, nz] outward normal
  const col = pickFrom([0xb8322f, 0x2f5fb8, 0x2f9a58, 0xd2a52f, 0x7a2f5f], R), horiz = facing[1] !== 0;
  a.vc(part(BOX, col, { sx: horiz ? w : 1.2, sy: .12, sz: horiz ? 1.2 : w, x: x + facing[0] * .6, y, z: z + facing[1] * .6, rx: horiz ? facing[1] * .35 : 0, rz: horiz ? 0 : -facing[0] * .35 }));
}
/** a balcony slab with a railing, on the face with outward normal n */
export function balcony(a, x, y, z, w, n) {
  const horiz = n[1] !== 0, dx = horiz ? w : 1.3, dz = horiz ? 1.3 : w;
  a.b(0x8a8a86, dx, .14, dz, x + n[0] * .65, y, z + n[1] * .65); a.b(0x2a2f36, horiz ? dx : .05, .9, horiz ? .05 : dz, x + n[0] * 1.28, y + .14, z + n[1] * 1.28);
  a.b(0x2a2f36, horiz ? .05 : 1.3, .9, horiz ? 1.3 : .05, x - (horiz ? dx / 2 : 0) + n[0] * .65, y + .14, z - (horiz ? 0 : dz / 2) + n[1] * .65);
  a.b(0x2a2f36, horiz ? .05 : 1.3, .9, horiz ? 1.3 : .05, x + (horiz ? dx / 2 : 0) + n[0] * .65, y + .14, z + (horiz ? 0 : dz / 2) + n[1] * .65);
}
/** a horizontal ledge / cornice around a box */
export function ledge(a, hex, cx, cz, y, w, d, h, out) { out = out || .25; a.b(hex, w + out * 2, h, d + out * 2, cx, y, cz); }

/* ---------- office / downtown archetypes: each stands on a ground floor and returns its height ---------- */
/** slim glass tower with setbacks, corner fins and a crown */
export function glassTower(a, R, cx, cz, base, w, d, floors, opts) {
  opts = opts || {}; const glass = pickFrom(STYLE.building.glass, R);
  let top = base, cw = w, cd = d, tiers = 2 + (R() < .55 ? 1 : 0), fl = floors;
  for (let t = 0; t < tiers; t++) {
    const h = Math.max(2, Math.round(fl * (t === 0 ? .6 : .55))) * FL; a.box(cw, h, cd, cx, top, cz, 'glass', glass);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a.b(STYLE.building.frame, .45, h, .45, cx + sx * (cw / 2 - .2), top, cz + sz * (cd / 2 - .2));
    a.b(0x5a6068, cw + .4, .5, cd + .4, cx, top + h, cz); top += h + .5; cw *= .78; cd *= .78; fl = Math.max(3, fl * .6);
  }
  a.box(cw, 3, cd, cx, top, cz, 'concrete', 0x8a8e94); top += 3;
  if (R() < .5) { a.c(0xb4b8bc, .16, .3, 14, cx, top, cz, 6); a.add(part(SPH(.3, 6, 4), 0xff3a2a, { x: cx, y: top + 14.2, z: cz }), lampMat); } else rooftop(a, R, cx, cz, top, cw, cd, { antenna: .8, helipad: opts.helipad });
  return top;
}
/** wide concrete slab with ribbon windows and plant on the roof */
export function concreteSlab(a, R, cx, cz, base, w, d, floors) {
  const col = pickFrom(STYLE.building.concrete, R), h = floors * FL; a.box(w, h, d, cx, base, cz, 'concrete', col);
  ledge(a, D(col, .8), cx, cz, base + h - .5, w, d, .5, .2); ledge(a, D(col, .85), cx, cz, base + 2 * FL, w, d, .3, .15);
  if (R() < .6) { const w2 = w * .5, h2 = 2 + Math.floor(R() * 2); a.box(w2, h2 * FL, d * .6, cx - w * .1, base + h + .1, cz, 'concrete', D(col, 1.06)); rooftop(a, R, cx - w * .1, cz, base + h + h2 * FL + .1, w2, d * .6); rooftop(a, R, cx + w * .27, cz, base + h, w * .4, d, { tank: .2 }); return base + h + h2 * FL; }
  rooftop(a, R, cx, cz, base + h, w, d); return base + h;
}
/** older stone/brick building: cornice bands, stepped crown, water tank */
export function classic(a, R, cx, cz, base, w, d, floors) {
  const kind = R() < .5 ? 'brick' : 'plaster', col = kind === 'brick' ? pickFrom(STYLE.building.brick, R) : pickFrom(STYLE.building.stone, R), h = floors * FL;
  a.box(w, h, d, cx, base, cz, kind, col);
  for (let f = 2; f < floors; f += 3) ledge(a, STYLE.building.trim, cx, cz, base + f * FL - .2, w, d, .3, .22);
  ledge(a, STYLE.building.trim, cx, cz, base + h - .2, w, d, .55, .45); a.box(w * .72, 2 * FL, d * .72, cx, base + h + .35, cz, kind, D(col, 1.05)); ledge(a, STYLE.building.trim, cx, cz, base + h + 2 * FL + .15, w * .72, d * .72, .4, .3);
  const top = base + h + 2 * FL + .55; waterTank(a, cx + w * .15, top, cz - d * .1, 1); if (R() < .6) a.b(D(col, .8), 1.1, 3, 1.1, cx - w * .2, top, cz + d * .1); parapet(a, D(col, .9), cx, cz, top, w * .72, d * .72); return top;
}
/** mid-rise mixed use: plaster upper floors with a row of balconies on the front */
export function mixedUse(a, R, cx, cz, base, w, d, floors) {
  const col = pickFrom(STYLE.building.plaster, R), h = floors * FL; a.box(w, h, d, cx, base, cz, 'plaster', col);
  for (let f = 1; f < floors; f++) for (let k = 0; k < 3; k++) balcony(a, cx - w / 3 + k * w / 3, base + f * FL - 1.1, cz + d / 2, 2.6, [0, 1]);
  ledge(a, STYLE.building.trim, cx, cz, base + h - .2, w, d, .5, .35); rooftop(a, R, cx, cz, base + h + .3, w, d); return base + h + .3;
}
/** the ground floor of a downtown building: shop windows, awnings, columns and a doorway sign */
export function groundFloor(a, R, cx, cz, w, d, name) {
  const col = pickFrom([0xe8dcc4, 0xd0d8e0, 0xe6d0c0, 0xc8d8c8, 0xd8d4c8], R); a.box(w, GF, d, cx, 0, cz, 'shop', col);
  ledge(a, STYLE.building.trim, cx, cz, GF - .15, w, d, .45, .35);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) a.b(STYLE.building.trim, .8, GF, .8, cx + sx * (w / 2), 0, cz + sz * (d / 2));
  for (let k = 1; k < 3; k++) { a.b(STYLE.building.trim, .6, GF, .6, cx - w / 2 + k * w / 3, 0, cz + d / 2 + .15); awning(a, R, cx - w / 2 + (k - .5) * w / 3 + 1.2, GF - .5, cz + d / 2 + .1, w / 3 - 1.2, [0, 1]); }
  if (name) sign(name[0], name[1], name[2], 6, 1.3, cx, GF + .95, cz + d / 2 + .5, 0);
}

/* ---------- houses ---------- */
/** One of several house shapes on a lot. (hx, hz) is the house centre; the front faces +z. Returns nothing. */
export function house(a, R, kind, hx, hz, w, d, h, wall, roof) {
  const doorX = hx - w / 4;
  if (kind === 'modern') {                      // flat roof, big overhang, garage on one side
    a.box(w, h, d, hx, .04, hz, 'house', wall); a.b(D(wall, .7), w + 1.2, .35, d + 1.2, hx, h + .04, hz); a.b(0x3a3e44, 3.2, 2.3, .1, hx + w / 2 - 1.8, .04, hz + d / 2 + .06); a.b(0x2a3a4a, w * .5, 1.4, .08, hx - w * .15, h * .45, hz + d / 2 + .05);
    return;
  }
  if (kind === 'duplex') {                      // two front doors, split gable
    a.box(w + 3, h, d, hx, .04, hz, 'house', wall); a.vc(part(prism(w + 3.8, 2.4, d + .8), roof, { x: hx, y: h + .04, z: hz }));
    for (const s of [-1, 1]) { a.b(0x5a3a28, 1.1, 2.2, .12, hx + s * (w + 3) / 4, .04, hz + d / 2 + .03); a.b(0x8a8a86, 2.2, .2, 1.4, hx + s * (w + 3) / 4, .04, hz + d / 2 + .8); }
    return;
  }
  if (kind === 'twostory') {                    // taller, with a porch on columns and a balcony above
    const hh = h + 2.8; a.box(w, hh, d, hx, .04, hz, 'house', wall); a.vc(part(prism(w + .8, 2.4, d + .8), roof, { x: hx, y: hh + .04, z: hz }));
    a.b(0xf0eee8, w * .7, .2, 1.9, hx, 2.7, hz + d / 2 + .95); for (const s of [-1, 1]) a.b(0xf0eee8, .18, 2.7, .18, hx + s * w * .32, .04, hz + d / 2 + 1.8);
    a.b(0x5a3a28, 1.1, 2.2, .12, doorX, .04, hz + d / 2 + .03); balcony(a, hx + w / 4, h + .3, hz + d / 2, 2.4, [0, 1]); a.b(0x8a6a4a, 3.2, .06, .8, hx - w / 4, .05, hz + d / 2 + 2);
    return;
  }
  // gable: the original shape, plus a porch step
  a.box(w, h, d, hx, .04, hz, 'house', wall); a.vc(part(prism(w + .8, 2.2, d + .8), roof, { x: hx, y: h + .04, z: hz }));
  a.b(D(wall, .8), 1.2, 2.6, 1.2, hx + w / 2 - 1.5, h + .6, hz - d / 4); a.b(0x5a3a28, 1.1, 2.2, .12, doorX, .04, hz + d / 2 + .03); a.b(0x8a8a86, 2.6, .2, 1.6, doorX, .04, hz + d / 2 + .9);
  if (R() < .5) { a.vc(part(prism(3.2, 1.2, 1.6), roof, { x: doorX, y: 2.4, z: hz + d / 2 + .9 })); for (const s of [-1, 1]) a.b(0xf0eee8, .14, 2.4, .14, doorX + s * 1.3, .04, hz + d / 2 + 1.6); }
}

/* ---------- port and industry ---------- */
/** a gantry crane: legs, a long boom over the water, cab and cables */
export function gantryCrane(a, x, z, dirX, dirZ, hex) {
  hex = hex || 0xe0a020; const reach = 22, lx = dirZ ? 1 : 0, lz = dirZ ? 0 : 1;      // legs spread across the travel axis
  for (const s of [-1, 1]) for (const t of [-1, 1]) { a.b(hex, .9, 17, .9, x + lx * s * 5 + dirX * t * 2.6, 0, z + lz * s * 5 + dirZ * t * 2.6); }
  a.b(hex, 11 * (lx || .9), 1.2, 11 * (lz || .9), x, 17, z); a.b(D(hex, .8), lx ? 11 : 6, .8, lz ? 11 : 6, x, 11, z);
  a.b(hex, (dirX ? reach + 8 : 1.2), 1.2, (dirZ ? reach + 8 : 1.2), x + dirX * (reach / 2 - 4), 18, z + dirZ * (reach / 2 - 4));
  a.b(0x3a3e44, 3, 2.2, 3, x + dirX * 6, 19.2, z + dirZ * 6); for (const s of [-1, 1]) a.b(0x2a2a2e, .08, 8, .08, x + dirX * 12 + lx * s * .6, 10, z + dirZ * 12 + lz * s * .6);
  a.b(0x555a60, 1, 1.2, 1, x + dirX * 12, 9, z + dirZ * 12); a.b(0xc83a2a, .3, 1.2, .3, x - dirX * 5, 19, z - dirZ * 5);
}
/** a floodlight mast: pole plus a bank of lamps that brighten at night */
export function floodlight(a, x, z, h) {
  h = h || 13; a.c(0x6a6e74, .14, .22, h, x, 0, z, 6); a.b(0x3a3e44, 2, .15, .5, x, h, z);
  for (let k = 0; k < 4; k++) a.add(part(BOX, 0xfff0c0, { sx: .4, sy: .26, sz: .12, x: x - .6 + k * .4, y: h + .2, z: z + .26 }), lightMats.bulb);
}
/** security gatehouse with a barrier arm */
export function gatehouse(a, x, z, rot) {
  a.b(0xdcdcd4, 2.6, 2.6, 2.2, x, 0, z); a.b(0x2a3a4a, 2.62, .9, 2.22, x, 1.0, z); a.b(0x4a4e54, 3, .2, 2.6, x, 2.6, z);
  const dx = rot ? 0 : 1, dz = rot ? 1 : 0; a.b(0x2a2a2c, .25, 1, .25, x + dx * 2.2, 0, z + dz * 2.2); a.b(0xe8e8e4, dx ? 3 : .14, .14, dx ? .14 : 3, x + dx * 3.7, 1, z + dz * 3.7); a.b(0xc83a2a, dx ? .5 : .15, .15, dx ? .15 : .5, x + dx * 3.7, 1, z + dz * 3.7);
}
/** roll-up loading door with a ramp and a bumper */
export function loadingBay(a, x, z, facing, w) {
  w = w || 4; a.b(0x3a4048, w, 4.4, .2, x, 0, z); for (let k = 0; k < 5; k++) a.b(0x2e343a, w - .1, .07, .24, x, .7 + k * .8, z + facing * .02);
  a.b(0x7a7e84, w + .6, .9, 1.7, x, 0, z + facing * .9); a.b(0x1a1a1c, w + .6, .3, .3, x, .3, z + facing * 1.65); a.b(0xe0b020, w + .6, .12, .06, x, 1.0, z + facing * 1.75);
  a.vc(part(BOX, 0x6a6e72, { sx: 2.6, sy: .15, sz: 3.2, x: x + w / 2 + 2.2, y: .5, z: z + facing * 1.6, rx: facing * -.18 }));
}

/** tubular scaffolding along one face: posts, ledgers, diagonal braces and planked platforms (w along x, d is the depth towards +z) */
export function scaffold(a, x, z, w, h, d) {
  const steel = 0x8a8e94, lv = Math.max(2, Math.round(h / 2.1)), px = Math.max(2, Math.round(w / 2.4));
  for (let i = 0; i <= px; i++) for (const o of [0, d]) a.b(steel, .08, h, .08, x - w / 2 + i * w / px, 0, z + o);
  for (let l = 1; l <= lv; l++) { const y = l * h / lv - .1; for (const o of [0, d]) a.b(steel, w, .07, .07, x, y, z + o); a.b(0x9a7a4a, w, .06, d + .1, x, y + .07, z + d / 2); a.b(steel, w, .08, .05, x, y + .55, z + d); a.b(steel, w, .08, .05, x, y + 1.0, z + d); }
  for (let i = 0; i < px; i += 2) a.vc(part(BOX, steel, { sx: .05, sy: Math.hypot(w / px, h / lv), sz: .05, x: x - w / 2 + (i + .5) * w / px, y: h / lv / 2, z: z + d, rz: Math.atan2(w / px, h / lv) }));
}
