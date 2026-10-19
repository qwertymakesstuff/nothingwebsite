// LAST EXIT: Darius's crew on the road. Dark cars that hunt the player, besiege a witness, or run for it (Darius at the end).
// They drive with the cruisers' own road navigation (police.js navTo), shoot from the window, and can be wrecked or disabled like any
// car, so a story ambush is an ordinary fight in the ordinary city. Pure bookkeeping (info) is what the mission engine reads.
import { cars, makeCar, removeCar, driveCar, showDriver } from '../vehicles.js';
import { navTo, newCop } from '../police.js';
import { N } from '../layout.js';
import { nodePos, LANE } from '../roads.js';
import { visibleToPlayer, los } from '../reporting.js';
import { player, hurtPlayer } from '../player.js';
import { G } from '../state.js';
import { smoke, tracer } from '../effects.js';
import { sfx } from '../audio.js';
import { rand, pick } from '../util.js';
import * as npcs from './npcs.js';

const groups = new Map();
const COLORS = [0x15151a, 0x23181c, 0x1b2024, 0x2a2a2e], TYPES = ['sedan', 'sedan', 'suv', 'van'];
const NODES = []; for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) { const p = nodePos(a, b); NODES.push({ x: p[0], z: p[1] }); }
const axisYaw = (dx, dz) => Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dz > 0 ? 0 : Math.PI);
const alive = c => c && !c.wreck && !(c.crew && c.crew.down);

function makeCrewCar(x, z, yaw, mode, group, color, type, tag) {
  const c = makeCar(x, z, yaw, 'crew', color == null ? pick(COLORS) : color, type || pick(TYPES));
  c.driver = 'crew'; c.speed = 6; c.tag = tag || null; c.crew = { k: newCop('crew'), mode, group, fire: rand(.5, 1.2), down: false, t: 0, tx: 0, tz: 0, born: G.time }; showDriver(c, true); return c;
}
/** a spot on the road network out of the player's sight, in the distance band, preferring the direction asked for */
function spawnSpot(ref, lo, hi, behind) {
  const fx = Math.sin(behind ? behind.yaw : 0), fz = Math.cos(behind ? behind.yaw : 0);
  let best = null, bs = Infinity;
  for (let t = 0; t < 40; t++) {
    const n = NODES[Math.floor(Math.random() * NODES.length)], d = Math.hypot(n.x - ref.x, n.z - ref.z);
    if (d < lo || d > hi || Math.hypot(n.x - player.x, n.z - player.z) < 70) continue;
    const vis = visibleToPlayer(n.x, n.z); let score = (vis ? 200 : 0) + Math.random() * 20;
    if (behind) score += ((n.x - ref.x) * fx + (n.z - ref.z) * fz) / d * 40;                // behind = negative dot product
    if (cars.some(o => !o.wreck && Math.hypot(o.x - n.x, o.z - n.z) < 8)) score += 300;
    if (score < bs) { bs = score; best = n; }
  }
  return best;
}
function spawnOne(g) {
  const ref = g.at || player, heading = g.from === 'behind' ? { yaw: player.car ? player.car.yaw : G.camYaw } : null;
  const n = spawnSpot(ref, 95, 175, heading) || spawnSpot(ref, 60, 260, null); if (!n) return null;
  const yaw = axisYaw(player.x - n.x, player.z - n.z), fx = Math.sin(yaw), fz = Math.cos(yaw);
  return makeCrewCar(n.x - fz * LANE, n.z + fx * LANE, yaw, g.mode, g.id);          // right-hand lane, facing the player
}

/* ---- groups: what the mission engine starts, polls and stops ---- */
export function startAmbush(id, spec) {
  stopAmbush(id);
  const g = { id, mode: spec.mode || 'hunt', want: spec.cars || 0, from: spec.from, npc: spec.npc || null, at: spec.at || null, tag: spec.tag || null, cars: [], t: 0, spawnT: .5, away: 0, resolved: false, dur: spec.dur || 55, max: spec.max || 170, npcHp0: spec.hp };
  groups.set(id, g);
  if (g.mode === 'flee') { const c = cars.find(o => o.tag === g.tag); if (c) { c.crew = { k: newCop('crew'), mode: 'flee', group: id, fire: 1, down: false, t: 0, tx: 0, tz: 0, born: G.time }; c.driver = 'crew'; c.kind = 'crew'; showDriver(c, true); g.cars.push(c); g.want = 1; } }
  if (g.npc && spec.hp != null) { const n = npcs.get(g.npc); if (n) n.hp = spec.hp; }
  return g;
}
export function stopAmbush(id) {
  const g = groups.get(id); if (!g) return; groups.delete(id);
  for (const c of g.cars) if (c.crew && !c.wreck && g.mode !== 'flee') c.crew.mode = 'leave';
}
export function clearAmbushes() { for (const id of [...groups.keys()]) { const g = groups.get(id); groups.delete(id); for (const c of g.cars) if (c.crew) { if (c.wreck) continue; removeCar(c); } } }
export function info(id) {
  const g = groups.get(id); if (!g) return null;
  const live = g.cars.filter(alive).length, np = g.npc ? npcs.get(g.npc) : null;
  return { alive: g.resolved ? 0 : g.mode === 'flee' ? live : live + Math.max(0, g.want - g.cars.length), total: g.want, away: g.away, npcHp: np ? np.hp : null };
}
export function updateGroups(dt) {
  if (G.mode !== 'playing') return;
  for (const g of groups.values()) {
    g.t += dt; g.cars = g.cars.filter(c => cars.includes(c));
    if (g.mode === 'flee') { if (g.t > 85) for (const c of g.cars) c.hp = Math.min(c.hp, 20); continue; }
    g.spawnT -= dt;
    if (!g.resolved && g.cars.length < g.want && g.spawnT <= 0) { g.spawnT = rand(1.2, 2.6); const c = spawnOne(g); if (c) g.cars.push(c); }
    const live = g.cars.filter(alive);
    let minD = Infinity; for (const c of live) minD = Math.min(minD, Math.hypot(c.x - player.x, c.z - player.z));
    g.away = g.cars.length >= g.want && live.length && minD > 150 ? g.away + dt : 0;
    if (g.mode === 'siege' && !g.resolved) {
      const n = npcs.get(g.npc);
      if ((n && n.dead) || g.t > g.dur + 8) { g.resolved = true; for (const c of live) c.crew.mode = 'leave'; }
    }
    if (!g.resolved && g.t > g.max) { g.resolved = true; for (const c of live) c.crew.mode = 'leave'; }
  }
}

/* ---- one car ---- */
function shoot(c, tx, tz, chance, dmg) {
  sfx.shot(); tracer(c.x, 1.3, c.z, tx + rand(-.6, .6), 1.1, tz + rand(-.6, .6));
  if (Math.random() < chance) hurtPlayer(rand(dmg[0], dmg[1]) * (player.car ? .7 : 1));
}
function far(c, g) {
  if (!g.far || Math.hypot(g.far.x - c.x, g.far.z - c.z) < 14) { let best = NODES[0], bd = -1; for (let t = 0; t < 12; t++) { const n = pick(NODES), d = Math.hypot(n.x - player.x, n.z - player.z) + Math.random() * 60; if (d > bd) { bd = d; best = n; } } g.far = best; }
  return g.far;
}
/** go for the player; but against someone on foot they slow right down and shoot instead of running them over */
function chase(c, k, d, dt) {
  if (player.car) return navTo(c, k, player.x, player.z, dt, 31 + G.stars, d < 30);
  if (d < 9) return driveCar(c, 0, 0, true, dt);
  navTo(c, k, player.x, player.z, dt, d < 30 ? 9 : 24, d < 30);
}
export function updateCrew(c, dt) {
  const g = c.crew; if (!g) return; const k = g.k;
  if (G.mode !== 'playing') { driveCar(c, 0, 0, true, dt); return; }
  if (c.hp < (g.mode === 'flee' ? 45 : 28)) g.down = true;
  if (k.stuck >= 6 && g.mode !== 'leave') g.down = true;                                  // wedged for good: counts as put out of action
  if (g.down) { driveCar(c, 0, 0, true, dt); if (Math.random() < dt * 2) smoke(c.x, c.z); return; }
  g.t += dt; const d = Math.hypot(player.x - c.x, player.z - c.z);
  g.fire -= dt;
  switch (g.mode) {
    case 'leave': {
      const f = far(c, g); navTo(c, k, f.x, f.z, dt, 22);
      if (d > 150 && !visibleToPlayer(c.x, c.z)) removeCar(c);
      return;
    }
    case 'flee': {
      const f = far(c, g); navTo(c, k, f.x, f.z, dt, d < 25 ? 30 : 26);
      if (g.fire <= 0 && d < 22 && los(c.x, c.z, player.x, player.z)) { g.fire = rand(1.4, 2.2); shoot(c, player.x, player.z, .3, [2, 5]); }
      return;
    }
    case 'siege': {
      const grp = groups.get(g.group), n = grp && grp.npc ? npcs.get(grp.npc) : null;
      if (d < 38 || !n) { chase(c, k, d, dt); if (g.fire <= 0 && d < 28 && los(c.x, c.z, player.x, player.z)) { g.fire = rand(.9, 1.6); shoot(c, player.x, player.z, .4, [3, 6]); } return; }
      const dn = Math.hypot(n.x - c.x, n.z - c.z);
      if (dn > 20) { navTo(c, k, n.x, n.z, dt, 28, dn < 40); return; }
      driveCar(c, 0, 0, true, dt);
      if (g.fire <= 0 && !n.dead) { g.fire = rand(.35, .7); sfx.shot(); tracer(c.x, 1.3, c.z, n.x, 1.2, n.z); npcs.hurt(n.id, rand(1.1, 2.0) * 1.0); }
      return;
    }
    default: {                                                                              // hunt
      chase(c, k, d, dt);
      if (g.fire <= 0 && d < 30 && los(c.x, c.z, player.x, player.z)) { g.fire = rand(.9, 1.7); shoot(c, player.x, player.z, .38, [3, 6]); }
    }
  }
}
/** a car the mission needs to chase (Darius): the caller creates it, the group makes it run */
export function makeFleeCar(x, z, yaw, color, type, tag) { const c = makeCrewCar(x, z, yaw, 'flee', null, color, type, tag); c.crew.mode = 'idle'; return c; }
