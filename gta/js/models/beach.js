// Everything that lives on the coast: rocks, driftwood, dunes, beach grass, palms, umbrellas, lifeguard towers, boardwalks, piers,
// the port quay and ship. Scattered things are placed by rejection sampling against the shoreline function, so each stretch of
// coast gets props that fit it (boulders on rocky points, dunes and grass behind wide beaches).
import { scene } from '../render.js';
import { WORLD as W, RD } from '../layout.js';
import { rng, pick } from '../util.js';
import { part, merge, BOX, CYL, SPH } from './mesh.js';
import { vcLambert, vcStandard } from './materials.js';
import { Prop } from './props.js';
import { addCircle } from '../city.js';
import { parkingSpots } from './kit.js';
import { shoreDist, rockiness, beachWidth, SPURS, LOTS, BOARDWALKS, COAST_ROADS, PATHS, piers, vnoise } from '../coast.js';
import { REGION } from '../terrain.js';

const SAND = 0xe3d4a6, SAND_D = 0xcdbb8a;
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(px - (ax + t * dx), pz - (az + t * dz)); };
/** is (x, z) on or too close to a planned road, car park, boardwalk or pier? Scattered props stay out of these. */
function reserved(x, z) {
  for (const s of SPURS) if (segDist(x, z, s.x0, s.z0, s.x1 + s.dx * 14, s.z1 + s.dz * 14) < s.w / 2 + 5) return true;
  for (const l of LOTS) if (Math.abs(x - l.cx) < l.w / 2 + 5 && Math.abs(z - l.cz) < l.d / 2 + 5) return true;
  for (const r of COAST_ROADS) for (let i = 1; i < r.pts.length; i++) if (segDist(x, z, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]) < r.w / 2 + 4) return true;
  for (const b of BOARDWALKS) { const hx = b.dx ? b.len / 2 : b.w / 2, hz = b.dx ? b.w / 2 : b.len / 2; if (Math.abs(x - b.x) < hx + 3 && Math.abs(z - b.z) < hz + 3) return true; }
  for (const p of piers) { const rx = x - p.x, rz = z - p.z, al = rx * p.dx + rz * p.dz, ac = rx * -p.dz + rz * p.dx; if (al > -6 && al < p.len + 6 && Math.abs(ac) < p.w / 2 + 5) return true; }
  for (const p of PATHS) if (segDist(x, z, p.x0, p.z0, p.x1, p.z1) < 3) return true;
  return false;
}
const jitter = (geo, amt, seed) => { const p = geo.attributes.position, R = rng(seed); for (let i = 0; i < p.count; i++) { p.setXYZ(i, p.getX(i) * (1 + (R() - .5) * amt), p.getY(i) * (1 + (R() - .5) * amt), p.getZ(i) * (1 + (R() - .5) * amt)); } geo.computeVertexNormals(); return geo; };
function rockGeo(hex, seed) { const g = jitter(new THREE.IcosahedronGeometry(1, 1), .5, seed).toNonIndexed(), n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(hex); for (let i = 0; i < n; i++) { const k = .85 + (i % 7) * .03; a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.scale(1, .7, 1); g.translate(0, .25, 0); return g; }
const tuft = part(new THREE.ConeGeometry(.28, .95, 4), 0x7e9a4a, { y: .45 });
const tuftB = merge([part(new THREE.ConeGeometry(.22, .8, 4), 0x8aa65a, { x: .25, y: .4, z: .1 }), part(new THREE.ConeGeometry(.2, .65, 4), 0x6f8a42, { x: -.2, y: .32, z: -.2 }), part(new THREE.ConeGeometry(.25, .9, 4), 0x93ad62, { y: .45 })]);
const driftwood = merge([part(CYL(.14, .18, 3.4, 5), 0x8a7a68, { rz: Math.PI / 2, y: .16 }), part(CYL(.07, .09, 1.2, 4), 0x7a6a58, { rz: Math.PI / 2 - .5, x: .5, y: .35, z: .1 })]);
const palm = (() => { const P = [part(CYL(.18, .3, 3, 6), 0x8a6a46, { y: 1.5 }), part(CYL(.14, .2, 2.6, 6), 0x7a5a3a, { y: 4.1, x: .35, rz: -.16 }), part(CYL(.12, .16, 2, 6), 0x7a5a3a, { y: 6.0, x: .95, rz: -.32 })]; for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2; P.push(part(BOX, k % 2 ? 0x3f7a3a : 0x4f8a3f, { sx: .5, sy: .06, sz: 3.2, x: 1.2 + Math.sin(an) * 1.4, y: 6.9, z: Math.cos(an) * 1.4, ry: an, rx: .5 })); } P.push(part(SPH(.22, 5, 4), 0x6a4a2a, { x: 1.15, y: 6.8 })); return merge(P); })();
const umbrella = hex => merge([part(CYL(.04, .04, 2.2, 5), 0xd8d8d8, { y: 1.1 }), part(CYL(0, 1.35, .55, 8), hex, { y: 2.3 }), part(CYL(1.35, 1.35, .04, 8), D2(hex), { y: 2.04 })]);
function D2(h) { const r = ((h >> 16) & 255) * .8, g = ((h >> 8) & 255) * .8, b = (h & 255) * .8; return (r << 16) | (g << 8) | b; }
const towel = hex => merge([part(BOX, hex, { sx: .8, sy: .03, sz: 1.7, y: .02 }), part(BOX, 0xf2f2ee, { sx: .8, sy: .031, sz: .2, y: .02, z: .5 })]);
const chair = merge([part(BOX, 0x3a6ab8, { sx: .6, sy: .05, sz: .7, y: .28 }), part(BOX, 0x3a6ab8, { sx: .6, sy: .6, sz: .05, y: .6, z: -.33, rx: -.35 }), part(BOX, 0x777b82, { sx: .05, sy: .28, sz: .05, x: -.26, y: .14, z: .3 }), part(BOX, 0x777b82, { sx: .05, sy: .28, sz: .05, x: .26, y: .14, z: .3 })]);
const dune = part(SPH(1, 9, 5), SAND, {});
const shrub = merge([part(SPH(.8, 5, 4), 0x5f8a45, { y: .5, sy: .75 }), part(SPH(.55, 5, 4), 0x6f9a4f, { x: .5, y: .45, z: .2, sy: .7 })]);
const seaStack = jitterGeo(1);
function jitterGeo(seed) { return rockGeo(0x6a6864, seed + 50); }

export function buildBeach() {
  const R = rng(4242);
  const rocks = [rockGeo(0x7d7b76, 1), rockGeo(0x666460, 2), rockGeo(0x8d8576, 3)].map(g => new Prop([{ geo: g, mat: vcLambert }]));
  const wood = new Prop([{ geo: driftwood, mat: vcLambert }]), grassP = new Prop([{ geo: tuft, mat: vcLambert }]), grassQ = new Prop([{ geo: tuftB, mat: vcLambert }]), palms = new Prop([{ geo: palm, mat: vcLambert }]);
  const dunes = new Prop([{ geo: dune, mat: vcLambert }]), shrubs = new Prop([{ geo: shrub, mat: vcLambert }]), stacks = new Prop([{ geo: seaStack, mat: vcLambert }]);
  const umb = [0xe0402f, 0x2f78e0, 0xe0c02f, 0x2fb86a, 0xd0489a].map(h => new Prop([{ geo: umbrella(h), mat: vcLambert }])), tow = [0xe85a5a, 0x4a9ae0, 0xf0d050, 0x5ac88a].map(h => new Prop([{ geo: towel(h), mat: vcLambert }])), chairs = new Prop([{ geo: chair, mat: vcLambert }]);
  const lo = REGION.x0 + 10, size = REGION.size - 20;
  for (let n = 0; n < 16000; n++) {
    const x = lo + R() * size, z = lo + R() * size; if (x > -6 && x < W + 6 && z > -6 && z < W + 6) continue;
    const d = shoreDist(x, z); if (d < -45 || d > 90) continue;
    const rk = rockiness(x, z), bw = beachWidth(x, z), roll = R();
    if (reserved(x, z)) continue;
    // sea stacks and boulders in the surf on rocky coast
    if (d < -3 && d > -34) { if (rk > .45 && roll < .035) { stacks.place(x, z, R() * 6, 2 + R() * 4, -.3); } continue; }
    if (d < 0) continue;
    if (d < 16 + 8 * rk && roll < (.1 + .8 * rk) * .22) { const sc = rk > .35 ? .9 + R() * 2.9 : .35 + R() * 1.1; rocks[Math.floor(R() * 3)].place(x, z, R() * 6, sc, 0); if (sc > 1.1) addCircle(x, z, sc * .85); continue; }
    if (rk < .3 && d > 3 && d < bw && roll < .006) { wood.place(x, z, R() * 3.14, .8 + R() * .7, 0); continue; }
    if (rk < .3 && d > bw - 10 && d < bw + 5 && roll < .12) { const sc = 3 + R() * 6; dunes.place(x, z, R() * 3, sc, -sc * .35); if (sc > 5.5) addCircle(x, z, sc * .5); continue; }
    if (d > bw - 6 && d < bw + 18 && roll < .5) { (R() < .5 ? grassP : grassQ).place(x, z, R() * 6, .7 + R() * .8, 0); continue; }
    if (rk < .35 && d > bw + 3 && d < bw + 30 && roll < .6 && R() < .05) { palms.place(x, z, R() * 6, .85 + R() * .4, 0); addCircle(x, z, .45); continue; }
    if (d > bw + 4 && d < bw + 40 && roll < .72 && R() < .08) { shrubs.place(x, z, R() * 6, .8 + R() * .9, 0); continue; }
    if (d > 25 && roll < .8 && R() < .01 + .02 * rk) { rocks[Math.floor(R() * 3)].place(x, z, R() * 6, .4 + R() * 1.2, 0); }
  }
  // umbrellas, towels and chairs on the beach in front of each car park
  for (const l of LOTS) { const cx = l.cx + l.dx * 30, cz = l.cz + l.dz * 30; for (let k = 0; k < 7; k++) { const x = cx + (R() - .5) * 38 * (l.dz ? 1 : .35) + (l.dx ? R() * 14 : 0), z = cz + (R() - .5) * 38 * (l.dx ? 1 : .35) + (l.dz ? R() * 14 : 0), d = shoreDist(x, z); if (d < 5 || d > 60 || reserved(x, z)) continue; umb[k % 5].place(x, z, R() * 3, 1, 0); tow[k % 4].place(x + 1.6, z + .4, R() * 3, 1, 0); if (R() < .6) chairs.place(x - 1.2, z + 1, R() * 6, 1, 0); } }
  [rocks, [wood, grassP, grassQ, palms, dunes, shrubs, stacks], umb, tow, [chairs]].flat().forEach(p => p.done());

  // static structures, merged into one mesh each
  const S = [], L = [], B = [];
  const plank = (a, hex, w, h, d, x, y, z, ry) => a.push(part(BOX, hex, { sx: w, sy: h, sz: d, x, y: y + h / 2, z, ry: ry || 0 }));
  for (const b of BOARDWALKS) { // a raised deck with posts and a rail on the sea side, ending in steps down to the sand
    const rot = b.dx ? 0 : Math.PI / 2, n = Math.floor(b.len / 1.2);
    for (let k = 0; k < n; k++) { const t = (k + .5) * 1.2 - b.len / 2, x = b.x + (b.dx ? t : 0), z = b.z + (b.dz ? t : 0); plank(S, k % 2 ? 0x9a7a52 : 0x8a6a46, b.dx ? 1.1 : b.w, .1, b.dx ? b.w : 1.1, x, .02, z); }
    for (let k = 0; k <= 8; k++) { const t = -b.len / 2 + k * b.len / 8, x = b.x + (b.dx ? t : 0), z = b.z + (b.dz ? t : 0); for (const o of [-1, 1]) plank(S, 0x6a5238, .12, 1, .12, x + (b.dz ? o * b.w / 2 : 0), 0, z + (b.dx ? o * b.w / 2 : 0)); }
    for (const o of [-1, 1]) plank(S, 0x6a5238, b.dx ? b.len : .1, .08, b.dx ? .1 : b.len, b.x + (b.dz ? o * b.w / 2 : 0), .95, b.z + (b.dx ? o * b.w / 2 : 0));
  }
  for (const p of piers) { // pier: planks, piles, rails, lamp posts, and a hut at the end
    const n = Math.floor(p.len / 1.1), across = [-p.dz, p.dx];
    for (let k = 0; k < n; k++) { const t = (k + .5) * 1.1, x = p.x + p.dx * t, z = p.z + p.dz * t; S.push(part(BOX, k % 2 ? 0x9a7a52 : 0x86684a, { sx: p.dx ? 1.05 : p.w, sy: .12, sz: p.dx ? p.w : 1.05, x, y: .01 + .06, z })); }
    for (let k = 0; k <= p.len / 4; k++) { const t = k * 4, x = p.x + p.dx * t, z = p.z + p.dz * t; for (const o of [-1, 1]) { const ox = across[0] * o * (p.w / 2 - .2), oz = across[1] * o * (p.w / 2 - .2); S.push(part(CYL(.22, .26, 4, 7), 0x5a4630, { x: x + ox, y: -1.9, z: z + oz })); S.push(part(BOX, 0x6a5238, { sx: .12, sy: 1, sz: .12, x: x + ox, y: .55, z: z + oz })); } }
    for (const o of [-1, 1]) S.push(part(BOX, 0x6a5238, { sx: p.dx ? p.len : .1, sy: .08, sz: p.dx ? .1 : p.len, x: p.x + p.dx * p.len / 2 + across[0] * o * (p.w / 2 - .2), y: 1.05, z: p.z + p.dz * p.len / 2 + across[1] * o * (p.w / 2 - .2) }));
    const ex = p.x + p.dx * (p.len - 3), ez = p.z + p.dz * (p.len - 3);
    for (const t of [10, p.len * .55, p.len - 8]) { const x = p.x + p.dx * t + across[0] * (p.w / 2 - .4), z = p.z + p.dz * t + across[1] * (p.w / 2 - .4); L.push(part(CYL(.06, .08, 3, 5), 0x3a3d42, { x, y: 1.6, z })); L.push(part(BOX, 0xffe9b0, { sx: .4, sy: .12, sz: .4, x, y: 3.15, z })); }
    S.push(part(BOX, 0xd8cdb4, { sx: 3.6, sy: 2.6, sz: 3.6, x: ex, y: 1.4, z: ez })); S.push(part(CYL(0, 2.9, 1.3, 4), 0x7a3a2a, { x: ex, y: 3.55, z: ez, ry: Math.PI / 4 }));
  }
  // lifeguard towers: one beside each boardwalk, on the sand
  for (const b of BOARDWALKS) { const x = b.x + b.dx * (b.dx ? 30 : 0) + (b.dz ? 16 : 0), z = b.z + b.dz * (b.dz ? 30 : 0) + (b.dx ? 16 : 0), d = shoreDist(x, z); if (d < 6 || reserved(x, z)) continue;
    for (const [dx, dz] of [[-.9, -.9], [.9, -.9], [-.9, .9], [.9, .9]]) S.push(part(BOX, 0xf0f0ec, { sx: .16, sy: 2.6, sz: .16, x: x + dx, y: 1.3, z: z + dz })); S.push(part(BOX, 0xe8e8e4, { sx: 2.4, sy: .14, sz: 2.4, x, y: 2.6, z })); S.push(part(BOX, 0xd8422f, { sx: 1.9, sy: 1.5, sz: 1.9, x, y: 3.4, z })); S.push(part(BOX, 0xf0f0ec, { sx: 2.3, sy: .16, sz: 2.3, x, y: 4.2, z })); S.push(part(BOX, 0xd8422f, { sx: .06, sy: .8, sz: .06, x: x + 1, y: 4.6, z })); S.push(part(BOX, 0xffd23f, { sx: .6, sy: .35, sz: .04, x: x + 1.3, y: 4.85, z })); addCircle(x, z, 1.5); }
  // the port quay along the south edge and the cargo ship moored at it
  const qx0 = 330, qx1 = W - 6, qz = W;
  S.push(part(BOX, 0x8a8a86, { sx: qx1 - qx0, sy: .5, sz: 15, x: (qx0 + qx1) / 2, y: -.22, z: qz + 7.5 })); S.push(part(BOX, 0x6a6a66, { sx: qx1 - qx0, sy: 1.6, sz: .6, x: (qx0 + qx1) / 2, y: -1.1, z: qz + 15 }));
  for (let x = qx0 + 6; x < qx1; x += 14) S.push(part(CYL(.28, .34, .8, 8), 0x2a2a30, { x, y: .4, z: qz + 14 }));
  const sz = qz + 46;
  S.push(part(BOX, 0x30363e, { sx: 150, sy: 8, sz: 22, x: 450, y: 1, z: sz })); S.push(part(BOX, 0xb8322f, { sx: 150.4, sy: 1.6, sz: 22.4, x: 450, y: -.6, z: sz })); S.push(part(CYL(0, 11, 14, 4), 0x30363e, { x: 527, y: 4, z: sz, rz: -Math.PI / 2, sy: .55 }));
  S.push(part(BOX, 0xe8e8e4, { sx: 34, sy: 14, sz: 18, x: 395, y: 12, z: sz })); S.push(part(BOX, 0x2a2a30, { sx: 8, sy: 6, sz: 8, x: 395, y: 23, z: sz })); S.push(part(CYL(2.2, 2.6, 7, 8), 0xc02a2a, { x: 395, y: 29, z: sz }));
  const CONT = [0xb8322f, 0x2f5fb8, 0xd2a52f, 0x2f9a58, 0x8a8e96, 0xe0702a, 0x6a2430];
  for (let i = 0; i < 18; i++) for (let lv = 0; lv < 1 + (i % 3); lv++) S.push(part(BOX, pick(CONT), { sx: 6, sy: 2.6, sz: 2.5, x: 436 + i * 6.2, y: 5 + lv * 2.65 + 1.3, z: sz + (i % 2 ? 4 : -4) }));
  const sm = new THREE.Mesh(merge(S), vcStandard); sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false; scene.add(sm);
  if (L.length) { const lm = new THREE.Mesh(merge(L), vcLambert); scene.add(lm); }
  // parking spots in the beach car parks (the traffic system fills some of them with parked cars)
  for (const l of LOTS) {
    if (l.dx) { for (let t = -l.d / 2 + 3; t < l.d / 2 - 1; t += 2.8) for (const rowX of [-l.w / 2 + 3.9, l.w / 2 - 3.9]) parkingSpots.push({ x: l.cx + rowX, z: l.cz + t, yaw: Math.PI / 2 * (rowX < 0 ? 1 : -1), weight: .7, district: 'outskirts' }); }
    else for (let t = -l.w / 2 + 3; t < l.w / 2 - 1; t += 2.8) for (const rowZ of [-l.d / 2 + 3.9, l.d / 2 - 3.9]) parkingSpots.push({ x: l.cx + t, z: l.cz + rowZ, yaw: rowZ < 0 ? 0 : Math.PI, weight: .7, district: 'outskirts' });
  }
}
