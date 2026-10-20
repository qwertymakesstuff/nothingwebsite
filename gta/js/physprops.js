// Physically reactive street props. Props are drawn instanced (props.js); when a car hits one hard enough it is hidden from its
// instance and a pooled stand-in mesh takes over: it tips over about its foot, slides away or breaks into a few pieces, comes to rest,
// and stops being simulated. Rules (what falls, what pushes, what stays solid) live in propPhysics.js.
import { scene } from './render.js';
import { G } from './state.js';
import { pushOut, circlesNear } from './city.js';
import { sfx } from './audio.js';
import { peds } from './people.js';
import { emit as emitPed } from './pedAI.js';
import { reportCrime } from './reporting.js';
import { DEFS, resolveImpact, approachSpeed, stepFall, stepSlide, pushVelocity } from './propPhysics.js';

export const objs = [];                       // every registered prop
const models = {}, pool = {};                 // type -> parts [{geo, mat}], and idle stand-in meshes
const active = [];                            // props being simulated right now
const debris = [];                            // flying pieces of broken props
const MAX_ACTIVE = 26, MAX_DEBRIS = 40, MAX_SETTLED = 70;
const up = new THREE.Vector3(0, 1, 0), qYaw = new THREE.Quaternion(), qTilt = new THREE.Quaternion(), axis = new THREE.Vector3();
export const stats = { knocked: 0, broken: 0, pushed: 0, restored: 0 };

export function defineModel(type, parts) { models[type] = parts; }
/** Register a prop. hide()/show() switch its instanced copy off/on; circle is its collision circle (flagged so cars treat it as soft). */
export function register(type, x, z, yaw, scale, hooks) {
  const o = { type, modelKey: hooks.model || type, def: DEFS[type], x, z, hx: x, hz: z, yaw: yaw || 0, s: scale || 1, state: 'standing', circle: hooks.circle || null, circles: hooks.circles || (hooks.circle ? [hooks.circle] : []), hide: hooks.hide, show: hooks.show, model: null, sim: null, since: 0, byPlayer: false };
  o.circles.forEach(c => { c.ref = o; }); objs.push(o); return o;
}
function acquire(type) {
  const p = pool[type] || (pool[type] = []); if (p.length) return p.pop();
  const g = new THREE.Group(); (models[type] || []).forEach(m => { const mesh = new THREE.Mesh(m.geo, m.mat); mesh.castShadow = m.shadow !== false; g.add(mesh); }); g.userData.type = type; return g;
}
function release(g) { scene.remove(g); (pool[g.userData.type] = pool[g.userData.type] || []).push(g); }
const setOff = (o, off) => o.circles.forEach(c => { c.off = off; });

function place(o) {
  const m = o.model, s = o.sim;
  m.scale.setScalar(o.s); qYaw.setFromAxisAngle(up, o.yaw);
  if (o.state === 'falling' || o.state === 'down' || o.state === 'bent') {
    axis.set(s.dz, 0, -s.dx); qTilt.setFromAxisAngle(axis, s.th); m.quaternion.copy(qTilt).multiply(qYaw);
    m.position.set(o.x, o.def.cat === 'destructible' ? Math.sin(s.th) * .1 : 0, o.z);
  } else if (o.state === 'sliding' || o.state === 'settled') {
    axis.set(s.dz || 1, 0, -(s.dx || 0)); qTilt.setFromAxisAngle(axis, s.th || 0); m.quaternion.copy(qTilt).multiply(qYaw);
    m.position.set(o.x, Math.sin(s.th || 0) * o.def.r, o.z);
  }
}
function start(o, sim, state) {
  o.hide(); setOff(o, true); o.state = state; o.sim = sim; o.since = G.time; o.model = acquire(o.modelKey); scene.add(o.model); place(o);
  if (!active.includes(o)) active.push(o);
  while (active.length > MAX_ACTIVE) finish(active.shift());           // never simulate more than a handful at once: snap the oldest to rest
}
function finish(o) { // snap to the resting pose
  const s = o.sim; if (!s) return;
  if (o.state === 'falling') { s.th = s.mode === 'bend' ? s.target : Math.PI / 2; s.rest = true; o.state = s.mode === 'bend' ? 'bent' : 'down'; }
  else if (o.state === 'sliding') { s.vx = s.vz = 0; s.rest = true; o.state = 'settled'; }
  place(o);
}
function alarm(x, z, r) { emitPed({ type: 'crash', x, z, radius: r + 6, loud: true, visual: true, sev: 1, threat: { x, z } }); }

/** knock a tall prop over (or bend it) in direction (dx, dz) */
function topple(o, dx, dz, speed, mode, car) {
  if (o.state !== 'standing') return;                                   // a prop can only be knocked once: no duplicate effects
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const h = o.def.h * o.s;
  start(o, { th: 0, w: Math.min(3.2, Math.max(.9, speed * .22)), dx, dz, mode, target: .3 + Math.min(.35, speed * .02), rest: false, bounces: 0 }, 'falling');
  stats.knocked++; sfx.crash(Math.min(.8, speed / 24)); alarm(o.x, o.z, 22);
  if (car && car.driver === 'player') reportCrime('vandalism', o.x, o.z);
  void h;
}
/** shove a pushable prop along the car's heading */
function shove(o, fx, fz, speed) {
  if (o.state === 'sliding' || o.state === 'settled') { if (o.sim) { const v = pushVelocity(o.type, speed, fx, fz); o.sim.vx = v[0]; o.sim.vz = v[1]; if (o.state === 'settled') { o.state = 'sliding'; o.sim.rest = false; if (!active.includes(o)) active.push(o); } } return; }
  if (o.state !== 'standing') return;
  const v = pushVelocity(o.type, speed, fx, fz);
  start(o, { x: o.x, z: o.z, vx: v[0], vz: v[1], spin: (Math.random() - .5) * 5, th: 0, dx: fx, dz: fz, rest: false }, 'sliding');
  stats.pushed++; if (o.def.mass > 30) sfx.crash(.25); alarm(o.x, o.z, 12);
}
const PIECE_COL = { fence: 0xe8e2d0, kiosk: 0x6a7a8a, shelter: 0x9ac8e0 };
function shatter(o, fx, fz, speed, car) {
  if (o.state !== 'standing') return;
  o.hide(); setOff(o, true); o.state = 'broken'; o.since = G.time; stats.broken++; sfx.crash(Math.min(.6, speed / 24)); alarm(o.x, o.z, 20);
  const n = o.type === 'kiosk' || o.type === 'shelter' ? 5 : 3;
  for (let k = 0; k < n; k++) spawnPiece(o, fx, fz, speed, k, n);
  if (car && car.driver === 'player') reportCrime('vandalism', o.x, o.z);
}
const pieceGeo = new THREE.BoxGeometry(1, 1, 1), pieceMats = {};
function spawnPiece(o, fx, fz, speed, k, n) {
  if (debris.length >= MAX_DEBRIS) removeDebris(0);
  const col = PIECE_COL[o.type] || 0x9a9a9a, mat = pieceMats[col] || (pieceMats[col] = new THREE.MeshLambertMaterial({ color: col }));
  const m = new THREE.Mesh(pieceGeo, mat), len = o.type === 'fence' ? 1.3 : .8; m.scale.set(o.type === 'fence' ? .1 : .9, o.type === 'fence' ? .8 : .12, len); m.castShadow = false;
  const side = (k - (n - 1) / 2) * (len * 1.05), px = o.x + (fx ? 0 : side) * 1, pz = o.z + (fz ? 0 : side) * 1;
  m.position.set(o.x + (-fz) * side * .5, .5 + Math.random() * .3, o.z + fx * side * .5); void px; void pz;
  m.rotation.set(Math.random() * .4, Math.random() * 6, 0); scene.add(m);
  const v = Math.min(8, speed * .5) * (.6 + Math.random() * .6);
  debris.push({ m, vx: fx * v + (Math.random() - .5) * 2, vy: 2 + Math.random() * 2.5, vz: fz * v + (Math.random() - .5) * 2, wx: (Math.random() - .5) * 8, wz: (Math.random() - .5) * 8, t: 0, rest: false, half: o.type === 'fence' ? .05 : .06 });
}
function removeDebris(i) { const d = debris[i]; scene.remove(d.m); debris.splice(i, 1); }

/**
 * Called from the car movement code for a car circle (px, pz, cr). Returns { x, z, hit } with the push-out for props that
 * behave solidly at this speed (a heavy or sturdy prop hit too gently); light props and weak ones just react and let the car through.
 */
export function carVsProps(car, px, pz, cr) {
  let ox = 0, oz = 0, hit = false;
  const list = circlesNear(px, pz);
  for (const c of list) {
    const o = c.ref; if (!o || c.off) continue;
    const dx = c.x - px, dz = c.z - pz, d = Math.hypot(dx, dz), m = cr + c.r; if (d >= m) continue;
    const dir = car.speed >= 0 ? 1 : -1, fx = Math.sin(car.yaw) * dir, fz = Math.cos(car.yaw) * dir;
    const sp = approachSpeed(Math.abs(car.speed), fx, fz, dx, dz) + Math.hypot(car.vx || 0, car.vz || 0) * .5;
    const r = resolveImpact(o.type, sp);
    if (r.outcome === 'solid') { const k = d || .001, pen = m - d; ox -= dx / k * pen; oz -= dz / k * pen; hit = true; continue; }
    if (o.byPlayer = car.driver === 'player', r.outcome === 'push') shove(o, fx, fz, Math.max(sp, 1.2));
    else if (r.outcome === 'break') shatter(o, fx, fz, sp, car);
    else topple(o, dx + fx, dz + fz, sp, r.outcome === 'fall' ? 'fall' : 'bend', car);
    car.speed *= r.keep;
  }
  return hit ? { x: ox, z: oz, hit: true } : null;
}

export function updatePhysProps(dt, px, pz) {
  for (let i = active.length - 1; i >= 0; i--) {
    const o = active[i], s = o.sim;
    if (o.state === 'falling') { if (!stepFall(s, dt, o.def.h * o.s)) o.state = s.mode === 'bend' ? 'bent' : 'down'; }
    else if (o.state === 'sliding') {
      const moving = stepSlide(s, dt, o.def.fr);
      const r = pushOut(s.x, s.z, o.def.r, true); if (r[2]) { s.x = r[0]; s.z = r[1]; const nl = Math.hypot(r[3], r[4]) || 1, vn = (s.vx * r[3] + s.vz * r[4]) / nl; if (vn < 0) { s.vx -= 1.3 * vn * r[3] / nl; s.vz -= 1.3 * vn * r[4] / nl; } }
      o.x = s.x; o.z = s.z; o.yaw += s.spin * dt;
      if (o.def.tip === 'lying' && s.th < Math.PI / 2 && Math.hypot(s.vx, s.vz) > 1.2) s.th = Math.min(Math.PI / 2, s.th + dt * 5);   // bins and cones tip over as they go
      if (!moving) o.state = 'settled';
    }
    place(o);
    if (o.state === 'down' || o.state === 'bent' || o.state === 'settled') active.splice(i, 1);
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.t += dt;
    if (!d.rest) {
      d.vy -= 18 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; d.m.rotation.x += d.wx * dt; d.m.rotation.z += d.wz * dt;
      if (d.m.position.y <= d.half) { d.m.position.y = d.half; if (Math.abs(d.vy) > 2.5) { d.vy *= -.25; d.vx *= .6; d.vz *= .6; } else { d.rest = true; d.m.rotation.x = d.m.rotation.z = 0; } }
    }
    if (d.t > 18) removeDebris(i);
  }
  cleanT -= dt; if (cleanT <= 0) { cleanT = 2; cleanup(px, pz); }
}
let cleanT = 2;
/** put things back once the player has left the area (and when too many knocked-over props pile up) */
function cleanup(px, pz) {
  let settled = 0;
  for (const o of objs) if (o.state !== 'standing' && o.state !== 'falling' && o.state !== 'sliding') settled++;
  for (const o of objs) {
    if (o.state === 'standing' || o.state === 'falling' || o.state === 'sliding') continue;
    const far = Math.hypot(o.x - px, o.z - pz), age = G.time - o.since;
    if ((far > 200 && age > 40) || (settled > MAX_SETTLED && far > 70 && age > 10)) { restore(o); settled--; }
  }
}
export function restore(o) {
  if (o.model) { release(o.model); o.model = null; const i = active.indexOf(o); if (i >= 0) active.splice(i, 1); }
  o.x = o.hx; o.z = o.hz; o.state = 'standing'; o.sim = null; o.show(); setOff(o, false); stats.restored++;
}
/** put every knocked-over prop back (respawn, mission restart) */
export function resetPhysProps() { for (const o of objs) if (o.state !== 'standing') restore(o); while (debris.length) removeDebris(0); }
export const physState = () => ({ active: active.length, debris: debris.length, down: objs.filter(o => o.state !== 'standing').length });
export { topple as _topple, shove as _shove, shatter as _shatter };
