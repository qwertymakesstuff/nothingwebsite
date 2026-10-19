// Crime catalogue and ledger (pure: no rendering, no game state). Every wrong-doing is reported here as a typed event with
// location, severity, witnesses and visibility; the ledger turns it into wanted heat. Harmless things report nothing.
export const CRIMES = {
  gunshot:         { sev: 1, heat: 15, violent: true,  label: 'shots fired' },
  assault:         { sev: 1, heat: 16, violent: true,  label: 'assault' },
  injure:          { sev: 2, heat: 20, violent: true,  label: 'serious assault' },
  murder:          { sev: 2, heat: 28, violent: true,  label: 'murder' },
  hit_and_run:     { sev: 2, heat: 24, violent: true,  label: 'hit and run' },
  steal_car:       { sev: 1, heat: 15, violent: false, label: 'car theft' },
  carjack:         { sev: 2, heat: 28, violent: true,  label: 'carjacking' },
  collision:       { sev: 1, heat: 10, violent: false, label: 'reckless driving' },
  assault_cop:     { sev: 3, heat: 32, violent: true,  label: 'assault on an officer', cop: true },
  kill_cop:        { sev: 4, heat: 48, violent: true,  label: 'officer down', cop: true },
  attack_cop_car:  { sev: 3, heat: 22, violent: true,  label: 'attack on a police vehicle', cop: true },
  destroy_cop_car: { sev: 4, heat: 40, violent: true,  label: 'police vehicle destroyed', cop: true },
  steal_cop_car:   { sev: 3, heat: 40, violent: false, label: 'stolen police car', cop: true },
  vandalism:       { sev: 1, heat: 6,  violent: false, label: 'property damage' },
  resist_arrest:   { sev: 1, heat: 12, violent: false, label: 'fleeing arrest', cop: true }
};
export const STAR_AT = [15, 45, 90, 150, 230];
export const starsFor = heat => STAR_AT.filter(t => heat >= t).length;

export function makeCrime(type, ctx) {
  const d = CRIMES[type]; if (!d) return null;
  return { id: 0, type, sev: d.sev, violent: d.violent, cop: !!d.cop, label: d.label, x: ctx.x, z: ctx.z, time: ctx.time || 0, witnesses: ctx.witnesses || 0, heard: ctx.heard || 0, visible: !!ctx.visible, copSaw: !!ctx.copSaw, suspect: ctx.visible || ctx.copSaw ? 'player' : 'unknown', pursued: !!ctx.pursued };
}
/** A crime is reported when somebody saw it, heard it, or it was done to the police. */
export const isReported = c => c.cop || c.witnesses > 0 || c.heard > 0 || c.copSaw;

export class CrimeLedger {
  constructor() { this.reset(); }
  reset() { this.last = {}; this.nextId = 1; this.history = []; this.lastViolent = -1e9; this.lastCop = -1e9; }
  /** Returns { crime, heat } or null when nobody noticed. Repeats of the same crime within a few seconds count for less. */
  report(type, ctx) {
    const c = makeCrime(type, ctx); if (!c || !isReported(c)) return null;
    const d = CRIMES[type], prev = this.last[type]; let heat = d.heat;
    if (prev != null && c.time - prev < 4) heat *= .25;                 // a burst of the same thing: the extra shots/blows add little
    if (!c.visible && !c.copSaw && !c.cop) heat *= .7;                  // only heard, not seen
    if (c.pursued) heat *= 1.5;                                         // committing crimes while being chased escalates
    heat = Math.round(heat);
    this.last[type] = c.time; c.id = this.nextId++; c.heat = heat;
    if (d.violent) this.lastViolent = c.time; if (d.cop) this.lastCop = c.time;
    this.history.push(c); if (this.history.length > 40) this.history.shift();
    return { crime: c, heat };
  }
  violentAgo(now) { return now - this.lastViolent; }
  copAttackAgo(now) { return now - this.lastCop; }
}
