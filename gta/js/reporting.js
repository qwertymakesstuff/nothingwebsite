// The game-side half of crime reporting: who saw or heard what, then hand the event to the ledger, wanted heat and dispatch.
import { G, addHeat } from './state.js';
import { CrimeLedger } from './crime.js';
import { pushOut } from './city.js';
import { peds } from './people.js';
import { cars } from './vehicles.js';
import { player } from './player.js';
import { officers, dispatcher, noteCrime } from './police.js';
import { angDiff } from './util.js';
import { say } from './ui.js';

export const ledger = new CrimeLedger();
const LOUD = new Set(['gunshot', 'assault', 'injure', 'murder', 'hit_and_run', 'carjack', 'assault_cop', 'kill_cop', 'attack_cop_car', 'destroy_cop_car']);

/** clear line between two ground points: no building, wall or tree in the way */
export function los(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz); if (d < 3) return true;
  for (let t = 2.5; t < d - 1; t += 2.5) if (pushOut(ax + dx / d * t, az + dz / d * t, .15)[2]) return false;
  return true;
}
/** would the player see something at (x, z)? In front of the camera, in range and not behind a building. */
export function visibleToPlayer(x, z) {
  const d = Math.hypot(x - player.x, z - player.z); if (d > 260) return false;
  if (d < 40) return true;
  return Math.abs(angDiff(Math.atan2(x - player.x, z - player.z), G.camYaw)) < 1.05 && los(player.x, player.z, x, z);
}
const copCarsNear = (x, z, r) => cars.some(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && Math.hypot(c.x - x, c.z - z) < r);

/**
 * Report a crime by the player. Witnesses are people who can see the spot; others close by only hear it.
 * Returns the ledger result ({ crime, heat }) or null when nobody noticed (no heat, no police).
 */
export function reportCrime(type, x, z) {
  if (x == null) { x = player.x; z = player.z; }
  let witnesses = 0, heard = 0;
  for (const p of peds) {
    if (p.dead) continue; const d = Math.hypot(p.x - x, p.z - z);
    if (d < 34 && los(p.x, p.z, x, z)) witnesses++; else if (d < 58 && LOUD.has(type)) heard++;
  }
  let copSaw = officers.some(o => !o.dead && Math.hypot(o.x - x, o.z - z) < 80 && los(o.x, o.z, x, z));
  if (!copSaw) copSaw = cars.some(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && Math.hypot(c.x - x, c.z - z) < 80 && los(c.x, c.z, x, z));
  if (!copSaw && LOUD.has(type) && copCarsNear(x, z, 120)) heard++;
  const r = ledger.report(type, { x, z, time: G.time, witnesses, heard, visible: witnesses > 0, copSaw, pursued: G.stars > 0 });
  if (!r) return null;
  addHeat(r.heat); dispatcher.report(r.crime, G.time); noteCrime(r.crime);
  if (!G.stars) say('someone saw that', 1.6);
  return r;
}
