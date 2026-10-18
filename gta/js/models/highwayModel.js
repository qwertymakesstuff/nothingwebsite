// The highway: ramps and deck as one merged mesh, with pillars, guard rails, lane markings, and road-closed barriers at the ground-level ramp mouths.
import { scene } from '../render.js';
import { N, RD, WORLD, rc } from '../layout.js';
import { HW, HW_Z, HW_H, HW_HALF, deckHeight } from '../highway.js';
import { part, merge, BOX, CYL } from './mesh.js';
import { vcStandard } from './materials.js';
import { glowTexture } from './materials.js';
import { addCircle } from '../city.js';
import { signMat } from './kit.js';

const DECK_T = .7;
export function buildHighway() {
  const P = [], STEP = 4, half = HW_HALF - .2;
  // road surface in short sloped slices so the ramps are real ramps
  for (let x = HW.w0; x < HW.e1; x += STEP) {
    const x1 = Math.min(HW.e1, x + STEP), h0 = deckHeight(x), h1 = deckHeight(x1), len = x1 - x, slope = Math.atan2(h1 - h0, len), mid = (h0 + h1) / 2;
    P.push(part(BOX, 0x35363a, { sx: len / Math.cos(slope) + .05, sy: DECK_T, sz: 2 * HW_HALF, x: x + len / 2, y: mid - DECK_T / 2, z: HW_Z, rz: slope }));
    for (const s of [-1, 1]) { // concrete barriers along both edges
      P.push(part(BOX, 0xa8a8a2, { sx: len / Math.cos(slope) + .05, sy: 1.0, sz: .45, x: x + len / 2, y: mid + .5, z: HW_Z + s * (HW_HALF - .25), rz: slope }));
      P.push(part(BOX, 0x7a7a76, { sx: len / Math.cos(slope) + .05, sy: .5, sz: .6, x: x + len / 2, y: mid - DECK_T - .1, z: HW_Z + s * (HW_HALF - .3), rz: slope }));
    }
    if (Math.floor(x / STEP) % 3 === 0) P.push(part(BOX, 0xe0d070, { sx: 2.4, sy: .04, sz: .25, x: x + len / 2, y: mid + .03, z: HW_Z, rz: slope })); // dashed centre line
    P.push(part(BOX, 0xe8e8e4, { sx: len / Math.cos(slope), sy: .04, sz: .18, x: x + len / 2, y: mid + .03, z: HW_Z - half + .6, rz: slope }), part(BOX, 0xe8e8e4, { sx: len / Math.cos(slope), sy: .04, sz: .18, x: x + len / 2, y: mid + .03, z: HW_Z + half - .6, rz: slope }));
  }
  // pillars on the pavement just outside the deck, every 18 m, only where the deck is above ground
  const pillars = [];
  for (let x = HW.w1; x <= HW.e0; x += 18) for (const s of [-1, 1]) { const z = HW_Z + s * (HW_HALF + .9); P.push(part(BOX, 0x8a8a86, { sx: 1.3, sy: HW_H - DECK_T, sz: 1.3, x, y: (HW_H - DECK_T) / 2, z })); P.push(part(BOX, 0x7a7a76, { sx: 2.2, sy: .6, sz: 2.4, x, y: HW_H - DECK_T - .3, z })); pillars.push([x, z]); }
  // the deck also rests on the median of every intersection it crosses (a single stout pier in the middle of the cross street)
  for (let a = 1; a < N; a++) { /* no pier in the junction: traffic must pass underneath */ }
  const mesh = new THREE.Mesh(merge(P), vcStandard); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  pillars.forEach(([x, z]) => addCircle(x, z, .9));
  // street lights along the deck, "road closed" barriers where the ground road ends under each ramp
  const L = [];
  for (let x = HW.w1 + 10; x < HW.e0; x += 40) for (const s of [-1, 1]) { L.push(part(CYL(.08, .1, 6, 5), 0x3a3d42, { x, y: HW_H + 3, z: HW_Z + s * (HW_HALF - .4) })); L.push(part(BOX, 0xffe9b0, { sx: .5, sy: .12, sz: .5, x, y: HW_H + 6, z: HW_Z + s * (HW_HALF - .4) })); }
  const lamps = new THREE.Mesh(merge(L), new THREE.MeshLambertMaterial({ vertexColors: true })); lamps.frustumCulled = false; scene.add(lamps);
  const barrier = [];
  for (const x of [HW.w1 + .2, HW.e0 - .2]) for (let k = -3; k <= 3; k++) { barrier.push(part(BOX, k % 2 ? 0xf4f4f0 : 0xe05020, { sx: .35, sy: 1, sz: 1.8, x, y: .5, z: HW_Z + k * 1.9 })); }
  const bm = new THREE.Mesh(merge(barrier), new THREE.MeshLambertMaterial({ vertexColors: true })); scene.add(bm);
  for (const [x, dir] of [[HW.w1 + .2, 1], [HW.e0 - .2, -1]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), signMat('ROAD CLOSED', '#c04020', '#ffffff')); s.position.set(x + dir * .3, 2.4, HW_Z); s.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(s); }
  // arrival signs at the two foot intersections
  for (const [x, dir] of [[HW.w0 - 1, 1], [HW.e1 + 1, -1]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.2), signMat('HIGHWAY', '#1f5a3a', '#ffffff')); s.position.set(x, 5, HW_Z - HW_HALF + 1); s.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(s); }
  return mesh;
}
