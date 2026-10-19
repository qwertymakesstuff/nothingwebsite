// The police: patrols, dispatch, cruisers that chase along the road graph, officers on foot who warn, arrest, chase or shoot.
// Decisions live in copAI.js (state machine), dispatch.js (who goes where) and crime.js (what counts as a crime); this file moves things.
import { scene } from './render.js';
import { N, RD, WORLD } from './layout.js';
import { nodePos, nearestNode, nodePath, LANE } from './roads.js';
import { pushOut } from './city.js';
import { G, starsOf, bump } from './state.js';
import { STAR_AT } from './crime.js';
import { clamp, rand, pick, angDiff } from './util.js';
import { sfx, setSiren } from './audio.js';
import { tracer, smoke } from './effects.js';
import { env } from './environment.js';
import { quality } from './settings.js';
import { cars, makeCar, removeCar, driveCar, showDriver, carDist, hurtCar } from './vehicles.js';
import { player, hurtPlayer } from './player.js';
import { layDown, dropItem } from './people.js';
import { createCharacter, officerSpec } from './models/characters.js';
import { busted } from './lifecycle.js';
import { banner, say } from './ui.js';
import { S, TUNE, aggro, officerNext, carNext, arrestStep, evadeStep, evadedEnough } from './copAI.js';
import { Dispatcher, FLEET, pickSpawn } from './dispatch.js';
import { los, visibleToPlayer, reportCrime, ledger } from './reporting.js';

export const officers = [];
export const dispatcher = new Dispatcher();
/** what the whole force knows: the last place the suspect was seen, whether anyone sees them now, how long they have been hidden */
export const intel = { tipT: -99, contact: false, lastKnown: null, seen: false, evade: 0, hold: 0, warnT: -99, rbCd: 8, patrolCd: 0, blockers: 0, phase: 'none' };
const MAX_OFFICERS = 10;
const nodes = []; for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) { const p = nodePos(a, b); nodes.push({ x: p[0], z: p[1], a, b }); }

/** cruisers that are alive and driven by the police AI (the player's car and wrecks don't count) */
export const copCars = () => cars.filter(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && c.cop);
export const copsNearby = () => intel.seen;

/* ---- what the suspect is doing (computed once per game frame) ---- */
let SN = null, snT = -1;
function snap() {
  if (SN && snT === G.time) return SN; snT = G.time;
  const c = player.car, sp = c ? Math.abs(c.speed) : Math.hypot(player.vx, player.vz);
  SN = { x: player.x, z: player.z, car: c, inCar: !!c, speed: sp, driving: !!c && sp > 5, vx: c ? Math.sin(c.yaw) * c.speed : player.vx, vz: c ? Math.cos(c.yaw) * c.speed : player.vz };
  return SN;
}
/** distance to the suspect, to the car's body when they are in a car (officers can only reach the side of it) */
const distTo = (x, z) => { const s = snap(); return s.car ? Math.max(0, carDist(s.car, x, z) + 1.2) : Math.hypot(s.x - x, s.z - z); };
const hidden = (x, z) => !visibleToPlayer(x, z);

/** can this unit see the suspect? re-checked a few times a second */
function perceive(k, x, z, dt) {
  k.look -= dt;
  if (k.look <= 0) {
    k.look = .2 + Math.random() * .12; const s = snap(), d = Math.hypot(s.x - x, s.z - z);
    k.sees = !G.interior && d < TUNE.vision[Math.max(1, G.stars)] * (1 - .3 * env.night) && los(x, z, s.x, s.z);
    if (k.sees) k.lastSeen = { x: s.x, z: s.z, t: G.time };       // where they actually were when this unit looked
  }
  if (k.sees) k.unseenT = 0; else k.unseenT += dt;
}
function worldFor(k, x, z) {
  const s = snap(), d = distTo(x, z);
  return { stars: G.stars, dist: d, sees: k.sees, speed: s.speed, inCar: s.inCar, driving: s.driving, canArrest: k.sees && d <= TUNE.arrestDist + .2, copAttackAgo: ledger.copAttackAgo(G.time), passed: false };
}

/* ---- units ---- */
function newCop(state) { return { state, stT: 0, rep: 0, look: Math.random() * .2, sees: false, unseenT: 0, path: [], inc: null, extra: false, slot: 0, role: 'chase', px: 0, pz: 0, pT: 0, stuck: 0, rec: 0, recDir: 1, blockT: 0, deployed: false, crewOut: 0, disabled: false, tgt: null, alive: true, patrol: false, assignedT: 0, x: 0, z: 0, id: 0 }; }
let unitId = 1;
function makeCop(x, z, yaw, state) {
  const c = makeCar(x, z, yaw, 'cop', 0x1c2a4a); c.driver = 'cop'; c.cop = newCop(state); c.cop.id = unitId++; showDriver(c, true); return c;
}
const axisYaw = (dx, dz) => Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dz > 0 ? 0 : Math.PI);
function spawnAt(n, toward, state) {
  const yaw = axisYaw(toward.x - n.x, toward.z - n.z), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;   // along the road towards the target, in the right-hand lane
  for (const s of [0, -10, 10, -22, 22]) {
    const x = n.x + fx * s + rx * LANE, z = n.z + fz * s + rz * LANE;
    if (cars.some(o => !o.wreck && Math.abs(o.y) < 2 && Math.hypot(o.x - x, o.z - z) < 6.5)) continue;
    const c = makeCop(x, z, yaw, state); c.speed = 6; return c;
  }
  return null;
}
/** a response unit out of the player's sight, near the incident, at a distance that suits the wanted level */
function dispatchSpawn(inc) {
  const st = Math.max(1, G.stars), band = FLEET.band[st], ref = inc || snap();
  const live = copCars(), list = nodes.filter(n => Math.hypot(n.x - player.x, n.z - player.z) > 70).map(n => ({ x: n.x, z: n.z, penalty: Math.random() * 30 + live.reduce((s, c) => s + (Math.hypot(c.x - n.x, c.z - n.z) < 90 ? 70 : 0), 0) }));   // spread the units over different approach roads
  const bad = new Set();
  for (let t = 0; t < 8; t++) {
    const w = Math.floor(t / 2), n = pickSpawn(list.filter(m => !bad.has(m)), { px: ref.x, pz: ref.z, band: [band[0] + w * 20, band[1] + w * 40], visible: visibleToPlayer, relax: t === 7 });
    if (!n) continue; const c = spawnAt(n, ref, S.RESPONDING); if (c) { c.cop.extra = true; return c.cop; } bad.add(n);
  }
  return null;
}
/** old entry point (and the debug handle): add one cruiser to the response */
export function spawnCop() { const k = dispatchSpawn(dispatcher.current()); if (k) { const inc = dispatcher.current(); if (inc) { k.inc = inc.id; k.assignedT = G.time; } } return k ? cars.find(c => c.cop === k) : null; }
function patrolSpawn() {
  const n = pickSpawn(nodes.filter(m => Math.hypot(m.x - player.x, m.z - player.z) > 100), { px: player.x, pz: player.z, band: [130, 290], visible: visibleToPlayer, relax: false });
  if (!n) return; const t = pick(nodes), c = spawnAt(n, t, S.PATROLLING); if (c) { c.cop.patrol = true; c.cop.look = 9; }
}

/* ---- driving ---- */
/** distance to the nearest car in the cone ahead (or 99) */
function blockerAhead(c) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let best = 99;
  for (const o of cars) {
    if (o === c || o.wreck || Math.abs(o.y - c.y) > 2.5) continue;
    const dx = o.x - c.x, dz = o.z - c.z, al = dx * fx + dz * fz;
    if (al < 0 || al > 9 + c.speed * 1.1) continue;
    const lat = Math.abs(dx * fz - dz * fx); if (lat < c.cr + o.cr + .6 && al < best) best = al;
  }
  return best;
}
/** steer a cruiser at a point: speed limit, braking for cars ahead, and a reverse-and-turn recovery when wedged */
function steer(c, k, gx, gz, dt, vmax) {
  const diff = angDiff(Math.atan2(gx - c.x, gz - c.z), c.yaw), ad = Math.abs(diff);
  if (k.rec > 0) { k.rec -= dt; driveCar(c, -1, k.recDir, false, dt); return; }
  let thr = ad > 1.4 ? .3 : ad > .8 ? .6 : 1, brake = false;
  if (c.speed > vmax) { thr = 0; brake = c.speed > vmax + 4; }
  const ahead = blockerAhead(c);
  const gap = 4 + Math.max(0, c.speed) * .55;                         // keep about half a second behind whatever is ahead
  if (ahead < gap + 6) { thr = Math.min(thr, ahead < gap ? -.4 : .25); brake = brake || (ahead < gap * .8 && c.speed > 2); }
  if (ahead < 11) k.blockT += dt; else k.blockT = Math.max(0, k.blockT - dt);
  k.pT += dt;
  if (k.pT >= 2) { // making progress? a car stuck on a wall or a pile-up backs out, tries another route, and as a last resort is replaced
    const moved = Math.hypot(c.x - k.px, c.z - k.pz); k.px = c.x; k.pz = c.z; k.pT = 0;
    if (moved < 1.6 && vmax > 3 && (ahead > 5 || k.blockT > 5)) { k.stuck++; k.rec = 1 + Math.random() * .8; k.recDir = -Math.sign(diff) || 1; k.blockT = 0; if (k.stuck >= 2) { k.path = []; k.rep = 0; } }
    else if (moved > 6) k.stuck = 0;
  }
  driveCar(c, thr, clamp(-diff * 2.2, -1, 1), brake, dt);
}
function pathGoal(c, k, tx, tz, direct) {
  const d = Math.hypot(tx - c.x, tz - c.z), aligned = Math.abs(tx - c.x) < 6 || Math.abs(tz - c.z) < 6;
  if (direct || (d < 38 && aligned)) return [tx, tz, 99];
  if (k.rep <= 0 || !k.path.length) { k.path = nodePath(nearestNode(c.x, c.z), nearestNode(tx, tz), c.layer === 1); k.rep = 1.2 + Math.random() * .6; }
  while (k.path.length) {
    const p = nodePos(k.path[0][0], k.path[0][1]), dn = Math.hypot(p[0] - c.x, p[1] - c.z);
    let limit = 99, turning = false;                                  // slow down for the turn at the next junction instead of ploughing into the corner
    if (k.path.length > 1) { const q = nodePos(k.path[1][0], k.path[1][1]), turn = Math.abs(angDiff(Math.atan2(q[0] - p[0], q[1] - p[1]), Math.atan2(p[0] - c.x, p[1] - c.z))); if (turn > .5) { turning = true; limit = 5 + dn * .4; } }
    if (dn < (turning ? 6.5 : 9)) { k.path.shift(); continue; }       // start the turn about a road half-width before the junction centre
    return [p[0], p[1], limit];
  }
  return [tx, tz, 99];
}
const navTo = (c, k, tx, tz, dt, vmax, direct) => { const g = pathGoal(c, k, tx, tz, direct); steer(c, k, g[0], g[1], dt, Math.min(vmax, g[2])); };

function enterCar(c, k, ns) {
  k.state = ns; k.stT = 0; k.path = []; k.rep = 0; k.tgt = null;
  if (ns === S.INVESTIGATING) k.deployed = false;
  if (ns === S.PURSUING_IN_VEHICLE) { const roles = G.stars >= 3 ? ['chase', 'intercept', 'flank', 'intercept', 'flank', 'chase'] : G.stars === 2 ? ['chase', 'intercept'] : ['chase']; k.role = roles[k.slot % roles.length]; }
}
const incidentSpot = k => { const inc = dispatcher.incidents.find(i => i.id === k.inc); return intel.lastKnown || (inc ? { x: inc.x, z: inc.z } : snap()); };
const randomNodeNear = (x, z, r) => { const a = nearestNode(x, z), b = [clamp(a[0] + Math.round(rand(-r, r)), 0, N), clamp(a[1] + Math.round(rand(-r, r)), 0, N)]; return nodePos(b[0], b[1]); };

/** per-frame brain of one cruiser (called from vehicles.updateCars) */
export function updateCop(c, dt) {
  const k = c.cop; if (!k) return;
  k.stT += dt; k.rep -= dt; k.crewOut = officers.reduce((n, o) => n + (o.car === c && !o.dead ? 1 : 0), 0);
  if (G.mode !== 'playing') { driveCar(c, 0, 0, true, dt); return; }
  if (c.hp < 25 && !k.disabled) disable(c, k);                       // smashed up: the crew gets out and the car is finished
  if (k.disabled) { driveCar(c, 0, 0, true, dt); if (Math.random() < dt * 2) smoke(c.x, c.z); if (G.stars === 0 && k.stT > 25 && hidden(c.x, c.z)) removeCar(c); return; }
  if (k.stuck >= 4 && k.state !== S.BLOCKING && Math.hypot(c.x - player.x, c.z - player.z) > 60 && hidden(c.x, c.z)) { removeCar(c); return; }   // hopelessly wedged out of sight: dispatch sends a replacement
  perceive(k, c.x, c.z, dt);
  const s = snap(), w = worldFor(k, c.x, c.z); w.dist = Math.hypot(s.x - c.x, s.z - c.z);
  if (k.state === S.BLOCKING) { const hx = k.hx || 0, hz = k.hz || 0; w.passed = (c.x - s.x) * hx + (c.z - s.z) * hz < -40; }
  if (!(k.state === S.PATROLLING && k.inc == null)) { const ns = carNext(k, w); if (ns !== k.state) enterCar(c, k, ns); }
  switch (k.state) {
    case S.PATROLLING: return patrol(c, k, dt);
    case S.RESPONDING: {
      const spot = incidentSpot(k); navTo(c, k, spot.x, spot.z, dt, k.sees ? 40 : 30);
      if (!k.sees && Math.hypot(spot.x - c.x, spot.z - c.z) < 16 && k.stT > 2) enterCar(c, k, S.SEARCHING_LAST_KNOWN_LOCATION);   // reached the scene, nobody there
      return;
    }
    case S.PURSUING_IN_VEHICLE: return pursue(c, k, s, dt);
    case S.INVESTIGATING: {
      driveCar(c, 0, 0, true, dt);
      if (!k.deployed && Math.abs(c.speed) < 2) { k.deployed = true; deployCrew(c, k); }
      return;
    }
    case S.SEARCHING_LAST_KNOWN_LOCATION: {
      const lk = intel.lastKnown || s; if (!k.tgt || Math.hypot(k.tgt[0] - c.x, k.tgt[1] - c.z) < 14) k.tgt = Math.random() < .35 ? [lk.x, lk.z] : randomNodeNear(lk.x, lk.z, 2 + Math.floor(G.stars / 2));
      return navTo(c, k, k.tgt[0], k.tgt[1], dt, 17);
    }
    case S.RETURNING_TO_PATROL: {
      if (k.crewOut > 0) { driveCar(c, 0, 0, true, dt); return; }       // wait for the officers to climb back in
      if (!k.tgt || Math.hypot(k.tgt[0] - c.x, k.tgt[1] - c.z) < 14) k.tgt = randomNodeNear(c.x, c.z, 3);
      navTo(c, k, k.tgt[0], k.tgt[1], dt, 13);
      if (G.stars === 0 && k.stT > 4) { if (k.extra && hidden(c.x, c.z) && Math.hypot(c.x - player.x, c.z - player.z) > 80) { removeCar(c); return; } k.inc = null; k.state = S.PATROLLING; k.stT = 0; k.path = []; }
      return;
    }
    case S.BLOCKING: {
      driveCar(c, 0, 0, true, dt);
      if (!k.deployed) { k.deployed = true; deployCrew(c, k, true); }
      return;
    }
  }
}
function patrol(c, k, dt) {
  if (!k.tgt || Math.hypot(k.tgt[0] - c.x, k.tgt[1] - c.z) < 14) k.tgt = randomNodeNear(c.x, c.z, 4);
  const g = pathGoal(c, k, k.tgt[0], k.tgt[1], false); const dx = g[0] - c.x, dz = g[1] - c.z, d = Math.hypot(dx, dz) || 1;
  const ax = Math.abs(dx) > Math.abs(dz), rx = ax ? 0 : (dz > 0 ? -1 : 1), rz = ax ? (dx > 0 ? 1 : -1) : 0;   // keep to the right-hand lane like the traffic
  steer(c, k, g[0] + (d > 9 ? rx * LANE * .5 : 0), g[1] + (d > 9 ? rz * LANE * .5 : 0), dt, 11);
  if (Math.hypot(c.x - player.x, c.z - player.z) > 380 && hidden(c.x, c.z)) removeCar(c);
}
/** pursuit by role: one cruiser chases, others cut in ahead of the suspect or run alongside, so they don't all take the same line */
function pursue(c, k, s, dt) {
  const lk = k.sees || intel.seen ? s : (intel.lastKnown || s), d = Math.hypot(lk.x - c.x, lk.z - c.z), vmax = 30 + G.stars * 2.2;
  let tx = lk.x, tz = lk.z, direct = false;
  const sp = Math.hypot(s.vx, s.vz) || 1, hx = s.vx / sp, hz = s.vz / sp;
  if (k.role === 'intercept' && s.speed > 6 && d > 35) { tx = clamp(lk.x + s.vx * 3.2, 5, WORLD - 5); tz = clamp(lk.z + s.vz * 3.2, 5, WORLD - 5); }
  else if (k.role === 'flank' && s.speed > 6 && d < 55) { const side = k.slot % 2 ? 1 : -1; tx = lk.x - hx * 5 - hz * 4.6 * side; tz = lk.z - hz * 5 + hx * 4.6 * side; direct = d < 30; }
  else { tx = lk.x + s.vx * .3; tz = lk.z + s.vz * .3; }
  navTo(c, k, tx, tz, dt, vmax, direct);
}
function disable(c, k) {
  k.disabled = true; k.alive = false; k.inc = null; deployCrew(c, k, false, true);
  for (const o of officers) if (o.car === c) o.car = null;           // the crew can't drive it away any more
}
/** hit by the player's car or by the law of crashes: finished cruisers have no driver any more */
function deployCrew(c, k, fixed, noCar) {
  const n = G.stars >= 3 || fixed ? 2 : 1;
  for (let i = 0; i < n && officers.length < MAX_OFFICERS; i++) officerFrom(c, i, fixed);
}
function officerFrom(c, i, fixed) {
  const ch = createCharacter(officerSpec()), side = fixed ? -1 : 1, rx = Math.cos(c.yaw) * side, rz = -Math.sin(c.yaw) * side, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const away = fixed ? 1.6 : 0, hx = c.cop.hx || 0, hz = c.cop.hz || 0;
  const o = { x: c.x + rx * (c.cr + 1.1 + away) + fx * (i * 1.7 - .6) + hx * away, z: c.z + rz * (c.cr + 1.1 + away) + fz * (i * 1.7 - .6) + hz * away, hp: 60, ch, mesh: ch.root, shotCd: rand(.6, 1.6), car: c, yaw: c.yaw, dead: 0, cur: 0, state: S.INVESTIGATING, stT: 0, look: Math.random() * .2, sees: false, unseenT: 0, hold: 0, grabT: 0, fixed: !!fixed, tgt: null, warned: false, fled: false };
  scene.add(ch.root); const r = pushOut(o.x, o.z, .5); o.x = r[0]; o.z = r[1]; officers.push(o); showDriver(c, false); ch.update(0, 0, {});
}

/* ---- officers on foot ---- */
function walk(o, tx, tz, sp, dt) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < .05) { o.cur = 0; return d; }
  const st = Math.min(d, sp * dt); let x = o.x + dx / d * st, z = o.z + dz / d * st;
  for (const c of cars) { if (c.wreck) continue; const cd = carDist(c, x, z); if (cd < .45) { const px = x - c.x, pz = z - c.z, pl = Math.hypot(px, pz) || 1; x += px / pl * (.45 - cd); z += pz / pl * (.45 - cd); } }
  const r = pushOut(x, z, .45); o.x = r[0]; o.z = r[1]; o.cur = sp; return d;
}
const face = (o, tx, tz) => { o.yaw = Math.atan2(tx - o.x, tz - o.z); };
function enterOfficer(o, ns, w) {
  const prev = o.state; o.state = ns; o.stT = 0; o.tgt = null;
  if (ns === S.ISSUING_WARNING && G.time - intel.warnT > 5) { intel.warnT = G.time; say('POLICE! STOP WHERE YOU ARE', 2.2); }
  if (ns === S.ATTEMPTING_ARREST && G.time - intel.warnT > 2) { intel.warnT = G.time; say('HOLD STILL: YOU ARE BEING ARRESTED', 2.2); }
  if (ns === S.PURSUING_ON_FOOT && !o.fled && (prev === S.ISSUING_WARNING || prev === S.ATTEMPTING_ARREST || prev === S.APPROACHING_SUSPECT) && w.speed > TUNE.runAway) { o.fled = true; reportCrime('resist_arrest'); say('STOP! POLICE!', 1.6); }
}
function updateOfficer(o, dt) {
  if (o.dead) return;
  o.shotCd -= dt; o.stT += dt; o.cur = 0;
  if (G.mode !== 'playing') { o.mesh.position.set(o.x, 0, o.z); o.mesh.rotation.y = o.yaw; o.ch.update(dt, 0, {}); return; }   // arrested or dead: everyone stands down
  perceive(o, o.x, o.z, dt); if (o.fixed && o.unseenT > 6) o.fixed = false;   // a roadblock crew that lost the suspect joins the search
  const s = snap(), w = worldFor(o, o.x, o.z);
  if (o.car && (o.car.wreck || !o.car.cop)) o.car = null;
  if (!o.fixed || w.stars === 0) { const ns = officerNext(o, w); if (ns !== o.state) enterOfficer(o, ns, w); }
  else if (o.sees && o.state !== S.ENGAGING_ACTIVE_THREAT && aggro(w)) enterOfficer(o, S.ENGAGING_ACTIVE_THREAT, w);
  const d = w.dist, lk = intel.lastKnown || s;
  let hands = false, aim = false;
  switch (o.state) {
    case S.APPROACHING_SUSPECT: face(o, s.x, s.z); walk(o, s.x, s.z, TUNE.walk, dt); break;
    case S.ISSUING_WARNING: {
      face(o, s.x, s.z); walk(o, s.x, s.z, d > 1.9 ? TUNE.walk * .8 : 0, dt);
      if (G.time - intel.warnT > 6 && d < 12) { intel.warnT = G.time; say('PUT YOUR HANDS UP. STAY STILL', 2); }
      break;
    }
    case S.ATTEMPTING_ARREST: {
      face(o, s.x, s.z); const before = o.hold; o.hold = arrestStep(o.hold, w, dt); intel.hold = Math.max(intel.hold, o.hold / TUNE.holdTime);
      if (o.hold >= TUNE.holdTime && before < TUNE.holdTime) arrest(o);
      break;
    }
    case S.PURSUING_ON_FOOT: {
      face(o, s.x, s.z); walk(o, s.x, s.z, TUNE.run, dt);
      if (d <= TUNE.grabDist + .3 && o.sees && !aggro(w)) { o.grabT += dt; if (o.grabT > .9) arrest(o); } else o.grabT = Math.max(0, o.grabT - dt);   // tackles the runner they catch up with
      break;
    }
    case S.ENGAGING_ACTIVE_THREAT: {
      face(o, s.x, s.z); aim = o.sees && d < TUNE.shootRange + 6;
      if (!o.fixed && d > 13) walk(o, s.x, s.z, TUNE.run * .8, dt); else if (!o.fixed && d < 7 && !s.car) walk(o, o.x - (s.x - o.x), o.z - (s.z - o.z), 2, dt);
      if (o.sees && d < TUNE.shootRange + 6 && o.shotCd <= 0) fireAt(o, s);
      break;
    }
    case S.INVESTIGATING: { const sp = incidentSpot({ inc: o.car && o.car.cop ? o.car.cop.inc : null }); if (Math.hypot(sp.x - o.x, sp.z - o.z) > 5) { face(o, sp.x, sp.z); walk(o, sp.x, sp.z, TUNE.walk, dt); } break; }
    case S.SEARCHING_LAST_KNOWN_LOCATION: {
      if (!o.tgt || Math.hypot(o.tgt[0] - o.x, o.tgt[1] - o.z) < 1.5) { const a = Math.random() * 6.283, r = 4 + Math.random() * (10 + G.stars * 3); o.tgt = [lk.x + Math.cos(a) * r, lk.z + Math.sin(a) * r]; }
      face(o, o.tgt[0], o.tgt[1]); walk(o, o.tgt[0], o.tgt[1], 3.4, dt); break;
    }
    case S.RETURNING_TO_PATROL: {
      const c = o.car;
      if (c && !c.wreck) { face(o, c.x, c.z); const dd = walk(o, c.x, c.z, 4.5, dt); if (dd < 2.6 + c.cr) { o.dead = -1; showDriver(c, true); sfx.door(); } }
      else if (G.stars === 0 && o.stT > 6 && Math.hypot(o.x - player.x, o.z - player.z) > 40) o.dead = -1;
      else if (!c && G.stars > 0 && o.stT > 2) { enterOfficer(o, S.SEARCHING_LAST_KNOWN_LOCATION, w); }
      break;
    }
  }
  // cars that run an officer over hurt them (and that is an assault on the police)
  const c = s.car; if (c && Math.abs(c.speed) > 5 && carDist(c, o.x, o.z) < .7) { c.speed *= .7; damageOfficer(o, Math.abs(c.speed) * 2.4, true); }
  o.mesh.position.set(o.x, 0, o.z); o.mesh.rotation.y = o.yaw; o.ch.update(dt, o.cur, { run: o.cur > 5, aim: aim && o.cur < .5 });
}
function fireAt(o, s) {
  o.shotCd = rand(.7, 1.3); sfx.shot(); const ok = Math.random() < (s.car ? .3 : .4) * (1 - Math.min(.6, distTo(o.x, o.z) / 60));
  tracer(o.x, 1.4, o.z, s.x + (ok ? 0 : rand(-2, 2)), 1.2, s.z + (ok ? 0 : rand(-2, 2)));
  if (ok) { if (s.car) hurtCar(s.car, 3); hurtPlayer(s.car ? 2 : 6); }
}
function arrest(o) {
  if (G.mode !== 'playing') return;
  bump('arrests'); busted('arrest');
}
export function damageOfficer(o, dmg, byCar) {
  if (o.dead) return; o.hp -= dmg;
  if (o.hp <= 0) { o.dead = 1; layDown(o.ch); dropItem('cash', o.x, o.z, 60); bump('copsKilled'); reportCrime('kill_cop', o.x, o.z); }
  else reportCrime('assault_cop', o.x, o.z);
  if (!intel.lastKnown) intel.lastKnown = { x: player.x, z: player.z, t: G.time };
}
/** called by the reporting module when a crime was noticed: the force now knows roughly where it happened */
export function noteCrime(crime) {
  if (crime.suspect === 'player' || crime.cop) intel.lastKnown = { x: crime.x, z: crime.z, t: G.time };
  else if (!intel.lastKnown) intel.lastKnown = { x: crime.x, z: crime.z, t: G.time };
}

/* ---- the force as a whole ---- */
function roadblock() {
  const s = snap(), c = s.car; if (!c || c.layer !== 0 || s.speed < 11 || G.stars < 4) return;
  const all = copCars(); if (all.length > FLEET.cap[G.stars] + 1 || all.some(c => c.cop.state === S.BLOCKING)) return;   // one roadblock at a time, on top of the normal force
  const sp = Math.hypot(s.vx, s.vz) || 1, hx = s.vx / sp, hz = s.vz / sp, ax = Math.abs(hx) > Math.abs(hz);
  const n = nearestNode(s.x + hx * 160, s.z + hz * 160), p = nodePos(n[0], n[1]);
  const along = ax ? Math.sign(hx) : Math.sign(hz), cx = p[0] - (ax ? along * (RD / 2 + 12) : 0), cz = p[1] - (ax ? 0 : along * (RD / 2 + 12));
  const dist = Math.hypot(cx - s.x, cz - s.z); if (dist < 100 || dist > 230) return;
  if (visibleToPlayer(cx, cz) && dist < 160) return;
  if (cars.some(o => !o.wreck && Math.hypot(o.x - cx, o.z - cz) < 9)) return;
  for (const off of [-4.7, 0, 4.7]) {
    const x = cx + (ax ? 0 : off), z = cz + (ax ? off : 0), k = makeCop(x, z, ax ? 0 : Math.PI / 2, S.BLOCKING).cop;
    k.extra = true; k.hx = hx; k.hz = hz; const inc = dispatcher.current(); if (inc) { k.inc = inc.id; k.assignedT = G.time; }
  }
  say('ROADBLOCK AHEAD', 1.8);
}
function releaseSurplus(units, stars) {
  const want = FLEET.want[stars] + 1, mine = units.filter(u => u.inc != null && u.alive && u.state !== S.BLOCKING);
  if (mine.length <= want) return;
  mine.sort((a, b) => Math.hypot(b.x - player.x, b.z - player.z) - Math.hypot(a.x - player.x, a.z - player.z));
  for (const u of mine.slice(0, mine.length - want)) if (!u.sees && u.state !== S.INVESTIGATING) { u.inc = null; const c = cars.find(q => q.cop === u); if (c) enterCar(c, u, S.RETURNING_TO_PATROL); }
}
export function updatePolice(dt) {
  const was = G.stars; G.stars = starsOf(G.heat);
  if (G.stars > was) banner('★'.repeat(G.stars) + ' WANTED', '#ff6', 1.6);
  const live = copCars();
  if (G.mode !== 'playing') { officers.forEach(o => updateOfficer(o, dt)); cleanOfficers(dt); setSiren(false, G.time); return; }
  const s = snap(), units = live.map(c => { const k = c.cop; k.x = c.x; k.z = c.z; k.alive = !k.disabled; k.patrol = k.inc == null && k.state === S.PATROLLING; return k; });
  // patrols keep the streets believable while there are no stars
  intel.patrolCd -= dt;
  const patrolCap = quality === 'low' ? 2 : 3;
  if (G.stars === 0 && intel.patrolCd <= 0) { intel.patrolCd = 3; if (units.filter(u => u.patrol || u.state === S.PATROLLING).length < patrolCap) patrolSpawn(); }
  if (G.stars === 0) { units.forEach(u => { if (u.inc != null && u.state !== S.BLOCKING) u.inc = null; }); }
  // who sees the suspect right now? the force shares what any unit sees (and loses them again when nobody does)
  const seen = units.some(u => u.sees && !u.disabled) || officers.some(o => !o.dead && o.sees);
  intel.seen = seen && G.stars > 0;
  if (intel.seen) {
    let best = null; for (const u of units) if (u.sees && u.lastSeen && (!best || u.lastSeen.t > best.t)) best = u.lastSeen;
    for (const o of officers) if (!o.dead && o.sees && o.lastSeen && (!best || o.lastSeen.t > best.t)) best = o.lastSeen;
    if (best) intel.lastKnown = best;
  }
  if (G.stars === 0) { intel.lastKnown = null; intel.evade = 0; intel.contact = false; }
  // the hiding clock only runs once the police have really made contact or reached the scene: nobody escapes before the first patrol arrives
  const cur = dispatcher.current(); if (intel.seen) intel.contact = true;
  if (!intel.contact && cur && cur.suspect === 'player' && G.time - cur.time < 25 && G.time - intel.tipT > 2.5) { intel.tipT = G.time; intel.lastKnown = { x: s.x, z: s.z, t: G.time }; }   // witnesses phone in where the suspect went, but only for a short while
  const evading = intel.contact || (cur && (cur.stage === 'ON_SCENE' || cur.stage === 'SEARCH'));
  intel.evade = evading ? evadeStep(intel.evade, intel.seen, G.stars, dt) : 0;
  if (evadedEnough(intel.evade, G.stars)) {                          // hidden for long enough: the heat drops a level, never to zero in one jump
    const st = G.stars; G.heat = st >= 2 ? STAR_AT[st - 2] : 0; G.stars = starsOf(G.heat); intel.evade = 0;
    if (G.stars === 0) { say('you lost them', 2.5); } else say('wanted level dropped: ' + '★'.repeat(G.stars), 2.2);
  }
  G.fuzz = 0;
  dispatcher.tick(dt, { stars: G.stars, now: G.time, suspect: s, units, seen: intel.seen, carCount: live.length, spawn: dispatchSpawn });
  if (G.stars > 0) releaseSurplus(units, G.stars);
  intel.rbCd -= dt; if (G.stars >= 4 && intel.rbCd <= 0) { intel.rbCd = 28; roadblock(); }
  intel.hold = 0; officers.forEach(o => updateOfficer(o, dt)); cleanOfficers(dt);
  const warn = officers.some(o => !o.dead && o.state === S.ISSUING_WARNING), holding = officers.some(o => !o.dead && o.state === S.ATTEMPTING_ARREST && o.hold > 0);
  intel.phase = G.stars === 0 ? 'none' : holding ? 'arrest' : warn ? 'warning' : intel.seen ? 'pursuit' : 'searching';
  G.wantedText = G.stars === 0 ? '' : holding ? 'HOLD STILL ' + Math.round(intel.hold * 100) + '%' : warn ? 'POLICE: STAND STILL TO SURRENDER' : intel.seen ? '' : 'SEARCHING ' + Math.min(99, Math.round(intel.evade / TUNE.loseTime[G.stars] * 100)) + '%';
  G.wantedPhase = intel.phase;
  setSiren(G.stars > 0 && live.some(c => Math.hypot(c.x - player.x, c.z - player.z) < 70), G.time);
}
function cleanOfficers(dt) {
  for (let i = officers.length - 1; i >= 0; i--) { const o = officers[i]; if (o.dead === -1) { scene.remove(o.mesh); officers.splice(i, 1); } else if (o.dead) { o.dead += dt; if (o.dead > 6) { scene.remove(o.mesh); officers.splice(i, 1); } } }
}
export function clearPolice() {
  officers.forEach(o => scene.remove(o.mesh)); officers.length = 0;
  copCars().forEach(removeCar); dispatcher.reset(); ledger.reset();
  Object.assign(intel, { tipT: -99, contact: false, lastKnown: null, seen: false, evade: 0, hold: 0, warnT: -99, rbCd: 8, patrolCd: 2, phase: 'none' });
  G.heat = 0; G.stars = 0; G.fuzz = 0; G.wantedText = ''; G.wantedPhase = 'none'; setSiren(false, 0);
}
