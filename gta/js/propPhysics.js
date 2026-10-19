// Street-prop physics rules (pure: no rendering). Every kind of prop has a category and a few tunable numbers; an impact is
// reduced to a speed along the line of contact, and `resolveImpact` says what happens. `stepFall` / `stepSlide` are the
// tiny integrators the scene side runs for knocked-over and pushed props.
//
// categories:  static      buildings, big supports, big trees: never move, the car collides normally
//              destructible solid until hit hard enough, then it bends or falls over (lamp posts, traffic lights, signs, hydrants...)
//              pushable    gets shoved along and tipped (cones, bins, benches, dumpsters); heavy ones need speed to budge
//              breakable   gives way in a few pieces (wooden fences, kiosks)
export const CAR_MASS = 1300;
export const DEFS = {
  cone:     { cat: 'pushable',    mass: 2,   r: .28, h: .7,  thr: 0,  tip: 'lying', fr: 2.4 },
  trash:    { cat: 'pushable',    mass: 14,  r: .32, h: .85, thr: 0,  tip: 'lying', fr: 2.2 },
  crate:    { cat: 'pushable',    mass: 25,  r: .45, h: .8,  thr: 0,  tip: 'flat',  fr: 3.2 },
  bench:    { cat: 'pushable',    mass: 70,  r: .7,  h: .8,  thr: 3,  tip: 'flat',  fr: 3.6 },
  dumpster: { cat: 'pushable',    mass: 320, r: 1.0, h: 1.4, thr: 6,  tip: 'flat',  fr: 4.5 },
  hydrant:  { cat: 'destructible', mass: 60, r: .3,  h: .8,  bend: 99, fall: 14 },
  meter:    { cat: 'destructible', mass: 15, r: .18, h: 1.3, bend: 4,  fall: 7 },
  sign:     { cat: 'destructible', mass: 12, r: .14, h: 2.6, bend: 4,  fall: 6.5 },
  lamp:     { cat: 'destructible', mass: 110, r: .28, h: 6.4, bend: 7, fall: 11 },
  tlight:   { cat: 'destructible', mass: 90, r: .24, h: 4.6, bend: 8,  fall: 12.5 },
  sapling:  { cat: 'destructible', mass: 80, r: .45, h: 4,   bend: 11, fall: 16 },
  shelter:  { cat: 'breakable',   mass: 160, r: 1.5, h: 2.6, brk: 9 },
  kiosk:    { cat: 'breakable',   mass: 120, r: .9,  h: 2.2, brk: 11 },
  fence:    { cat: 'breakable',   mass: 25,  r: .35, h: 1,   brk: 5 },
  tree:     { cat: 'static', r: .5 },
  building: { cat: 'static' }
};
/**
 * What does a car doing `speed` (m/s, along the contact normal) do to a prop of this kind?
 * outcome: 'solid' (collide normally) | 'push' | 'bend' | 'fall' | 'break' | 'none'
 * keep: fraction of the car's speed that survives the hit (light props barely slow it, heavy ones take more).
 */
export function resolveImpact(kind, speed, carMass) {
  const d = DEFS[kind]; carMass = carMass || CAR_MASS; speed = Math.max(0, speed);
  if (!d || d.cat === 'static') return { outcome: 'solid', keep: 0 };
  const share = d.mass ? d.mass / (d.mass + carMass) : 0;
  if (d.cat === 'pushable') {
    if (speed < (d.thr || 0)) return { outcome: 'solid', keep: 0 };      // a heavy thing hit too gently: the car just stops against it
    return { outcome: 'push', keep: 1 - share * 1.6, vel: speed * (1 - share) * (d.mass > 100 ? .5 : .9) };
  }
  if (d.cat === 'breakable') {
    if (speed < d.brk) return { outcome: 'solid', keep: 0 };
    return { outcome: 'break', keep: 1 - Math.min(.3, share * 2.2 + .06), vel: speed * .6 };
  }
  if (speed >= d.fall) return { outcome: 'fall', keep: 1 - Math.min(.35, share * 2 + .08), vel: speed };
  if (speed >= d.bend) return { outcome: 'bend', keep: 1 - Math.min(.45, share * 3 + .12), vel: speed };
  return { outcome: 'solid', keep: 0 };
}

/** Component of the car's motion toward the prop. dir = unit vector from car to prop, fwd = car heading. */
export function approachSpeed(speed, fx, fz, dx, dz) {
  const l = Math.hypot(dx, dz) || 1; return speed * Math.max(0, (fx * dx + fz * dz) / l);
}

/**
 * Tip a tall prop over about its foot. s = { th, w, target, state }: th is the lean from upright (rad), w its rate.
 * 'fall' rotates until the prop lies on the ground (th = PI/2) with a small bounce, then rests; 'bend' eases to a lean.
 * Returns true while still moving.
 */
export function stepFall(s, dt, h) {
  if (s.rest) return false;
  const L = Math.max(.5, (h || 3) * .6), g = 9.8;
  if (s.mode === 'bend') {                                            // spring toward the leaning pose, damped so it settles
    const a = (s.target - s.th) * 60 - s.w * 9; s.w += a * dt; s.th += s.w * dt;
    if (Math.abs(s.target - s.th) < .01 && Math.abs(s.w) < .05) { s.th = s.target; s.rest = true; return false; } return true;
  }
  s.w += (g / L) * Math.sin(Math.max(.06, s.th)) * 1.1 * dt; s.th += s.w * dt;
  const floor = Math.PI / 2;
  if (s.th >= floor) {
    s.th = floor;
    if (s.w > 1.2 && (s.bounces = (s.bounces || 0) + 1) < 3) s.w = -s.w * .28; else { s.w = 0; s.rest = true; return false; }
  }
  return true;
}
/** Slide a pushed prop: velocity decays with friction; returns true while moving. s = { x, z, vx, vz, spin } */
export function stepSlide(s, dt, fr) {
  const sp = Math.hypot(s.vx, s.vz); if (sp < .12 && Math.abs(s.spin) < .1) { s.vx = s.vz = s.spin = 0; s.rest = true; return false; }
  s.x += s.vx * dt; s.z += s.vz * dt; const f = Math.exp(-(fr || 2.5) * dt); s.vx *= f; s.vz *= f; s.spin *= Math.exp(-3 * dt); return true;
}
/** Velocity handed to a pushed prop: the car's direction of travel, scaled; capped so nothing is launched. */
export function pushVelocity(kind, speed, fx, fz) {
  const d = DEFS[kind], r = resolveImpact(kind, speed), v = Math.min(14, (r.vel || speed) * (d && d.mass < 20 ? 1.15 : 1));
  return [fx * v, fz * v];
}
