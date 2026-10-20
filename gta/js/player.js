// The player: on-foot movement, getting in and out of cars, driving input and taking damage.
import { pushOut } from './city.js';
import { G, canAct } from './state.js';
import { reportCrime } from './reporting.js';
import { angDiff } from './util.js';
import { sfx } from './audio.js';
import { cars, driveCar, carDist, showDriver } from './vehicles.js';
import { makePed } from './people.js';
import { carjackVictim } from './pedAI.js';
import { createCharacter, playerSpec } from './models/characters.js';
import { scene } from './render.js';
import { data } from './save.js';
import { roomPush } from './models/interiors.js';
import { walkBlocked, zoneAt } from './highway.js';
import { spawnHospital } from './locations.js';
import { flash, say } from './ui.js';
import { wasted } from './lifecycle.js';

export const player = { x: spawnHospital[0] - 8, z: spawnHospital[1], yaw: 0, vx: 0, vz: 0, hp: 100, car: null, mesh: null, ch: null, aimT: 0, vis: null, shootCd: 0, hurt: 0, moving: false, ph: 0, sprinting: false, y: 0 };
export const REACH = 3.8;
export function initPlayer() { dressPlayer(); }
/** (Re)build the player's character with the saved outfit. */
export function dressPlayer() {
  const old = player.ch, parent = old && old.root.parent;
  if (old && parent) parent.remove(old.root);
  if (riggedBody) { player.ch = riggedBody; riggedBody.setTint(OUTFIT_TINT[data.outfit || 0]); }       // Ash's own model; the jacket choices tint it
  else player.ch = createCharacter(playerSpec(data.outfit));
  player.mesh = player.ch.root;
  (parent || scene).add(player.mesh);
  if (old && old !== player.ch && old.dispose) old.dispose();
}
/** the rigged model of Ash (story/glbChar.js loadBody) takes over from the blocky body once it has loaded */
let riggedBody = null;
const OUTFIT_TINT = [0xffffff, 0xff8c8c, 0x99ffb3, 0x8c8c9a];
export function adoptRiggedPlayer(ch) { riggedBody = ch; dressPlayer(); }
const seatWorld = c => { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw); return [c.x + fx * c.seat[2] + rx * c.seat[0], c.z + fz * c.seat[2] + rz * c.seat[0]]; };
function seatPlayer(c) { // the character climbs in: walk to the door side, then sit behind the wheel
  const [sx, sz] = seatWorld(c); player.vis = { fx: player.x, fz: player.z, t: 0, dur: .28, mode: 'enter', car: c };
  void sx; void sz;
}
function unseatPlayer(c, x, z) { // climb out: slide from the seat to the spot beside the car
  const [sx, sz] = seatWorld(c); player.vis = { fx: sx, fz: sz, t: 0, dur: .25, mode: 'exit', car: null };
  c.model.pivot.remove(player.mesh); scene.add(player.mesh);
  void x; void z;
}

/** The closest enterable car within reach, or null. Used by both the prompt and the action so they always agree. */
export function nearestCar() {
  if (player.car) return null;
  let best = null, bd = REACH;
  for (const c of cars) { if (c.wreck) continue; const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function enterCar(c) {
  if (!c || c.wreck || player.car || !canAct()) return false;
  if (c.kind === 'display') { say('for sale: talk to the dealer first', 2); return false; }
  if (c.kind === 'cop' || c.type === 'cruiser') reportCrime('steal_cop_car', c.x, c.z);
  else if (c.driver === 'ai') reportCrime('carjack', c.x, c.z);
  else if (c.kind === 'parked' || c.kind === 'traffic') reportCrime('steal_car', c.x, c.z);
  if (c.driver === 'ai') { say('carjacked', 1.5); ejectDriver(c); }
  if (c.kind === 'cop') { if (c.cop && c.cop.out) c.cop.out.car = null; c.cop = null; }
  c.ai = null; c.driver = 'player'; c.kind = c.kind === 'parked' || c.kind === 'cop' || c.kind === 'traffic' ? 'owned' : c.kind;
  c.vx = c.vz = c.spin = 0; c.despawn = 0;
  player.car = c; player.vx = player.vz = 0; showDriver(c, false); seatPlayer(c); sfx.door(); return true;
}
function ejectDriver(c) {
  const side = [Math.cos(c.yaw), -Math.sin(c.yaw)];
  const p = makePed([c.x + side[0] * 2.5, c.z + side[1] * 2.5]); carjackVictim(p);
}
function carBlocks(x, z, except) { return cars.some(c => c !== except && carDist(c, x, z) < .7); }
/** Step out beside the car on a free spot. Never leaves the player inside a wall or another car. */
export function leaveCar(forced) {
  const c = player.car; if (!c) return false;
  if (!forced && Math.abs(c.speed) >= 14) { say('slow down first', 1.5); return false; }
  if (!forced && c.layer === 1 && zoneAt(c.x, c.z)) { say('no stopping on the highway', 2); return false; }
  const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  let spot = null;
  outer: for (const dist of [c.cr + 1.3, c.cr + 2.4]) for (const side of [1, -1]) for (const off of [0, 1.8, -1.8]) {
    const x = c.x + rx * dist * side + fx * off, z = c.z + rz * dist * side + fz * off, r = pushOut(x, z, .5);
    if (!r[2] && !carBlocks(x, z, c)) { spot = [x, z]; break outer; }
  }
  if (!spot) { const r = pushOut(c.x + rx * (c.cr + 1.3), c.z + rz * (c.cr + 1.3), .5); spot = [r[0], r[1]]; }
  player.x = spot[0]; player.z = spot[1]; player.yaw = c.yaw; player.vx = player.vz = 0;
  c.driver = null; c.speed *= .5; player.car = null; unseatPlayer(c); sfx.door(); return true;
}
export function hurtPlayer(d) {
  if (!canAct() || !(d > 0)) return;
  player.hp -= d; player.hurt = .4; flash(.5);
  if (player.hp <= 0) wasted();
}

export function updatePlayer(dt, inp) {
  player.shootCd -= dt; player.hurt -= dt; player.y = player.car ? player.car.y : 0;
  const c = player.car;
  if (G.mode !== 'playing') { if (c) driveCar(c, 0, 0, true, dt); if (c) { player.x = c.x; player.z = c.z; } return; }
  if (c) {
    if (c.wreck) { leaveCar(true); return; }
    driveCar(c, inp.fwd, inp.side, inp.brake, dt);
    player.x = c.x; player.z = c.z; player.yaw = c.yaw; player.moving = false;
    if (c.honk > 0) c.honk -= dt;
    return;
  }
  // on foot: camera-relative movement with a little acceleration so it feels responsive but not twitchy
  const sy = Math.sin(G.camYaw), cy = Math.cos(G.camYaw);
  let wx = sy * inp.fwd - cy * inp.side, wz = cy * inp.fwd + sy * inp.side; const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  const sp = inp.run ? 8.4 : 5, k = 1 - Math.exp(-dt * 16);
  player.vx += (wx * sp - player.vx) * k; player.vz += (wz * sp - player.vz) * k;
  player.moving = Math.hypot(player.vx, player.vz) > .4; player.sprinting = !!inp.run && player.moving;
  if (player.moving) {
    const room = G.interior && G.interior.room;
    let r = room ? roomPush(room, player.x + player.vx * dt, player.z + player.vz * dt, .45) : pushOut(player.x + player.vx * dt, player.z + player.vz * dt, .45);
    if (!room) for (let pass = 0; pass < 2; pass++) for (const car of cars) { // cars are solid: treat each as a capsule along its body
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = r[0] - car.x, rz = r[1] - car.z;
      const t = Math.max(-car.cl, Math.min(car.cl, rx * fx + rz * fz)), qx = car.x + fx * t, qz = car.z + fz * t;
      const dx = r[0] - qx, dz = r[1] - qz, m = car.cr + .4, d2 = dx * dx + dz * dz;
      if (d2 < m * m) { const d = Math.sqrt(d2) || .001; r = pushOut(qx + dx / d * m, qz + dz / d * m, .45); }
    }
    if (!room && walkBlocked(r[0], r[1])) { r[0] = player.x; r[1] = player.z; }   // the ramps are for cars only
    player.x = r[0]; player.z = r[1];
    player.yaw += angDiff(Math.atan2(player.vx, player.vz), player.yaw) * Math.min(1, dt * 14);
    player.ph += dt * (inp.run ? 14 : 10);
  }
  if (!G.interior) for (const car of cars) { // being run over
    if (car.wreck || Math.abs(car.speed) < 6 || car.driver === 'player') continue;
    if (carDist(car, player.x, player.z) < .6) { hurtPlayer(Math.abs(car.speed) * 1.1); car.speed *= .6; }
  }
}
/** Place and animate the player's character: on foot, climbing in/out, or seated at the wheel. */
export function syncPlayerMesh(dt) {
  const c = player.car, ch = player.ch, v = player.vis, root = player.mesh;
  player.aimT -= dt;
  if (v) {
    v.t += dt; const u = Math.min(1, v.t / v.dur), e = u * u * (3 - 2 * u);
    const tx = v.mode === 'enter' ? seatWorld(v.car)[0] : player.x, tz = v.mode === 'enter' ? seatWorld(v.car)[1] : player.z;
    root.position.set(v.fx + (tx - v.fx) * e, 0, v.fz + (tz - v.fz) * e); root.rotation.y = Math.atan2(tx - v.fx, tz - v.fz) || player.yaw;
    ch.update(dt, 3.2, {});
    if (u >= 1) { player.vis = null; if (v.mode === 'enter' && player.car === v.car) { scene.remove(root); v.car.model.pivot.add(root); } }
    return;
  }
  if (c) {
    if (root.parent !== c.model.pivot) { if (root.parent) root.parent.remove(root); c.model.pivot.add(root); }
    root.position.set(c.seat[0], c.seat[1] - .54 - (ch.seatDrop || 0), c.seat[2] - (ch.seatBack || 0)); root.rotation.set(0, 0, 0);
    ch.update(dt, 0, { seated: true }); return;
  }
  if (root.parent !== scene) { if (root.parent) root.parent.remove(root); scene.add(root); }
  root.position.set(player.x, 0, player.z); root.rotation.y = player.yaw;
  ch.update(dt, Math.hypot(player.vx, player.vz), { aim: player.aimT > 0, run: player.sprinting, hands: G.mode === 'busted' });
}
