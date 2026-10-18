// Static city: solid footprints and obstacles (for collisions), ground texture, buildings, trees and street lamps.
import { scene } from './render.js';
import { N, B, RD, P, WORLD, INSET, rc, blockX, blockZ, blockType, blockChar, footprints } from './layout.js';
import { HW, HW_Z, HW_HALF } from './highway.js';
import { limitToLand } from './coast.js';
import { buildTerrain } from './terrain.js';
import { buildBeach } from './models/beach.js';
import { clamp, rng } from './util.js';
import { quality } from './settings.js';
import { buildBlock, circles, spinners } from './models/buildings.js';
import { decor, lots } from './models/kit.js';

const rectGrid = {};
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const fps = footprints(i, j).map(f => ({ x0: f[0], z0: f[1], x1: f[2], z1: f[3] })); if (fps.length) rectGrid[i + ',' + j] = fps; }
// small round obstacles (trees, lamp posts) in a coarse hash so lookups stay cheap
const CELLSZ = 20, circleGrid = {};
export function addCircle(x, z, r) { const k = Math.floor(x / CELLSZ) + ',' + Math.floor(z / CELLSZ); (circleGrid[k] = circleGrid[k] || []).push({ x, z, r }); }

/** Push a circle (x,z,rad) out of every solid thing. Returns [x, z, hit, nx, nz]. */
export function pushOut(x, z, rad) {
  const bi = Math.floor((x - RD / 2) / P), bj = Math.floor((z - RD / 2) / P);
  let hit = false, nx = 0, nz = 0, wall = false;
  for (let i = bi - 1; i <= bi + 1; i++) for (let j = bj - 1; j <= bj + 1; j++) {
    const list = rectGrid[i + ',' + j]; if (!list) continue;
    for (const r of list) {
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
  }
  const ci = Math.floor(x / CELLSZ), cj = Math.floor(z / CELLSZ);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const list = circleGrid[i + ',' + j]; if (!list) continue;
    for (const c of list) {
      const dx = x - c.x, dz = z - c.z, m = rad + c.r, d2 = dx * dx + dz * dz;
      if (d2 < m * m) { const d = Math.sqrt(d2) || .001; x = c.x + dx / d * m; z = c.z + dz / d * m; hit = true; nx += dx / d; nz += dz / d; }
    }
  }
  // the edge of the world is the water line, not a wall: stay on dry land (or a pier) outside the city square
  wall = hit; const lp = limitToLand(x, z, rad + 1.4); let shore = false; if (lp.hit) { x = lp.x; z = lp.z; hit = true; nx += lp.nx; nz += lp.nz; shore = !wall; }
  return [x, z, hit, nx, nz, shore];
}
/** True if the straight line a->b is not blocked by a building. */
export function lineClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 1.5));
  for (let i = 1; i < n; i++) { const t = i / n, bi = Math.floor((ax + (bx - ax) * t - RD / 2) / P), bj = Math.floor((az + (bz - az) * t - RD / 2) / P); const list = rectGrid[bi + ',' + bj]; if (!list) continue; const x = ax + (bx - ax) * t, z = az + (bz - az) * t; for (const r of list) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return false; }
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
  // the closed ground road beneath each ramp becomes a grassy embankment
  for (const [x0, x1] of [[HW.w0, HW.w1], [HW.e0, HW.e1]]) { g.fillStyle = '#4f7f40'; g.fillRect(x0 * k, (HW_Z - HW_HALF) * k, (x1 - x0) * k, 2 * HW_HALF * k); grain(x0 * k, (HW_Z - HW_HALF) * k, (x1 - x0) * k, 2 * HW_HALF * k, 1500, .1); }
  const bays = (x0, z0, w, rows) => { g.fillStyle = 'rgba(235,235,230,.85)'; for (let r = 0; r < rows; r++) { const zc = z0 + 3 + r * 11.2; for (let q = 0; q <= Math.floor(w / 2.8); q++) g.fillRect((x0 + q * 2.8 + (w - Math.floor(w / 2.8) * 2.8) / 2 - .06) * k, (zc - 2.7) * k, .12 * k, 5.4 * k); } };
  const tint = { o: '#5f8a4a', f: '#7a8a4a', l: '#6f8a5a', c: '#7a6a50', h: '#4a4a46', S: '#4a4a46', p: '#4a8a42', w: '#a89878', Z: '#c4bca8', N: '#3a3a3c', M: '#3a3a3c', F: '#48484a', V: '#3a3a3c', X: '#3a3a3c', U: '#3a3a3c', K: '#8a8c90', I: '#55575a', Y: '#55575a', P: '#6a6e72', W: '#6a6e72', L: '#3a3a3c', E: '#3a3a3c' };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = blockX(i), z = blockZ(j), ch = blockChar(i, j), t = blockType(i, j);
    g.fillStyle = '#9a9a94'; g.fillRect(x * k, z * k, B * k, B * k); grain(x * k, z * k, B * k, B * k, 2200, .07);                       // pavement
    g.fillStyle = 'rgba(0,0,0,.16)'; for (let q = 3; q < B; q += 3) { g.fillRect((x + q) * k, z * k, .06 * k, B * k); g.fillRect(x * k, (z + q) * k, B * k, .06 * k); } // paving joints
    g.fillStyle = '#c4c4be'; g.fillRect(x * k, z * k, B * k, .3 * k); g.fillRect(x * k, (z + B - .3) * k, B * k, .3 * k); g.fillRect(x * k, z * k, .3 * k, B * k); g.fillRect((x + B - .3) * k, z * k, .3 * k, B * k); // curb
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x * k, (z - .4) * k, B * k, .4 * k); g.fillRect(x * k, (z + B) * k, B * k, .4 * k); g.fillRect((x - .4) * k, z * k, .4 * k, B * k); g.fillRect((x + B) * k, z * k, .4 * k, B * k); // gutter shadow
    const ix = (x + INSET) * k, iz = (z + INSET) * k, is = (B - 2 * INSET) * k;
    g.fillStyle = tint[ch] || '#4a4a46'; g.fillRect(ix, iz, is, is); grain(ix, iz, is, is, 3000, ch === 'p' || ch === 'o' || ch === 'f' ? .09 : .06);
    if (ch === 'p') { g.strokeStyle = '#b8a888'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(ix, iz); g.lineTo(ix + is, iz + is); g.moveTo(ix + is, iz); g.lineTo(ix, iz + is); g.stroke(); g.fillStyle = '#3a78a8'; g.beginPath(); g.arc(ix + is / 2, iz + is / 2, 4 * k, 0, 7); g.fill(); }
    if (ch === 'Z') { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .12 * k; for (let q = 0; q <= 34; q += 3.4) { g.beginPath(); g.moveTo(ix + q * k, iz); g.lineTo(ix + q * k, iz + is); g.moveTo(ix, iz + q * k); g.lineTo(ix + is, iz + q * k); g.stroke(); } g.fillStyle = '#8a8a82'; g.beginPath(); g.arc(ix + is / 2, iz + is / 2, 6.5 * k, 0, 7); g.fill(); }
    if (ch === 'w') { g.strokeStyle = 'rgba(70,50,30,.35)'; g.lineWidth = .08 * k; for (let q = 0; q <= 34; q += 2) { g.beginPath(); g.moveTo(ix + q * k, iz); g.lineTo(ix + q * k, iz + is); g.stroke(); } }
    if (ch === 'c') { g.fillStyle = 'rgba(90,70,40,.5)'; for (let q = 0; q < 20; q++) g.fillRect(ix + R() * is, iz + R() * is, (1 + R() * 4) * k, (1 + R() * 3) * k); }
    if (ch === 'K' || ch === 'P' || ch === 'W') { g.strokeStyle = 'rgba(230,200,60,.55)'; g.lineWidth = .18 * k; g.strokeRect(ix + 1 * k, iz + 1 * k, is - 2 * k, is - 2 * k); }
  }
  // parking bays and car-park surfaces (positions are the ones parkingBays() registered)
  for (const l of lots) { g.fillStyle = 'rgba(30,30,32,.9)'; g.fillRect(l.x0 * k, l.z0 * k, l.w * k, (l.rows * 11.2 + 1) * k); bays(l.x0, l.z0, l.w, l.rows); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
export let ground = null;


/* the blocks themselves */
export function buildCity() {
  buildTerrain();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (blockType(i, j) && true) buildBlock(i, j);
  circles.forEach(c => addCircle(c[0], c[1], c[2]));
  ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshLambertMaterial({ map: groundTex() }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD / 2, 0, WORLD / 2); ground.receiveShadow = true; scene.add(ground);
  buildBeach();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (blockChar(i, j) === 'p') addCircle(blockX(i) + B / 2, blockZ(j) + B / 2, 4.2); // the pond
}
export function beam(x, z, col, h) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h || 30, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(x, (h || 30) / 2, z); scene.add(m); return m;
}

/** Hide whole blocks that are far away (the fog hides them anyway). Called a few times a second. */
export function cullBlocks(px, pz, range) {
  const r = range || 270;
  for (const b of decor.blocks) { const vis = Math.abs(b.x - px) < r && Math.abs(b.z - pz) < r; if (b.vis !== vis) { b.vis = vis; for (const m of b.meshes) m.visible = vis; } }
}
