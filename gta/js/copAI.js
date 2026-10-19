// Police state machine (pure: no rendering). `w` is a snapshot of what the unit knows right now; each function returns the
// next state from actual events and distances. police.js does the moving, shooting and spawning.
export const S = {
  PATROLLING: 'PATROLLING', RESPONDING: 'RESPONDING', INVESTIGATING: 'INVESTIGATING', APPROACHING_SUSPECT: 'APPROACHING_SUSPECT',
  ISSUING_WARNING: 'ISSUING_WARNING', ATTEMPTING_ARREST: 'ATTEMPTING_ARREST', PURSUING_ON_FOOT: 'PURSUING_ON_FOOT',
  PURSUING_IN_VEHICLE: 'PURSUING_IN_VEHICLE', ENGAGING_ACTIVE_THREAT: 'ENGAGING_ACTIVE_THREAT',
  SEARCHING_LAST_KNOWN_LOCATION: 'SEARCHING_LAST_KNOWN_LOCATION', RETURNING_TO_PATROL: 'RETURNING_TO_PATROL',
  BLOCKING: 'BLOCKING'                                            // a roadblock cruiser holding its line
};
export const TUNE = {
  vision: [0, 70, 80, 90, 100, 110], visionNight: .7,            // how far a unit can see the suspect, by stars
  searchTime: [0, 10, 14, 18, 22, 26],                           // how long a unit searches the last known position
  loseTime: [0, 12, 18, 26, 36, 46],                             // unseen seconds before a star is dropped
  warnDist: 15, arrestDist: 2.6, grabDist: 1.5, holdTime: 2.2, walk: 2.3, run: 7.2, shootRange: 26,
  runAway: 6.5                                                    // suspect speed above this on foot counts as running
};
/** may officers use guns right now? Minor offences never get gunfire; a cop attacked, or three stars and up, does. */
export const aggro = w => w.stars >= 3 || (w.stars >= 2 && w.copAttackAgo < 25);

/** Next state of an officer on foot. */
export function officerNext(o, w) {
  const st = o.state;
  if (w.stars === 0) return st === S.RETURNING_TO_PATROL ? st : S.RETURNING_TO_PATROL;
  const ag = aggro(w), near = w.dist;
  if (st === S.RETURNING_TO_PATROL) return w.sees && near < 30 ? pickContact(o, w) : st;       // a unit heading back still reacts to a fresh sighting
  if (!w.sees) {
    if (st === S.SEARCHING_LAST_KNOWN_LOCATION) return o.stT > TUNE.searchTime[w.stars] ? S.RETURNING_TO_PATROL : st;
    if (st === S.INVESTIGATING) return o.unseenT > 4 && o.stT > 4 ? S.SEARCHING_LAST_KNOWN_LOCATION : st;   // got to the scene and found nobody
    return o.unseenT > 2.5 ? S.SEARCHING_LAST_KNOWN_LOCATION : st;
  }
  if (ag && near < TUNE.shootRange + 6) return S.ENGAGING_ACTIVE_THREAT;
  return pickContact(o, w);
}
function pickContact(o, w) {
  const st = o.state, near = w.dist;
  if (w.stars >= 3 && near < 26) return S.ENGAGING_ACTIVE_THREAT;
  if (st === S.ATTEMPTING_ARREST) {
    if (w.speed > TUNE.runAway || near > 6) return S.PURSUING_ON_FOOT;                          // the suspect bolted from the arrest
    if (near > TUNE.arrestDist + 1.4 || w.speed > 3) return S.APPROACHING_SUSPECT;
    return st;
  }
  if (w.inCar && w.speed > 9) return S.RETURNING_TO_PATROL;                                      // can't catch a car on foot: back to the cruiser
  if (w.speed > TUNE.runAway || st === S.PURSUING_ON_FOOT && near > TUNE.grabDist + .4 && w.speed > 2.5) return S.PURSUING_ON_FOOT;
  if (near <= TUNE.arrestDist && w.canArrest) return S.ATTEMPTING_ARREST;
  if (near <= TUNE.warnDist) return S.ISSUING_WARNING;
  return S.APPROACHING_SUSPECT;
}

/** Next state of a cruiser. */
export function carNext(c, w) {
  const st = c.state;
  if (st === S.BLOCKING) return c.stT > 30 || w.stars === 0 || w.passed ? S.PURSUING_IN_VEHICLE : st;
  if (w.stars === 0) return st === S.PATROLLING ? st : S.RETURNING_TO_PATROL;
  switch (st) {
    case S.PATROLLING: return S.RESPONDING;
    case S.RETURNING_TO_PATROL: return w.sees ? contactCar(c, w) : S.RESPONDING;
    case S.RESPONDING:
      if (w.sees) return contactCar(c, w);
      return st;
    case S.INVESTIGATING:                                       // parked with the crew out
      if (c.deployed && c.crewOut === 0) return S.RESPONDING;
      return st;
    case S.PURSUING_IN_VEHICLE:
      if (w.sees && !w.driving && w.dist < 40 && w.speed < TUNE.runAway + 2) return S.INVESTIGATING;  // the suspect is on foot: crew gets out
      if (!w.sees && c.unseenT > 4) return S.SEARCHING_LAST_KNOWN_LOCATION;
      return st;
    case S.SEARCHING_LAST_KNOWN_LOCATION:
      if (w.sees) return contactCar(c, w);
      return c.stT > TUNE.searchTime[w.stars] + 6 ? S.RETURNING_TO_PATROL : st;
  }
  return st;
}
function contactCar(c, w) {
  if (!w.driving && w.dist < 48) return S.INVESTIGATING;           // park up and send the officers
  return S.PURSUING_IN_VEHICLE;
}

/** Arrest progress for an officer in ATTEMPTING_ARREST: the suspect must stay still, in reach and in the open. */
export function arrestStep(hold, w, dt) {
  if (w.canArrest && w.speed < 1.4 && w.dist <= TUNE.arrestDist + .2) return Math.min(TUNE.holdTime, hold + dt);
  return Math.max(0, hold - dt * 2);
}
/** Lose-the-cops clock: counts up while nobody sees the suspect, drops a star at loseTime. Higher stars take longer. */
export function evadeStep(evade, seen, stars, dt) {
  if (stars === 0) return 0;
  if (seen) return Math.max(0, evade - dt * 3);
  return evade + dt;
}
export const evadedEnough = (evade, stars) => stars > 0 && evade >= TUNE.loseTime[stars];
