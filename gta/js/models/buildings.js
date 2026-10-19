// City blocks: dispatches every block of the map to its generator and merges the result per material.
// Offices, houses and the hospital live here; every other block type is in districts.js.
import { INSET, blockX, blockZ, blockChar, blockType, S, entrance, doorAt } from '../layout.js';
import { rng, pick } from '../util.js';
import { part, BOX, CYL, SPH } from './mesh.js';
import { fenceSegs, track, Acc, D, BRICKS, PLASTERS, CONCRETES, GLASSES, FLOOR, prism, sign, roofClutter, decor, circles } from './kit.js';
import { BUILDERS } from './districts.js';
import { glassTower, concreteSlab, classic, mixedUse, groundFloor, house } from './archetypes.js';
import { STYLE } from './style.js';
const ARCH = { ground: STYLE.scale.ground };
export { doors, parkingSpots, staticCars, circles, spinners, signMat } from './kit.js';

const OFFICE_NAMES = [['MERIDIAN', '#14202a', '#7fd0ff'], ['HARBOR TRUST', '#2a1f14', '#f0d890'], ['PACIFIC LAW', '#1a2a1f', '#d8f0d8'], ['OMNICORP', '#1f1f28', '#ff9a60'], ['SEAVIEW HOTEL', '#2a1424', '#ffb0e0'], ['DELTA BANK', '#142a2a', '#a0f0d8']];
/** a downtown block: a storefront ground floor with one or two buildings of different character on top */
function office(acc, R, x0, z0) {
  const cx = x0 + S / 2, cz = z0 + S / 2;
  groundFloor(acc, R, cx, cz, S - 2, S - 2, pick(OFFICE_NAMES));
  const base = ARCH.ground, kinds = [['tower', .35], ['slab', .25], ['classic', .2], ['mixed', .2]];
  const choose = () => { let r = R(), k = 0; for (const [n, p] of kinds) { r -= p; if (r <= 0) return n; k = n; } return k; };
  const build = (kind, x, z, w, d) => kind === 'tower' ? glassTower(acc, R, x, z, base, w, d, 10 + Math.floor(R() * 12), { helipad: R() < .15 }) : kind === 'slab' ? concreteSlab(acc, R, x, z, base, w, d, 5 + Math.floor(R() * 4)) : kind === 'classic' ? classic(acc, R, x, z, base, w, d, 6 + Math.floor(R() * 4)) : mixedUse(acc, R, x, z, base, w, d, 5 + Math.floor(R() * 4));
  if (R() < .4) { const k = choose(); build(k, cx, cz, k === 'slab' ? S - 8 : 15 + R() * 7, k === 'slab' ? 13 + R() * 6 : 15 + R() * 7); }
  else { build(choose(), cx - 6.5, cz + 5.5, 12 + R(), 12 + R()); build(choose(), cx + 7, cz - 5.5, 12 + R(), 12 + R()); }
}
function houses(acc, R, x0, z0, safe, bi, bj) {
  const lot = S / 2;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const lx = x0 + a * lot, lz = z0 + b * lot, cx = lx + lot / 2, cz = lz + lot / 2;
    acc.vc(part(BOX, 0x4f8a45, { sx: lot - .4, sy: .04, sz: lot - .4, x: cx, y: .02, z: cz }));                  // lawn
    const w = 8 + R() * 2.5, d = 7 + R() * 2, h = 3.4 + R() * 1.2, wall = pick(STYLE.building.plaster), roof = pick(STYLE.building.roofAlt);
    const hz = lz + lot * .32, hx = cx;
    house(acc, R, safe ? 'gable' : pick(['gable', 'gable', 'modern', 'duplex', 'twostory']), hx, hz, w, d, h, wall, roof);
    acc.vc(part(BOX, 0x6a6a6c, { sx: 3.2, sy: .04, sz: lot * .5, x: hx + w / 2 + 1.4, y: .05, z: lz + lot * .72 })); // driveway
    // picket fence along the lot front
    for (let p = 0; p < 4; p++) fenceSegs.push({ x: lx + .8 + (p + .5) * (lot - 1.6) / 4, z: lz + lot - .5, yaw: 0 });
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
