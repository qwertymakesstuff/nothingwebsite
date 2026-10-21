// Procedural car models. Each type is built once from a side profile (extruded across the width) plus merged detail parts, then
// shared by every car of that type. Cars are made of a few meshes: body (per-colour paint), glass, dark trim, lamps, and two wheel pairs.
import { part, merge, xf, quad, BOX, CYL, SPH } from './mesh.js';
import { vcLambert, glassMat, lampMat, paintMat, glowTexture } from './materials.js';

glassMat.side = THREE.DoubleSide;
const TIRE = 0x17171a, RIM = 0xb4b8c0;

function extrudeProfile(pts, width, bevel) {
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const b = bevel || 0;
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.01, width - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * .8, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(width - 2 * b) / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g;
}
const shrink = (pts, kz, ky, belt) => { const cz = pts.reduce((a, p) => a + p[0], 0) / pts.length; return pts.map(p => [cz + (p[0] - cz) * kz, belt + .05 + (p[1] - belt) * ky]); };

// type definitions. z is forward. belt = height of the shoulder line, roof = roof height.
export const CAR_TYPES = {
  sedan:  { L: 4.5, W: 1.85, belt: .98, roof: 1.5,  cab: [.7, .15, -.9, -1.25], hood: .86, trunk: .96, seat: [.42, .62, -.1], weight: 5 },
  hatch:  { L: 3.9, W: 1.75, belt: .95, roof: 1.5,  cab: [.55, .05, -1.2, -1.5], hood: .84, trunk: .95, seat: [.4, .62, -.05], weight: 4 },
  sports: { L: 4.3, W: 1.95, belt: .8,  roof: 1.22, cab: [.45, -.1, -.7, -1.15], hood: .7, trunk: .82, seat: [.45, .5, -.15], weight: 2, spoiler: true },
  suv:    { L: 4.7, W: 1.95, belt: 1.12, roof: 1.78, cab: [.85, .4, -1.85, -2.05], hood: 1.0, trunk: 1.12, seat: [.45, .8, -.05], weight: 3 },
  van:    { L: 5.2, W: 2.0,  belt: 1.0,  roof: 2.0,  cab: [1.15, .85, -2.55, -2.6], hood: .95, trunk: 1.0, seat: [.47, .8, .6], weight: 2, van: true },
  pickup: { L: 5.3, W: 2.0,  belt: 1.05, roof: 1.72, cab: [.7, .3, -.6, -.8], hood: .98, trunk: .72, seat: [.47, .75, .1], weight: 2, bed: true },
  truck:  { L: 6.8, W: 2.35, belt: 1.15, roof: 2.15, cab: [2.0, 1.75, 1.0, .9], hood: 1.05, trunk: 1.15, seat: [.55, .95, 1.5], weight: 1, box: true },
  cruiser:{ L: 4.7, W: 1.9, belt: .98, roof: 1.5,  cab: [.75, .2, -.95, -1.3], hood: .86, trunk: .96, seat: [.43, .62, -.1], weight: 0, police: true }
};
Object.values(CAR_TYPES).forEach(t => { t.cr = t.W / 2 + .2; t.cl = t.L / 2 - t.cr; });
export const SPAWN_TYPES = Object.keys(CAR_TYPES).filter(k => CAR_TYPES[k].weight > 0);
export function pickCarType() { const bag = []; SPAWN_TYPES.forEach(k => { for (let i = 0; i < CAR_TYPES[k].weight; i++) bag.push(k); }); return bag[Math.floor(Math.random() * bag.length)]; }
export const CAR_COLORS = [0xb8322f, 0x2f5fb8, 0xd9dadc, 0x2a2b30, 0xd2a52f, 0x2f9a58, 0x8a3fb8, 0xe0702a, 0x9aa0a8, 0x1f6e8a, 0x6a2430];

const cache = {};
function build(type) {
  const T = CAR_TYPES[type], { L, W, belt, roof } = T, hl = L / 2, bodyParts = [], dark = [], lamps = [], glass = [];
  const [z1, z2, z3, z4] = T.cab;
  const lowerTopRear = T.trunk, wheelR = type === 'truck' ? .5 : type === 'suv' || type === 'pickup' || type === 'van' ? .42 : .36;
  const lowY = wheelR + .06;
  // lower body (everything below the shoulder line), seen from the side
  const lower = [[-hl, lowY], [-hl, lowerTopRear - .18], [-hl + .15, lowerTopRear], [z4, T.bed ? .74 : belt], [z1 + (T.van ? 0 : .05), belt], [hl - .3, T.hood], [hl, T.hood - .22], [hl, lowY]];
  if (T.bed) { lower.splice(3, 1, [-.4, .74], [z4 - .05, belt]); }
  if (T.box) { // truck: short cab at the front, chassis behind it
    bodyParts.push(xf(extrudeProfile([[hl - 1.9, lowY], [hl - 1.9, belt], [hl, T.hood], [hl, lowY]], W, .05)));
  } else bodyParts.push(extrudeProfile(lower, W, .05));
  // cabin (greenhouse)
  const cabin = [[z1, belt], [z2, roof], [z3, roof], [z4, belt]];
  const cabW = W * (T.van ? .97 : .86);
  bodyParts.push(extrudeProfile(cabin, cabW, .04));
  // glass: side windows (a shrunken copy of the cabin outline) + windscreen + rear screen
  if (T.van) { glass.push(extrudeProfile(shrink([[z1, belt], [z2, roof], [.15, roof], [.15, belt]], .86, .75, belt), cabW + .03)); }
  else if (T.box) { glass.push(extrudeProfile(shrink(cabin, .78, .72, belt), cabW + .03)); }
  else glass.push(extrudeProfile(shrink(cabin, .86, .74, belt), cabW + .03));
  const ws = (zb, zt, hb, ht, hw) => { const n = [ht - hb, zb - zt]; const l = Math.hypot(n[0], n[1]); const oz = n[0] / l * .015, oy = n[1] / l * .015; const a = .1, b2 = .9; const P = t => [zb + (zt - zb) * t + oz, hb + (ht - hb) * t + oy]; return quad([-hw, P(a)[1], P(a)[0]], [hw, P(a)[1], P(a)[0]], [hw, P(b2)[1], P(b2)[0]], [-hw, P(b2)[1], P(b2)[0]]); };
  glass.push(ws(z1, z2, belt, roof, cabW / 2 * .9));
  if (!T.van && !T.box && !T.bed || T.bed) glass.push(ws(z4, z3, belt, roof, cabW / 2 * .9));
  // bed walls for pickups
  if (T.bed) {
    const bl = -hl + .1, bf = z4 - .05, len = bf - bl;
    [-1, 1].forEach(s => bodyParts.push(xf(BOX, { sx: .09, sy: .36, sz: len, x: s * (W / 2 - .05), y: .74 + .18, z: (bl + bf) / 2 })));
    bodyParts.push(xf(BOX, { sx: W - .1, sy: .36, sz: .09, y: .92, z: bl }), xf(BOX, { sx: W - .1, sy: .36, sz: .09, y: .92, z: bf }));
    dark.push(part(BOX, 0x2a2a2e, { sx: W - .2, sy: .03, sz: len - .1, y: .76, z: (bl + bf) / 2 }));
  }
  // box truck cargo
  if (T.box) dark.push(part(BOX, 0xdcdee2, { sx: W, sy: 2.05, sz: 4.1, y: lowY + 1.1, z: -hl + 2.15 }), part(BOX, 0x8a8e96, { sx: W + .02, sy: .06, sz: 4.12, y: lowY + .1, z: -hl + 2.15 }), part(BOX, 0x2f5fb8, { sx: W + .03, sy: .25, sz: 3.0, y: lowY + 1.2, z: -hl + 2.15 }));
  // underbody, bumpers, grille, skirts, mirrors, exhaust
  dark.push(part(BOX, 0x1a1a1d, { sx: W - .25, sy: .12, sz: L - .4, y: lowY + .04 }));
  dark.push(part(BOX, 0x1c1c20, { sx: W * 1.0, sy: .2, sz: .16, y: lowY + .13, z: hl - .02 }), part(BOX, 0x1c1c20, { sx: W * 1.0, sy: .2, sz: .16, y: lowY + .13, z: -hl + .02 }));
  dark.push(part(BOX, 0x15151a, { sx: W * .6, sy: .16, sz: .06, y: T.hood - .22, z: hl + .01 }));
  [-1, 1].forEach(s => dark.push(part(BOX, 0x1c1c20, { sx: .06, sy: .16, sz: .22, x: s * (cabW / 2 + .12), y: belt + .1, z: z1 - .12 })));
  dark.push(part(BOX, 0x777b82, { sx: .08, sy: .08, sz: .08, x: -W * .3, y: lowY + .02, z: -hl - .02, }));
  // lamps: headlights (pale) and tail lights (red)
  [-1, 1].forEach(s => {
    lamps.push(part(BOX, 0xfff3cf, { sx: .36, sy: .14, sz: .08, x: s * (W / 2 - .3), y: T.hood - .15, z: hl + .005 }));
    lamps.push(part(BOX, 0xc02828, { sx: .34, sy: .13, sz: .08, x: s * (W / 2 - .28), y: lowerTopRear - .22, z: -hl - .005 }));
  });
  if (type === 'sports') lamps.push(part(BOX, 0xc02828, { sx: W - .5, sy: .06, sz: .06, y: lowerTopRear - .15, z: -hl - .01 }));
  if (T.spoiler) { dark.push(part(BOX, 0x1a1a1d, { sx: W - .1, sy: .05, sz: .4, y: lowerTopRear + .4, z: -hl + .25 }), part(BOX, 0x1a1a1d, { sx: .06, sy: .3, sz: .2, x: W / 2 - .3, y: lowerTopRear + .2, z: -hl + .25 }), part(BOX, 0x1a1a1d, { sx: .06, sy: .3, sz: .2, x: -W / 2 + .3, y: lowerTopRear + .2, z: -hl + .25 })); }
  if (T.police) {
    // white doors, light bar, push bar, side stripe
    [-1, 1].forEach(s => { dark.push(part(BOX, 0xf0f0f4, { sx: .03, sy: .42, sz: 1.5, x: s * (W / 2 + .03), y: belt - .3, z: .2 })); dark.push(part(BOX, 0x2a4fb0, { sx: .031, sy: .1, sz: 3.2, x: s * (W / 2 + .035), y: belt - .55, z: -.05 })); });
    dark.push(part(BOX, 0x1a1a1d, { sx: W * .8, sy: .06, sz: .16, y: roof + .06, z: .1 }), part(BOX, 0x15151a, { sx: W * .7, sy: .3, sz: .12, y: lowY + .3, z: hl + .08 }));
  }
  if (T.van || T.box) lamps.push(part(BOX, 0xffe9a8, { sx: .08, sy: .08, sz: .06, x: 0, y: roof + .02 - (T.box ? 2.2 : 0) + (T.box ? 0 : 0), z: z1 - .05 }));
  const wheelAt = (z) => merge([-1, 1].flatMap(s => [
    part(CYL(wheelR, wheelR, .27, 12), TIRE, { rz: Math.PI / 2, x: s * (W / 2 - .06) }),
    part(CYL(wheelR * .62, wheelR * .62, .285, 10), RIM, { rz: Math.PI / 2, x: s * (W / 2 - .05) })
  ]));
  const g = {
    body: merge(bodyParts), glass: merge(glass), dark: merge(dark), lamps: merge(lamps),
    wheelF: wheelAt(), wheelR: wheelAt()
  };
  const axleF = type === 'truck' ? hl - 1.2 : hl - .85, axleR = type === 'truck' ? -hl + 1.2 : -hl + .85;
  return Object.assign({ type, geos: g, wheelR, axleF, axleR, tmpl: T, roofY: roof }, T);
}
export function carTemplate(type) { return cache[type] || (cache[type] = build(type)); }

/* shared little effect materials */
const coneTex = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(10, 128); g.lineTo(22, 128); g.lineTo(32, 0); g.lineTo(0, 0); g.fill(); return new THREE.CanvasTexture(c); })();
export const fxMats = {
  cone: new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
  brake: new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff2a1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }),
  red: new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff2020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }),
  blue: new THREE.SpriteMaterial({ map: glowTexture(), color: 0x3050ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })
};
const coneGeo = new THREE.PlaneGeometry(4.2, 11); coneGeo.rotateX(-Math.PI / 2); coneGeo.translate(0, .06, 6.4);
const barRed = new THREE.MeshBasicMaterial({ color: 0xff2020 }), barBlue = new THREE.MeshBasicMaterial({ color: 0x2a4dff });
const barGeo = new THREE.BoxGeometry(.7, .16, .3);
export const lampTint = lampMat; // exposed so the environment can brighten headlights at night


/* ---- photographic car bodies: ped-style GLB models for the ordinary sedan and the police cruiser ----
 * The procedural car above stays as the fallback (and its wheels, lamps and light-bar flashing keep running). Once a GLB has loaded, a
 * car of that type swaps the paint mesh's geometry for the model's (shared by every car of the type), and the other procedural meshes
 * are given empty geometry so nothing shows through. The model faces -x and is normalised to about 1.9 units long; it is scaled to the
 * type's length and stood on the ground. Sedans are tinted towards their paint colour; the cruiser keeps its own livery. */
const SKIN_FILES = { sedan: 'car_sedan.glb', cruiser: 'car_cruiser.glb' };
const skins = {}, emptyGeo = new THREE.BufferGeometry();
let skinLoading = null;
const scriptTag = src => new Promise((res, rej) => { if (THREE.GLTFLoader) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); });
export function loadCarSkins() {
  if (skinLoading) return skinLoading;
  const base = new URL('../../', import.meta.url).href;
  return (skinLoading = scriptTag(base + 'lib/GLTFLoader.js').then(() => Promise.all(Object.entries(SKIN_FILES).map(([type, file]) => new Promise(res => new THREE.GLTFLoader().load(base + 'models/' + file, g => {
    let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    if (mesh) { const geo = mesh.geometry; geo.computeBoundingBox(); const bb = geo.boundingBox, T = CAR_TYPES[type], k = T.L / (bb.max.x - bb.min.x);
      skins[type] = { geo, map: mesh.material.map, k, ox: -(bb.max.x + bb.min.x) / 2, oz: -(bb.max.z + bb.min.z) / 2, oy: -bb.min.y }; }
    res();
  }, undefined, () => res()))))).catch(e => console.warn('[car models]', e)));
}
export const hasSkin = type => !!skins[type];
/** put the GLB body on a car's model (idempotent) */
export function skinCar(m, type, colorHex) {
  const sk = skins[type]; if (!sk || m.skinned) return false; m.skinned = true;
  const b = m.parts.body, mat = new THREE.MeshLambertMaterial({ map: sk.map });
  if (type === 'sedan' && colorHex != null) mat.color.set(colorHex).lerp(new THREE.Color(0xffffff), .55).multiplyScalar(1.15);   // silver paint, nudged towards the car's own colour
  b.geometry = sk.geo; b.material = mat; b.rotation.y = Math.PI / 2; b.scale.setScalar(sk.k); b.position.set(sk.oz * sk.k, sk.oy * sk.k, -sk.ox * sk.k);
  const p = m.parts; for (const k of ['glass', 'dark', 'lamps', 'wf', 'wr']) p[k].geometry = emptyGeo;
  if (p.bar) { p.bar[0].position.y = p.bar[1].position.y = 1.52; p.bar[0].scale.setScalar(.6); p.bar[1].scale.setScalar(.6); }
  return true;
}

/** Create the scene objects for one car. Returns { group, pivot, parts, ... } - animate with animateCarModel(). */
export function createCarMesh(type, colorHex) {
  const t = carTemplate(type), group = new THREE.Group(), pivot = new THREE.Group(); group.add(pivot);
  const mk = (geo, mat, shadow) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!shadow; pivot.add(m); return m; };
  const body = mk(t.geos.body, paintMat(colorHex), true), glass = mk(t.geos.glass, glassMat), dark = mk(t.geos.dark, vcLambert, true), lamps = mk(t.geos.lamps, lampMat);
  const wf = mk(t.geos.wheelF, vcLambert), wr = mk(t.geos.wheelR, vcLambert); wf.position.set(0, t.wheelR, t.axleF); wr.position.set(0, t.wheelR, t.axleR);
  wf.rotation.order = wr.rotation.order = 'YXZ'; wf.castShadow = wr.castShadow = true;
  const cone = new THREE.Mesh(coneGeo, fxMats.cone); cone.position.z = t.L / 2 - .4; cone.visible = false; group.add(cone);
  const brakes = [-1, 1].map(s => { const sp = new THREE.Sprite(fxMats.brake); sp.scale.set(.9, .9, 1); sp.position.set(s * (t.W / 2 - .3), t.trunk - .1, -t.L / 2 - .1); sp.visible = false; pivot.add(sp); return sp; });
  const parts = { body, glass, dark, lamps, wf, wr, cone, brakes, bar: null, glows: null };
  if (t.police) {
    const r = new THREE.Mesh(barGeo, barRed), b = new THREE.Mesh(barGeo, barBlue);
    r.position.set(-.38, t.roof + .15, .1); b.position.set(.38, t.roof + .15, .1); pivot.add(r, b); parts.bar = [r, b];
    const gr = new THREE.Sprite(fxMats.red), gb = new THREE.Sprite(fxMats.blue); gr.scale.set(3.2, 3.2, 1); gb.scale.set(3.2, 3.2, 1); gr.position.copy(r.position); gb.position.copy(b.position); gr.position.y += .3; gb.position.y += .3; pivot.add(gr, gb); parts.glows = [gr, gb];
  }
  const model = { group, pivot, parts, t, spin: 0, pitch: 0, roll: 0, prevSpeed: 0, colorHex };
  if (skins[type]) skinCar(model, type, colorHex);
  return model;
}
/** Per-frame look of a car: suspension lean, wheel spin and steer, brake lights, police lights, headlight pool. */
export function animateCarModel(m, st, dt) {
  const { parts, t } = m;
  const lean = Math.max(-1, Math.min(1, ((st.speed - m.prevSpeed) / Math.max(dt, .001)) / 25)); m.prevSpeed = st.speed;
  m.pitch += (-lean * .05 - m.pitch) * Math.min(1, dt * 6);
  const turn = (st.steer || 0) * Math.min(1, Math.abs(st.speed) / 18) * (st.speed >= 0 ? 1 : -1);
  m.roll += (turn * .055 - m.roll) * Math.min(1, dt * 6);
  m.pivot.rotation.x = m.pitch; m.pivot.rotation.z = m.roll;
  m.spin += st.speed * dt / t.wheelR;
  parts.wf.rotation.x = parts.wr.rotation.x = m.spin; parts.wf.rotation.y = -(st.steer || 0) * .4;
  const braking = !!st.braking; parts.brakes.forEach(b => { b.visible = braking; });
  if (parts.bar) { const on = !!st.sirens, ph = Math.sin(st.time * 14) > 0; parts.bar[0].visible = on ? ph : true; parts.bar[1].visible = on ? !ph : true; parts.glows[0].visible = on && ph && st.night > .2; parts.glows[1].visible = on && !ph && st.night > .2; }
  parts.cone.visible = st.night > .25 && st.near && !st.wreck; fxMats.cone.opacity = Math.min(.55, st.night * .6);
}
