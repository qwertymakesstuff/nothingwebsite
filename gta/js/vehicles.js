// Cars: meshes, driving physics, damage and explosions, car-to-car collisions. AI lives in traffic.js (civilians) and police.js (cops).
import { scene } from './render.js';
import { pushOut } from './city.js';
import { G, addHeat, bump } from './state.js';
import { clamp, pick } from './util.js';
import { sfx } from './audio.js';
import { fireball, smoke } from './effects.js';
import { player, leaveCar, hurtPlayer } from './player.js';
import { peds, killPed } from './people.js';
import { updateTraffic } from './traffic.js';
import { updateCop } from './police.js';

export const CAR_COLORS = [0xb83a3a, 0x3a6ab8, 0xd8d8d8, 0x2a2a2e, 0xc8a23a, 0x3a9a5a, 0x8a4ab8, 0xe07a30];
const wheelGeo = new THREE.CylinderGeometry(.42, .42, .3, 10), wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x1b2a38 }), copCab = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
const bodyGeo = new THREE.BoxGeometry(2, .75, 4.4), cabGeo = new THREE.BoxGeometry(1.8, .7, 2.1);
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), tailMat = new THREE.MeshBasicMaterial({ color: 0xaa1111 }), lampGeo = new THREE.BoxGeometry(.4, .2, .1);

function carMesh(color, kind) {
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, mat); body.position.y = .75; g.add(body);
  const cab = new THREE.Mesh(cabGeo, kind === 'cop' ? copCab : glassMat); cab.position.set(0, 1.4, -.2); g.add(cab);
  [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].forEach(([x, z]) => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(x * .95, .42, z); g.add(w); });
  [-.7, .7].forEach(x => { const h = new THREE.Mesh(lampGeo, headMat); h.position.set(x, .85, 2.22); const t = new THREE.Mesh(lampGeo, tailMat); t.position.set(x, .85, -2.22); g.add(h, t); });
  g.userData.mat = mat;
  if (kind === 'cop') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, .3, 4.42), new THREE.MeshLambertMaterial({ color: 0x1b3a8a })); stripe.position.y = .78; g.add(stripe);
    const a = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), new THREE.MeshBasicMaterial({ color: 0xff2222 })), b = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    a.position.set(-.4, 1.85, -.2); b.position.set(.4, 1.85, -.2); g.add(a, b); g.userData.lights = [a, b];
  }
  scene.add(g); return g;
}
export const cars = [];
// kind: 'parked' (empty civilian car) | 'owned' (a car the player has taken) | 'traffic' | 'cop'
export function makeCar(x, z, yaw, kind, color) {
  const c = { kind, x, z, yaw, speed: 0, hp: kind === 'cop' ? 90 : 100, vx: 0, vz: 0, spin: 0, driver: null, mesh: carMesh(color == null ? pick(CAR_COLORS) : color, kind), wreck: false, ai: null, cop: null, honk: 0, despawn: 0, stuck: 0, hitCd: 0, burn: 0 };
  c.mesh.position.set(x, 0, z); c.mesh.rotation.y = yaw; cars.push(c); return c;
}
export function removeCar(c) { scene.remove(c.mesh); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }
export const liveCars = () => cars.filter(c => !c.wreck);

/** Arcade physics for a driven car (player or cop): throttle -1..1, steer -1..1 (right positive), brake bool. */
export function driveCar(c, thr, steer, brake, dt) {
  const maxF = c.kind === 'cop' ? 34 + G.stars * 1.5 : 38, maxR = 10;
  if (thr > 0 && c.speed < maxF) c.speed += thr * (c.speed < 0 ? 40 : 19 - c.speed * .25) * dt;
  else if (thr < 0 && c.speed > -maxR) c.speed += thr * (c.speed > 0 ? 36 : 12) * dt;
  else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 38 * dt);
  const grip = clamp(Math.abs(c.speed) / 7, 0, 1) * (c.speed < 0 ? -1 : 1);
  c.yaw -= steer * grip * (brake ? 2.6 : 1.7) / (1 + Math.abs(c.speed) * .035) * dt;
  moveCarBy(c, Math.sin(c.yaw) * c.speed * dt, Math.cos(c.yaw) * c.speed * dt, true);
}
export function moveCarBy(c, dx, dz, bounce) {
  for (const o of [[1.3, 1.2], [-1.3, 1.2]]) { // two circles along the body
    const px = c.x + dx + Math.sin(c.yaw) * o[0], pz = c.z + dz + Math.cos(c.yaw) * o[0];
    const r = pushOut(px, pz, o[1]);
    if (r[2]) {
      dx += r[0] - px; dz += r[1] - pz;
      const imp = Math.abs(c.speed);
      if (bounce && imp > 3 && c.hitCd <= 0) { c.hitCd = .3; hurtCar(c, Math.max(0, imp - 7) * 1.5); sfx.crash(imp / 40); c.speed *= -.25; if (c === player.car) G.shake = clamp(imp / 20, 0, 1); }
      else if (bounce) c.speed *= .8;
    }
  }
  c.x += dx; c.z += dz;
}
export function hurtCar(c, d) { if (c.wreck || !(d > 0)) return; c.hp -= d; if (c.hp <= 0) explodeCar(c); }
export function explodeCar(c) {
  c.wreck = true; c.hp = 0; c.speed = 0; c.vx = c.vz = 0; c.burn = 20; sfx.boom();
  c.mesh.userData.mat.color.setHex(0x161616); fireball(c.x, c.z);
  peds.forEach(p => { if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < 7) killPed(p, 'explosion'); });
  cars.forEach(o => { if (o !== c && !o.wreck && Math.hypot(o.x - c.x, o.z - c.z) < 7) hurtCar(o, 45); });
  if (player.car === c) { leaveCar(true); hurtPlayer(28); }
  else if (!player.car && Math.hypot(player.x - c.x, player.z - c.z) < 6) hurtPlayer(35);
  if (c.kind === 'cop') { addHeat(30); bump('copsKilled'); }
  c.ai = null; c.cop = null; c.driver = null;
  if (c.mesh.userData.lights) c.mesh.userData.lights.forEach(l => { l.visible = false; });
}

/** Push two cars apart and trade some speed / damage. Returns true when they overlap. */
export function carVsCar(a, b) {
  let hit = false;
  for (const oa of [1.3, -1.3]) for (const ob of [1.3, -1.3]) {
    const ax = a.x + Math.sin(a.yaw) * oa, az = a.z + Math.cos(a.yaw) * oa, bx = b.x + Math.sin(b.yaw) * ob, bz = b.z + Math.cos(b.yaw) * ob;
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), m = 2.3;
    if (d < m && d > .001) { hit = true; const pen = (m - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen; }
  }
  if (hit && a.hitCd <= 0 && b.hitCd <= 0) {
    const rel = Math.abs(a.speed) + Math.abs(b.speed) * (b.ai || b.kind === 'parked' ? 0 : .7);
    a.hitCd = b.hitCd = .35;
    if (rel > 4) { sfx.crash(rel / 40); hurtCar(a, Math.max(0, rel - 6) * 1.1); hurtCar(b, Math.max(0, rel - 6) * 1.1); }
    const t = a.speed; a.speed = a.speed * -.15 + b.speed * .1; b.speed = b.speed * .5 + t * .35;
  }
  return hit;
}

export function updateCars(dt) {
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i]; c.hitCd -= dt;
    if (c.wreck) { c.burn -= dt; if (c.burn < -20 && Math.hypot(c.x - player.x, c.z - player.z) > 60) { removeCar(c); continue; } }
    else if (c.driver === 'player') { /* the player's update drives it */ }
    else if (c.ai) updateTraffic(c, dt);
    else if (c.cop) updateCop(c, dt);
    if (c.driver !== 'player' && (c.vx || c.vz)) { // knocked about by a crash
      moveCarBy(c, c.vx * dt, c.vz * dt, false); c.yaw += c.spin * dt; const f = Math.exp(-1.8 * dt); c.vx *= f; c.vz *= f; c.spin *= f;
      if (Math.hypot(c.vx, c.vz) < .3) c.vx = c.vz = c.spin = 0;
    } else if (c.driver !== 'player' && !c.ai && !c.cop && Math.abs(c.speed) > .2) driveCar(c, 0, 0, true, dt);
    if (c.wreck && c.burn > 0 && Math.random() < dt * 3) smoke(c.x + (Math.random() - .5) * 1.6, c.z + (Math.random() - .5) * 1.6);
  }
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j]; if (Math.abs(a.x - b.x) > 5.5 || Math.abs(a.z - b.z) > 5.5) continue;
    const mover = b.driver === 'player' ? b : a, other = mover === a ? b : a;
    const rel = Math.abs(mover.speed) + Math.hypot(other.vx || 0, other.vz || 0);
    if (!carVsCar(mover, other)) continue;
    if (mover.driver === 'player' && rel > 8 && other.kind === 'traffic' && other.hitCd > .2) addHeat(10);
    if (other.driver !== 'player' && rel > 5 && !(other.cop && G.stars)) {
      const dx = other.x - mover.x, dz = other.z - mover.z, d = Math.hypot(dx, dz) || 1;
      other.vx += dx / d * rel * .45; other.vz += dz / d * rel * .45; other.spin = (Math.random() - .5) * 3;
      if (other.ai) { other.ai = null; other.driver = null; other.honk = 1; }
    }
  }
  const px = player.x, pz = player.z;
  cars.forEach(c => {
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw;
    c.mesh.visible = Math.abs(c.x - px) < 160 && Math.abs(c.z - pz) < 160; // far cars are hidden (the fog hides them anyway)
    const l = c.mesh.userData.lights; if (l && !c.wreck) { const on = (G.stars || c.driver === 'cop') && Math.sin(G.time * 14) > 0; l[0].visible = !!on; l[1].visible = !on && !!(G.stars || c.driver === 'cop'); }
  });
}
