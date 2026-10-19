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
  constructor(parts) { this.parts = parts; this.n = 0; this.chunks = new Map(); }
  place(x, z, yaw, s, y) {
    q.setFromAxisAngle(up, yaw || 0); sc.set(s || 1, s || 1, s || 1); pos.set(x, y || 0, z); mat4.compose(pos, q, sc);
    const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK); let c = this.chunks.get(key);
    if (!c) { c = { cx: (Math.floor(x / CHUNK) + .5) * CHUNK, cz: (Math.floor(z / CHUNK) + .5) * CHUNK, m: [] }; this.chunks.set(key, c); }
    const e = mat4.elements.slice(); e[12] -= c.cx; e[14] -= c.cz; c.m.push(e); this.n++;
    return { key, i: c.m.length - 1 };
  }
  /** switch one placed instance off / back on (physics props swap it for a loose mesh while knocked over) */
  hide(h) { const c = this.chunks.get(h.key); if (!c || !c.meshes) return; for (const m of c.meshes) { m.setMatrixAt(h.i, ZERO); m.instanceMatrix.needsUpdate = true; } }
  show(h) { const c = this.chunks.get(h.key); if (!c || !c.meshes) return; tmp4.fromArray(c.m[h.i]); for (const m of c.meshes) { m.setMatrixAt(h.i, tmp4); m.instanceMatrix.needsUpdate = true; } }
  done() {
    this.meshes = [];
    for (const c of this.chunks.values()) { c.meshes = []; for (const p of this.parts) {
      const g = p.geo.clone(); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), CHUNK * .78);
      const m = new THREE.InstancedMesh(g, p.mat, c.m.length); m.position.set(c.cx, 0, c.cz); m.castShadow = p.shadow !== false;
      const tmp = new THREE.Matrix4(); c.m.forEach((e, i) => { tmp.fromArray(e); m.setMatrixAt(i, tmp); }); m.instanceMatrix.needsUpdate = true; scene.add(m); this.meshes.push(m); c.meshes.push(m); allChunks.push({ m, cx: c.cx, cz: c.cz });
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
const SIGNPLATE = (m) => ({ geo: PLATE, mat: m, shadow: false });
export function buildProps() {
  const R = rng(99), pad = 0.7;
  defineModel('lamp', [{ geo: G.pole, mat: vcLambert }, { geo: G.bulb, mat: lightMats.bulb, shadow: false }]);
  defineModel('hydrant', [{ geo: G.hydrant, mat: vcLambert }]); defineModel('trash', [{ geo: G.trash, mat: vcLambert }]); defineModel('meter', [{ geo: G.meter, mat: vcLambert }]);
  defineModel('bench', [{ geo: G.bench, mat: vcLambert }]); defineModel('dumpster', [{ geo: G.dumpster, mat: vcLambert }]); defineModel('tree', [{ geo: G.tree, mat: vcLambert }]);
  defineModel('tlpole', [{ geo: G.tlPole, mat: vcLambert }]); defineModel('cone', [{ geo: CONE, mat: vcLambert }]); defineModel('kiosk', [{ geo: KIOSK, mat: vcLambert }]);
  const lights = new Prop([{ geo: G.pole, mat: vcLambert }, { geo: G.bulb, mat: lightMats.bulb, shadow: false }], 520);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat, 560); pools.count = 0; pools.frustumCulled = false; scene.add(pools); let pn = 0;
  const hyd = new Prop([{ geo: G.hydrant, mat: vcLambert }], 200), trash = new Prop([{ geo: G.trash, mat: vcLambert }], 260), meters = new Prop([{ geo: G.meter, mat: vcLambert }], 420), bench = new Prop([{ geo: G.bench, mat: vcLambert }], 200), dump = new Prop([{ geo: G.dumpster, mat: vcLambert }], 80), trees = new Prop([{ geo: G.tree, mat: vcLambert }], 1400), pines = new Prop([{ geo: G.pine, mat: vcLambert }], 400);
  /** place an instance, give it a collision circle and (when `type` is given) make it a physics prop */
  const place = (prop, x, z, yaw, r, s, type, extra) => {
    const h = prop.place(x, z, yaw, s), c = r ? addCircle(x, z, r) : null;
    if (type && c) { const o = register(type, x, z, yaw, s || 1, { circle: c, model: extra && extra.model, hide: () => { prop.hide(h); extra && extra.hide && extra.hide(); }, show: () => { prop.show(h); extra && extra.show && extra.show(); } }); return o; }
    return null;
  };
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
    if (!park && !plaza && !industrial && (dist === 'residential' || ch === 'o')) for (let k = 0; k < 3; k++) { const ts = .8 + R() * .4; place(trees, bx + 6 + k * 14 + R() * 3, bz + pad + 1.0, 0, .45, ts, ts < .98 ? 'sapling' : null, { model: 'tree' }); }
    if (park) for (let k = 0; k < (ch === 'w' ? 5 : 16); k++) { const x = bx + INSETPARK + R() * (B - 2 * INSETPARK), z = bz + INSETPARK + R() * (B - 2 * INSETPARK); R() < .35 ? place(pines, x, z, R() * 6, .5, .9 + R() * .5) : place(trees, x, z, R() * 6, .55, .9 + R() * .5); }
  }
  // traffic cones: lines at the kerb for roadworks, and around construction sites
  const cones = new Prop([{ geo: CONE, mat: vcLambert }], 120), fences = new Prop([{ geo: FENCE, mat: vcLambert }], 120), kiosks = new Prop([{ geo: KIOSK, mat: vcLambert }], 30);
  const RW = rng(4242);
  for (let k = 0; k < 7; k++) { const i = Math.floor(RW() * N), j = Math.floor(RW() * N), t = blockType(i, j); if (!t || t.district === 'outskirts' || t.district === 'port') continue; const bx = blockX(i), bz = blockZ(j); for (let m = 0; m < 5; m++) place(cones, bx + 12 + m * 1.9, bz - 1.5, 0, .26, 1, 'cone'); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (blockChar(i, j) === 'c') for (let m = 0; m < 7; m++) { place(cones, blockX(i) + 8 + m * 3.4, blockZ(j) - 1.2, 0, .26, 1, 'cone'); place(cones, blockX(i) - 1.2, blockZ(j) + 8 + m * 3.4, 0, .26, 1, 'cone'); }
  for (const f of fenceSegs) { const c = [-1.3, 0, 1.3].map(o => addCircle(f.x + Math.cos(f.yaw) * o, f.z - Math.sin(f.yaw) * o, .3)), h = fences.place(f.x, f.z, f.yaw, 1); register('fence', f.x, f.z, f.yaw, 1, { circles: c, hide: () => fences.hide(h), show: () => fences.show(h) }); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j), d = t && t.district; if ((d === 'downtown' || d === 'commercial') && !t.open && (i * 7 + j * 3) % 4 === 0) place(kiosks, blockX(i) + B - 11, blockZ(j) + B - pad - 1.3, 0, .9, 1, 'kiosk'); }
  [cones, fences, kiosks].forEach(p => p.done());
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
  posts.done(); plates.forEach(p => { p.instanceMatrix.needsUpdate = true; });
}
const INSETPARK = 4;
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
export function cullProps(px, pz, range) { for (const c of allChunks) { const v = Math.abs(c.cx - px) < range + CHUNK / 2 && Math.abs(c.cz - pz) < range + CHUNK / 2; if (c.m.visible !== v) c.m.visible = v; } }
