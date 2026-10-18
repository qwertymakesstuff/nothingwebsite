// Pistol: auto-aims at the best target in front of the camera, hit-scan, stopped by buildings.
import { pushOut } from './city.js';
import { G, canAct, addHeat } from './state.js';
import { angDiff } from './util.js';
import { sfx } from './audio.js';
import { tracer } from './effects.js';
import { cars, hurtCar } from './vehicles.js';
import { player } from './player.js';
import { peds, damagePed } from './people.js';
import { officers, damageOfficer } from './police.js';

const RANGE = 40, COOLDOWN = .3;
export function shoot() {
  if (!canAct() || player.car || player.shootCd > 0) return false;
  player.shootCd = COOLDOWN; sfx.shot();
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
  cars.forEach(c => { if (!c.wreck && c.driver !== 'player') test(c.x, c.z, 1.5, c, 'car'); });
  tracer(player.x + fx * .6, 1.3, player.z + fz * .6, player.x + fx * hd, 1.2, player.z + fz * hd);
  peds.forEach(p => { if (!p.dead && Math.hypot(p.x - player.x, p.z - player.z) < 28) p.panic = 6; });
  if (hit) {
    if (hit.kind === 'ped') damagePed(hit.ref, 30);
    else if (hit.kind === 'cop') damageOfficer(hit.ref, 22);
    else { hurtCar(hit.ref, 14); if (hit.ref.kind === 'cop') addHeat(25); else if (hit.ref.driver === 'ai') addHeat(8); }
  }
  return true;
}
