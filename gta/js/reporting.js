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
import { CRIMES } from './crime.js';
import { registerCrime } from './pedAI.js';

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
  let witnesses = 0, heard = 0; const seers = [], hearers = [];
  for (const p of peds) {
    if (p.dead) continue; const d = Math.hypot(p.x - x, p.z - z);
    if (d < 34 && los(p.x, p.z, x, z)) { witnesses++; seers.push(p); } else if (d < 58 && LOUD.has(type)) { heard++; hearers.push(p); }
  }
  let copSaw = officers.some(o => !o.dead && Math.hypot(o.x - x, o.z - z) < 80 && los(o.x, o.z, x, z));
  if (!copSaw) copSaw = cars.some(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && Math.hypot(c.x - x, c.z - z) < 80 && los(c.x, c.z, x, z));
  if (!copSaw && LOUD.has(type) && copCarsNear(x, z, 120)) heard++;
  const ctx = { x, z, time: G.time, witnesses, heard, visible: witnesses > 0, copSaw, pursued: G.stars > 0 };
  // Pedestrians do not file a report by magic: someone has to see it, decide to phone, and finish the call (pedAI.js). The police and the
  // police's own reports, and anything while the police are already after you, count at once as before.
  const def = CRIMES[type], immediate = copSaw || (def && def.cop) || G.stars > 0 || !(witnesses || heard);
  if (!immediate && (seers.length || hearers.length)) {
    registerCrime({ type, x, z, sev: def ? def.sev : 1, seers, hearers, ctx });
    return null;
  }
  return fileReport(type, ctx, null);
}
/** the report itself: the ledger turns it into heat, the wanted level rises, the dispatcher is told */
function fileReport(type, ctx, witness) {
  const r = ledger.report(type, ctx);
  if (!r) return null;
  r.crime.witness = witness || null;
  addHeat(r.heat); dispatcher.report(r.crime, G.time); noteCrime(r.crime);
  if (!G.stars) say('someone saw that', 1.6);
  return r;
}
/** a pedestrian finished phoning the police about an incident (called by pedAI.js) */
export function fileCrimeReport(inc, witness) {
  const c = inc.ctx, ctx = Object.assign({}, c, { time: G.time, witnesses: inc.counts.witnesses, heard: inc.counts.heard, visible: inc.counts.witnesses > 0, pursued: G.stars > 0 });
  return fileReport(inc.type, ctx, witness);
}
