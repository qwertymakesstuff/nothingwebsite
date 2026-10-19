// Street furniture, placed with instancing: every kind of prop is one geometry drawn many times. Collisions are small circles.
import { scene } from '../render.js';
import { N, B, RD, blockX, blockZ, rc, blockChar, blockType, districtOf } from '../layout.js';
import { HW_ROAD, walkBlocked } from '../highway.js';
import { addCircle } from '../city.js';
import { defineModel, register } from '../physprops.js';
import { fenceSegs } from './kit.js';
import { rng } from '../util.js';
import { part, merge, BOX, CYL, SPH } from './mesh.js';
import { vcLambert, glowTexture } from './materials.js';

const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pos = new THREE.Vector3();
const CHUNK = 110, allChunks = [], ZERO = new THREE.Matrix4().makeScale(0, 0, 0), tmp4 = new THREE.Matrix4();
/** Instanced props, split into spatial chunks so the camera can skip whole chunks (an InstancedMesh is otherwise drawn in full, however far away). */
export class Prop {
  constructor(parts, _cap, chunk) { this.parts = parts; this.n = 0; this.chunks = new Map(); this.size = chunk || CHUNK; }   // sparse props use bigger chunks: fewer draw calls
  place(x, z, yaw, s, y) {
    q.setFromAxisAngle(up, yaw || 0); sc.set(s || 1, s || 1, s || 1); pos.set(x, y || 0, z); mat4.compose(pos, q, sc);
    const S = this.size, key = Math.floor(x / S) + ',' + Math.floor(z / S); let c = this.chunks.get(key);
    if (!c) { c = { cx: (Math.floor(x / S) + .5) * S, cz: (Math.floor(z / S) + .5) * S, m: [] }; this.chunks.set(key, c); }
    const e = mat4.elements.slice(); e[12] -= c.cx; e[14] -= c.cz; c.m.push(e); this.n++;
    placedLog.push([this, x, z]);
    return { key, i: c.m.length - 1 };
  }
  /** switch one placed instance off / back on (physics props swap it for a loose mesh while knocked over) */
  hide(h) { const c = this.chunks.get(h.key); if (!c || !c.meshes) return; for (const m of c.meshes) { m.setMatrixAt(h.i, ZERO); m.instanceMatrix.needsUpdate = true; } }
  show(h) { const c = this.chunks.get(h.key); if (!c || !c.meshes) return; tmp4.fromArray(c.m[h.i]); for (const m of c.meshes) { m.setMatrixAt(h.i, tmp4); m.instanceMatrix.needsUpdate = true; } }
  done() {
    this.meshes = [];
    for (const c of this.chunks.values()) { c.meshes = []; for (const p of this.parts) {
      const g = p.geo.clone(); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), this.size * .78);
      const m = new THREE.InstancedMesh(g, p.mat, c.m.length); m.position.set(c.cx, 0, c.cz); m.castShadow = p.shadow !== false;
      const tmp = new THREE.Matrix4(); c.m.forEach((e, i) => { tmp.fromArray(e); m.setMatrixAt(i, tmp); }); m.instanceMatrix.needsUpdate = true; scene.add(m); this.meshes.push(m); c.meshes.push(m); allChunks.push({ m, cx: c.cx, cz: c.cz, size: this.size });
    } }
  }
}
const metal = 0x3a3d42;
const G = {
  pole: merge([part(CYL(.09, .12, 6.4, 6), metal, { y: 3.2 }), part(BOX, metal, { sx: .1, sy: .1, sz: 1.7, y: 6.3, z: .8 }), part(BOX, 0x25272b, { sx: .4, sy: .12, sz: .7, y: 6.22, z: 1.55 })]),
  bulb: merge([part(BOX, 0xffffff, { sx: .32, sy: .06, sz: .55, y: 6.14, z: 1.55 })]),
  hydrant: merge([part(CYL(.16, .18, .55, 8), 0xc43228, { y: .3 }), part(SPH(.17, 8, 5), 0xc43228, { y: .6, sy: .7 }), part(BOX, 0xe0e0e0, { sx: .4, sy: .08, sz: .08, y: .42 }), part(CYL(.06, .06, .12, 6), 0xd8d8d8, { y: .82 })]),
  trash: merge([part(CYL(.28, .24, .8, 9), 0x3f5a46, { y: .4 }), part(CYL(.3, .3, .06, 9), 0x2a3a2e, { y: .83 }), part(BOX, 0x555a5e, { sx: .5, sy: .04, sz: .04, y: .6 })]),
  meter: merge([part(CYL(.04, .04, 1.1, 5), 0x66696e, { y: .55 }), part(BOX, 0x4a4d52, { sx: .18, sy: .3, sz: .12, y: 1.2 }), part(BOX, 0x9ac0e0, { sx: .12, sy: .1, sz: .02, y: 1.25, z: .07 })]),
  bench: merge([part(BOX, 0x7a5a3a, { sx: 1.7, sy: .08, sz: .5, y: .45 }), part(BOX, 0x7a5a3a, { sx: 1.7, sy: .4, sz: .07, y: .72, z: -.22, rx: -.12 }), part(BOX, metal, { sx: .08, sy: .45, sz: .45, x: -.75, y: .22 }), part(BOX, metal, { sx: .08, sy: .45, sz: .45, x: .75, y: .22 })]),
  dumpster: merge([part(BOX, 0x2f6a3f, { sx: 1.9, sy: 1.1, sz: 1.0, y: .75 }), part(BOX, 0x1f2a22, { sx: 2.0, sy: .1, sz: 1.1, y: 1.35 }), part(BOX, 0x1a1a1c, { sx: .15, sy: .2, sz: .15, x: -.8, y: .12, z: .35 }), part(BOX, 0x1a1a1c, { sx: .15, sy: .2, sz: .15, x: .8, y: .12, z: .35 })]),
  tlPole: merge([part(CYL(.1, .12, 4.6, 6), metal, { y: 2.3 }), part(BOX, 0x1c1c1f, { sx: .38, sy: 1.15, sz: .3, y: 4.5, z: .0 })]),
  tree: merge([part(CYL(.16, .24, 2.4, 5), 0x5a3d22, { y: 1.2 }), part(SPH(1.5, 6, 4), 0x3a7a3a, { y: 3.4, sy: 1.05 }), part(SPH(1.05, 5, 4), 0x4a8a3a, { x: .7, y: 4.4, z: .2 }), part(SPH(.95, 5, 4), 0x2f6a35, { x: -.6, y: 4.1, z: -.4 })]),
  treeTall: merge([part(CYL(.14, .2, 3.2, 5), 0x4a3320, { y: 1.6 }), part(SPH(1.0, 6, 4), 0x2f6a35, { y: 4.3, sy: 2.0 }), part(SPH(.75, 6, 4), 0x3a7a3a, { y: 6.1, sy: 1.5 })]),
  treeBroad: merge([part(CYL(.22, .3, 1.9, 5), 0x5a3d22, { y: .95 }), part(SPH(2.3, 7, 4), 0x4a8a3a, { y: 3.2, sy: .75 }), part(SPH(1.5, 6, 4), 0x5a9a3f, { x: 1.3, y: 3.8, z: .5, sy: .8 }), part(SPH(1.4, 6, 4), 0x3a7a3a, { x: -1.2, y: 3.6, z: -.7, sy: .8 })]),
  treeAutumn: merge([part(CYL(.16, .24, 2.4, 5), 0x5a3d22, { y: 1.2 }), part(SPH(1.5, 6, 4), 0xc08a2a, { y: 3.4, sy: 1.05 }), part(SPH(1.05, 5, 4), 0xb5622a, { x: .7, y: 4.4, z: .2 }), part(SPH(.95, 5, 4), 0xd0a030, { x: -.6, y: 4.1, z: -.4 })]),
  bush: merge([part(SPH(.85, 6, 4), 0x3a7a3a, { y: .5, sy: .75 }), part(SPH(.6, 6, 4), 0x4a8a3a, { x: .65, y: .4, z: .2, sy: .8 }), part(SPH(.55, 6, 4), 0x2f6a35, { x: -.5, y: .4, z: -.3, sy: .8 })]),
  planter: merge([part(BOX, 0x8a8a84, { sx: 1.6, sy: .55, sz: .8, y: .28 }), part(BOX, 0x5a3d22, { sx: 1.45, sy: .08, sz: .65, y: .56 }), part(SPH(.45, 6, 4), 0x3a7a3a, { x: -.4, y: .8, sy: .8 }), part(SPH(.4, 6, 4), 0x5a9a3f, { x: .4, y: .78, sy: .8 }), part(SPH(.2, 5, 4), 0xd8506a, { x: 0, y: 1.0 })]),
  pine: merge([part(CYL(.14, .2, 1.4, 5), 0x4a3320, { y: .7 }), part(CYL(0, 1.5, 2.4, 7), 0x2a6a3a, { y: 2.4 }), part(CYL(0, 1.15, 2.2, 7), 0x2f7a40, { y: 3.8 }), part(CYL(0, .8, 1.8, 7), 0x378a48, { y: 5.0 })])
};
const plateGeo = (txt, bg, fg, shape) => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = bg; if (shape === 'round') { g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = '#cc2222'; g.lineWidth = 5; g.stroke(); } else g.fillRect(3, 3, 58, 58);
  g.fillStyle = fg; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 32, 34);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) });
};
const POLE_GEO = merge([part(CYL(.04, .04, 2.6, 5), 0x6a6d72, { y: 1.3 })]);
const PLATE = new THREE.BoxGeometry(.7, .7, .04); PLATE.translate(0, 2.35, .05);

export const placedLog = [];   // every instanced prop placed: [prop, x, z] (the world audit reads this)
export const lightMats = { bulb: new THREE.MeshBasicMaterial({ color: 0x9a9a90 }), pool: null };
const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,225,160,.9)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
export const nightProps = { poolMat };
const tl = { x: null, lamps: null, nodes: [] };

import { lightPhase } from '../signals.js';
export { lightPhase };
const LC = { red: [0xff3a2a, 0x401210, 0x401210], yellow: [0x3a2a08, 0xffc22a, 0x3a2a08], green: [0x0c2a14, 0x0c2a14, 0x3aff6a] };

const CONE = merge([part(BOX, 0x2a2a2c, { sx: .5, sy: .04, sz: .5, y: .02 }), part(CYL(.04, .2, .62, 8), 0xf0701e, { y: .35 }), part(CYL(.1, .15, .12, 8), 0xf4f4f0, { y: .36 }), part(CYL(.14, .17, .08, 8), 0xf4f4f0, { y: .22 })]);
const FENCE = merge([...[-1.6, -1.1, -.55, 0, .55, 1.1, 1.6].map(x => part(BOX, 0xf0eee8, { sx: .1, sy: .9, sz: .08, x, y: .45 })), part(BOX, 0xf0eee8, { sx: 3.6, sy: .08, sz: .06, y: .7 }), part(BOX, 0xf0eee8, { sx: 3.6, sy: .08, sz: .06, y: .3 })]);
const KIOSK = merge([part(BOX, 0x3a6f8f, { sx: 1.6, sy: 2.0, sz: 1.2, y: 1.0 }), part(BOX, 0xe8e2d0, { sx: 1.1, sy: .7, sz: .05, y: 1.3, z: .62 }), part(BOX, 0x2a2f36, { sx: 1.9, sy: .14, sz: 1.5, y: 2.05 }), part(BOX, 0xd0a020, { sx: 1.7, sy: .3, sz: .05, y: 1.85, z: .63 })]);
const UPOLE = merge([part(CYL(.14, .2, 9, 6), 0x6a5238, { y: 4.5 }), part(BOX, 0x5a4530, { sx: 2.6, sy: .14, sz: .14, y: 8.4 }), part(BOX, 0x5a4530, { sx: 1.8, sy: .12, sz: .12, y: 7.6 }), ...[-1.1, 0, 1.1].map(x => part(CYL(.06, .06, .25, 5), 0xd8d8d0, { x, y: 8.65 })), part(BOX, 0x4a4e54, { sx: .5, sy: .6, sz: .35, x: .3, y: 6.6, z: .25 })]);
const CABINET = merge([part(BOX, 0x4a6a58, { sx: .9, sy: 1.3, sz: .6, y: .65 }), part(BOX, 0x3a5a48, { sx: .96, sy: .08, sz: .66, y: 1.32 }), part(BOX, 0x2a2a2c, { sx: .5, sy: .8, sz: .02, y: .7, z: .31 })]);
const SHELTER = merge([...[-1.4, 1.4].map(x => part(BOX, 0x4a4e54, { sx: .12, sy: 2.5, sz: .12, x, y: 1.25, z: -.45 })), part(BOX, 0x2f343a, { sx: 3.2, sy: .12, sz: 1.3, y: 2.55, z: -.2 }), part(BOX, 0x9ac8e0, { sx: 2.9, sy: 1.7, sz: .04, y: 1.3, z: -.46 }), part(BOX, 0x7a5a3a, { sx: 2.2, sy: .08, sz: .45, y: .5, z: -.25 }), part(BOX, 0xe8e4d8, { sx: .9, sy: 1.3, sz: .06, x: 1.9, y: 1.4, z: -.4 }), part(BOX, 0x2a6ac8, { sx: .7, sy: .35, sz: .05, x: 1.9, y: 2.2, z: -.36 })]);
const BARRIER = merge([part(BOX, 0xe4e4e0, { sx: 2.4, sy: .85, sz: .5, y: .43 }), part(BOX, 0xf0701e, { sx: .5, sy: .85, sz: .52, x: -.7, y: .43 }), part(BOX, 0xf0701e, { sx: .5, sy: .85, sz: .52, x: .7, y: .43 }), part(BOX, 0xf4d020, { sx: 2.4, sy: .08, sz: .54, y: .78 })]);
const SIGNPLATE = (m) => ({ geo: PLATE, mat: m, shadow: false });
export function buildProps() {
  const R = rng(99), pad = 0.7;
  defineModel('lamp', [{ geo: G.pole, mat: vcLambert }, { geo: G.bulb, mat: lightMats.bulb, shadow: false }]);
  defineModel('hydrant', [{ geo: G.hydrant, mat: vcLambert }]); defineModel('trash', [{ geo: G.trash, mat: vcLambert }]); defineModel('meter', [{ geo: G.meter, mat: vcLambert }]);
  defineModel('bench', [{ geo: G.bench, mat: vcLambert }]); defineModel('dumpster', [{ geo: G.dumpster, mat: vcLambert }]); defineModel('tree', [{ geo: G.tree, mat: vcLambert }]);
  defineModel('treeA', [{ geo: G.treeTall, mat: vcLambert }]); defineModel('treeB', [{ geo: G.treeBroad, mat: vcLambert }]); defineModel('treeC', [{ geo: G.treeAutumn, mat: vcLambert }]);
  defineModel('upole', [{ geo: UPOLE, mat: vcLambert }]);
  defineModel('shelter', [{ geo: SHELTER, mat: vcLambert }]);
  defineModel('tlpole', [{ geo: G.tlPole, mat: vcLambert }]); defineModel('cone', [{ geo: CONE, mat: vcLambert }]); defineModel('kiosk', [{ geo: KIOSK, mat: vcLambert }]);
  const lights = new Prop([{ geo: G.pole, mat: vcLambert }, { geo: G.bulb, mat: lightMats.bulb, shadow: false }], 520);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), poolMat, 560); pools.count = 0; pools.frustumCulled = false; scene.add(pools); let pn = 0;
  const hyd = new Prop([{ geo: G.hydrant, mat: vcLambert }], 200), trash = new Prop([{ geo: G.trash, mat: vcLambert }], 260), meters = new Prop([{ geo: G.meter, mat: vcLambert }], 420), bench = new Prop([{ geo: G.bench, mat: vcLambert }], 200), dump = new Prop([{ geo: G.dumpster, mat: vcLambert }], 80), trees = new Prop([{ geo: G.tree, mat: vcLambert }], 1400), pines = new Prop([{ geo: G.pine, mat: vcLambert }], 400);
  /** place an instance, give it a collision circle and (when `type` is given) make it a physics prop */
  const place = (prop, x, z, yaw, r, s, type, extra) => {
    const h = prop.place(x, z, yaw, s), c = r ? addCircle(x, z, r) : null;
    if (type && c) { const o = register(type, x, z, yaw, s || 1, { circle: c, model: extra && extra.model, hide: () => { prop.hide(h); extra && extra.hide && extra.hide(); }, show: () => { prop.show(h); extra && extra.show && extra.show(); } }); return o; }
    return null;
  };
  const treeV = [trees, new Prop([{ geo: G.treeTall, mat: vcLambert }], 0, 160), new Prop([{ geo: G.treeBroad, mat: vcLambert }], 0, 160), new Prop([{ geo: G.treeAutumn, mat: vcLambert }], 0, 160)], treeM = ['tree', 'treeA', 'treeB', 'treeC'];
  const shrubs = new Prop([{ geo: G.bush, mat: vcLambert }], 0, 160), planters = new Prop([{ geo: G.planter, mat: vcLambert }], 0, 220);
  /** a street/park tree: one of four silhouettes (round, columnar, broad, autumn); small ones can be knocked over */
  const placeTree = (x, z, r, s, wide) => { const w = R(), v = w < .4 ? 0 : w < .6 ? 1 : w < .88 ? 2 : 3; place(treeV[v], x, z, R() * 6, v === 2 ? r * 1.2 : r, s, s < .98 ? 'sapling' : null, { model: treeM[v] }); };
  const toRoad = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // outward direction of each block side
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const bx = blockX(i), bz = blockZ(j), ch = blockChar(i, j), t = blockType(i, j), dist = t.district;
    const park = ch === 'p' || ch === 'w', plaza = ch === 'Z', downtownish = dist === 'downtown' || dist === 'commercial', industrial = dist === 'industrial' || dist === 'port', outskirt = dist === 'outskirts';
    // street lights: middle of each side, arm pointing at the road (fewer on the outskirts)
    if (!outskirt || (i + j) % 2 === 0) [[bx + B / 2, bz + pad, 0], [bx + B / 2, bz + B - pad, 1], [bx + pad, bz + B / 2, 2], [bx + B - pad, bz + B / 2, 3]].forEach(([x, z, f]) => {
      const d = toRoad[f], yaw = Math.atan2(d[0], d[1]); if (lights.n >= 500) return; const pi = pn, px = x + d[0] * 1.6, pz = z + d[1] * 1.6; q.setFromAxisAngle(up, 0); pos.set(px, .05, pz); sc.set(1, 1, 1); mat4.compose(pos, q, sc); const pm = mat4.clone(); if (pn < 520) pools.setMatrixAt(pn++, mat4);
      place(lights, x, z, yaw, .25, 1, 'lamp', { hide: () => { pools.setMatrixAt(pi, ZERO); pools.instanceMatrix.needsUpdate = true; }, show: () => { pools.setMatrixAt(pi, pm); pools.instanceMatrix.needsUpdate = true; } });
    });
    if (!park && !plaza && !outskirt && R() < .7) place(hyd, bx + 6 + R() * 6, bz + pad + .1, 0, .3, 1, 'hydrant');
    if (!park && !outskirt && R() < (downtownish ? .9 : .5)) place(trash, bx + B - 3.5 - R() * 2, bz + B - pad - .1, 0, .32, 1, 'trash');
    if (downtownish && R() < .8) place(trash, bx + pad + .1, bz + 8 + R() * 6, 0, .32, 1, 'trash');
    if (downtownish) for (let m = 0; m < 3; m++) place(meters, bx + 6 + m * 5, bz + B - pad - .1, 0, .15, 1, 'meter');
    if ((dist === 'residential' || downtownish || plaza) && R() < .55) place(bench, bx + 10 + R() * 8, bz + 2.55, Math.PI, .6, 1, 'bench');
    if ((dist === 'residential' || downtownish) && R() < .4) place(bench, bx + 10 + R() * 8, bz + B - 2.55, 0, .6, 1, 'bench');
    if (industrial) place(dump, bx + 8 + R() * 18, bz + 2.3, 0, 1.0, 1, 'dumpster');
    if (!park && !plaza && !industrial && (dist === 'residential' || ch === 'o')) for (let k = 0; k < 3; k++) placeTree(bx + 6 + k * 14 + R() * 3, bz + pad + 1.0, .45, .8 + R() * .4);
    if (park) for (let k = 0; k < (ch === 'w' ? 5 : 16); k++) { const x = bx + INSETPARK + R() * (B - 2 * INSETPARK), z = bz + INSETPARK + R() * (B - 2 * INSETPARK); if (R() < .3) place(pines, x, z, R() * 6, .5, .9 + R() * .5); else placeTree(x, z, .55, .9 + R() * .5); }
    if (park) { for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, r = 5.2 + (k % 2) * .3; shrubs.place(bx + B / 2 + Math.cos(a) * r, bz + B / 2 + Math.sin(a) * r, R() * 6, .8 + R() * .5); } if (ch === 'p') for (let k = 0; k < 4; k++) place(bench, bx + B / 2 + (k < 2 ? -1 : 1) * 7.5, bz + B / 2 + (k % 2 ? -1 : 1) * 7.5, k * 1.57, .6, 1, 'bench'); for (let k = 0; k < 6; k++) shrubs.place(bx + INSETPARK + 1 + k * 5.4, bz + INSETPARK + .5, 0, 1); }
    if (plaza) for (const [px2, pz2] of [[5, 5], [B - 5, 5], [5, B - 5], [B - 5, B - 5], [B / 2, 4], [B / 2, B - 4]]) planters.place(bx + px2, bz + pz2, 0, 1);
    if (!park && !outskirt && dist === 'residential' && R() < .6) for (let k = 0; k < 3; k++) shrubs.place(bx + 8 + k * 9 + R() * 2, bz + B - pad - .9, 0, .7 + R() * .4);
  }
  // traffic cones: lines at the kerb for roadworks, and around construction sites
  const cones = new Prop([{ geo: CONE, mat: vcLambert }], 0, 220), fences = new Prop([{ geo: FENCE, mat: vcLambert }], 0, 220), kiosks = new Prop([{ geo: KIOSK, mat: vcLambert }], 0, 220);
  const RW = rng(4242);
  for (let k = 0; k < 7; k++) { const i = Math.floor(RW() * N), j = Math.floor(RW() * N), t = blockType(i, j); if (!t || t.district === 'outskirts' || t.district === 'port') continue; const bx = blockX(i), bz = blockZ(j); for (let m = 0; m < 5; m++) place(cones, bx + 12 + m * 1.9, bz - 1.5, 0, .26, 1, 'cone'); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (blockChar(i, j) === 'c') for (let m = 0; m < 7; m++) { place(cones, blockX(i) + 8 + m * 3.4, blockZ(j) - 1.2, 0, .26, 1, 'cone'); place(cones, blockX(i) - 1.2, blockZ(j) + 8 + m * 3.4, 0, .26, 1, 'cone'); }
  // low wooden fences round the parks, with an opening in the middle of each side
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const ch = blockChar(i, j); if (ch !== 'p' && ch !== 'w') continue; const bx = blockX(i) + INSETPARK - 1, bz = blockZ(j) + INSETPARK - 1, L = B - 2 * (INSETPARK - 1), n = Math.floor((L - 8) / 3.85);
    for (let k = 0; k < n; k++) { const t = 4 + 1.925 + k * 3.85; if (Math.abs(t - L / 2) < 4) continue; fenceSegs.push({ x: bx + t, z: bz, yaw: 0 }, { x: bx + t, z: bz + L, yaw: 0 }, { x: bx, z: bz + t, yaw: Math.PI / 2 }, { x: bx + L, z: bz + t, yaw: Math.PI / 2 }); } }
  for (const f of fenceSegs) { const c = [-1.3, 0, 1.3].map(o => addCircle(f.x + Math.cos(f.yaw) * o, f.z - Math.sin(f.yaw) * o, .3)), h = fences.place(f.x, f.z, f.yaw, 1); register('fence', f.x, f.z, f.yaw, 1, { circles: c, hide: () => fences.hide(h), show: () => fences.show(h) }); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j), d = t && t.district; if ((d === 'downtown' || d === 'commercial') && !t.open && (i * 7 + j * 3) % 4 === 0) place(kiosks, blockX(i) + B - 11, blockZ(j) + B - pad - 1.3, 0, .9, 1, 'kiosk'); }
  // bus shelters on the busier street sides, jersey barriers at the roadworks, and street-name blades on the corner poles
  const upoles = new Prop([{ geo: UPOLE, mat: vcLambert }], 0, 220), cabinets = new Prop([{ geo: CABINET, mat: vcLambert }], 0, 220);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j), d = t && t.district; if (!d || t.open) continue; const bx = blockX(i), bz = blockZ(j);
    if ((d === 'industrial' || d === 'port') && (i + j) % 2 === 0) place(upoles, bx + 3.2, bz + B - pad - 1.6, 0, .25, 1, 'lamp', { model: 'upole' });
    if ((i * 3 + j * 7) % 5 === 0 && d !== 'outskirts') { place(cabinets, bx + 2.2, bz + 3.5, Math.PI / 2, .6, 1); } }
  const shelters = new Prop([{ geo: SHELTER, mat: vcLambert }], 0, 220), barriers = new Prop([{ geo: BARRIER, mat: vcLambert }], 0, 220); let ns = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j); if (!t || ns >= 22 || t.open || !['downtown', 'commercial', 'residential'].includes(t.district) || (i * 5 + j * 11) % 4 !== 1) continue;
    const bx = blockX(i), bz = blockZ(j), south = (i + j) % 2; const sx = bx + 26, sz = south ? bz + B - pad - .45 : bz + pad + .45;
    const h = shelters.place(sx, sz, south ? 0 : Math.PI, 1), cs = [-1, 1].map(o => addCircle(sx + o * .9, sz, .65));
    register('shelter', sx, sz, south ? 0 : Math.PI, 1, { circles: cs, hide: () => shelters.hide(h), show: () => shelters.show(h) }); ns++; }
  for (let k = 0; k < 7; k++) { const i = Math.floor(RW() * N), j = Math.floor(RW() * N), t = blockType(i, j); if (!t || t.district === 'outskirts' || t.district === 'port') continue; for (let m = -1; m <= 1; m += 2) { const x = blockX(i) + 12 + 4.5 * 1.9 + m * 3.2 + 2, z = blockZ(j) - 3.2; barriers.place(x, z, 0, 1); addCircle(x, z, .8); } }
  Object.entries({ hyd, trash, meters, bench, dump, trees, pines, lights, cones, fences, kiosks, shrubs, planters }).forEach(([k, p]) => { p.label = k; }); treeV.slice(1).forEach((p, i) => { p.label = 'tree' + (i + 1); });
  [cones, fences, kiosks, shrubs, planters, shelters, barriers, upoles, cabinets, ...treeV.slice(1)].forEach(p => p.done());
  [hyd, trash, meters, bench, dump, trees, pines, lights].forEach(p => p.done()); pools.count = pn; pools.instanceMatrix.needsUpdate = true;

  // traffic lights at every intersection: poles with two heads, lamp colours updated as the phase changes
  const poles = new Prop([{ geo: G.tlPole, mat: vcLambert }], (N + 1) * (N + 1) * 4);
  const lampGeo = new THREE.PlaneGeometry(.2, .24), lampCount = (N + 1) * (N + 1) * 4 * 6;
  const lampMesh = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial(), lampCount); lampMesh.frustumCulled = false; scene.add(lampMesh);
  lampMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(lampCount * 3), 3);
  let ln = 0;
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
    const entry = { a, b, base: ln, last: '' };
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = rc(a) + sx * (RD / 2 + .5), z = rc(b) + sz * (RD / 2 + .5);
      const saved = [], ph = poles.place(x, z, 0, 1), tc = addCircle(x, z, .22);
      // head facing the z-traffic (approaching from sz side) and head facing the x-traffic
      [[0, sz, 'z'], [sx, 0, 'x']].forEach(([dx, dz, axis]) => {
        for (let k = 0; k < 3; k++) {
          q.setFromAxisAngle(up, Math.atan2(dx, dz)); pos.set(x + dx * .17 + (dx ? 0 : 0), 4.5 + (1 - k) * .36, z + dz * .17); sc.set(1, 1, 1); mat4.compose(pos, q, sc);
          lampMesh.setMatrixAt(ln, mat4); saved.push([ln, mat4.clone()]); entry[axis] = entry[axis] || []; entry[axis].push(ln); ln++;
        }
      });
      register('tlight', x, z, 0, 1, { circle: tc, model: 'tlpole', hide: () => { poles.hide(ph); saved.forEach(s => lampMesh.setMatrixAt(s[0], ZERO)); lampMesh.instanceMatrix.needsUpdate = true; }, show: () => { poles.show(ph); saved.forEach(s => lampMesh.setMatrixAt(s[0], s[1])); lampMesh.instanceMatrix.needsUpdate = true; } });
    }
    tl.nodes.push(entry);
  }
  poles.done(); lampMesh.count = ln; lampMesh.instanceMatrix.needsUpdate = true; tl.lamps = lampMesh;

  // road signs: speed limits and one-way arrows on posts
  const signs = [['30', '#f4f4f4', '#111', 'round'], ['P', '#2a5ac8', '#fff', 'sq'], ['→', '#111', '#fff', 'sq']].map(s => ({ mat: plateGeo(...s), n: 0 }));
  const posts = new Prop([{ geo: POLE_GEO, mat: vcLambert }], 260);
  signs.forEach((s, i) => defineModel('sign' + i, [{ geo: POLE_GEO, mat: vcLambert }, SIGNPLATE(s.mat)]));
  const plates = signs.map(s => { const m = new THREE.InstancedMesh(PLATE, s.mat, 120); m.count = 0; m.frustumCulled = false; scene.add(m); return m; });
  for (let k = 0; k < 220; k++) {
    const i = Math.floor(R() * N), j = Math.floor(R() * N), side = Math.floor(R() * 4), t = 6 + R() * (B - 12);
    const x = side < 2 ? blockX(i) + t : side === 2 ? blockX(i) + .5 : blockX(i) + B - .5, z = side === 0 ? blockZ(j) + .5 : side === 1 ? blockZ(j) + B - .5 : blockZ(j) + t;
    const yaw = Math.atan2(toRoad[side][0], toRoad[side][1]), idx = k % 3; if (plates[idx].count >= 120) continue;
    const hp = posts.place(x, z, yaw, 1); q.setFromAxisAngle(up, yaw); pos.set(x, 0, z); sc.set(1, 1, 1); mat4.compose(pos, q, sc); const pm = plates[idx], pi = pm.count, sm = mat4.clone(); pm.setMatrixAt(pm.count++, mat4); const sc2 = addCircle(x, z, .12);
    register('sign', x, z, yaw, 1, { circle: sc2, model: 'sign' + idx, hide: () => { posts.hide(hp); pm.setMatrixAt(pi, ZERO); pm.instanceMatrix.needsUpdate = true; }, show: () => { posts.show(hp); pm.setMatrixAt(pi, sm); pm.instanceMatrix.needsUpdate = true; } });
  }
  posts.done(); plates.forEach(p => { p.instanceMatrix.needsUpdate = true; }); streetSigns();
}
const INSETPARK = 4;
export const STREETS = { ns: ['Harbor', 'Bay', 'Pier', 'Market', 'Cedar', 'Main', 'Union', 'Park', 'Mill', 'Dock', 'Quay', 'Shore'].map(n => n + ' Ave'), ew: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(n => n + ' St') };
/** green street-name blades under the signal heads on one corner pole of every junction (one merged mesh, one atlas texture) */
function streetSigns() {
  const names = [...STREETS.ns, ...STREETS.ew], cw = 256, chh = 64, cols = 4, rows = 6, c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * chh; const g = c.getContext('2d');
  names.forEach((n, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * chh; g.fillStyle = '#1b6a3c'; g.fillRect(x, y, cw, chh); g.strokeStyle = '#f2f2ee'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, cw - 6, chh - 6); g.fillStyle = '#f2f2ee'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n.toUpperCase(), x + cw / 2, y + chh / 2 + 2); });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; const P = [], U = [];
  const quadAt = (idx, cx, cy, cz, ax, az) => { // plate 1.5 x .38 centred on (cx, cy, cz), running along (ax, az)
    const col = idx % cols, row = Math.floor(idx / cols), u0 = col / cols, u1 = (col + 1) / cols, v1 = 1 - row / rows, v0 = 1 - (row + 1) / rows, hw = .75, hh = .19;
    const p = [[cx - ax * hw, cy - hh, cz - az * hw], [cx + ax * hw, cy - hh, cz + az * hw], [cx + ax * hw, cy + hh, cz + az * hw], [cx - ax * hw, cy + hh, cz - az * hw]], uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    for (const k of [0, 1, 2, 0, 2, 3]) { P.push(...p[k]); U.push(...uv[k]); }
  };
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) { const x = rc(a) + RD / 2 + .5, z = rc(b) + RD / 2 + .5; quadAt(a, x - .85, 3.55, z + .14, 1, 0); quadAt(12 + b, x + .14, 3.1, z - .85, 0, 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(U), 2)); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })));
}
let lastKey = '';
const c3 = new THREE.Color();
/** Update traffic-light colours (cheap: only when a phase changes). */
export function updateTrafficLights(t) {
  if (!tl.lamps) return;
  let changed = false;
  for (const e of tl.nodes) {
    const ph = lightPhase(e.a, e.b, t), key = ph.x + ph.z;
    if (key === e.last) continue; e.last = key; changed = true;
    ['x', 'z'].forEach(ax => { const cols = LC[ph[ax]]; e[ax].forEach((li, n) => { c3.setHex(cols[n % 3]); tl.lamps.setColorAt(li, c3); }); });
  }
  if (changed) tl.lamps.instanceColor.needsUpdate = true;
}
/** night 0..1: street lamps glow, light pools appear */
export function setNightProps(n) { lightMats.bulb.color.setRGB(.6 + .4 * n, .6 + .35 * n, .55 + .1 * n); if (n > .05) lightMats.bulb.color.lerp(new THREE.Color(0xffe2a0), n); poolMat.opacity = Math.min(.8, n * .9); }

/** Hide instanced prop chunks that are far from the player (they are cheap to keep but add up over a big map). */
export function cullProps(px, pz, range) { for (const c of allChunks) { const v = Math.abs(c.cx - px) < range + c.size / 2 && Math.abs(c.cz - pz) < range + c.size / 2; if (c.m.visible !== v) c.m.visible = v; } }
