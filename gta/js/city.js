// Static city: solid footprints and obstacles (for collisions), ground texture, buildings, trees and street lamps.
import { scene } from './render.js';
import { N, B, RD, P, WORLD, INSET, rc, blockX, blockZ, isPark, HOSPITAL, STATION } from './layout.js';
import { clamp, rand, pick } from './util.js';

const rectGrid = {};
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  if (isPark(i, j)) continue;
  rectGrid[i + ',' + j] = { x0: blockX(i) + INSET, z0: blockZ(j) + INSET, x1: blockX(i) + B - INSET, z1: blockZ(j) + B - INSET };
}
// small round obstacles (trees, lamp posts) in a coarse hash so lookups stay cheap
const CELLSZ = 20, circleGrid = {};
function addCircle(x, z, r) { const k = Math.floor(x / CELLSZ) + ',' + Math.floor(z / CELLSZ); (circleGrid[k] = circleGrid[k] || []).push({ x, z, r }); }

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
export function beam(x, z, col, h) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h || 30, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(x, (h || 30) / 2, z); scene.add(m); return m;
}

/* ---------- ground texture ---------- */
function groundTex() {
  const S = 2048, k = S / WORLD, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#2d2e31'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * .08 + ')'; g.fillRect(Math.random() * S, Math.random() * S, 3, 3); }
  // dashed centre lines
  g.fillStyle = '#c9b44a';
  for (let a = 0; a <= N; a++) for (let t = 0; t < WORLD; t += 8) {
    g.fillRect((rc(a) - .15) * k, t * k, .3 * k, 4 * k);
    g.fillRect(t * k, (rc(a) - .15) * k, 4 * k, .3 * k);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = blockX(i) * k, z = blockZ(j) * k;
    g.fillStyle = '#8c8c86'; g.fillRect(x, z, B * k, B * k);                          // pavement
    g.fillStyle = '#6f6f6a'; g.fillRect(x, z, B * k, .5 * k); g.fillRect(x, z + (B - .5) * k, B * k, .5 * k); g.fillRect(x, z, .5 * k, B * k); g.fillRect(x + (B - .5) * k, z, .5 * k, B * k);
    g.fillStyle = isPark(i, j) ? '#3f7a3a' : '#4d4d49'; g.fillRect((blockX(i) + INSET) * k, (blockZ(j) + INSET) * k, (B - 2 * INSET) * k, (B - 2 * INSET) * k);
  }
  // zebra crossings
  g.fillStyle = 'rgba(235,235,235,.8)';
  for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
    const cx = rc(a), cz = rc(b);
    for (let s = -5.5; s <= 5.5; s += 1.4) {
      g.fillRect((cx + s - .35) * k, (cz - RD / 2 - 3) * k, .7 * k, 2.2 * k); g.fillRect((cx + s - .35) * k, (cz + RD / 2 + .8) * k, .7 * k, 2.2 * k);
      g.fillRect((cx - RD / 2 - 3) * k, (cz + s - .35) * k, 2.2 * k, .7 * k); g.fillRect((cx + RD / 2 + .8) * k, (cz + s - .35) * k, 2.2 * k, .7 * k);
    }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
export const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshLambertMaterial({ map: groundTex() }));
ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD / 2, 0, WORLD / 2); scene.add(ground);
const outer = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0x2c5f78 }));
outer.rotation.x = -Math.PI / 2; outer.position.set(WORLD / 2, -.3, WORLD / 2); scene.add(outer);

/* ---------- buildings ---------- */
function windowTex(tint) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = tint; g.fillRect(0, 0, 64, 64);
  for (let y = 4; y < 64; y += 16) for (let x = 4; x < 64; x += 16) { g.fillStyle = Math.random() < .25 ? '#f0d98a' : '#27323d'; g.fillRect(x, y, 9, 10); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const TINTS = ['#8a7f73', '#7b8591', '#9a8a7a', '#6f7a70', '#a39587', '#78707f'];
const bMats = TINTS.map(t => new THREE.MeshLambertMaterial({ map: windowTex(t) }));
const roofMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
function building(x0, z0, w, d, h, mat) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / 8, uv.getY(i) * dims[f][1] / 8); }
  const m = new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
  m.position.set(x0 + w / 2, h / 2, z0 + d / 2); scene.add(m); return m;
}
const treeGeo = new THREE.ConeGeometry(1.6, 5, 7), trunkGeo = new THREE.CylinderGeometry(.25, .3, 1.5, 6);
const treeMat = new THREE.MeshLambertMaterial({ color: 0x2f6a35 }), trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3d22 });
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const x0 = blockX(i) + INSET, z0 = blockZ(j) + INSET, S = B - 2 * INSET;
  if (isPark(i, j)) {
    for (let t = 0; t < 14; t++) { const x = x0 + 2 + Math.random() * (S - 4), z = z0 + 2 + Math.random() * (S - 4); const c = new THREE.Mesh(treeGeo, treeMat); c.position.set(x, 3.8, z); const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.position.set(x, .75, z); scene.add(c, tr); addCircle(x, z, .7); }
    continue;
  }
  const special = (i === HOSPITAL[0] && j === HOSPITAL[1]) ? 'hospital' : (i === STATION[0] && j === STATION[1]) ? 'station' : null;
  if (special) {
    const mat = new THREE.MeshLambertMaterial({ color: special === 'hospital' ? 0xe8e8ec : 0x3a5a9a });
    building(x0, z0, S, S, 20, mat);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 6, .3), new THREE.MeshBasicMaterial({ color: special === 'hospital' ? 0xcc2222 : 0xdddddd }));
    sign.position.set(x0 + S / 2, 23, z0 + S + .2 - S / 2 * 0 - 0); sign.position.z = z0 + S / 2; scene.add(sign);
    continue;
  }
  const mat = pick(bMats), split = Math.random() < .55, tall = Math.random() < .3;
  if (!split) building(x0, z0, S, S, tall ? rand(30, 55) : rand(10, 22), mat);
  else {
    const hw = S / 2 - 1;
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => building(x0 + a * (hw + 2), z0 + b * (hw + 2), hw, hw, rand(8, tall ? 45 : 26), pick(bMats)));
  }
}
// street lamps (decoration only)
const lampGeo = new THREE.CylinderGeometry(.12, .12, 6, 5), lampMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const m = new THREE.Mesh(lampGeo, lampMat); m.position.set(blockX(i) + 1.2, 3, blockZ(j) + 1.2); scene.add(m); addCircle(blockX(i) + 1.2, blockZ(j) + 1.2, .3); }


