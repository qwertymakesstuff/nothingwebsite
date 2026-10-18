// Static city: solid footprints and obstacles (for collisions), ground texture, buildings, trees and street lamps.
import { scene } from './render.js';
import { N, B, RD, P, WORLD, INSET, rc, blockX, blockZ, isPark, HOSPITAL, STATION } from './layout.js';
import { clamp, rng } from './util.js';
import { quality } from './settings.js';
import { buildBlock, ENTERABLE_BLOCKS } from './models/buildings.js';

const rectGrid = {};
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  if (isPark(i, j)) continue;
  rectGrid[i + ',' + j] = { x0: blockX(i) + INSET, z0: blockZ(j) + INSET, x1: blockX(i) + B - INSET, z1: blockZ(j) + B - INSET };
}
// small round obstacles (trees, lamp posts) in a coarse hash so lookups stay cheap
const CELLSZ = 20, circleGrid = {};
export function addCircle(x, z, r) { const k = Math.floor(x / CELLSZ) + ',' + Math.floor(z / CELLSZ); (circleGrid[k] = circleGrid[k] || []).push({ x, z, r }); }

/** Push a circle (x,z,rad) out of every solid thing. Returns [x, z, hit, nx, nz]. */
export function pushOut(x, z, rad) {
  const bi = Math.floor((x - RD / 2) / P), bj = Math.floor((z - RD / 2) / P);
  let hit = false, nx = 0, nz = 0;
  for (let i = bi - 1; i <= bi + 1; i++) for (let j = bj - 1; j <= bj + 1; j++) {
    const r = rectGrid[i + ',' + j]; if (!r) continue;
    const cx = clamp(x, r.x0, r.x1), cz = clamp(z, r.z0, r.z1), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 < rad * rad) {
      hit = true;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); x = cx + dx / d * rad; z = cz + dz / d * rad; nx += dx / d; nz += dz / d; }
      else { // centre is inside: shove out through the nearest side
        const l = x - r.x0, rr = r.x1 - x, t = z - r.z0, b = r.z1 - z, m = Math.min(l, rr, t, b);
        if (m === l) { x = r.x0 - rad; nx -= 1; } else if (m === rr) { x = r.x1 + rad; nx += 1; } else if (m === t) { z = r.z0 - rad; nz -= 1; } else { z = r.z1 + rad; nz += 1; }
      }
    }
  }
  const ci = Math.floor(x / CELLSZ), cj = Math.floor(z / CELLSZ);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const list = circleGrid[i + ',' + j]; if (!list) continue;
    for (const c of list) {
      const dx = x - c.x, dz = z - c.z, m = rad + c.r, d2 = dx * dx + dz * dz;
      if (d2 < m * m) { const d = Math.sqrt(d2) || .001; x = c.x + dx / d * m; z = c.z + dz / d * m; hit = true; nx += dx / d; nz += dz / d; }
    }
  }
  if (x < 1.5 + rad) { x = 1.5 + rad; hit = true; nx = 1; } if (x > WORLD - 1.5 - rad) { x = WORLD - 1.5 - rad; hit = true; nx = -1; }
  if (z < 1.5 + rad) { z = 1.5 + rad; hit = true; nz = 1; } if (z > WORLD - 1.5 - rad) { z = WORLD - 1.5 - rad; hit = true; nz = -1; }
  return [x, z, hit, nx, nz];
}
/** True if the straight line a->b is not blocked by a building. */
export function lineClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 1.5));
  for (let i = 1; i < n; i++) { const t = i / n, bi = Math.floor((ax + (bx - ax) * t - RD / 2) / P), bj = Math.floor((az + (bz - az) * t - RD / 2) / P); const r = rectGrid[bi + ',' + bj]; if (!r) continue; const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return false; }
  return true;
}
function groundTex() {
  const S = quality === 'high' ? 4096 : 2048, k = S / WORLD, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(7);
  const grain = (x, y, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = (R() < .5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + R() * a + ')'; g.fillRect(x + R() * w, y + R() * h, 2, 2); } };
  g.fillStyle = '#34353a'; g.fillRect(0, 0, S, S); grain(0, 0, S, S, S * 12, .05);
  for (let t = 0; t < 70; t++) { g.fillStyle = 'rgba(0,0,0,' + (.04 + R() * .05) + ')'; g.fillRect(R() * S, R() * S, (4 + R() * 30) * k, (1 + R() * 3) * k); }         // patched asphalt
  const line = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * k, y * k, w * k, h * k); };
  const Y = '#d8b84a', Wh = '#e4e4e0';
  for (let a = 0; a <= N; a++) {
    const c0 = rc(a);
    line(c0 - .3, 0, .12, WORLD, Y); line(c0 + .18, 0, .12, WORLD, Y); line(0, c0 - .3, WORLD, .12, Y); line(0, c0 + .18, WORLD, .12, Y);                  // double yellow
    for (const o of [-4.6, 4.6]) { line(c0 + o, 0, .15, WORLD, Wh); line(0, c0 + o, WORLD, .15, Wh); }                                                     // edge lines
    for (let t = 0; t < WORLD; t += 10) for (const o of [-2.8, 2.8]) { line(c0 + o - .07, t, .14, 3.5, 'rgba(228,228,224,.55)'); line(t, c0 + o - .07, 3.5, .14, 'rgba(228,228,224,.55)'); } // lane dashes
  }
  // intersections: clean asphalt over the lines, then crossings and stop lines
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
    const cx = rc(a), cz = rc(b); g.fillStyle = '#34353a'; g.fillRect((cx - RD / 2) * k, (cz - RD / 2) * k, RD * k, RD * k); grain((cx - RD / 2) * k, (cz - RD / 2) * k, RD * k, RD * k, 900, .05);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect((cx - 3) * k, (cz - 3) * k, 6 * k, 6 * k);
    for (let s = -5.6; s <= 5.6; s += 1.2) {
      line(cx + s - .3, cz - RD / 2 - 2.4, .6, 2, Wh); line(cx + s - .3, cz + RD / 2 + .4, .6, 2, Wh);
      line(cx - RD / 2 - 2.4, cz + s - .3, 2, .6, Wh); line(cx + RD / 2 + .4, cz + s - .3, 2, .6, Wh);
    }
    line(cx + .4, cz - RD / 2 - 3.4, 4.2, .4, Wh); line(cx - 4.6, cz + RD / 2 + 3, 4.2, .4, Wh); line(cx + RD / 2 + 3, cz + .4, .4, 4.2, Wh); line(cx - RD / 2 - 3.4, cz - 4.6, .4, 4.2, Wh); // stop lines
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = blockX(i), z = blockZ(j);
    g.fillStyle = '#9a9a94'; g.fillRect(x * k, z * k, B * k, B * k); grain(x * k, z * k, B * k, B * k, 2200, .07);                       // pavement
    g.fillStyle = 'rgba(0,0,0,.16)'; for (let t = 3; t < B; t += 3) { g.fillRect((x + t) * k, z * k, .06 * k, B * k); g.fillRect(x * k, (z + t) * k, B * k, .06 * k); } // paving joints
    g.fillStyle = '#c4c4be'; g.fillRect(x * k, z * k, B * k, .3 * k); g.fillRect(x * k, (z + B - .3) * k, B * k, .3 * k); g.fillRect(x * k, z * k, .3 * k, B * k); g.fillRect((x + B - .3) * k, z * k, .3 * k, B * k); // curb
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x * k, (z - .4) * k, B * k, .4 * k); g.fillRect(x * k, (z + B) * k, B * k, .4 * k); g.fillRect((x - .4) * k, z * k, .4 * k, B * k); g.fillRect((x + B) * k, z * k, .4 * k, B * k); // gutter shadow
    const ix = (x + INSET) * k, iz = (z + INSET) * k, is = (B - 2 * INSET) * k;
    if (isPark(i, j)) { g.fillStyle = '#4a8a42'; g.fillRect(ix, iz, is, is); grain(ix, iz, is, is, 3000, .09); g.strokeStyle = '#b8a888'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(ix, iz); g.lineTo(ix + is, iz + is); g.moveTo(ix + is, iz); g.lineTo(ix, iz + is); g.stroke(); g.fillStyle = '#3a78a8'; g.beginPath(); g.arc(ix + is / 2, iz + is / 2, 4 * k, 0, 7); g.fill(); }
    else { g.fillStyle = '#4a4a46'; g.fillRect(ix, iz, is, is); }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
export const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshLambertMaterial({ map: groundTex() }));
ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD / 2, 0, WORLD / 2); ground.receiveShadow = true; scene.add(ground);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x2c6a88, roughness: .25, metalness: .2 }));
sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD / 2, -.4, WORLD / 2); scene.add(sea);
export { sea };

/* the blocks themselves */
export function buildCity() {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (isPark(i, j)) addCircle(blockX(i) + B / 2, blockZ(j) + B / 2, 4.2); // the pond
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!isPark(i, j)) buildBlock(i, j, ENTERABLE_BLOCKS[i + ',' + j]);
}
export function beam(x, z, col, h) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h || 30, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(x, (h || 30) / 2, z); scene.add(m); return m;
}
