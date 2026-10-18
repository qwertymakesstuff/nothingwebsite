// Enterable shop interiors: small open-top rooms far outside the city, built on first visit. Each has a counter with something to buy.
import { scene } from '../render.js';
import { rng, pick } from '../util.js';
import { part, merge, BOX, CYL, SPH } from './mesh.js';
import { vcLambert, lampMat } from './materials.js';
import { createCharacter, civilianSpec } from './characters.js';
import { signMat } from './buildings.js';

export const ROOM_W = 16, ROOM_D = 12;                       // metres inside
export const KINDS = {
  mart:    { label: '24H MART', item: 'health kit', price: 30,  floorA: 0xe8e6de, floorB: 0xbfc4c8, wall: 0xdfe6e0 },
  fashion: { label: 'FASHION',  item: 'new jacket', price: 120, floorA: 0x6a5a52, floorB: 0x5a4a44, wall: 0xd8c8d8 },
  diner:   { label: 'DINER',    item: 'burger',     price: 15,  floorA: 0xe8e0d0, floorB: 0x8a2a2a, wall: 0xe8d8b8 }
};
const rooms = {};
let slot = 0;
export const interiorLight = new THREE.PointLight(0xffe6c0, 0, 40, 1.4);
scene.add(interiorLight);

function shelf(x, z, len, colors, R, rot) {
  const p = [part(BOX, 0x8a8f96, { sx: len, sy: 1.9, sz: .55, y: .95 })];
  for (let lv = 0; lv < 4; lv++) for (let k = 0; k < len * 3; k++) p.push(part(BOX, pick(colors), { sx: .26, sy: .26, sz: .4, x: -len / 2 + .2 + k * .33, y: .42 + lv * .45, z: R() < .5 ? .08 : -.08 }));
  const g = merge(p); if (rot) g.rotateY(rot); g.translate(x, 0, z); return g;
}
function build(kind) {
  const K = KINDS[kind], i = slot++, cx = 1200 + i * 60, cz = 1200, R = rng(500 + i), W = ROOM_W, D = ROOM_D, parts = [], solids = [];
  const add = g => parts.push(g), solid = (x0, z0, x1, z1) => solids.push({ x0: cx + x0, z0: cz + z0, x1: cx + x1, z1: cz + z1 });
  // floor tiles
  for (let a = 0; a < W; a += 2) for (let b = 0; b < D; b += 2) add(part(BOX, ((a + b) / 2) % 2 ? K.floorA : K.floorB, { sx: 2, sy: .06, sz: 2, x: cx - W / 2 + a + 1, y: .03, z: cz - D / 2 + b + 1 }));
  // walls (low enough to look into from above) with baseboard; south wall has the door gap
  const wallH = 3.2, wc = K.wall, t = .3;
  add(part(BOX, wc, { sx: W + t * 2, sy: wallH, sz: t, x: cx, y: wallH / 2, z: cz - D / 2 - t / 2 })); add(part(BOX, wc, { sx: t, sy: wallH, sz: D, x: cx - W / 2 - t / 2, y: wallH / 2, z: cz })); add(part(BOX, wc, { sx: t, sy: wallH, sz: D, x: cx + W / 2 + t / 2, y: wallH / 2, z: cz }));
  add(part(BOX, wc, { sx: W / 2 - 1.2 + t, sy: wallH, sz: t, x: cx - (W / 2 + 1.2) / 2 - t / 2, y: wallH / 2, z: cz + D / 2 + t / 2 })); add(part(BOX, wc, { sx: W / 2 - 1.2 + t, sy: wallH, sz: t, x: cx + (W / 2 + 1.2) / 2 + t / 2, y: wallH / 2, z: cz + D / 2 + t / 2 }));
  add(part(BOX, 0x3a3f46, { sx: W, sy: .25, sz: .1, x: cx, y: .15, z: cz - D / 2 + .06 }));
  // door frame and welcome mat
  add(part(BOX, 0x2a2e34, { sx: 2.6, sy: .25, sz: .35, x: cx, y: 2.9, z: cz + D / 2 + .15 })); add(part(BOX, 0x7a2a2a, { sx: 2.2, sy: .03, sz: 1.2, x: cx, y: .08, z: cz + D / 2 - .8 }));
  const colors = [0xd8453a, 0x3a7ad8, 0xe0c43a, 0x3aa85a, 0xe8e8e8, 0xd87a2a, 0x8a4ab8];
  // counter with register (right side near the door), service area behind it
  const counter = (x, z, len) => { add(part(BOX, 0x7a5a3a, { sx: len, sy: 1.0, sz: 1.0, x: cx + x, y: .5, z: cz + z })); add(part(BOX, 0xd8d8d0, { sx: len + .1, sy: .08, sz: 1.1, x: cx + x, y: 1.04, z: cz + z })); add(part(BOX, 0x25282c, { sx: .5, sy: .35, sz: .4, x: cx + x - len / 2 + 1, y: 1.3, z: cz + z })); solid(x - len / 2, z - .55, x + len / 2, z + .55); };
  const clerkSpot = [], buySpot = [];
  if (kind === 'mart') {
    counter(4.2, -2.5, 4);  clerkSpot.push(4.2, -3.6); buySpot.push(4.2, -1.2);
    for (let r = 0; r < 3; r++) { add(shelf(cx - 4.5 + r * 0, cz - 3 + r * 2.4 - 0.2, 5, colors, R)); solid(-7, -3.3 + r * 2.4, -2, -2.7 + r * 2.4); }
    for (let r = 0; r < 3; r++) { add(part(BOX, 0xf4f8fa, { sx: 1.1, sy: 2.1, sz: .8, x: cx - W / 2 + 1 + r * 1.2, y: 1.05, z: cz + 4 })); add(part(BOX, 0x7ab8e0, { sx: .9, sy: 1.7, sz: .05, x: cx - W / 2 + 1 + r * 1.2, y: 1.1, z: cz + 3.57 })); }
    solid(-7.8, 3.5, -4, 4.5);
    for (let k = 0; k < 4; k++) add(part(BOX, colors[k], { sx: .5, sy: .5, sz: .5, x: cx + 6 + (k % 2) * .6, y: .25 + Math.floor(k / 2) * .5, z: cz + 1.5 }));
  } else if (kind === 'fashion') {
    counter(4.2, -2.5, 3.6); clerkSpot.push(4.2, -3.6); buySpot.push(4.2, -1.2);
    for (let r = 0; r < 3; r++) { const z = -3 + r * 2.6; add(part(BOX, 0x8a8f96, { sx: .06, sy: .06, sz: 4.4, x: cx - 5 + 0, y: 1.5, z: cz + z - 0 }).rotateY(0)); }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) add(part(BOX, pick(colors), { sx: .5, sy: .8, sz: .12, x: cx - 6 + r * 2.6, y: 1.1, z: cz - 3.8 + k * .5 }));
    for (let r = 0; r < 3; r++) add(part(BOX, 0x8a8f96, { sx: .06, sy: 1.6, sz: 4.2, x: cx - 6 + r * 2.6, y: .8, z: cz - 1.8 }));
    solid(-6.4, -4, -.9, .4);
    add(part(BOX, 0x9ac8e0, { sx: .1, sy: 2.4, sz: 1.6, x: cx - W / 2 + .1, y: 1.4, z: cz + 3 })); add(part(BOX, 0x4a3a52, { sx: 2.2, sy: 2.6, sz: 1.8, x: cx - 5.6, y: 1.3, z: cz + 4.4 })); solid(-6.7, 3.5, -4.5, 5.3);
  } else {
    counter(0, -4.3, 9);  clerkSpot.push(1.5, -5.2); buySpot.push(1.5, -2.9);
    for (let s = 0; s < 5; s++) add(part(CYL(.26, .26, .7, 8), 0xb02a2a, { x: cx - 3 + s * 1.6, y: .4, z: cz - 3 })), add(part(CYL(.06, .06, .4, 5), 0x888888, { x: cx - 3 + s * 1.6, y: .2, z: cz - 3 }));
    for (let b = 0; b < 3; b++) { const bx = -4.5 + b * 4.2; add(part(BOX, 0xb02a2a, { sx: 2.6, sy: .5, sz: 1.0, x: cx + bx, y: .45, z: cz + 3.4 })); add(part(BOX, 0xb02a2a, { sx: 2.6, sy: 1.1, sz: .2, x: cx + bx, y: .9, z: cz + 3.95 })); add(part(BOX, 0xe0d8c8, { sx: 1.4, sy: .08, sz: 1.0, x: cx + bx, y: .85, z: cz + 2.3 })); add(part(BOX, 0xb02a2a, { sx: 2.6, sy: .5, sz: 1.0, x: cx + bx, y: .45, z: cz + 1.2 })); solid(bx - 1.3, 1.0, bx + 1.3, 4.0); }
    add(part(BOX, 0x2a2a50, { sx: 1.2, sy: 2.0, sz: .7, x: cx + 6.6, y: 1.0, z: cz - 1 })); add(part(BOX, 0xffd070, { sx: .9, sy: .5, sz: .05, x: cx + 6.6, y: 1.5, z: cz - .62 })); solid(6, -1.4, 7.2, -.6);
  }
  // big window panes on the back wall and ceiling light strips (emissive)
  for (let k = 0; k < 3; k++) add(part(BOX, 0xbfe6ff, { sx: 3, sy: 1.4, sz: .05, x: cx - 5 + k * 5, y: 1.9, z: cz - D / 2 + .02 }));
  const lights = merge([-1, 1].map(s => part(BOX, 0xfff4d6, { sx: 5, sy: .08, sz: .5, x: cx + s * 4, y: 3.1, z: cz }))); // always-on strips above (seen from the cut-away camera)
  const body = new THREE.Mesh(merge(parts), vcLambert); body.receiveShadow = true; body.castShadow = true;
  const g = new THREE.Group(); g.add(body, new THREE.Mesh(lights, lampMat)); g.visible = false; scene.add(g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), signMat(K.label, '#101010', '#ffd070')); sign.position.set(cx, 2.4, cz - D / 2 + .1); g.add(sign);
  const clerk = createCharacter(civilianSpec({ top: kind === 'diner' ? 0xf0f0f0 : kind === 'mart' ? 0x2f8a4a : 0x2a2a30, hairStyle: kind === 'diner' ? 'cap' : 'short' }));
  clerk.root.position.set(cx + clerkSpot[0], 0, cz + clerkSpot[1]); clerk.root.rotation.y = 0; g.add(clerk.root);
  return { kind, K, cx, cz, group: g, solids, clerk, buy: [cx + buySpot[0], cz + buySpot[1]], exit: [cx, cz + D / 2 - 1.2], start: [cx, cz + D / 2 - 2.6], bounds: [cx - W / 2 + .5, cz - D / 2 + .5, cx + W / 2 - .5, cz + D / 2 - .4] };
}
export function getRoom(kind) { return rooms[kind] || (rooms[kind] = build(kind)); }
export function showRoom(room, on) { room.group.visible = on; interiorLight.intensity = on ? 1.0 : 0; if (on) interiorLight.position.set(room.cx, 5, room.cz); }
/** push a circle out of the walls and furniture of a room. returns [x, z, hit] */
export function roomPush(room, x, z, r) {
  const b = room.bounds; let hit = false;
  if (x < b[0] + r) { x = b[0] + r; hit = true; } if (x > b[2] - r) { x = b[2] - r; hit = true; } if (z < b[1] + r) { z = b[1] + r; hit = true; } if (z > b[3] - r + .4) { z = b[3] - r + .4; hit = true; }
  for (const s of room.solids) {
    const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) { hit = true; if (d2 > 1e-6) { const d = Math.sqrt(d2); x = cx + dx / d * r; z = cz + dz / d * r; } else z = s.z1 + r; }
  }
  return [x, z, hit];
}
