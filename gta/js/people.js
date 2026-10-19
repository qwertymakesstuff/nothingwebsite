// Pedestrians walking round the pavements (and across the roads), plus the pickups (cash, health) they and the world drop.
import { scene } from './render.js';
import { N, blockX, blockZ, corner, blockType, DISTRICTS } from './layout.js';
import { walkBlocked } from './highway.js';
import { shoreDist } from './coast.js';
import { WORLD } from './layout.js';
import { G, addMoney, bump } from './state.js';
import { reportCrime } from './reporting.js';
import { rand, pick } from './util.js';
import { sfx } from './audio.js';
import { cars, carDist } from './vehicles.js';
import { player } from './player.js';

import { createCharacter, civilianSpec } from './models/characters.js';
export function layDown(ch) { ch.update(0, 0, { dead: true }); }

export const peds = [], items = [];
/** o.ch: a ready-made character (for example the rigged model) instead of a random civilian; o.keep: never replaced by a new random pedestrian when it is removed */
export function makePed(at, o) {
  let i = 0, j = 0;
  for (let t = 0; t < 30; t++) { i = Math.floor(Math.random() * N); j = Math.floor(Math.random() * N); if (Math.random() * 1.8 <= DISTRICTS[blockType(i, j).district].peds) break; }  // busier districts get more people
  const c = Math.floor(Math.random() * 4), p = corner(i, j, c);
  const q = { x: at ? at[0] : p[0] + rand(-.7, .7), z: at ? at[1] : p[1] + rand(-.7, .7), i, j, c, dir: Math.random() < .5 ? 1 : -1, hp: 30, dead: 0, panic: 0, speed: rand(1.2, 1.9), ch: null, mesh: null, tgt: null, yaw: 0 };
  q.ch = (o && o.ch) || createCharacter(civilianSpec()); q.mesh = q.ch.root; if (o && o.keep) q.keep = true; scene.add(q.mesh); q.ph = 0;
  q.nc = (c + q.dir + 4) % 4; q.tgt = corner(i, j, q.nc); q.mesh.position.set(q.x, 0, q.z); peds.push(q); return q;
}
function pedNext(p) { // arrived at a corner: keep going round the block, turn back, or cross the road
  const r = Math.random(), sx = [-1, 1, 1, -1][p.nc], sz = [-1, -1, 1, 1][p.nc];
  const ok = t => !walkBlocked(t[0], t[1]) && !walkBlocked((t[0] + p.x) / 2, (t[1] + p.z) / 2);  // nobody crosses a highway ramp on foot
  if (r < .22) { const ni = p.i + sx, nn = [1, 0, 3, 2][p.nc]; if (ni >= 0 && ni < N && ok(corner(ni, p.j, nn))) { p.i = ni; p.c = p.nc; p.nc = nn; p.tgt = corner(ni, p.j, p.nc); return; } }
  else if (r < .44) { const nj = p.j + sz, nn = [3, 2, 1, 0][p.nc]; if (nj >= 0 && nj < N && ok(corner(p.i, nj, nn))) { p.j = nj; p.c = p.nc; p.nc = nn; p.tgt = corner(p.i, nj, p.nc); return; } }
  else if (r < .55) p.dir *= -1;
  p.c = p.nc; p.nc = (p.c + p.dir + 4) % 4; p.tgt = corner(p.i, p.j, p.nc);
}
/** a beach-goer: wanders freely over the sand between the water and the dunes */
const beachPoint = (x, z) => { for (let t = 0; t < 30; t++) { const a = Math.random() * 6.283, r = 6 + Math.random() * 40, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; const d = shoreDist(px, pz); if (d > 7 && d < 34 && !(px > -4 && px < WORLD + 4 && pz > -4 && pz < WORLD + 4)) return [px, pz]; } return null; };
export function makeBeachPed() {
  for (let t = 0; t < 60; t++) {
    const a = Math.random() * 6.283, r = 330 + Math.random() * 250, x = WORLD / 2 + Math.cos(a) * r, z = WORLD / 2 + Math.sin(a) * r, d = shoreDist(x, z);
    if (d < 8 || d > 30 || (x > -4 && x < WORLD + 4 && z > -4 && z < WORLD + 4)) continue;
    const q = makePed([x, z]); q.free = true; q.speed = 1 + Math.random() * .6; q.tgt = beachPoint(x, z) || [x, z]; return q;
  }
  return null;
}
export function killPed(p, by) {
  if (p.dead) return; p.dead = 1; layDown(p.ch); dropItem('cash', p.x, p.z, Math.floor(rand(15, 70))); sfx.scream(); bump('kills');
}
export function damagePed(p, dmg) { p.hp -= dmg; p.panic = 6; if (p.hp <= 0) { killPed(p, 'gun'); reportCrime('murder', p.x, p.z); } else reportCrime('assault', p.x, p.z); }

export function updatePeds(dt) {
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (p.dead) { p.dead += dt; p.mesh.visible = Math.abs(p.x - player.x) < 140 && Math.abs(p.z - player.z) < 140; if (p.dead > 14) { scene.remove(p.mesh); peds.splice(i, 1); if (p.ch.dispose) p.ch.dispose(); if (p.keep) continue; if (p.free) makeBeachPed(); else makePed(); } continue; }
    if (p.panic > 0) p.panic -= dt;
    const dx = p.tgt[0] - p.x, dz = p.tgt[1] - p.z, d = Math.hypot(dx, dz);
    if (d < .6) { if (p.free) p.tgt = beachPoint(p.x, p.z) || [p.x + (Math.random() - .5) * 8, p.z + (Math.random() - .5) * 8]; else pedNext(p); }
    else { const sp = p.speed * (p.panic > 0 ? 3.4 : 1); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; p.yaw = Math.atan2(dx, dz); p.cur = sp; }
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw;
    p.mesh.visible = Math.abs(p.x - player.x) < 110 && Math.abs(p.z - player.z) < 110;
    if (p.mesh.visible) p.ch.update(dt, p.cur || 0, { run: p.panic > 0 });
    for (const c of cars) { // cars hit people; fast cars scare them
      if (c.wreck || Math.abs(c.y) > 1.5) continue; const dd = carDist(c, p.x, p.z) + 1.2, spd = Math.abs(c.speed) + Math.hypot(c.vx || 0, c.vz || 0);
      if (dd < 14 && spd > 8 && p.panic <= 0) p.panic = 3;
      if (dd < 1.4 && spd > 5) { killPed(p, 'car'); if (c.driver === 'player') reportCrime('hit_and_run', p.x, p.z); break; }
    }
  }
}

/* pickups */
export function dropItem(kind, x, z, v) {
  const m = new THREE.Mesh(kind === 'cash' ? new THREE.BoxGeometry(.5, .08, .3) : new THREE.SphereGeometry(.35, 8, 8), new THREE.MeshBasicMaterial({ color: kind === 'cash' ? 0x5ae068 : 0xff4466 }));
  m.position.set(x, .9, z); scene.add(m); items.push({ kind, x, z, v, mesh: m, t: 0, respawn: 0 });
}
export function updateItems(dt, onPickup) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.t += dt; it.mesh.rotation.y += dt * 2; it.mesh.position.y = .9 + Math.sin(it.t * 3) * .12;
    if (Math.hypot(it.x - player.x, it.z - player.z) > 2.2) continue;
    if (it.kind === 'cash') addMoney(it.v);
    else { if (player.hp >= 100) continue; player.hp = Math.min(100, player.hp + 40); G.pendingHealth = (G.pendingHealth || []).concat([{ x: it.x, z: it.z, at: G.time + 60 }]); }
    onPickup(it); scene.remove(it.mesh); items.splice(i, 1);
  }
  if (G.pendingHealth && G.pendingHealth.length && G.pendingHealth[0].at <= G.time) { const h = G.pendingHealth.shift(); dropItem('health', h.x, h.z, 0); }
}
export function clearPeds() { peds.forEach(p => scene.remove(p.mesh)); peds.length = 0; }

/** a pedestrian that starts on the pavement corner nearest to (x, z), then walks the blocks like any other (the rigged model uses this) */
export function makePedNear(x, z, o) {
  let best = null, bd = 1e9;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let c = 0; c < 4; c++) { const p = corner(i, j, c), d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = [i, j, c, p]; } }
  const q = makePed(best[3], o); q.i = best[0]; q.j = best[1]; q.c = best[2]; q.nc = (q.c + q.dir + 4) % 4; q.tgt = corner(q.i, q.j, q.nc); return q;
}
export function removePed(p) { const i = peds.indexOf(p); if (i < 0) return; scene.remove(p.mesh); peds.splice(i, 1); if (p.ch.dispose) p.ch.dispose(); }
