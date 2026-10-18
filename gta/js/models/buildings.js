// City blocks: dispatches every block of the map to its generator and merges the result per material.
// Offices, houses and the hospital live here; every other block type is in districts.js.
import { INSET, blockX, blockZ, blockChar, blockType, S, entrance, doorAt } from '../layout.js';
import { rng, pick } from '../util.js';
import { part, BOX, CYL, SPH } from './mesh.js';
import { track, Acc, D, BRICKS, PLASTERS, CONCRETES, GLASSES, FLOOR, prism, sign, roofClutter, decor, circles } from './kit.js';
import { BUILDERS } from './districts.js';
export { doors, parkingSpots, staticCars, circles, spinners, signMat } from './kit.js';

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
function houses(acc, R, x0, z0, safe, bi, bj) {
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
  if (safe) { const en = entrance(bi, bj), dp = doorAt(en.origin, en.n, en.len); acc.b(0x55585e, .2, 3, .2, dp.stand[0] + 1.4, 0, dp.stand[1]); sign('SAFEHOUSE', '#14301f', '#7dff9a', 3.6, .9, dp.stand[0] + 1.4, 3.3, dp.stand[1] + .12, 0); circles.push([dp.stand[0] + 1.4, dp.stand[1], .3]); }
}

function special(acc, R, x0, z0, which) {
  const base = which === 'hospital' ? 0xe6e8ec : 0x5a78b0;
  acc.box(S, 18, S, x0 + S / 2, 0, z0 + S / 2, 'hospital', base);
  const cross = which === 'hospital' ? 0xcc2222 : 0xe8e8ea;
  acc.vc(part(BOX, cross, { sx: 7, sy: 2, sz: .3, x: x0 + S / 2, y: 22, z: z0 + S + .15 })); acc.vc(part(BOX, cross, { sx: 2, sy: 7, sz: .3, x: x0 + S / 2, y: 22, z: z0 + S + .15 }));
  acc.vc(part(BOX, which === 'hospital' ? 0xf0f0f2 : 0x2a3a5a, { sx: S + 1, sy: 2, sz: 1, x: x0 + S / 2, y: 19, z: z0 + S + .5 }));
  acc.vc(part(BOX, 0x2a4a8a, { sx: S - 8, sy: .6, sz: 5, x: x0 + S / 2, y: 3.4, z: z0 + S + 2.5 }));
  acc.c(0xe0c020, 5.6, 5.6, .32, x0 + S / 2, 18.1, z0 + S / 2 + 4, 20); acc.c(0x4a4a4c, 5, 5, .36, x0 + S / 2, 18.1, z0 + S / 2 + 4, 20);
  roofClutter(acc, R, x0 + S / 2 - 6, z0 + S / 2 - 6, 18, 12, 12);
}

export function buildBlock(i, j) {
  const ch = blockChar(i, j), x0 = blockX(i) + INSET, z0 = blockZ(j) + INSET, R = rng(i * 131 + j * 17 + 5), acc = new Acc();
  track.length = 0;
  if (ch === 'D') office(acc, R, x0, z0);
  else if (ch === 'h') houses(acc, R, x0, z0, false, i, j);
  else if (ch === 'S') houses(acc, R, x0, z0, true, i, j);
  else if (ch === 'H') special(acc, R, x0, z0, 'hospital');
  else if (BUILDERS[ch]) BUILDERS[ch](acc, R, x0, z0, i, j);
  const meshes = acc.flush(true).concat(track.slice());
  decor.blocks.push({ i, j, x: blockX(i) + 20, z: blockZ(j) + 20, meshes });
}
