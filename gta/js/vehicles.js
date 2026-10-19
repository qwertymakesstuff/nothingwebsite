// Cars: meshes, driving physics, damage and explosions, car-to-car collisions. AI lives in traffic.js (civilians) and police.js (cops).
import { scene } from './render.js';
import { env } from './environment.js';
import { createCarMesh, animateCarModel, CAR_TYPES, CAR_COLORS, pickCarType } from './models/vehicles3d.js';
import { createBust } from './models/characters.js';
import { pushOut } from './city.js';
import { G, bump } from './state.js';
import { reportCrime } from './reporting.js';
import { clamp, pick } from './util.js';
import { zoneAt, nextLayer, heightFor, groundBlocked, deckSlope, HW_Z, HW_HALF } from './highway.js';
import { sfx } from './audio.js';
import { fireball, smoke, splash } from './effects.js';
import { player, leaveCar, hurtPlayer } from './player.js';
import { peds, killPed } from './people.js';
import { updateTraffic } from './traffic.js';
import { updateCop } from './police.js';
import { carVsProps } from './physprops.js';

const burntMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .9 });
export const cars = [];
// kind: 'parked' (empty civilian car) | 'owned' (a car the player has taken) | 'traffic' | 'cop'
export function makeCar(x, z, yaw, kind, color, type) {
  type = type || (kind === 'cop' ? 'cruiser' : pickCarType());
  const model = createCarMesh(type, color == null ? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] : color), T = CAR_TYPES[type];
  const c = { kind, type, x, z, yaw, speed: 0, hp: kind === 'cop' ? 90 : 100, vx: 0, vz: 0, spin: 0, driver: null, model, mesh: model.group, cl: T.cl, cr: T.cr, seat: T.seat, wreck: false, ai: null, cop: null, honk: 0, despawn: 0, stuck: 0, hitCd: 0, burn: 0, steer: 0, braking: false, dm: null, lastYaw: yaw, y: 0, layer: 0, pitch: 0, forSale: false };
  c.mesh.rotation.order = 'YXZ'; c.mesh.position.set(x, 0, z); c.mesh.rotation.y = yaw; scene.add(c.mesh); cars.push(c); return c;
}
/** little seated figure behind the wheel of civilian and police cars */
export function showDriver(c, on) {
  if (on && !c.dm) { c.dm = createBust(c.kind === 'cop'); c.dm.position.set(c.seat[0], c.seat[1], c.seat[2]); c.model.pivot.add(c.dm); }
  if (c.dm) c.dm.visible = !!on;
}
/** distance from a point to the car's body (a capsule along its length) */
export function carDist(c, x, z) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), t = Math.max(-c.cl, Math.min(c.cl, (x - c.x) * fx + (z - c.z) * fz));
  return Math.hypot(x - (c.x + fx * t), z - (c.z + fz * t)) - c.cr;
}
export function removeCar(c) { if (player.car === c) return; scene.remove(c.mesh); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }
export const liveCars = () => cars.filter(c => !c.wreck);

/** Arcade physics for a driven car (player or cop): throttle -1..1, steer -1..1 (right positive), brake bool. */
export function driveCar(c, thr, steer, brake, dt) {
  const maxF = c.kind === 'cop' ? 34 + G.stars * 1.5 : 38, maxR = 10;
  if (thr > 0 && c.speed < maxF) c.speed += thr * (c.speed < 0 ? 40 : 19 - c.speed * .25) * dt;
  else if (thr < 0 && c.speed > -maxR) c.speed += thr * (c.speed > 0 ? 36 : 12) * dt;
  else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 38 * dt);
  c.steer += (steer - c.steer) * .35; c.braking = brake || (thr < 0 && c.speed > 1.5) || (thr === 0 && false);
  const grip = clamp(Math.abs(c.speed) / 7, 0, 1) * (c.speed < 0 ? -1 : 1);
  c.yaw -= steer * grip * (brake ? 2.6 : 1.7) / (1 + Math.abs(c.speed) * .035) * dt;
  moveCarBy(c, Math.sin(c.yaw) * c.speed * dt, Math.cos(c.yaw) * c.speed * dt, true);
}
export function moveCarBy(c, dx, dz, bounce) {
  for (const o of [[c.cl, c.cr], [-c.cl, c.cr]]) { // two circles along the body
    const px = c.x + dx + Math.sin(c.yaw) * o[0], pz = c.z + dz + Math.cos(c.yaw) * o[0];
    const r = pushOut(px, pz, o[1], true);
    if (!c.ai && Math.abs(c.speed) > .4 && !r[2]) {          // street props: light ones are pushed aside, weak ones knocked over, sturdy ones stay solid
      const sp = carVsProps(c, px, pz, o[1]);
      if (sp) { dx += sp.x; dz += sp.z; if (Math.abs(c.speed) > 3 && c.hitCd <= 0) { c.hitCd = .3; hurtCar(c, Math.max(0, Math.abs(c.speed) - 6) * .8 * (c.cop ? .5 : 1)); sfx.crash(Math.abs(c.speed) / 40); if (c === player.car) G.shake = clamp(Math.abs(c.speed) / 25, 0, 1); } c.speed *= .8; }
    }
    if (r[2] && r[5]) { // reached the water: no crash, the car just can't go on; it slows and splashes
      dx += r[0] - px; dz += r[1] - pz;
      if (Math.abs(c.speed) > 5 && c.hitCd <= 0) { c.hitCd = .6; splash(c.x + dx, c.z + dz, Math.abs(c.speed)); }
      c.speed *= .93;
    } else if (r[2]) {
      dx += r[0] - px; dz += r[1] - pz;
      const imp = Math.abs(c.speed);
      if (bounce && imp > 3 && c.hitCd <= 0) { c.hitCd = .3; hurtCar(c, Math.max(0, imp - 7) * 1.5 * (c.cop ? .5 : 1)); sfx.crash(imp / 40); c.speed *= -.25; if (c === player.car) G.shake = clamp(imp / 20, 0, 1); }
      else if (bounce) c.speed *= .8;
    }
  }
  // the highway: ground cars can't climb a ramp from underneath the deck; cars on the deck stay between the barriers
  if (c.layer === 0 && groundBlocked(c.x, c.x + dx, c.z)) { dx = 0; if (bounce) c.speed *= -.2; }
  c.x += dx; c.z += dz;
  if (!c.ai) { c.layer = nextLayer(c.layer, c.x, c.z); if (c.layer === 1 && zoneAt(c.x, c.z)) c.z = clamp(c.z, HW_Z - HW_HALF + 1.5, HW_Z + HW_HALF - 1.5); c.y = heightFor(c.layer, c.x, c.z); }
}
export function hurtCar(c, d) { if (c.wreck || !(d > 0)) return; c.hp -= d; if (c.hp <= 0) explodeCar(c); }
export function explodeCar(c) {
  c.wreck = true; c.hp = 0; c.speed = 0; c.vx = c.vz = 0; c.burn = 20; sfx.boom();
  c.model.parts.body.material = burntMat; showDriver(c, false); fireball(c.x, c.z);
  peds.forEach(p => { if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < 7) killPed(p, 'explosion'); });
  cars.forEach(o => { if (o !== c && !o.wreck && Math.abs(o.y - c.y) < 3 && Math.hypot(o.x - c.x, o.z - c.z) < 7) hurtCar(o, 45); });
  if (player.car === c) { leaveCar(true); hurtPlayer(28); }
  else if (!player.car && Math.hypot(player.x - c.x, player.z - c.z) < 6) hurtPlayer(35);
  if (c.kind === 'cop') { reportCrime('destroy_cop_car', c.x, c.z); bump('copsKilled'); }
  c.ai = null; c.cop = null; c.driver = null;
}

/** Push two cars apart and trade some speed / damage. Returns true when they overlap. */
export function carVsCar(a, b) {
  let hit = false;
  for (const oa of [a.cl, -a.cl]) for (const ob of [b.cl, -b.cl]) {
    const ax = a.x + Math.sin(a.yaw) * oa, az = a.z + Math.cos(a.yaw) * oa, bx = b.x + Math.sin(b.yaw) * ob, bz = b.z + Math.cos(b.yaw) * ob;
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), m = a.cr + b.cr - .1;
    if (d < m && d > .001) { hit = true; const pen = (m - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen; }
  }
  if (hit && a.hitCd <= 0 && b.hitCd <= 0) {
    const rel = Math.abs(a.speed) + Math.abs(b.speed) * (b.ai || b.kind === 'parked' ? 0 : .7);
    a.hitCd = b.hitCd = .35;
    const dmg = a.cop && b.cop ? .12 : 1.1;   // cruisers in one convoy only scrape each other; they don't wreck themselves
    if (rel > 4) { sfx.crash(rel / 40); hurtCar(a, Math.max(0, rel - 6) * dmg); hurtCar(b, Math.max(0, rel - 6) * dmg); }
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
    const a = cars[i], b = cars[j]; if (Math.abs(a.x - b.x) > 6.5 || Math.abs(a.z - b.z) > 6.5 || Math.abs(a.y - b.y) > 2.5) continue; // other layers don't touch
    const mover = b.driver === 'player' ? b : a, other = mover === a ? b : a;
    const rel = Math.abs(mover.speed) + Math.hypot(other.vx || 0, other.vz || 0);
    if (!carVsCar(mover, other)) continue;
    if (mover.driver === 'player' && other.hitCd > .2) { if (rel > 5 && other.kind === 'cop') reportCrime('attack_cop_car', other.x, other.z); else if (rel > 12 && other.kind === 'traffic') reportCrime('collision', other.x, other.z); }
    if (other.driver !== 'player' && rel > 5 && !(other.cop && G.stars)) {
      const dx = other.x - mover.x, dz = other.z - mover.z, d = Math.hypot(dx, dz) || 1;
      other.vx += dx / d * rel * .45; other.vz += dz / d * rel * .45; other.spin = (Math.random() - .5) * 3;
      if (other.ai) { other.ai = null; other.driver = null; other.honk = 1; showDriver(other, false); }
    }
  }
  const px = player.x, pz = player.z;
  cars.forEach(c => {
    const dist = Math.max(Math.abs(c.x - px), Math.abs(c.z - pz));
    if (c.driver !== 'player' && !c.cop && !c.ai && Math.abs(c.speed) < .2) c.braking = false; // parked cars don't keep their brake lights on
    c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.y = c.yaw;
    const sl = c.y > 0 || c.layer ? deckSlope(c.x) * Math.sin(c.yaw) : 0; c.pitch += (-Math.atan(sl) - c.pitch) * Math.min(1, dt * 12); c.mesh.rotation.x = c.pitch;
    c.mesh.visible = dist < 170; // far cars are hidden (the fog hides them anyway)
    if (!c.mesh.visible) return;
    const p = c.model.parts, near = dist < 60;
    p.wf.visible = p.wr.visible = p.dark.visible = p.lamps.visible = p.glass.visible = near;             // distant cars: just paint
    if (!near) return;
    let sp = c.speed, steer = c.steer;
    if (c.ai) { const dy = ((c.yaw - c.lastYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; steer = -dy * 4; c.steer += (steer - c.steer) * .2; steer = c.steer; c.braking = c.speed < c.ai.cruise - 2; }
    else if (c.vx || c.vz) sp = Math.hypot(c.vx, c.vz);
    c.lastYaw = c.yaw;
    animateCarModel(c.model, { speed: sp, steer, braking: c.braking && !c.wreck, sirens: c.kind === 'cop' && !c.wreck && G.stars > 0, time: G.time, night: env.night, near: dist < 70, wreck: c.wreck }, dt);
  });
}
