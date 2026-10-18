// Pedestrians walking round the pavements (and across the roads), plus the pickups (cash, health) they and the world drop.
import { scene } from './render.js';
import { N, blockX, blockZ, corner } from './layout.js';
import { G, addMoney, addHeat, bump } from './state.js';
import { rand, pick } from './util.js';
import { sfx } from './audio.js';
import { cars, carDist } from './vehicles.js';
import { player } from './player.js';

import { createCharacter, civilianSpec } from './models/characters.js';
export function layDown(ch) { ch.update(0, 0, { dead: true }); }

export const peds = [], items = [];
export function makePed(at) {
  const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N), c = Math.floor(Math.random() * 4), p = corner(i, j, c);
  const q = { x: at ? at[0] : p[0] + rand(-2, 2), z: at ? at[1] : p[1] + rand(-2, 2), i, j, c, dir: Math.random() < .5 ? 1 : -1, hp: 30, dead: 0, panic: 0, speed: rand(1.2, 1.9), ch: null, mesh: null, tgt: null, yaw: 0 };
  q.ch = createCharacter(civilianSpec()); q.mesh = q.ch.root; scene.add(q.mesh); q.ph = 0;
  q.nc = (c + q.dir + 4) % 4; q.tgt = corner(i, j, q.nc); q.mesh.position.set(q.x, 0, q.z); peds.push(q); return q;
}
function pedNext(p) { // arrived at a corner: keep going round the block, turn back, or cross the road
  const r = Math.random(), sx = [-1, 1, 1, -1][p.nc], sz = [-1, -1, 1, 1][p.nc];
  if (r < .22) { const ni = p.i + sx; if (ni >= 0 && ni < N) { p.i = ni; p.c = p.nc; p.nc = [1, 0, 3, 2][p.nc]; p.tgt = corner(ni, p.j, p.nc); return; } }
  else if (r < .44) { const nj = p.j + sz; if (nj >= 0 && nj < N) { p.j = nj; p.c = p.nc; p.nc = [3, 2, 1, 0][p.nc]; p.tgt = corner(p.i, nj, p.nc); return; } }
  else if (r < .55) p.dir *= -1;
  p.c = p.nc; p.nc = (p.c + p.dir + 4) % 4; p.tgt = corner(p.i, p.j, p.nc);
}
export function killPed(p, by) {
  if (p.dead) return; p.dead = 1; layDown(p.ch); dropItem('cash', p.x, p.z, Math.floor(rand(15, 70))); sfx.scream(); bump('kills');
}
export function damagePed(p, dmg) { p.hp -= dmg; p.panic = 6; if (p.hp <= 0) { killPed(p, 'gun'); addHeat(20); } }

export function updatePeds(dt) {
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (p.dead) { p.dead += dt; p.mesh.visible = Math.abs(p.x - player.x) < 140 && Math.abs(p.z - player.z) < 140; if (p.dead > 14) { scene.remove(p.mesh); peds.splice(i, 1); makePed(); } continue; }
    if (p.panic > 0) p.panic -= dt;
    const dx = p.tgt[0] - p.x, dz = p.tgt[1] - p.z, d = Math.hypot(dx, dz);
    if (d < .6) pedNext(p);
    else { const sp = p.speed * (p.panic > 0 ? 3.4 : 1); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; p.yaw = Math.atan2(dx, dz); p.cur = sp; }
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw;
    p.mesh.visible = Math.abs(p.x - player.x) < 140 && Math.abs(p.z - player.z) < 140;
    if (p.mesh.visible) p.ch.update(dt, p.cur || 0, { run: p.panic > 0 });
    for (const c of cars) { // cars hit people; fast cars scare them
      if (c.wreck) continue; const dd = carDist(c, p.x, p.z) + 1.2, spd = Math.abs(c.speed) + Math.hypot(c.vx || 0, c.vz || 0);
      if (dd < 14 && spd > 8 && p.panic <= 0) p.panic = 3;
      if (dd < 1.4 && spd > 5) { killPed(p, 'car'); if (c.driver === 'player') addHeat(12); break; }
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
