// Wanted level and the police: cop cars chase along the road graph, officers get out to arrest or shoot.
import { scene } from './render.js';
import { N } from './layout.js';
import { nodePos, nearestNode, nodePath } from './roads.js';
import { pushOut } from './city.js';
import { G, STAR_AT, starsOf, addHeat, bump } from './state.js';
import { clamp, rand, angDiff } from './util.js';
import { sfx, setSiren } from './audio.js';
import { tracer } from './effects.js';
import { cars, makeCar, removeCar, driveCar } from './vehicles.js';
import { player, hurtPlayer } from './player.js';
import { personMesh, animLegs, layDown, dropItem } from './people.js';
import { busted } from './lifecycle.js';
import { banner, say } from './ui.js';

export const officers = [];
const copCars = () => cars.filter(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player');
const copTarget = () => G.stars ? Math.min(7, G.stars + 1 + (G.stars >= 4 ? 1 : 0)) : 0;
const targetPos = () => player.car ? [player.car.x, player.car.z] : [player.x, player.z];

export function spawnCop() {
  for (let t = 0; t < 20; t++) {
    const n = [Math.floor(Math.random() * (N + 1)), Math.floor(Math.random() * (N + 1))], p = nodePos(n[0], n[1]);
    const d = Math.hypot(p[0] - player.x, p[1] - player.z);
    if (d < 90 || d > 190) continue;
    const c = makeCar(p[0] + 2.8, p[1], 0, 'cop', 0x1c2a4a); c.driver = 'cop'; c.cop = { path: [], rep: 0, out: null }; return c;
  }
  return null;
}
function officerFrom(c) {
  const o = { x: c.x + Math.cos(c.yaw) * 2, z: c.z - Math.sin(c.yaw) * 2, hp: 60, mesh: personMesh(0x1a2a6a, 0xe0b898), shotCd: 1, car: c, yaw: 0, dead: 0 };
  const r = pushOut(o.x, o.z, .5); o.x = r[0]; o.z = r[1]; officers.push(o); c.cop.out = o;
}
export function updateCop(c, dt) {
  const k = c.cop; k.rep -= dt;
  const [tx, tz] = targetPos(), dist = Math.hypot(tx - c.x, tz - c.z);
  if (!G.stars) { c.despawn += dt; driveCar(c, .4, 0, false, dt); if (c.despawn > 8 && dist > 40) removeCar(c); return; }
  c.despawn = 0;
  if (!player.car && dist < 12 && !k.out) { driveCar(c, 0, 0, true, dt); if (Math.abs(c.speed) < 2) officerFrom(c); return; }
  if (k.out) { driveCar(c, 0, 0, true, dt); return; }
  let gx = tx, gz = tz;
  const aligned = Math.abs(tx - c.x) < 5 || Math.abs(tz - c.z) < 5;
  if (!(dist < 38 && aligned)) {
    if (k.rep <= 0 || !k.path.length) { k.path = nodePath(nearestNode(c.x, c.z), nearestNode(tx, tz)); k.rep = 1; }
    while (k.path.length) { const p = nodePos(k.path[0][0], k.path[0][1]); if (Math.hypot(p[0] - c.x, p[1] - c.z) < 11) k.path.shift(); else { gx = p[0]; gz = p[1]; break; } }
  }
  const diff = angDiff(Math.atan2(gx - c.x, gz - c.z), c.yaw), sp = Math.abs(diff) > 1 ? .45 : 1;
  c.stuck = Math.abs(c.speed) < 1.5 ? c.stuck + dt : 0;
  if (c.stuck > 1.6) { driveCar(c, -1, -Math.sign(diff) || 1, false, dt); if (c.stuck > 3) c.stuck = 0; }
  else driveCar(c, sp, clamp(-diff * 2.2, -1, 1), false, dt);
}
function updateOfficer(o, dt) {
  if (o.dead) return;
  o.shotCd -= dt;
  const [tx, tz] = targetPos(), dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz) || .001;
  if (!G.stars) { if (o.car && o.car.cop) o.car.cop.out = null; o.dead = 2; return; }
  if (G.stars >= 3 && d < 24 && o.shotCd <= 0) { o.shotCd = rand(.6, 1.1); sfx.shot(); if (Math.random() < .45) hurtPlayer(player.car ? 3 : 6); tracer(o.x, 1.4, o.z, tx, 1.2, tz); }
  if (d > 1.3 && !(G.stars >= 3 && d < 14)) { const r = pushOut(o.x + dx / d * 5.6 * dt, o.z + dz / d * 5.6 * dt, .45); o.x = r[0]; o.z = r[1]; o.yaw = Math.atan2(dx, dz); }
  else if (d <= 1.4 && !player.car) busted();
  o.mesh.position.set(o.x, Math.abs(Math.sin(G.time * 10)) * .04, o.z); o.mesh.rotation.y = o.yaw; animLegs(o.mesh, G.time * 10, 1);
}
export function damageOfficer(o, dmg) {
  if (o.dead) return; o.hp -= dmg; addHeat(12);
  if (o.hp <= 0) { o.dead = 1; layDown(o.mesh); dropItem('cash', o.x, o.z, 60); addHeat(40); bump('copsKilled'); }
}

export function updatePolice(dt) {
  const was = G.stars; G.stars = starsOf(G.heat);
  if (G.stars > was) banner('★'.repeat(G.stars) + ' WANTED', '#ff6', 1.6);
  const live = copCars(), copNear = live.some(c => Math.hypot(c.x - player.x, c.z - player.z) < 55) || officers.some(o => !o.dead);
  if (G.heat > 0 && !copNear) { G.fuzz += dt; if (G.fuzz > 3) G.heat = Math.max(0, G.heat - 4 * dt); }
  if (G.stars === 0 && was > 0 && G.mode === 'playing') say('you lost them', 2.5);
  G.copTimer = (G.copTimer || 0) - dt;
  if (G.copTimer <= 0) { G.copTimer = 1.5; if (G.stars && live.length < copTarget()) spawnCop(); }
  officers.forEach(o => updateOfficer(o, dt));
  for (let i = officers.length - 1; i >= 0; i--) { const o = officers[i]; if (o.dead) { o.dead += dt; if (o.dead > 6) { scene.remove(o.mesh); officers.splice(i, 1); } } }
  setSiren(G.stars > 0 && live.some(c => Math.hypot(c.x - player.x, c.z - player.z) < 70), G.time);
}
export function clearPolice() {
  officers.forEach(o => scene.remove(o.mesh)); officers.length = 0;
  copCars().forEach(removeCar); G.heat = 0; G.stars = 0; G.fuzz = 0; setSiren(false, 0);
}
export const copsNearby = () => copCars().some(c => Math.hypot(c.x - player.x, c.z - player.z) < 60);
