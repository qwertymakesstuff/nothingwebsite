// The player: on-foot movement, getting in and out of cars, driving input and taking damage.
import { pushOut } from './city.js';
import { G, canAct, addHeat } from './state.js';
import { angDiff } from './util.js';
import { sfx } from './audio.js';
import { cars, driveCar } from './vehicles.js';
import { personMesh, animLegs, makePed } from './people.js';
import { spawnHospital } from './locations.js';
import { flash, say } from './ui.js';
import { wasted } from './lifecycle.js';

export const player = { x: spawnHospital[0] - 8, z: spawnHospital[1], yaw: 0, vx: 0, vz: 0, hp: 100, car: null, mesh: null, shootCd: 0, hurt: 0, moving: false, ph: 0 };
export const REACH = 3.8;
export function initPlayer() { player.mesh = personMesh(0xd8d8d8, 0xe0b898); }

/** The closest enterable car within reach, or null. Used by both the prompt and the action so they always agree. */
export function nearestCar() {
  if (player.car) return null;
  let best = null, bd = REACH;
  for (const c of cars) { if (c.wreck) continue; const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
export function enterCar(c) {
  if (!c || c.wreck || player.car || !canAct()) return false;
  if (c.driver === 'ai') { addHeat(c.kind === 'cop' ? 40 : 14); say('carjacked', 1.5); ejectDriver(c); }
  else if (c.kind === 'cop') addHeat(40);
  if (c.kind === 'cop') { if (c.cop && c.cop.out) c.cop.out.car = null; c.cop = null; }
  c.ai = null; c.driver = 'player'; c.kind = c.kind === 'parked' || c.kind === 'cop' || c.kind === 'traffic' ? 'owned' : c.kind;
  c.vx = c.vz = c.spin = 0; c.despawn = 0;
  player.car = c; player.mesh.visible = false; player.vx = player.vz = 0; sfx.door(); return true;
}
function ejectDriver(c) {
  const side = [Math.cos(c.yaw), -Math.sin(c.yaw)];
  const p = makePed([c.x + side[0] * 2.5, c.z + side[1] * 2.5]); p.panic = 6;
}
function carBlocks(x, z, except) { return cars.some(c => c !== except && (Math.hypot(c.x + Math.sin(c.yaw) * 1.3 - x, c.z + Math.cos(c.yaw) * 1.3 - z) < 1.7 || Math.hypot(c.x - Math.sin(c.yaw) * 1.3 - x, c.z - Math.cos(c.yaw) * 1.3 - z) < 1.7)); }
/** Step out beside the car on a free spot. Never leaves the player inside a wall or another car. */
export function leaveCar(forced) {
  const c = player.car; if (!c) return false;
  if (!forced && Math.abs(c.speed) >= 14) { say('slow down first', 1.5); return false; }
  const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  let spot = null;
  outer: for (const dist of [2.6, 3.6]) for (const side of [-1, 1]) for (const off of [0, 1.8, -1.8]) {
    const x = c.x + rx * dist * side + fx * off, z = c.z + rz * dist * side + fz * off, r = pushOut(x, z, .5);
    if (!r[2] && !carBlocks(x, z, c)) { spot = [x, z]; break outer; }
  }
  if (!spot) { const r = pushOut(c.x + rx * 2.6, c.z + rz * 2.6, .5); spot = [r[0], r[1]]; }
  player.x = spot[0]; player.z = spot[1]; player.yaw = c.yaw; player.vx = player.vz = 0;
  c.driver = null; c.speed *= .5; player.car = null; player.mesh.visible = true; sfx.door(); return true;
}
export function hurtPlayer(d) {
  if (!canAct() || !(d > 0)) return;
  player.hp -= d; player.hurt = .4; flash(.5);
  if (player.hp <= 0) wasted();
}

export function updatePlayer(dt, inp) {
  player.shootCd -= dt; player.hurt -= dt;
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
  player.moving = Math.hypot(player.vx, player.vz) > .4;
  if (player.moving) {
    let r = pushOut(player.x + player.vx * dt, player.z + player.vz * dt, .45);
    for (let pass = 0; pass < 2; pass++) for (const car of cars) { // cars are solid: treat each as a capsule along its body
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = r[0] - car.x, rz = r[1] - car.z;
      const t = Math.max(-1.3, Math.min(1.3, rx * fx + rz * fz)), qx = car.x + fx * t, qz = car.z + fz * t;
      const dx = r[0] - qx, dz = r[1] - qz, m = 1.55, d2 = dx * dx + dz * dz;
      if (d2 < m * m) { const d = Math.sqrt(d2) || .001; r = pushOut(qx + dx / d * m, qz + dz / d * m, .45); }
    }
    player.x = r[0]; player.z = r[1];
    player.yaw += angDiff(Math.atan2(player.vx, player.vz), player.yaw) * Math.min(1, dt * 14);
    player.ph += dt * (inp.run ? 14 : 10);
  }
  for (const car of cars) { // being run over
    if (car.wreck || Math.abs(car.speed) < 6 || car.driver === 'player') continue;
    if (Math.hypot(car.x - player.x, car.z - player.z) < 1.9) { hurtPlayer(Math.abs(car.speed) * 1.1); car.speed *= .6; }
  }
}
export function syncPlayerMesh() {
  player.mesh.position.set(player.x, 0, player.z); player.mesh.rotation.y = player.yaw; animLegs(player.mesh, player.ph, player.moving ? 1 : 0);
}
