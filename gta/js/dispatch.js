// Police dispatch (pure). Lifecycle of an incident:
//   REPORTED -> ASSIGNED -> EN_ROUTE -> ON_SCENE -> CONTACT (arrest / pursuit) -> SEARCH -> CLOSED
// A reported crime always ends up with units assigned: a nearby patrol if there is one, otherwise a unit spawned out of sight.
export const FLEET = {
  want: [0, 1, 2, 3, 5, 6],        // cruisers working an incident, by stars
  cap: [0, 2, 3, 5, 6, 7],         // hard limit of police cars alive at once, by stars (patrols included)
  delay: [0, 2.5, 2, 1.6, 1.2, .9],// seconds between dispatching units
  band: [null, [150, 240], [135, 220], [120, 200], [110, 180], [100, 170]], // how far away out-of-sight units appear
  patrolRange: 280, deadline: 40, sceneRadius: 32
};

export class Dispatcher {
  constructor() { this.reset(); }
  reset() { this.incidents = []; this.nextId = 1; this.spawnCd = 0; }
  /** A crime was reported. The same incident (close in space and time) is merged instead of dispatching again. */
  report(crime, now) {
    const open = this.incidents.find(i => i.stage !== 'CLOSED' && Math.hypot(i.x - crime.x, i.z - crime.z) < 70 && now - i.time < 40);
    if (open) { open.count++; open.sev = Math.max(open.sev, crime.sev); open.x = crime.x; open.z = crime.z; open.time = now; open.crimes.push(crime.type); return open; }
    const inc = { id: this.nextId++, stage: 'REPORTED', x: crime.x, z: crime.z, sev: crime.sev, time: now, openedAt: now, deadline: now + FLEET.deadline, retries: 0, count: 1, crimes: [crime.type], suspect: crime.suspect };
    this.incidents.push(inc); if (this.incidents.length > 20) this.incidents.shift(); return inc;
  }
  current() { for (let i = this.incidents.length - 1; i >= 0; i--) if (this.incidents[i].stage !== 'CLOSED') return this.incidents[i]; return null; }
  /**
   * One dispatch step. W: { stars, now, suspect:{x,z}, units:[{id,x,z,state,inc,patrol,alive}], seen, spawn(inc) -> unit|null, carCount }
   * Returns the incident being worked (or null).
   */
  tick(dt, W) {
    this.spawnCd -= dt;
    let inc = this.current();
    if (W.stars === 0) { if (inc && !W.units.some(u => u.inc === inc.id && u.state !== 'RETURNING_TO_PATROL')) inc.stage = 'CLOSED'; return null; }
    if (!inc) inc = this.report({ type: 'gunshot', sev: W.stars, x: W.suspect.x, z: W.suspect.z, suspect: 'player' }, W.now);   // wanted but nothing on file: still respond
    const mine = W.units.filter(u => u.alive && u.inc === inc.id);
    const near = mine.some(u => Math.hypot(u.x - inc.x, u.z - inc.z) < FLEET.sceneRadius);
    if (W.seen) inc.stage = 'CONTACT';
    else if (inc.stage === 'CONTACT') inc.stage = 'SEARCH';
    else if (inc.stage !== 'SEARCH') inc.stage = near ? 'ON_SCENE' : mine.some(u => u.state === 'RESPONDING' || u.state === 'PURSUING_IN_VEHICLE') ? 'EN_ROUTE' : mine.length ? 'ASSIGNED' : 'REPORTED';
    let need = FLEET.want[W.stars] - mine.length;
    // overdue: nobody has reached the scene in time (stuck, lost): bring in one more unit and push the deadline back
    const overdue = W.now > inc.deadline && !near && inc.stage !== 'CONTACT' && inc.stage !== 'SEARCH' && inc.retries < 3;
    if (overdue) { inc.retries++; inc.deadline = W.now + FLEET.deadline * .6; need = Math.max(need, 1); }
    while (need > 0) {
      const p = this.nearestPatrol(W.units, inc);
      if (p) { p.inc = inc.id; p.assignedT = W.now; need--; continue; }
      if (this.spawnCd > 0 || (W.carCount >= FLEET.cap[W.stars] && !overdue)) break;
      const u = W.spawn(inc); this.spawnCd = FLEET.delay[W.stars];
      if (u) { u.inc = inc.id; u.assignedT = W.now; need--; } else break;
      break;                                                          // one spawn per tick keeps arrivals staggered
    }
    return inc;
  }
  nearestPatrol(units, inc) {
    let best = null, bd = FLEET.patrolRange;
    for (const u of units) { if (!u.alive || !u.patrol || u.inc != null) continue; const d = Math.hypot(u.x - inc.x, u.z - inc.z); if (d < bd) { bd = d; best = u; } }
    return best;
  }
}

/** Pick where a unit appears: a road node in the distance band that the player can't see, nearest to the middle of the band. */
export function pickSpawn(nodes, ctx) {
  const [lo, hi] = ctx.band; let best = null, bs = 1e9;
  for (const n of nodes) {
    const d = Math.hypot(n.x - ctx.px, n.z - ctx.pz); if (d < lo || d > hi) continue;
    if (ctx.visible(n.x, n.z)) continue;
    const s = Math.abs(d - (lo + hi) / 2) + (n.penalty || 0); if (s < bs) { bs = s; best = n; }
  }
  if (best || !ctx.relax) return best;
  for (const n of nodes) {                                           // nothing hidden in the band: widen it, then accept a far visible spot
    const d = Math.hypot(n.x - ctx.px, n.z - ctx.pz); if (d < lo * .8) continue;
    const s = (ctx.visible(n.x, n.z) ? 400 : 0) + Math.abs(d - hi); if (s < bs) { bs = s; best = n; }
  }
  return best;
}
