// Pistol: auto-aims at the best target in front of the camera, hit-scan, stopped by buildings.
import { pushOut } from './city.js';
import { G, canAct } from './state.js';
import { reportCrime } from './reporting.js';
import { angDiff } from './util.js';
import { sfx } from './audio.js';
import { tracer, muzzleFlash } from './effects.js';
import { cars, hurtCar } from './vehicles.js';
import { player } from './player.js';
import { peds, damagePed } from './people.js';
import { officers, damageOfficer } from './police.js';
import { emit, noteShot } from './pedAI.js';

const RANGE = 40, COOLDOWN = .3;
export function shoot() {
  if (!canAct() || player.car || player.shootCd > 0) return false;
  player.shootCd = COOLDOWN; player.aimT = 1.2; sfx.shot(); reportCrime('gunshot');
  let yaw = G.camYaw, best = null, bd = 1e9;
  const consider = (x, z) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz); if (d > RANGE || d < .5) return; const a = Math.abs(angDiff(Math.atan2(dx, dz), G.camYaw)); if (a < .3 && a * d < bd) { bd = a * d; best = [x, z]; } };
  peds.forEach(p => { if (!p.dead) consider(p.x, p.z); }); officers.forEach(o => { if (!o.dead) consider(o.x, o.z); });
  cars.forEach(c => { if (!c.wreck && c.kind !== 'parked' && c.driver !== 'player') consider(c.x, c.z); });
  if (best) yaw = Math.atan2(best[0] - player.x, best[1] - player.z);
  player.yaw = yaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let maxD = RANGE; for (let d = 1.5; d <= RANGE; d += 1.5) if (pushOut(player.x + fx * d, player.z + fz * d, .1)[2]) { maxD = d; break; }
  let hit = null, hd = maxD;
  const test = (x, z, rad, ref, kind) => { const dx = x - player.x, dz = z - player.z, al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx); if (al > 0 && al < hd && lat < rad) { hd = al; hit = { ref, kind }; } };
  peds.forEach(p => { if (!p.dead) test(p.x, p.z, .6, p, 'ped'); }); officers.forEach(o => { if (!o.dead) test(o.x, o.z, .6, o, 'cop'); });
  cars.forEach(c => { if (!c.wreck && c.driver !== 'player') test(c.x, c.z, c.cr + .3, c, 'car'); });
  muzzleFlash(player.x + fx * .7, 1.25, player.z + fz * .7);
  tracer(player.x + fx * .6, 1.3, player.z + fz * .6, player.x + fx * hd, 1.2, player.z + fz * hd);
  noteShot(); emit({ type: 'gunshot', x: player.x, z: player.z, radius: 70, loud: true, visual: true, byPlayer: true, threat: { x: player.x, z: player.z } });   // everyone who can hear or see it decides what to do
  if (hit) {
    if (hit.kind === 'ped') damagePed(hit.ref, 30, 'gun');
    else if (hit.kind === 'cop') damageOfficer(hit.ref, 22);
    else { hurtCar(hit.ref, 14); if (hit.ref.kind === 'cop') reportCrime('attack_cop_car', hit.ref.x, hit.ref.z); else if (hit.ref.driver === 'ai') reportCrime('assault', hit.ref.x, hit.ref.z); }
  }
  return true;
}

/** unarmed: a punch at whoever is right in front (used in fistfights; the same damage, crime and reaction path as the pistol) */
const PUNCH_RANGE = 1.9;
export function punch() {
  if (!canAct() || player.car || player.shootCd > 0) return false;
  player.shootCd = .55; player.aimT = .45; sfx.punch();
  let best = null, bd = PUNCH_RANGE;
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  for (const p of peds) { if (p.dead) continue; const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > .3) { bd = d; best = p; } }
  if (best) { player.yaw = Math.atan2(best.x - player.x, best.z - player.z); damagePed(best, 9, 'fist'); return true; }
  for (const o of officers) { if (o.dead) continue; const d = Math.hypot(o.x - player.x, o.z - player.z); if (d < PUNCH_RANGE) { damageOfficer(o, 6); return true; } }
  return false;
}
