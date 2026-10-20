// Pedestrian behaviour in the world: perception, reactions, movement for every state, confrontations and fights, witnesses who phone the
// police, drivers who lose their temper. The decisions (personalities, the state machine, severities, chances) are in pedBrain.js and are
// unit-tested; this file connects them to people.js, vehicles, weapons, reporting and police.
//
// Shape of it: events are pushed in (a gunshot, a near miss, a crash, a killing); only pedestrians who could see or hear the event are
// told; each decides through its personality; the state machine in its brain then runs the behaviour with timeouts, so nobody stays
// scared, angry or on the phone for ever. Nothing runs for pedestrians who are far away, and heavy checks (line of sight) only run when
// an event actually happens.
import * as BR from './pedBrain.js';
import { G } from './state.js';
import { player, hurtPlayer } from './player.js';
import { cars, carDist, showDriver } from './vehicles.js';
import { peds, makePed, removePed } from './people.js';
import { los, fileCrimeReport } from './reporting.js';
import { officers } from './police.js';
import { pushOut } from './city.js';
import { N, B, P, RD, corner } from './layout.js';
import { walkBlocked } from './highway.js';
import { scene } from './render.js';
import { sfx } from './audio.js';
import { rand, pick, angDiff } from './util.js';
import { trafficTakeover } from './traffic.js';

const { S } = BR;
export const cfg = { enabled: true, alwaysReport: false, nearMiss: true, maxConflicts: 3, debug: false };
export const stats = { events: 0, reports: 0, fights: 0, nearMisses: 0, confrontations: 0 };
const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const now = () => G.time;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* ======================================================================= setup */
/** called for every pedestrian when it is made */
export function initPed(p, personality) {
  p.pers = personality || BR.makePersonality(); p.brain = new BR.Brain(); p.nextThink = Math.random() * .3; p.acc = 0; p.gest = null; p.dodge = null; p.dodgeCd = 0; p.from = [p.x, p.z]; p.buddy = null; p.report = null;
  return p;
}
const armedLately = () => player.aimT > 0 || G.time - lastShotT < 14;
let lastShotT = -99;
export const noteShot = () => { lastShotT = G.time; };
const playerArmedVisible = p => armedLately() && seesPoint(p, player.x, player.z, 40);

/* ======================================================================= perception */
/** can this pedestrian see a point: in range, roughly in front of them (or very close), and not behind a building */
export function seesPoint(p, x, z, range) {
  const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d > range) return false;
  if (d > 5 && Math.abs(angDiff(Math.atan2(dx, dz), p.yaw)) > 1.9) return false;     // behind them
  return d < 3 || los(p.x, p.z, x, z);
}

/* ======================================================================= speech bubbles (no voice assets: short lines as text above the head) */
const bubbles = [], tex = new Map();
function bubbleTexture(text) {
  let t = tex.get(text); if (t) return t;
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = 'bold 30px sans-serif'; const w = Math.ceil(g.measureText(text).width) + 28; c.width = w; c.height = 54;
  g.font = 'bold 30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.93)'; g.beginPath(); g.roundRect ? g.roundRect(2, 2, w - 4, 42, 14) : g.rect(2, 2, w - 4, 42); g.fill();
  g.beginPath(); g.moveTo(w / 2 - 7, 43); g.lineTo(w / 2, 53); g.lineTo(w / 2 + 7, 43); g.fill(); g.fillStyle = '#16161a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 24);
  t = { map: new THREE.CanvasTexture(c), w }; tex.set(text, t); if (tex.size > 60) { const k = tex.keys().next().value; tex.get(k).map.dispose(); tex.delete(k); } return t;
}
/** a short line above someone's head, with sound; rate-limited per pedestrian and in total */
export function speak(owner, kind, text, brain, secs) {
  const d = Math.hypot(owner.x - player.x, owner.z - player.z); if (d > 40) return false;
  if (brain && !brain.ready('speech', now(), 3.2)) return false;
  if (bubbles.length >= 5) return false;
  const line = text || BR.pickLine(kind, Math.random, brain && brain.data.lastLine); if (!line) return false; if (brain) brain.data.lastLine = line;
  const t = bubbleTexture(line), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.map, transparent: true, depthWrite: false }));
  sp.scale.set(t.w / 54 * .5, .5, 1); const parent = owner.mesh || owner.root || owner; sp.position.set(0, owner.cars ? 2.3 : 2.35, 0); parent.add(sp); sp.renderOrder = 10;
  bubbles.push({ sp, parent, t: 0, dur: secs || 2.3 });
  const v = Math.max(0, 1 - d / 40); if (kind === 'angry' || kind === 'nearmiss' || kind === 'taunt' || kind === 'leave') sfx.shout(v); else if (kind === 'flee' || kind === 'hurt') sfx.scream(); else sfx.shout(v * .6);
  return true;
}
function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.t += dt; if (b.t > b.dur || !b.parent.parent) { b.parent.remove(b.sp); b.sp.material.dispose(); bubbles.splice(i, 1); } else if (b.t > b.dur - .3) b.sp.material.opacity = (b.dur - b.t) / .3; }
}

/* ======================================================================= movement helpers */
function blockIndex(x, z) { return [Math.max(0, Math.min(N - 1, Math.floor((x - RD / 2) / P))), Math.max(0, Math.min(N - 1, Math.floor((z - RD / 2) / P)))]; }
/** the pavement corner nearest to a point, as { i, j, c, x, z } */
function nearestCorner(x, z) {
  const [bi, bj] = blockIndex(x, z); let best = null, bd = 1e9;
  for (let i = Math.max(0, bi - 1); i <= Math.min(N - 1, bi + 1); i++) for (let j = Math.max(0, bj - 1); j <= Math.min(N - 1, bj + 1); j++) for (let c = 0; c < 4; c++) { const q = corner(i, j, c), d = Math.hypot(q[0] - x, q[1] - z); if (d < bd && !walkBlocked(q[0], q[1])) { bd = d; best = { i, j, c, x: q[0], z: q[1] }; } }
  return best;
}
/** put a pedestrian back on the walking network at the nearest corner */
export function reanchor(p) {
  const q = nearestCorner(p.x, p.z); if (!q) return; p.i = q.i; p.j = q.j; p.nc = q.c; p.c = (q.c - p.dir + 4) % 4; p.tgt = [q.x, q.z]; p.from = [p.x, p.z];
}
const carsNear = (x, z, r) => cars.filter(c => !c.wreck && Math.abs(c.x - x) < r && Math.abs(c.z - z) < r && (Math.abs(c.speed) > 2.5 || c.driver === 'player'));
/** move towards a point at a speed; slides along walls, steps out of the way of moving cars and other people. Returns true when there. */
function stepTo(p, tx, tz, speed, dt, stop) {
  let dx = tx - p.x, dz = tz - p.z; const d = Math.hypot(dx, dz); stop = stop || 0; if (d <= stop + .05) { p.cur = 0; return true; }
  const m = Math.min(speed * dt, d - stop); dx /= d; dz /= d;
  let nx = p.x + dx * m, nz = p.z + dz * m;
  for (const c of carsNear(nx, nz, 5)) { const cd = carDist(c, nx, nz); if (cd < 1.3 && c.driver !== 'player' + 'x') { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), side = Math.sign((nx - c.x) * fz - (nz - c.z) * fx) || 1; nx += fz * side * 2.8 * dt; nz += -fx * side * 2.8 * dt; } }
  for (const o of peds) { if (o === p || o.dead) continue; const ox = nx - o.x, oz = nz - o.z; if (Math.abs(ox) < .6 && Math.abs(oz) < .6) { const od = Math.hypot(ox, oz) || .01; if (od < .55) { nx += ox / od * 1.2 * dt; nz += oz / od * 1.2 * dt; } } }
  const r = pushOut(nx, nz, .35); p.x = r[0]; p.z = r[1];
  p.yaw += wrap(Math.atan2(dx, dz) - p.yaw) * Math.min(1, dt * 10); p.cur = speed; return d - m <= stop + .05;
}
function face(p, x, z, dt, rate) { p.yaw += wrap(Math.atan2(x - p.x, z - p.z) - p.yaw) * Math.min(1, dt * (rate || 8)); }
/** a pavement corner to run to: away from the threat, a clear straight line, not where others are already heading */
function pickFleeTarget(p, th) {
  const [bi, bj] = blockIndex(p.x, p.z); let best = null, bs = -1e9; const dth = Math.hypot(p.x - th.x, p.z - th.z);
  for (let i = Math.max(0, bi - 1); i <= Math.min(N - 1, bi + 1); i++) for (let j = Math.max(0, bj - 1); j <= Math.min(N - 1, bj + 1); j++) for (let c = 0; c < 4; c++) {
    const q = corner(i, j, c), dd = Math.hypot(q[0] - p.x, q[1] - p.z); if (dd < 6 || dd > 42 || walkBlocked(q[0], q[1])) continue;
    const away = Math.hypot(q[0] - th.x, q[1] - th.z) - dth; if (away < 2) continue;
    let s = away - dd * .25 + Math.random() * 7; for (const o of peds) if (o !== p && !o.dead && o.brain && o.brain.state === S.FLEEING && o.flee && Math.hypot(o.flee[0] - q[0], o.flee[1] - q[1]) < 5) s -= 8;   // do not all pile into the same corner
    if (s > bs && los(p.x, p.z, q[0], q[1])) { bs = s; best = q; }
  }
  return best;
}
/** a spot near here with a wall between it and the threat */
function findCover(p, th) {
  let best = null, bd = 1e9;
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = 5 + (k % 2) * 6, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r; if (pushOut(x, z, .4)[2] || !los(p.x, p.z, x, z) || los(th.x, th.z, x, z)) continue; const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = [x, z]; } }
  return best;
}

/* ======================================================================= state changes */
function go(p, to, data, force) {
  const b = p.brain, from = b.state;
  if (!b.go(to, now(), force)) return false;
  Object.assign(b.data, data || {}); p.gest = null; p.cur = 0;
  if (to === S.FLEEING) { p.flee = null; if (b.ready('alarm', now(), 6) && (b.data.gen || 0) < 2) emit({ type: 'alarm', x: p.x, z: p.z, radius: 14, gen: (b.data.gen || 0) + 1, ref: p, threat: b.data.threat, strength: .6, visual: true }); }
  if (to === S.WALKING) { reanchorIfNeeded(p, from); p.gest = null; }
  return true;
}
function reanchorIfNeeded(p, from) { if (from !== S.IDLE) reanchor(p); }
const conflicts = () => { let n = 0; for (const p of peds) if (p.brain && (p.brain.state === S.CONFRONTING_PLAYER || p.brain.state === S.ARGUING || p.brain.state === S.FIGHTING)) n++; return n; };
let activeConflicts = 0;

/* ======================================================================= events */
/**
 * Tell the pedestrians who could notice. ev: { type, x, z, radius, loud, visual, gen, ref, threat, sev, byPlayer, strength }
 * types: gunshot, explosion, crash, violence (someone was hurt), carHitPed, alarm
 */
export function emit(ev) {
  if (!cfg.enabled || !peds.length) return; stats.events++;
  const R = ev.radius || 45;
  for (const p of peds) {
    if (p.dead || p === ev.ref || !p.brain) continue;
    const dx = p.x - ev.x, dz = p.z - ev.z; if (Math.abs(dx) > R || Math.abs(dz) > R) continue; const d = Math.hypot(dx, dz); if (d > R) continue;
    const sees = ev.visual !== false && d < 38 && seesPoint(p, ev.x, ev.z, 38), hears = ev.loud && d < R; if (!sees && !hears) continue;
    perceive(p, ev, d, sees);
  }
}
function perceive(p, ev, d, sees) {
  const b = p.brain, pers = p.pers, t = now(), th = ev.threat || { x: ev.x, z: ev.z };
  if (b.recalls('ev:' + ev.type, t) && ev.type !== 'alarm') { b.addFear(pers, .08); return; }          // the same sound again: more nervous, not a new decision
  const near = 1 - d / (ev.radius || 45);
  let level = 0;
  switch (ev.type) {
    case 'gunshot': level = (sees ? .75 : .5) * (.5 + .5 * near); b.remember('ev:gunshot', t, 1.5); break;
    case 'explosion': level = .9 * (.4 + .6 * near); break;
    case 'crash': level = (ev.sev || 1) * .22 * (.4 + .6 * near); b.remember('ev:crash', t, 3); break;
    case 'violence': level = (sees ? .55 : .3) * (.4 + .6 * near); b.remember('ev:violence', t, 2); break;
    case 'carHitPed': level = (sees ? .7 : .3) * (.4 + .6 * near); b.remember('ev:carHitPed', t, 4); break;
    case 'alarm': level = (ev.strength || .5) * near * .9; if (!ev.threat || b.state === S.FLEEING) return; break;
    default: level = .3 * near;
  }
  const fear = b.addFear(pers, level);
  // someone close to them was hurt: the protective ones get angry, not scared
  if ((ev.type === 'violence' || ev.type === 'carHitPed') && p.buddy && ev.ref === p.buddy && ev.byPlayer && (pers.type === 'protective' || pers.aggression > .6) && !armedLately()) { go(p, S.ANGRY, { sev: 3, hit: true, target: 'player', reason: 'friend' }); speak(p, 'angry', null, b); return; }
  if (BR.BUSY.has(b.state) && b.state !== S.STARTLED) {                                                // already fighting or arguing: a weapon or an explosion ends that
    if ((ev.type === 'gunshot' || ev.type === 'explosion') && (b.state === S.ARGUING || b.state === S.CONFRONTING_PLAYER || b.state === S.FIGHTING)) { b.cd.confront = t + 30; go(p, S.FLEEING, { threat: th, sev: 3 }, true); }
    return;
  }
  if (fear < .2 + (pers.type === 'indifferent' ? .15 : 0)) { if (pers.curiosity > .45 && sees && b.state === S.WALKING && b.ready('look', t, 6)) go(p, S.OBSERVING_EVENT, { look: { x: ev.x, z: ev.z }, stay: 1 + pers.curiosity * 3 }); return; }
  if (fear < .38) { if (b.state === S.WALKING || b.state === S.IDLE) go(p, S.OBSERVING_EVENT, { look: { x: ev.x, z: ev.z }, stay: 1.2 + pers.curiosity * 2, alarmed: true }); return; }
  panic(p, th, ev.type === 'explosion' || ev.type === 'gunshot' ? 3 : 2, ev.gen || 0);
}
/** a threat is near: startle, then run, or find cover, or (opportunists) take a chance */
function panic(p, th, sev, gen) {
  const b = p.brain, pers = p.pers; if (b.state === S.FLEEING || b.state === S.SEEKING_COVER) { b.data.threat = th; return; }
  let next = S.FLEEING; const data = { threat: th, sev, gen };
  if (pers.courage > .3 && Math.random() < .35) { const cv = findCover(p, th); if (cv) { next = S.SEEKING_COVER; data.cover = cv; } }
  if (pers.type === 'opportunistic' && Math.random() < .18) { const c = cars.find(c => c.kind === 'parked' && !c.driver && !c.wreck && Math.hypot(c.x - p.x, c.z - p.z) < 18 && Math.hypot(c.x - player.x, c.z - player.z) > 8); if (c) data.stealCar = c; }
  if (!go(p, S.STARTLED, { next, nextData: data, threat: th, sev, gen }, true)) go(p, next, data, true);
  p.gest = 'startle'; if (Math.random() < .5) speak(p, 'flee', null, b);
}

/** the player's car (or any car) came very close: dodge, and maybe react */
export function onCarNear(p, c, clearance, spd) {
  if (!cfg.enabled || !cfg.nearMiss || !p.brain || p.dead) return;
  const b = p.brain, t = now(), dx = p.x - c.x, dz = p.z - c.z, fx = Math.sin(c.yaw) * Math.sign(c.speed || 1), fz = Math.cos(c.yaw) * Math.sign(c.speed || 1);
  const along = dx * fx + dz * fz, lateral = dx * fz - dz * fx, towards = along > -.5, uid = 'car' + (c.uid || 0);
  // the dodge: a quick hop sideways, away from the car's path, if it is about to arrive
  if (towards && along > 0 && along < spd * .8 + 1.8 && Math.abs(lateral) < c.cr + 1.2 && p.dodgeCd <= t && !(b.state === S.FIGHTING)) {
    p.dodgeCd = t + 2; if (Math.random() < .55 + p.pers.fear * .35 - (p.pers.type === 'indifferent' ? .25 : 0)) { const s = lateral >= 0 ? 1 : -1; p.dodge = { vx: fz * s * 5.2, vz: -fx * s * 5.2, t: .28 }; p.gest = 'startle'; }
  }
  const sev = BR.nearMissSeverity(spd, clearance, towards); if (sev <= 0 || b.recalls(uid, t)) return;
  b.remember(uid, t, 10); stats.nearMisses++;
  const byPlayer = c.driver === 'player';
  const r = BR.reactToNearMiss(p.pers, sev, Math.random, { armed: false });
  b.addFear(p.pers, .15 * sev);
  if (r.act === 'ignore') return;
  const th = { x: c.x, z: c.z, car: c };
  if (!(b.state === S.WALKING || b.state === S.IDLE || b.state === S.OBSERVING_EVENT || b.state === S.RETURNING_TO_ROUTINE)) return;
  if (r.act === 'flee') { panic(p, th, sev, 0); if (byPlayer && sev >= 3 && b.fear > .5) maybeReport(p, 'collision', c.x, c.z, 1); }
  else if (r.act === 'startle') { if (go(p, S.STARTLED, { next: S.OBSERVING_EVENT, nextData: { look: { x: c.x, z: c.z }, stay: 1.5 }, threat: th, sev }, true)) { p.gest = 'startle'; if (Math.random() < .5) speak(p, 'nearmiss', null, b); } }
  else if (r.act === 'angry') {
    go(p, S.STARTLED, { next: S.ANGRY, nextData: { sev, target: byPlayer ? 'player' : 'car', car: c, hit: false, lastPos: { x: c.x, z: c.z } }, threat: th, sev }, true);
    p.gest = 'startle'; speak(p, 'nearmiss', null, b);
    if (byPlayer && sev >= 3) maybeReport(p, 'collision', c.x, c.z, 1);
  }
}
/** one pedestrian decides whether to phone the police about a crime they just saw (used for dangerous driving) */
function maybeReport(p, type, x, z, sev) {
  if (p.brain.data.reportDone || !p.brain.ready('report', now(), 30)) return;
  const law = p.pers.lawfulness; if (Math.random() < BR.reportChance(p.pers, sev, Math.hypot(p.x - x, p.z - z), p.brain.fear, {})) registerCrime({ type, x, z, sev, seers: [p], hearers: [], count: 1 });
}

/* ======================================================================= pedestrians hurt, killed */
const victims = [];
export function onPedHurt(p, dmg, by) {
  if (!cfg.enabled || !p.brain) return; const b = p.brain, pers = p.pers, t = now();
  b.remember('hurt', t, 25); p.report = b.state === S.CALLING_POLICE ? null : p.report;                  // a phone call is dropped when you are hit
  const armed = by === 'gun' || armedLately(), choice = BR.fightOrFlight(pers, { armed, hpFraction: p.hp / 30, protecting: false }, Math.random);
  const close = !player.car && Math.hypot(p.x - player.x, p.z - player.z) < 7;
  if (choice === 'fight' && close && by !== 'gun' && conflicts() < cfg.maxConflicts) { if (b.state !== S.FIGHTING) go(p, S.FIGHTING, { sev: 2, struck: true, target: 'player' }, true); speak(p, 'taunt', null, b); }
  else { b.cd.confront = t + 30; go(p, S.STARTLED, { next: S.FLEEING, nextData: { threat: { x: player.x, z: player.z }, sev: 3 }, threat: { x: player.x, z: player.z }, sev: 3 }, true) || go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); speak(p, 'hurt', null, b); }
  if (p.buddy && !p.buddy.dead && p.buddy.brain) { const bb = p.buddy.brain; if ((p.buddy.pers.type === 'protective' || p.buddy.pers.aggression > .6) && !armed && !BR.BUSY.has(bb.state)) { go(p.buddy, S.ANGRY, { sev: 3, hit: true, target: 'player', reason: 'friend' }); speak(p.buddy, 'angry', null, bb); } else panic(p.buddy, { x: player.x, z: player.z }, 3, 1); }
  emit({ type: 'violence', x: p.x, z: p.z, radius: 30, loud: false, visual: true, ref: p, byPlayer: by !== 'car' ? true : false, threat: { x: player.x, z: player.z } });
}
export function onPedKilled(p, by, driverIsPlayer) {
  if (!cfg.enabled) return; victims.push({ p, t: now(), x: p.x, z: p.z }); if (victims.length > 6) victims.shift();
  const th = { x: player.x, z: player.z };
  if (by === 'car') emit({ type: 'carHitPed', x: p.x, z: p.z, radius: 45, loud: true, visual: true, ref: p, byPlayer: driverIsPlayer, threat: driverIsPlayer ? th : { x: p.x, z: p.z } });
  else emit({ type: 'violence', x: p.x, z: p.z, radius: 40, loud: true, visual: true, ref: p, byPlayer: true, threat: th });
  if (p.buddy && !p.buddy.dead && p.buddy.brain && !armedLately() && (p.buddy.pers.aggression > .55 || p.buddy.pers.type === 'protective') && driverIsPlayer) { go(p.buddy, S.ANGRY, { sev: 3, hit: true, target: 'player', reason: 'friend' }); speak(p.buddy, 'angry', null, p.buddy.brain); }
}
/** a pedestrian thrown out of their car by the player */
export function carjackVictim(p) {
  if (!p.brain) return; const b = p.brain;
  if (p.pers.aggression > .6 && !armedLately()) { go(p, S.ANGRY, { sev: 3, hit: true, target: 'player', reason: 'car' }, true); speak(p, 'angry', null, b); } else { panic(p, { x: player.x, z: player.z }, 3, 0); speak(p, 'flee', null, b); }
}

/* ======================================================================= witnesses and the police */
const incidents = []; let incId = 1;
/**
 * A crime happened and pedestrians saw or heard it (called by reporting.js). Each willing witness will phone the police after a short
 * delay, which the player can interrupt. The first completed call files the report (reporting.fileCrimeReport); the rest are not needed.
 */
export function registerCrime(info) {
  if (!cfg.enabled) return false;
  const t = now(); let inc = incidents.find(i => !i.done && i.type === info.type && Math.hypot(i.x - info.x, i.z - info.z) < 25 && t - i.time < 8);
  if (inc && inc.submitted) return true;
  if (!inc) { inc = { id: incId++, type: info.type, x: info.x, z: info.z, sev: info.sev, time: t, submitted: false, done: false, ctx: info.ctx || {}, counts: { witnesses: info.seers.length, heard: info.hearers.length }, reporters: new Set(), expire: t + 40 }; incidents.push(inc); if (incidents.length > 12) incidents.shift(); }
  let any = false;
  for (const [list, saw] of [[info.seers, true], [info.hearers, false]]) for (const p of list) {
    if (!p.brain || p.dead || inc.reporters.has(p) || p.brain.recalls('rep:' + inc.id, t)) continue;
    const s = p.brain.state; if (s === S.CONFRONTING_PLAYER || s === S.ARGUING || s === S.FIGHTING) continue;     // busy with their own quarrel
    const d = Math.hypot(p.x - info.x, p.z - info.z), threatNear = Math.hypot(p.x - player.x, p.z - player.z) < 6 && armedLately();
    const chance = cfg.alwaysReport ? 1 : BR.reportChance(p.pers, info.sev, d, p.brain.fear, { threatNear, sawIt: saw });
    if (Math.random() > chance) continue;
    inc.reporters.add(p); p.brain.remember('rep:' + inc.id, t, 120); p.report = inc; any = true; scheduleCall(p, inc);
  }
  return any;
}
function scheduleCall(p, inc) {
  const b = p.brain;
  if (b.state === S.FLEEING || b.state === S.SEEKING_COVER || b.state === S.CALLING_POLICE) return;           // they will call when they are safe
  if (b.fear > .5 || inc.sev >= 3 && p.pers.fear > .5) panic(p, { x: inc.x, z: inc.z }, inc.sev, 0);
  else go(p, S.OBSERVING_EVENT, { look: { x: inc.x, z: inc.z }, stay: .8, thenCall: true });
}
function beginCall(p) {
  const inc = p.report; if (!inc || inc.submitted) { go(p, S.RETURNING_TO_ROUTINE); return; }
  if (go(p, S.CALLING_POLICE, { callT: rand(2.6, 4), inc })) { p.gest = 'phone'; speak(p, 'call', null, p.brain, 2.6); }
  else go(p, S.RETURNING_TO_ROUTINE, null, true);
}
function completeCall(p, inc) {
  p.report = null; if (inc.submitted) return; inc.submitted = true; inc.done = true; stats.reports++;
  fileCrimeReport(inc, p);
}

/* ======================================================================= drivers */
export function honk(c) { c.honk = 1; if (Math.hypot(c.x - player.x, c.z - player.z) < 45) sfx.horn(); }
/** two cars collided. Only collisions with the player's car matter to the other driver. */
export function onCarCollision(a, b, rel) {
  if (!cfg.enabled) return; const pc = a.driver === 'player' ? a : b.driver === 'player' ? b : null; if (!pc) return; const o = pc === a ? b : a;
  const sev = BR.crashSeverity(rel); if (!sev) return; const t = now();
  emit({ type: 'crash', x: o.x, z: o.z, radius: 40, loud: true, visual: true, sev, threat: { x: o.x, z: o.z } });
  if (!o.ai || o.driver !== 'ai' || (o.reactT && t - o.reactT < 6)) return; o.reactT = t;
  const A = o.ai; A.pers = A.pers || BR.makePersonality(); const pers = A.pers;
  honk(o); A.hold = Math.max(A.hold || 0, sev === 1 ? 1.2 : 3.5);
  if (sev === 1) { if (pers.aggression > .45 || pers.hothead) speak(o, 'honk', null, null, 1.8); return; }
  const angry = pers.hothead ? .6 : pers.aggression * .5, scared = pers.fear * .6;
  const r = Math.random();
  if (sev >= 2 && r < angry + (sev === 3 ? .25 : 0) && pers.courage > .3 && !armedLately()) driverExits(o, pers, sev);
  else if (r > 1 - scared - (sev === 3 ? .2 : 0)) { A.hold = 0; A.flee = t + 7; speak(o, 'flee', null, null, 1.8); }
  else { speak(o, 'nearmiss', null, null, 2); if (pers.hothead && sev === 2) A.chase = t + 8; }
}
export function onNearMissCar(c) { /* AI cars that were cut off by the player: a honk now and then */ if (!c.ai || c.reactT && now() - c.reactT < 5) return; c.reactT = now(); honk(c); const A = c.ai; A.pers = A.pers || BR.makePersonality(); if (A.pers.hothead && Math.random() < .35) { A.chase = now() + 7; speak(c, 'honk', null, null, 1.6); } }
/** the other driver gets out to argue. The car is left where it is; they walk back to it afterwards. */
function driverExits(c, pers, sev) {
  if (conflicts() >= cfg.maxConflicts) return;
  const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), x = c.x - rx * (c.cr + .8), z = c.z - rz * (c.cr + .8), p = makePed([x, z], { keep: false });
  p.pers = pers; p.carRef = c; p.x = x; p.z = z; p.mesh.position.set(x, 0, z); p.yaw = Math.atan2(player.x - x, player.z - z);
  c.ai = null; c.driver = null; c.kind = 'parked'; c.speed = 0; showDriver(c, false);
  go(p, S.ANGRY, { sev, hit: true, target: 'player', fromCar: true }, true); speak(p, 'angry', null, p.brain); stats.confrontations++;
}

/* ======================================================================= per-pedestrian update */
const WALK = 1.9, RUN = 5.2;
/**
 * Called by people.js every frame for every living pedestrian. Returns true when the AI moved them this frame (so the normal walk
 * along the pavement is skipped). Thinking is rate-limited by distance; movement is every frame.
 */
export function updatePed(p, dt, near) {
  if (!cfg.enabled || !p.brain) return false;
  const b = p.brain, t = now();
  if (p.panic > 0) { p.panic = 0; b.addFear(p.pers, .5); if (b.state === S.WALKING) panic(p, { x: player.x, z: player.z }, 2, 1); }      // old-style "scare" requests from other modules
  if (p.dodge) { p.dodge.t -= dt; const r = pushOut(p.x + p.dodge.vx * dt, p.z + p.dodge.vz * dt, .35); p.x = r[0]; p.z = r[1]; p.cur = 4; if (p.dodge.t <= 0) p.dodge = null; }
  p.acc += dt; const rate = near ? .1 : .35; if (p.acc < rate && !(b.state === S.WALKING)) { return runState(p, dt, false); }
  const step = p.acc; p.acc = 0;
  const forced = b.tick(step, t);
  if (forced) onTimeout(p, forced);
  return runState(p, dt, true);
}
function onTimeout(p, to) { p.gest = null; if (to === S.WALKING) reanchor(p); if (p.report && p.report.submitted) p.report = null; }

function threatPos(p) { const th = p.brain.data.threat; if (!th) return { x: player.x, z: player.z }; if (th.car && !th.car.wreck) return { x: th.car.x, z: th.car.z }; return th; }
function playerClose(p, r) { return Math.hypot(p.x - player.x, p.z - player.z) < r; }

function runState(p, dt, think) {
  const b = p.brain, d = b.data, t = now();
  switch (b.state) {
    case S.WALKING: {
      if (think && !p.free && p.buddy && !p.buddy.dead && p.buddy.brain && p.buddy.brain.state === S.WALKING) { /* friends keep together: handled in people.js */ }
      return false;
    }
    case S.IDLE: {
      p.cur = 0; p.yaw += Math.sin(t * 1.3 + p.ph) * dt * .5;
      if (think && d.greet && d.greet.brain && d.greet.brain.state === S.IDLE) { face(p, d.greet.x, d.greet.z, dt); p.gest = 'wave'; }
      if (think && !d.until) d.until = t + rand(2.2, 5.5);
      if (think && t > d.until) go(p, S.WALKING, null, true);
      else if (think && !d.greet && b.ready('greetlook', t, 2.5)) tryGreet(p);
      return true;
    }
    case S.OBSERVING_EVENT: {
      p.cur = 0; if (d.look) face(p, d.look.x, d.look.z, dt, 6);
      if (think && b.t > (d.stay || 1.5)) { if (d.thenCall && p.report && !p.report.submitted) beginCall(p); else go(p, S.RETURNING_TO_ROUTINE, null, true); }
      return true;
    }
    case S.STARTLED: {
      p.cur = 0; p.gest = 'startle'; const th = threatPos(p); face(p, th.x, th.z, dt, 14);
      if (!d.jumped && d.threat) { d.jumped = true; const dx = p.x - th.x, dz = p.z - th.z, m = Math.hypot(dx, dz) || 1; if (!p.dodge) p.dodge = { vx: dx / m * 3.2, vz: dz / m * 3.2, t: .22 }; }
      if (think && b.t > .4 + (1 - p.pers.fear) * .25) { const next = d.next || S.RETURNING_TO_ROUTINE; if (!go(p, next, d.nextData || {}, true)) go(p, S.FLEEING, d.nextData || { threat: th, sev: 2 }, true); }
      return true;
    }
    case S.FLEEING: return fleeing(p, dt, think);
    case S.SEEKING_COVER: {
      const th = threatPos(p);
      if (d.cover) { const arrived = stepTo(p, d.cover[0], d.cover[1], RUN * .9, dt); if (arrived) { p.cur = 0; face(p, th.x, th.z, dt); p.gest = null; if (think && b.t > 3) { if (p.report && !p.report.submitted) beginCall(p); else go(p, S.RETURNING_TO_ROUTINE, null, true); } } }
      else go(p, S.FLEEING, { threat: th, sev: d.sev || 2 }, true);
      return true;
    }
    case S.ANGRY: return angry(p, dt, think);
    case S.CONFRONTING_PLAYER: return confronting(p, dt, think);
    case S.ARGUING: return arguing(p, dt, think);
    case S.FIGHTING: return fighting(p, dt, think);
    case S.CALLING_POLICE: {
      p.cur = 0; p.gest = 'phone'; const th = p.report ? { x: p.report.x, z: p.report.z } : { x: player.x, z: player.z };
      if (think) {
        if (playerArmedVisible(p) && playerClose(p, 18) || (playerClose(p, 3.5) && p.pers.courage < .6)) { p.report = null; go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
        if (b.t > d.callT) { completeCall(p, d.inc); go(p, playerClose(p, 28) ? S.FLEEING : S.RETURNING_TO_ROUTINE, { threat: { x: player.x, z: player.z }, sev: 2 }, true); }
      }
      return true;
    }
    case S.SEEKING_HELP: {
      const v = d.victim; if (!v || !(v.dead || v.hp < 30)) { go(p, S.RETURNING_TO_ROUTINE, null, true); return true; }
      if (think && (armedLately() && playerClose(p, 30))) { go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
      const there = stepTo(p, v.x, v.z, WALK * 1.5, dt, 1.2); if (there) { p.cur = 0; face(p, v.x, v.z, dt); p.gest = 'phone'; if (!d.said) { d.said = true; speak(p, 'help', null, b); } if (think && b.t > 6) go(p, S.RETURNING_TO_ROUTINE, null, true); }
      return true;
    }
    case S.RETURNING_TO_ROUTINE: return returning(p, dt, think);
  }
  return false;
}

function tryGreet(p) {
  for (const o of peds) { if (o === p || o.dead || !o.brain || (o.brain.state !== S.IDLE && o.brain.state !== S.WALKING)) continue; if (Math.abs(o.x - p.x) > 3.4 || Math.abs(o.z - p.z) > 3.4) continue; if (!o.brain.ready('greet', now(), 30)) continue;
    p.brain.data.greet = o; if (o.brain.state === S.WALKING) go(o, S.IDLE, { greet: p, until: now() + 2 }, true); p.brain.data.until = now() + 2; if (Math.random() < .4) speak(p, 'greet', null, p.brain, 1.6); return; }
}
function fleeing(p, dt, think) {
  const b = p.brain, d = b.data, th = threatPos(p), pers = p.pers; p.gest = null;
  if (d.stealCar) { const c = d.stealCar; if (c.wreck || c.driver) d.stealCar = null; else if (stepTo(p, c.x, c.z, RUN, dt, 1.8)) { stats.fleeSteals = (stats.fleeSteals || 0) + 1; removePed(p); trafficTakeover(c, true); return true; } else return true; }
  if (think) {
    const safe = BR.safeDistance(pers, d.sev || 2), dd = Math.hypot(p.x - th.x, p.z - th.z);
    if (dd > safe && b.t > 1.5) { if (p.report && !p.report.submitted) beginCall(p); else go(p, S.RETURNING_TO_ROUTINE, null, true); return true; }
    if (!p.flee || Math.hypot(p.flee[0] - p.x, p.flee[1] - p.z) < 1.2) { const q = pickFleeTarget(p, th); p.flee = q ? [q[0], q[1]] : [p.x + (p.x - th.x) / (dd || 1) * 14, p.z + (p.z - th.z) / (dd || 1) * 14]; }
  }
  if (!p.flee) { p.flee = [p.x + (p.x - th.x) * .5, p.z + (p.z - th.z) * .5]; }
  stepTo(p, p.flee[0], p.flee[1], RUN * (.85 + pers.fear * .25), dt); return true;
}
function playerLeaving() { return Math.abs(player.car ? player.car.speed : Math.hypot(player.vx, player.vz)) > 7; }
function angry(p, dt, think) {
  const b = p.brain, d = b.data, pers = p.pers; p.cur = 0; p.gest = 'shake';
  const tgt = d.target === 'car' && d.car ? d.car : player; face(p, tgt.x, tgt.z, dt, 9);
  if (!think) return true;
  if (playerArmedVisible(p)) { b.cd.confront = now() + 30; go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
  if (b.t > 1.1 + (1 - pers.aggression)) {
    const can = d.target !== 'car' && b.ready('confront', now(), 25) && conflicts() < cfg.maxConflicts;
    const want = can && BR.wantsToConfront(pers, { severity: d.sev || 1, hit: d.hit, armed: armedLately(), fleeing: playerLeaving() }, Math.random);
    if (want && Math.hypot(p.x - player.x, p.z - player.z) < 30) { go(p, S.CONFRONTING_PLAYER, { sev: d.sev || 2, hit: d.hit, fromCar: d.fromCar }); stats.confrontations++; }
    else { if (playerLeaving() || Math.random() < .5) speak(p, 'leave', null, b); go(p, S.RETURNING_TO_ROUTINE, null, true); }
  }
  return true;
}
function confronting(p, dt, think) {
  const b = p.brain, d = b.data, t = now(); p.gest = null;
  if (think) {
    if (playerArmedVisible(p) && playerClose(p, 40)) { b.cd.confront = t + 30; speak(p, 'flee', null, b); go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
    if (playerLeaving() || Math.hypot(p.x - player.x, p.z - player.z) > 30) { b.cd.confront = t + 25; speak(p, 'leave', null, b); go(p, S.RETURNING_TO_ROUTINE, null, true); return true; }
    if (Math.hypot(p.x - player.x, p.z - player.z) < (player.car ? 3.4 : 2.6)) { go(p, S.ARGUING, { sev: d.sev, hit: d.hit, fromCar: d.fromCar, lines: 0, nextLine: t + .3 }); return true; }
  }
  const stop = player.car ? player.car.cr + 1.5 : 1.9; stepTo(p, player.x, player.z, WALK * 1.35 + p.pers.aggression * .7, dt, stop); return true;
}
function arguing(p, dt, think) {
  const b = p.brain, d = b.data, t = now(), pers = p.pers; p.cur = 0; p.gest = 'shake'; face(p, player.x, player.z, dt, 9);
  if (!think) return true;
  const dd = Math.hypot(p.x - player.x, p.z - player.z);
  if (playerArmedVisible(p)) { b.cd.confront = t + 30; speak(p, 'flee', null, b); go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
  if (playerLeaving() || dd > 12) { b.cd.confront = t + 25; speak(p, 'leave', null, b); go(p, S.RETURNING_TO_ROUTINE, null, true); return true; }
  if (dd > 3.2) { p.cur = 0; stepTo(p, player.x, player.z, WALK, dt, player.car ? player.car.cr + 1.5 : 1.8); }
  if (t > (d.nextLine || 0) && (d.lines || 0) < 4) { d.lines = (d.lines || 0) + 1; d.nextLine = t + rand(2.2, 3.2); speak(p, player.car ? 'angry' : (d.lines > 2 ? 'taunt' : 'angry'), null, b, 2.4); }
  const onFoot = !player.car;
  if (onFoot && b.t > 1.5 && conflicts() <= cfg.maxConflicts && BR.wantsToFight(pers, { severity: d.sev || 2, playerOnFoot: true, armed: armedLately(), struck: false }, Math.random)) { go(p, S.FIGHTING, { sev: d.sev, target: 'player' }, true); return true; }
  if (b.t > (player.car ? 7 : 9)) { b.cd.confront = t + 30; speak(p, 'leave', null, b); go(p, S.RETURNING_TO_ROUTINE, null, true); }
  return true;
}
let punchSfxT = 0;
function fighting(p, dt, think) {
  const b = p.brain, d = b.data, t = now(); const dd = Math.hypot(p.x - player.x, p.z - player.z);
  if (think) {
    if (playerArmedVisible(p) || p.hp < 11) { b.cd.confront = t + 30; speak(p, 'flee', null, b); go(p, S.FLEEING, { threat: { x: player.x, z: player.z }, sev: 3 }, true); return true; }
    if (player.car || dd > 9 || G.mode !== 'playing') { b.cd.confront = t + 25; go(p, player.car ? S.ARGUING : S.RETURNING_TO_ROUTINE, player.car ? { sev: d.sev, lines: 3, nextLine: t + 9 } : null, true); return true; }
  }
  face(p, player.x, player.z, dt, 12);
  if (dd > 1.3) { stepTo(p, player.x, player.z, WALK * 1.6, dt, 1.0); p.gest = null; return true; }
  p.cur = 0; p.gest = 'punch'; d.swingT = (d.swingT || 0) - dt;
  if (d.swingT <= 0) { d.swingT = rand(.95, 1.4); stats.fights++; if (G.mode === 'playing' && Math.random() < .62) { hurtPlayer(rand(3, 5)); if (t - punchSfxT > .25) { punchSfxT = t; sfx.punch(); } } if (Math.random() < .25) speak(p, 'taunt', null, b, 1.6); }
  return true;
}
function returning(p, dt, think) {
  const b = p.brain, d = b.data; p.gest = null;
  if (p.carRef && !p.carRef.wreck && Math.hypot(p.carRef.x - p.x, p.carRef.z - p.z) < 60) {                // a driver walks back to their car and drives off
    if (stepTo(p, p.carRef.x, p.carRef.z, WALK * 1.3, dt, 1.8)) { const c = p.carRef; removePed(p); trafficTakeover(c, false); }
    return true;
  }
  if (!d.q) { d.q = nearestCorner(p.x, p.z); p.carRef = null; }
  if (!d.q) { go(p, S.WALKING, null, true); return true; }
  if (stepTo(p, d.q.x, d.q.z, WALK, dt, .4)) { if (think || true) go(p, S.WALKING, null, true); }
  return true;
}

/* ======================================================================= global tick */
let thinkT = 0, aimT = 0;
export function updateAI(dt) {
  if (!cfg.enabled) return; updateBubbles(dt);
  thinkT -= dt; if (thinkT > 0) return; thinkT = .25;
  activeConflicts = conflicts();
  const t = now();
  for (let i = incidents.length - 1; i >= 0; i--) if (incidents[i].expire < t || incidents[i].done) { if (incidents[i].done || incidents[i].expire < t - 20) incidents.splice(i, 1); }
  // someone with a weapon drawn in plain sight scares people who can see it
  if (player.aimT > 0 && !player.car) {
    for (const p of peds) {
      if (p.dead || !p.brain || Math.abs(p.x - player.x) > 28 || Math.abs(p.z - player.z) > 28) continue; const b = p.brain;
      if (b.state === S.FLEEING || b.state === S.SEEKING_COVER || b.state === S.STARTLED || !seesPoint(p, player.x, player.z, 28) || !b.ready('weapon', t, 7)) continue;
      b.addFear(p.pers, .35); if (b.fear > .3 || BR.BUSY.has(b.state)) { b.cd.confront = t + 30; panic(p, { x: player.x, z: player.z }, 3, 0); }
    }
  }
  // bystanders who go and check on someone who is down, once the danger is gone
  for (let i = victims.length - 1; i >= 0; i--) {
    const v = victims[i]; if (t - v.t > 14) { victims.splice(i, 1); continue; } if (t - v.t < 3 || v.helped) continue;
    if ((armedLately() && Math.hypot(v.x - player.x, v.z - player.z) < 40) || Math.hypot(v.x - player.x, v.z - player.z) < 8 && player.car) continue;
    let best = null, bd = 25; for (const p of peds) { if (p.dead || !p.brain || p === v.p) continue; const b = p.brain; if (b.state !== S.WALKING && b.state !== S.IDLE) continue; if (p.pers.helpfulness < .65 || p.pers.fear > .6) continue; const d = Math.hypot(p.x - v.x, p.z - v.z); if (d < bd && los(p.x, p.z, v.x, v.z)) { bd = d; best = p; } }
    if (best) { v.helped = true; go(best, S.SEEKING_HELP, { victim: v.p }); }
  }
}
/** everything back to normal (respawn, new game) */
export function reset() { incidents.length = 0; victims.length = 0; for (const b of bubbles) { b.parent.remove(b.sp); b.sp.material.dispose(); } bubbles.length = 0; for (const p of peds) if (p.brain) { p.brain = new BR.Brain(); p.report = null; p.dodge = null; p.gest = null; reanchor(p); } }
export const debugInfo = () => ({ counts: peds.reduce((m, p) => { if (p.brain) m[p.brain.state] = (m[p.brain.state] || 0) + 1; return m; }, {}), incidents: incidents.length, bubbles: bubbles.length, stats: Object.assign({}, stats) });
/** put a pedestrian next to a friend so they walk together */
export function pairUp(a, b) { a.buddy = b; b.buddy = a; b.speed = a.speed; b.x = a.x + 1; b.z = a.z; b.i = a.i; b.j = a.j; b.c = a.c; b.nc = a.nc; b.dir = a.dir; b.tgt = a.tgt; }
export function startIdle(p) { const b = p.brain; if (b && b.state === S.WALKING && !p.buddy && b.ready('idle', now(), 14)) go(p, S.IDLE, { until: now() + rand(2.5, 6) }, true); }
export { P, B };
