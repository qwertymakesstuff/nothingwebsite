/* HARBOR CITY - a small open-world crime sandbox in the style of the early 3D GTA games. Everything (city, cars, people, sounds) is generated; built with three.js. */
(function () {
'use strict';
const store = {
  get(k, d) { try { const v = localStorage.getItem('gta:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('gta:' + k, JSON.stringify(v)); } catch (e) {} }
};
const $ = id => document.getElementById(id);
/* ---------- three setup ---------- */
let canvas = document.getElementById('view');
function failStart(detail) {
  const b = document.getElementById('go');
  b.textContent = 'can\'t start'; b.disabled = true; b.style.opacity = .5; b.style.cursor = 'default';
  const ua = navigator.userAgent;
  const mine = /Edg\//.test(ua) ? 'edge' : /OPR\/|Opera/.test(ua) ? 'opera' : /Firefox\//.test(ua) ? 'firefox' : /Chrome\/|CriOS/.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : '';
  const url = (u) => '<code class="cp" data-copy="' + u + '" title="click to copy">' + u + '</code>';
  const guides = [
    ['chrome', 'Chrome', '<ol><li>Open ' + url('chrome://settings/system') + ' (click it to copy, then paste into a new tab).</li><li>Turn on <b>Use graphics acceleration when available</b>.</li><li>Click <b>Relaunch</b>.</li><li>Still blank? Open ' + url('chrome://gpu') + ' and check that WebGL says "Hardware accelerated".</li></ol>'],
    ['edge', 'Edge', '<ol><li>Open ' + url('edge://settings/system') + '.</li><li>Turn on <b>Use graphics acceleration when available</b>.</li><li>Click <b>Restart</b>.</li></ol>'],
    ['firefox', 'Firefox', '<ol><li>Open ' + url('about:preferences') + ', scroll to <b>Performance</b>.</li><li>Untick <b>Use recommended performance settings</b>, then tick <b>Use hardware acceleration when available</b>.</li><li>Restart Firefox.</li><li>If it still fails, open ' + url('about:config') + ' and make sure <b>webgl.disabled</b> is <b>false</b>.</li></ol>'],
    ['safari', 'Safari', '<p>Safari has no hardware-acceleration switch &mdash; WebGL is normally always on. Try:</p><ol><li><b>Lockdown Mode</b> turns WebGL off. Check System Settings &rarr; Privacy &amp; Security &rarr; Lockdown Mode.</li><li>Safari &rarr; Settings &rarr; Advanced &rarr; tick <b>Show features for web developers</b>, then in the <b>Develop</b> menu open <b>Feature Flags</b> and reset any flags you changed back to their defaults, then restart Safari.</li><li>Turn off content blockers / extensions for this site, and update macOS &amp; Safari.</li><li>Still stuck? Try Chrome or Firefox instead.</li></ol>'],
    ['opera', 'Opera / Brave / others', '<ol><li>Open the browser settings and search for <b>hardware acceleration</b> (or <b>graphics acceleration</b>).</li><li>Turn it on and restart the browser. Brave: <code class="cp" data-copy="brave://settings/system">brave://settings/system</code></li></ol>']
  ];
  const box = document.createElement('div'); box.className = 'wgl';
  box.innerHTML = '<button type="button" class="wgl-t">Your browser has WebGL turned off or unsupported, so the game can\'t run. <u>Tap here to see how to turn it on.</u></button><div class="wgl-b" hidden>' +
    guides.map(g => '<details' + (g[0] === mine ? ' open' : '') + '><summary>' + g[1] + (g[0] === mine ? ' (your browser)' : '') + '</summary>' + g[2] + '</details>').join('') +
    '<p class="wgl-d">Technical detail: ' + String(detail || 'unknown').replace(/[<>&]/g, '') + '</p></div>';
  b.parentNode.insertBefore(box, b);
  box.querySelector('.wgl-t').addEventListener('click', () => { const x = box.querySelector('.wgl-b'); x.hidden = !x.hidden; });
  box.addEventListener('click', e => {
    const c = e.target.closest('.cp'); if (!c) return;
    const t = c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { c.textContent = 'copied! paste into a new tab'; setTimeout(() => c.textContent = t, 1800); }).catch(() => {});
  });
}
const ctxErr = [];
let renderer = null;
for (const [type, attrs] of [['webgl2', { antialias: true }], ['webgl', { antialias: true }], ['webgl', { antialias: false }], ['webgl', { antialias: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false }], ['experimental-webgl', {}]]) {
  const c = document.createElement('canvas'); c.id = 'view';
  c.addEventListener('webglcontextcreationerror', e => ctxErr.push(type + ': ' + (e.statusMessage || 'refused')));
  let gl = null;
  try { gl = c.getContext(type, attrs); } catch (e) { ctxErr.push(type + ': ' + e.message); }
  if (!gl) continue;
  if (gl.isContextLost && gl.isContextLost()) ctxErr.push(type + ': context lost right after creation');
  // some Safari setups return null here, which makes three.js crash; fall back to typical values
  const spf = gl.getShaderPrecisionFormat ? gl.getShaderPrecisionFormat.bind(gl) : null;
  gl.getShaderPrecisionFormat = (a, b) => (spf && spf(a, b)) || { rangeMin: 127, rangeMax: 127, precision: 23 };
  try { renderer = new THREE.WebGLRenderer({ canvas: c, context: gl, antialias: !!attrs.antialias }); canvas.replaceWith(c); canvas = c; break; }
  catch (e) { ctxErr.push('three on ' + type + ': ' + e.message); }
}
if (!renderer) { failStart(ctxErr.join(' | ') || 'no WebGL context available'); return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x9fb8c8);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fb8c8, 90, 300);
const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 340);

scene.add(camera);
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x59605a, 0.95));
const sun = new THREE.DirectionalLight(0xfff1d6, 0.75); sun.position.set(80, 140, 50); scene.add(sun);

/* ---------- city layout ---------- */
const N = 7, B = 40, RD = 14, P = B + RD, WORLD = N * P + RD, INSET = 3;
const rc = k => k * P + RD / 2;                // centre of road k
const blockX = i => i * P + RD, blockZ = j => j * P + RD;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const PARKS = ['3,3', '1,1', '5,5'], HOSPITAL = [5, 1], STATION = [1, 5];
const isPark = (i, j) => PARKS.includes(i + ',' + j);
const rects = [];                               // solid footprints
const rectGrid = {};
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  if (isPark(i, j)) continue;
  const r = { x0: blockX(i) + INSET, z0: blockZ(j) + INSET, x1: blockX(i) + B - INSET, z1: blockZ(j) + B - INSET };
  rects.push(r); rectGrid[i + ',' + j] = r;
}
function pushOut(x, z, rad) {
  // returns [x, z, hitFlag, nx, nz]
  const bi = Math.floor((x - RD / 2) / P), bj = Math.floor((z - RD / 2) / P);
  let hit = false, nx = 0, nz = 0;
  for (let i = bi - 1; i <= bi + 1; i++) for (let j = bj - 1; j <= bj + 1; j++) {
    const r = rectGrid[i + ',' + j]; if (!r) continue;
    const cx = clamp(x, r.x0, r.x1), cz = clamp(z, r.z0, r.z1), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 < rad * rad) {
      hit = true;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); x = cx + dx / d * rad; z = cz + dz / d * rad; nx += dx / d; nz += dz / d; }
      else { // inside: shove out through the nearest side
        const l = x - r.x0, rr = r.x1 - x, t = z - r.z0, b = r.z1 - z, m = Math.min(l, rr, t, b);
        if (m === l) { x = r.x0 - rad; nx -= 1; } else if (m === rr) { x = r.x1 + rad; nx += 1; } else if (m === t) { z = r.z0 - rad; nz -= 1; } else { z = r.z1 + rad; nz += 1; }
      }
    }
  }
  if (x < 1.5 + rad) { x = 1.5 + rad; hit = true; nx = 1; } if (x > WORLD - 1.5 - rad) { x = WORLD - 1.5 - rad; hit = true; nx = -1; }
  if (z < 1.5 + rad) { z = 1.5 + rad; hit = true; nz = 1; } if (z > WORLD - 1.5 - rad) { z = WORLD - 1.5 - rad; hit = true; nz = -1; }
  return [x, z, hit, nx, nz];
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
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshLambertMaterial({ map: groundTex() }));
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
    for (let t = 0; t < 14; t++) { const x = x0 + 2 + Math.random() * (S - 4), z = z0 + 2 + Math.random() * (S - 4); const c = new THREE.Mesh(treeGeo, treeMat); c.position.set(x, 3.8, z); const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.position.set(x, .75, z); scene.add(c, tr); }
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
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const m = new THREE.Mesh(lampGeo, lampMat); m.position.set(blockX(i) + 1.2, 3, blockZ(j) + 1.2); scene.add(m); }

// hospital / police station markers
function beam(x, z, col, h) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h || 30, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false })); m.position.set(x, (h || 30) / 2, z); scene.add(m); return m; }
const spawnHospital = [blockX(HOSPITAL[0]) + B / 2, blockZ(HOSPITAL[1]) + B + 3.5];
const spawnStation = [blockX(STATION[0]) + B / 2, blockZ(STATION[1]) + B + 3.5];
beam(spawnHospital[0], spawnHospital[1], 0xff4444, 14); beam(spawnStation[0], spawnStation[1], 0x4466ff, 14);

/* ---------- audio ---------- */
let ac = null, master = null, noiseBuf = null, engOsc = null, engGain = null, sirenOsc = null, sirenGain = null;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; engOsc = ac.createOscillator(); engOsc.type = 'sawtooth'; engGain = ac.createGain(); engGain.gain.value = 0;
    engOsc.connect(lp); lp.connect(engGain); engGain.connect(master); engOsc.start();
    sirenOsc = ac.createOscillator(); sirenOsc.type = 'square'; sirenGain = ac.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  } catch (e) { ac = null; }
}
function tone(f, d, type, v, slide) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05); }
function noise(d, v, cut) { if (!ac) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = cut || 1000; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5, d + .05); }
const sfx = {
  shot: () => { noise(.12, .3, 4000); tone(160, .12, 'square', .1, 60); },
  crash: v => { noise(.25, Math.min(.5, v), 700); tone(80, .2, 'sine', Math.min(.4, v), 40); },
  boom: () => { noise(1.1, .6, 500); tone(60, .9, 'sine', .5, 25); },
  cash: () => { tone(988, .1, 'sine', .12); setTimeout(() => tone(1319, .18, 'sine', .12), 90); },
  horn: () => { tone(330, .35, 'sawtooth', .08); tone(415, .35, 'sawtooth', .08); },
  door: () => { noise(.1, .15, 900); },
  scream: () => tone(900, .35, 'sawtooth', .05, 500)
};

/* ---------- vehicles ---------- */
const CAR_COLORS = [0xb83a3a, 0x3a6ab8, 0xd8d8d8, 0x2a2a2e, 0xc8a23a, 0x3a9a5a, 0x8a4ab8, 0xe07a30];
const wheelGeo = new THREE.CylinderGeometry(.42, .42, .3, 10), wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x1b2a38 });
const bodyGeo = new THREE.BoxGeometry(2, .75, 4.4), cabGeo = new THREE.BoxGeometry(1.8, .7, 2.1), vanGeo = new THREE.BoxGeometry(2, 1.5, 4.8);
function carMesh(color, kind) {
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, mat); body.position.y = .75; g.add(body);
  const cab = new THREE.Mesh(cabGeo, kind === 'cop' ? new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }) : glassMat); cab.position.set(0, 1.4, -.2); g.add(cab);
  [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].forEach(([x, z]) => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(x * .95, .42, z); g.add(w); });
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }); [-.7, .7].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), hl); l.position.set(x, .85, 2.22); g.add(l); });
  const tl = new THREE.MeshBasicMaterial({ color: 0xaa1111 }); [-.7, .7].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), tl); l.position.set(x, .85, -2.22); g.add(l); });
  g.userData.mat = mat;
  if (kind === 'cop') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, .3, 4.42), new THREE.MeshLambertMaterial({ color: 0x1b3a8a })); stripe.position.y = .78; g.add(stripe);
    const red = new THREE.MeshBasicMaterial({ color: 0xff2222 }), blue = new THREE.MeshBasicMaterial({ color: 0x2244ff });
    const a = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), red), b = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), blue);
    a.position.set(-.4, 1.85, -.2); b.position.set(.4, 1.85, -.2); g.add(a, b); g.userData.lights = [a, b];
  }
  scene.add(g); return g;
}
const cars = [];
function makeCar(x, z, yaw, kind, color) {
  const c = { kind, x, z, yaw, speed: 0, hp: kind === 'cop' ? 90 : 100, vx: 0, vz: 0, spin: 0, driver: null, mesh: carMesh(color == null ? pick(CAR_COLORS) : color, kind), wreck: false, age: 0, ai: null, honk: 0, despawn: 0, stuck: 0, hitCd: 0, burn: 0 };
  c.mesh.position.set(x, 0, z); c.mesh.rotation.y = yaw; cars.push(c); return c;
}
function removeCar(c) { scene.remove(c.mesh); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }

/* road graph: intersections (a,b) at (rc(a), rc(b)) */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const nodePos = (a, b) => [rc(a), rc(b)];
const nearestNode = (x, z) => [clamp(Math.round((x - RD / 2) / P), 0, N), clamp(Math.round((z - RD / 2) / P), 0, N)];
function nodePath(from, to) {
  const key = n => n[0] * 20 + n[1], prev = new Map([[key(from), null]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const n = q[i]; if (n[0] === to[0] && n[1] === to[1]) break;
    for (const [dx, dz] of DIRS) { const m = [n[0] + dx, n[1] + dz]; if (m[0] < 0 || m[1] < 0 || m[0] > N || m[1] > N || prev.has(key(m))) continue; prev.set(key(m), n); q.push(m); }
  }
  const out = []; let n = to; if (!prev.has(key(n))) return out;
  while (n && !(n[0] === from[0] && n[1] === from[1])) { out.push(n); n = prev.get(key(n)); }
  return out.reverse();
}

/* traffic: cars glide along the roads on the right-hand lane */
const LANE = 2.8;
function spawnTraffic() {
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS), na = a + d[0], nb = b + d[1];
    if (na < 0 || nb < 0 || na > N || nb > N) continue;
    const s = rand(8, P - 8), p = nodePos(a, b), r = [-d[1], d[0]];
    const x = p[0] + d[0] * s + r[0] * LANE, z = p[1] + d[1] * s + r[1] * LANE;
    if (Math.hypot(x - player.x, z - player.z) < 45) continue;
    if (cars.some(c => Math.hypot(c.x - x, c.z - z) < 8)) continue;
    const c = makeCar(x, z, Math.atan2(d[0], d[1]), 'traffic');
    c.ai = { a, b, d, s, cruise: rand(8, 14), stopT: 0, ghost: 0 }; c.driver = 'ai'; return c;
  }
}
function parkedCar() {
  for (let tries = 0; tries < 30; tries++) {
    const a = Math.floor(Math.random() * (N + 1)), b = Math.floor(Math.random() * (N + 1)), d = pick(DIRS), na = a + d[0], nb = b + d[1];
    if (na < 0 || nb < 0 || na > N || nb > N) continue;
    const s = rand(14, P - 14), p = nodePos(a, b), r = [-d[1], d[0]], side = Math.random() < .5 ? 1 : -1;
    const x = p[0] + d[0] * s + r[0] * 5.6 * side, z = p[1] + d[1] * s + r[1] * 5.6 * side;
    if (cars.some(c => Math.hypot(c.x - x, c.z - z) < 6) || Math.hypot(x - player.x, z - player.z) < 12) continue;
    return makeCar(x, z, Math.atan2(d[0], d[1]) + (Math.random() < .5 ? 0 : Math.PI), 'parked');
  }
}

/* ---------- people ---------- */
const skinCols = [0xe0b898, 0xc89870, 0x8a5a3a, 0xf0d0b0], clothCols = [0x3a6ab8, 0xb83a3a, 0x3a8a5a, 0xc8b030, 0x6a3a8a, 0x2a2a2a, 0xdddddd];
function personMesh(cloth, skin) {
  const g = new THREE.Group(), cm = new THREE.MeshLambertMaterial({ color: cloth });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.55, .75, .3), cm); body.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 8), new THREE.MeshLambertMaterial({ color: skin })); head.position.y = 1.78;
  const legM = new THREE.MeshLambertMaterial({ color: 0x2a2a35 });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(.2, .8, .22), legM), l2 = l1.clone(); l1.position.set(-.14, .4, 0); l2.position.set(.14, .4, 0);
  g.add(body, head, l1, l2); g.userData.legs = [l1, l2]; g.userData.body = cm; scene.add(g); return g;
}
const peds = [], items = [], bullets = [], fx = [];
const corner = (i, j, c) => { const sx = [-1, 1, 1, -1][c], sz = [-1, -1, 1, 1][c]; return [blockX(i) + B / 2 + sx * (B / 2 - 1.5), blockZ(j) + B / 2 + sz * (B / 2 - 1.5)]; };
function makePed() {
  const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N), c = Math.floor(Math.random() * 4), p = corner(i, j, c);
  const q = { x: p[0] + rand(-2, 2), z: p[1] + rand(-2, 2), i, j, c, dir: Math.random() < .5 ? 1 : -1, hp: 30, dead: 0, panic: 0, speed: rand(1.2, 1.9), mesh: personMesh(pick(clothCols), pick(skinCols)), ph: Math.random() * 6, tgt: null, cross: false, yaw: 0 };
  q.nc = (c + q.dir + 4) % 4; q.tgt = corner(i, j, q.nc); peds.push(q); return q;
}
function pedNext(p) {
  // arrived at a corner: keep walking round the block, turn back, or cross the road
  const r = Math.random(), sx = [-1, 1, 1, -1][p.nc], sz = [-1, -1, 1, 1][p.nc];
  if (p.cross) { p.cross = false; }
  if (r < .22) { const ni = p.i + sx, nj = p.j; if (ni >= 0 && ni < N) { p.i = ni; p.c = p.nc; p.nc = [1, 0, 3, 2][p.nc]; p.cross = true; p.tgt = corner(ni, nj, p.nc); return; } }
  else if (r < .44) { const nj = p.j + sz, ni = p.i; if (nj >= 0 && nj < N) { p.j = nj; p.c = p.nc; p.nc = [3, 2, 1, 0][p.nc]; p.cross = true; p.tgt = corner(ni, nj, p.nc); return; } }
  else if (r < .55) p.dir *= -1;
  p.c = p.nc; p.nc = (p.c + p.dir + 4) % 4; p.tgt = corner(p.i, p.j, p.nc);
}
function killPed(p, by) {
  if (p.dead) return; p.dead = 1; p.mesh.rotation.x = -Math.PI / 2; p.mesh.position.y = .25;
  dropItem('cash', p.x, p.z, Math.floor(rand(15, 70))); sfx.scream(); kills++;
}
let kills = 0;
function dropItem(kind, x, z, v) {
  const m = new THREE.Mesh(kind === 'cash' ? new THREE.BoxGeometry(.5, .08, .3) : new THREE.SphereGeometry(.35, 8, 8), new THREE.MeshBasicMaterial({ color: kind === 'cash' ? 0x5ae068 : kind === 'health' ? 0xff4466 : 0xffd23f }));
  m.position.set(x, .9, z); scene.add(m); items.push({ kind, x, z, v, mesh: m, t: 0 });
}

/* ---------- player and game state ---------- */
const player = { x: spawnHospital[0] - 8, z: spawnHospital[1], yaw: 0, hp: 100, car: null, mesh: personMesh(0xd8d8d8, 0xe0b898), shootCd: 0, hurt: 0, moving: false, ph: 0 };
scene.add(player.mesh);
const G = { running: false, started: false, over: false, money: store.get('money', 0), heat: 0, stars: 0, camYaw: 0, camPitch: .35, camDrag: 0, mission: null, missionCd: 0, banner: 0, time: 0, copTimer: 0, shootNoise: 0, fuzz: 0 };
const STAR_AT = [15, 45, 90, 150, 230];
function addHeat(v) { G.heat = Math.min(320, G.heat + v); G.fuzz = 0; }
const starsOf = () => STAR_AT.filter(t => G.heat >= t).length;
const msgEl = $('msg'); let msgT = 0;
function say(t, s) { msgEl.textContent = t; msgEl.classList.add('on'); msgT = s || 2.5; }
function banner(text, col, secs) { const b = $('banner'); b.textContent = text; b.style.color = col || '#fff'; b.classList.add('on'); G.banner = secs || 2.2; }

/* ---------- vehicle physics ---------- */
function driveCar(c, thr, steer, brake, dt) {
  const maxF = c.kind === 'cop' ? 34 + G.stars * 1.5 : 38, maxR = 10;
  if (thr > 0 && c.speed < maxF) c.speed += thr * (c.speed < 0 ? 40 : 19 - c.speed * .25) * dt;
  else if (thr < 0 && c.speed > -maxR) c.speed += thr * (c.speed > 0 ? 36 : 12) * dt;
  else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 38 * dt);
  const grip = clamp(Math.abs(c.speed) / 7, 0, 1) * (c.speed < 0 ? -1 : 1);
  c.yaw -= steer * grip * (brake ? 2.6 : 1.7) / (1 + Math.abs(c.speed) * .035) * dt;
  moveCarBy(c, Math.sin(c.yaw) * c.speed * dt, Math.cos(c.yaw) * c.speed * dt, true);
}
function moveCarBy(c, dx, dz, bounce) {
  for (const o of [[1.3, 1.2], [-1.3, 1.2]]) { // two circles along the body
    const px = c.x + dx + Math.sin(c.yaw) * o[0], pz = c.z + dz + Math.cos(c.yaw) * o[0];
    const r = pushOut(px, pz, o[1]);
    if (r[2]) {
      dx += r[0] - px; dz += r[1] - pz;
      const imp = Math.abs(c.speed);
      if (bounce && imp > 3 && c.hitCd <= 0) { c.hitCd = .3; hurtCar(c, Math.max(0, imp - 7) * 1.5); sfx.crash(imp / 40); c.speed *= -.25; if (c === player.car) { G.shake = clamp(imp / 20, 0, 1); } }
      else if (bounce) c.speed *= .8;
    }
  }
  c.x += dx; c.z += dz;
}
function hurtCar(c, d) { if (c.wreck || d <= 0) return; c.hp -= d; if (c.hp <= 0) explodeCar(c); }
function explodeCar(c) {
  c.wreck = true; c.hp = 0; c.speed = 0; c.burn = 20; sfx.boom();
  c.mesh.userData.mat.color.setHex(0x161616);
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9020, transparent: true, opacity: .9 }));
  s.position.set(c.x, 1.5, c.z); scene.add(s); fx.push({ mesh: s, t: 0, dur: .9, grow: 7 });
  peds.forEach(p => { if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < 7) killPed(p); });
  cars.forEach(o => { if (o !== c && !o.wreck && Math.hypot(o.x - c.x, o.z - c.z) < 7) hurtCar(o, 45); });
  if (player.car === c) { leaveCar(true); hurtPlayer(28); }
  else if (!player.car && Math.hypot(player.x - c.x, player.z - c.z) < 6) hurtPlayer(35);
  if (c.kind === 'cop') { addHeat(30); copsKilled++; }
  if (c.ai) { c.ai = null; c.driver = null; }
  if (c.mesh.userData.lights) c.mesh.userData.lights.forEach(l => l.visible = false);
}
let copsKilled = 0;
function hurtPlayer(d) { if (G.over) return; player.hp -= d; player.hurt = .4; flash(.5); if (player.hp <= 0) wasted(); }
function flash(o) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = o; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .7s'; f.style.opacity = 0; })); }

function carVsCar(a, b) {
  // two circles each: push apart, trade some speed, damage
  let hit = false;
  for (const oa of [1.3, -1.3]) for (const ob of [1.3, -1.3]) {
    const ax = a.x + Math.sin(a.yaw) * oa, az = a.z + Math.cos(a.yaw) * oa, bx = b.x + Math.sin(b.yaw) * ob, bz = b.z + Math.cos(b.yaw) * ob;
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), m = 2.3;
    if (d < m && d > .001) {
      hit = true; const pen = (m - d) / 2, nx = dx / d, nz = dz / d;
      a.x -= nx * pen; a.z -= nz * pen; b.x += nx * pen; b.z += nz * pen;
    }
  }
  if (hit && a.hitCd <= 0 && b.hitCd <= 0) {
    const rel = Math.abs(a.speed) + Math.abs(b.speed) * (b.ai || b.kind === 'parked' ? 0 : .7);
    a.hitCd = b.hitCd = .35;
    if (rel > 4) { sfx.crash(rel / 40); hurtCar(a, Math.max(0, rel - 6) * 1.1); hurtCar(b, Math.max(0, rel - 6) * 1.1); }
    const t = a.speed; a.speed = a.speed * -.15 + b.speed * .1; b.speed = b.speed * .5 + t * .35;
  }
  return hit;
}

function enterCar(c) {
  if (c.wreck) return;
  if (c.driver === 'ai') { addHeat(c.kind === 'cop' ? 40 : 14); say('carjacked', 1.5); const dir = [Math.cos(c.yaw), -Math.sin(c.yaw)]; const p = makePed(); p.x = c.x + dir[0] * 2; p.z = c.z + dir[1] * 2; p.panic = 6; p.mesh.position.set(p.x, 0, p.z); c.ai = null; c.driver = null; }
  else if (c.kind === 'cop') addHeat(40);
  c.driver = 'player'; c.kind = c.kind === 'parked' ? 'owned' : c.kind; player.car = c; player.mesh.visible = false; sfx.door();
  if (c.kind === 'cop') { c.despawn = 0; }
}
function leaveCar(forced) {
  const c = player.car; if (!c) return;
  const side = [Math.cos(c.yaw), -Math.sin(c.yaw)];
  for (const s of [1, -1]) { const x = c.x + side[0] * 2.4 * s, z = c.z + side[1] * 2.4 * s, r = pushOut(x, z, .5); if (!r[2] || s === -1) { player.x = r[0]; player.z = r[1]; break; } }
  c.driver = null; c.speed *= .5; player.car = null; player.mesh.visible = true; sfx.door();
}

/* ---------- police ---------- */
const officers = [];
function copTarget() { return Math.min(7, G.stars ? G.stars + 1 + (G.stars >= 4 ? 1 : 0) : 0); }
function spawnCop() {
  for (let t = 0; t < 20; t++) {
    const n = [Math.floor(Math.random() * (N + 1)), Math.floor(Math.random() * (N + 1))], p = nodePos(n[0], n[1]);
    const d = Math.hypot(p[0] - player.x, p[1] - player.z);
    if (d < 90 || d > 190) continue;
    const c = makeCar(p[0] + LANE, p[1], 0, 'cop', 0x1c2a4a); c.driver = 'cop'; c.cop = { path: [], rep: 0, flip: Math.random() * 3 }; return c;
  }
}
function officerFrom(c) {
  const m = personMesh(0x1a2a6a, 0xe0b898);
  const o = { x: c.x + Math.cos(c.yaw) * 2, z: c.z - Math.sin(c.yaw) * 2, hp: 60, mesh: m, shotCd: 1, car: c, yaw: 0, dead: 0 };
  officers.push(o); c.cop.out = o;
}
function updateCop(c, dt) {
  const k = c.cop; k.rep -= dt; c.mesh.userData.lights[0].visible = Math.sin(G.time * 14 + k.flip) > 0; c.mesh.userData.lights[1].visible = !c.mesh.userData.lights[0].visible;
  const tx = player.car ? player.car.x : player.x, tz = player.car ? player.car.z : player.z, dist = Math.hypot(tx - c.x, tz - c.z);
  if (!G.stars) { c.despawn += dt; driveCar(c, .4, 0, false, dt); if (c.despawn > 8 && dist > 40) removeCar(c); return; }
  c.despawn = 0;
  if (!player.car && dist < 12 && !k.out) { driveCar(c, 0, 0, true, dt); if (Math.abs(c.speed) < 2) officerFrom(c); return; }
  if (k.out) { driveCar(c, 0, 0, true, dt); return; }
  let gx = tx, gz = tz;
  const aligned = Math.abs(tx - c.x) < RD / 2 - 2 || Math.abs(tz - c.z) < RD / 2 - 2;
  if (!(dist < 38 && aligned)) {
    if (k.rep <= 0 || !k.path.length) { k.path = nodePath(nearestNode(c.x, c.z), nearestNode(tx, tz)); k.rep = 1; }
    while (k.path.length) { const p = nodePos(k.path[0][0], k.path[0][1]); if (Math.hypot(p[0] - c.x, p[1] - c.z) < 11) k.path.shift(); else { gx = p[0]; gz = p[1]; break; } }
  }
  const want = Math.atan2(gx - c.x, gz - c.z), diff = angDiff(want, c.yaw);
  const sp = Math.abs(diff) > 1 ? .45 : 1;
  const stuck = Math.abs(c.speed) < 1.5; c.stuck = stuck ? c.stuck + dt : 0;
  if (c.stuck > 1.6) { driveCar(c, -1, -Math.sign(diff) || 1, false, dt); if (c.stuck > 3) c.stuck = 0; }
  else driveCar(c, sp, clamp(-diff * 2.2, -1, 1), false, dt);
}
function updateOfficer(o, dt) {
  if (o.dead) return;
  o.shotCd -= dt;
  const tx = player.car ? player.car.x : player.x, tz = player.car ? player.car.z : player.z, dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz) || .001;
  if (!G.stars) { if (o.car) o.car.cop.out = null; o.dead = 2; return; }
  if (G.stars >= 3 && d < 24 && o.shotCd <= 0) { o.shotCd = rand(.6, 1.1); sfx.shot(); if (Math.random() < .45) hurtPlayer(player.car ? 3 : 6); drawTracer(o.x, 1.4, o.z, tx, 1.2, tz); }
  if (d > 1.3 && !(G.stars >= 3 && d < 14)) { const sp = 5.6; const r = pushOut(o.x + dx / d * sp * dt, o.z + dz / d * sp * dt, .45); o.x = r[0]; o.z = r[1]; o.yaw = Math.atan2(dx, dz); }
  else if (d <= 1.4 && !player.car) busted();
  o.mesh.position.set(o.x, Math.abs(Math.sin(G.time * 10)) * .04, o.z); o.mesh.rotation.y = o.yaw; animLegs(o.mesh, G.time * 10, 1);
}
function animLegs(m, t, amp) { m.userData.legs[0].rotation.x = Math.sin(t) * .6 * amp; m.userData.legs[1].rotation.x = -Math.sin(t) * .6 * amp; }
function drawTracer(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfff0a0 })); scene.add(l); fx.push({ mesh: l, t: 0, dur: .07, grow: 0 });
}

/* ---------- respawns ---------- */
function clearCops() { officers.forEach(o => { scene.remove(o.mesh); }); officers.length = 0; cars.filter(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player').forEach(removeCar); G.heat = 0; G.stars = 0; }
function respawn(at) {
  if (player.car) { player.car.driver = null; player.car = null; }
  player.mesh.visible = true; player.x = at[0]; player.z = at[1]; player.hp = 100; clearCops(); G.mission = null; hideMission();
  cars.filter(c => Math.hypot(c.x - at[0], c.z - at[1]) < 6 && !c.wreck).forEach(c => { c.x += 10; });
  document.querySelectorAll('.big').forEach(e => e.classList.remove('on'));
}
function wasted() {
  if (G.over) return; G.over = true; const lost = Math.min(G.money, 100); G.money -= lost; store.set('money', G.money);
  banner('WASTED', '#d33', 3.2); sfx.boom(); G.over = 'wasted';
  setTimeout(() => { respawn(spawnHospital); G.over = false; say('they patched you up (-$' + lost + ')', 3); }, 3200);
}
function busted() {
  if (G.over) return; G.over = 'busted'; const lost = Math.floor(G.money * .1); G.money -= lost; store.set('money', G.money);
  banner('BUSTED', '#69f', 3.2);
  setTimeout(() => { respawn(spawnStation); G.over = false; say('released. fined $' + lost, 3); }, 3200);
}

/* ---------- missions ---------- */
const givers = [];
for (const [i, j, c] of [[0, 0, 2], [6, 0, 3], [0, 6, 1], [6, 6, 0], [3, 3, 0], [3, 0, 2]]) { const p = corner(i, j, c); givers.push({ x: p[0], z: p[1], mesh: beam(p[0], p[1], 0xffd23f, 12) }); }
const mBeam = beam(0, 0, 0xffee55, 40); mBeam.visible = false;
const rnode = () => nodePos(Math.floor(Math.random() * (N + 1)), Math.floor(Math.random() * (N + 1)));
function hideMission() { mBeam.visible = false; $('mission').hidden = true; }
function startMission() {
  const type = pick(['delivery', 'taxi', 'race']);
  let pts, time, reward, label;
  if (type === 'race') {
    const a0 = Math.floor(Math.random() * (N - 1)), b0 = Math.floor(Math.random() * (N - 1));
    pts = [[a0 + 2, b0], [a0 + 2, b0 + 2], [a0, b0 + 2], [a0, b0], [a0 + 2, b0], [a0 + 2, b0 + 2]].map(n => nodePos(n[0], n[1]));
    time = 80; reward = 700; label = 'street race: hit every checkpoint';
  } else {
    const a = rnode(); let b = rnode(), tries = 0; while (Math.hypot(a[0] - b[0], a[1] - b[1]) < 120 && tries++ < 30) b = rnode();
    pts = [a, b]; const d = Math.hypot(a[0] - player.x, a[1] - player.z) + Math.hypot(a[0] - b[0], a[1] - b[1]);
    time = Math.round(d * .16 + 35); reward = Math.round(150 + d * .9);
    label = type === 'delivery' ? 'package run: pick it up, drop it off' : 'taxi fare: you need a car';
  }
  G.mission = { type, pts, idx: 0, left: time, reward, label, need: type !== 'delivery' };
  mBeam.visible = true; $('mission').hidden = false; banner(type === 'race' ? 'STREET RACE' : type === 'taxi' ? 'TAXI FARE' : 'PACKAGE RUN', '#ffd23f', 2);
}
function updateMission(dt) {
  const m = G.mission; G.missionCd -= dt;
  if (!m) {
    if (G.missionCd <= 0 && !G.over) for (const g of givers) {
      const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
      if (Math.hypot(g.x - px, g.z - pz) < 3.5) { startMission(); break; }
    }
    return;
  }
  m.left -= dt;
  const t = m.pts[m.idx]; mBeam.position.set(t[0], 20, t[1]);
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z, d = Math.hypot(t[0] - px, t[1] - pz);
  const needNow = m.need && !player.car && (m.type === 'race' || m.idx === 0 || m.idx === 1);
  $('mission').textContent = m.label + ' - ' + (m.type === 'race' ? 'checkpoint ' + (m.idx + 1) + '/' + m.pts.length : m.idx === 0 ? 'go to the pickup' : 'go to the drop-off') + ' - ' + Math.ceil(d) + 'm - ' + Math.max(0, Math.ceil(m.left)) + 's' + (needNow ? ' - GET IN A CAR' : '');
  if (d < 6 && !needNow) {
    m.idx++; sfx.cash();
    if (m.idx >= m.pts.length) {
      let r = m.reward; if (m.type === 'race') { const used = 80 - m.left; r += Math.round(Math.max(0, m.left) * 8); const best = store.get('bestRace', null); if (!best || used < best) { store.set('bestRace', used); say('new best race time: ' + used.toFixed(1) + 's', 3); } }
      G.money += r; store.set('money', G.money); banner('MISSION PASSED  $' + r, '#7ae27a', 3); G.mission = null; G.missionCd = 4; hideMission();
    }
  }
  if (G.mission && m.left <= 0) { banner('MISSION FAILED', '#d33', 2.5); G.mission = null; G.missionCd = 4; hideMission(); }
}

/* ---------- shooting ---------- */
function shoot() {
  if (G.over || player.car || player.shootCd > 0) return;
  player.shootCd = .3; sfx.shot();
  let yaw = G.camYaw, best = null, bd = 1e9;
  const consider = (x, z, rad, ref) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz); if (d > 40 || d < .5) return; const a = Math.abs(angDiff(Math.atan2(dx, dz), G.camYaw)); if (a < .3 && a * d < bd) { bd = a * d; best = { x, z, d }; } };
  peds.forEach(p => { if (!p.dead) consider(p.x, p.z); }); officers.forEach(o => { if (!o.dead) consider(o.x, o.z); }); cars.forEach(c => { if (!c.wreck && c !== player.car && c.kind !== 'parked' || (c.kind === 'parked' && false)) consider(c.x, c.z); });
  if (best) yaw = Math.atan2(best.x - player.x, best.z - player.z);
  player.yaw = yaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let maxD = 40; for (let d = 1.5; d <= 40; d += 1.5) if (pushOut(player.x + fx * d, player.z + fz * d, .1)[2]) { maxD = d; break; }
  let hit = null, hd = maxD;
  const test = (x, z, rad, ref, kind) => { const dx = x - player.x, dz = z - player.z, al = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx); if (al > 0 && al < hd && lat < rad) { hd = al; hit = { ref, kind }; } };
  peds.forEach(p => { if (!p.dead) test(p.x, p.z, .6, p, 'ped'); }); officers.forEach(o => { if (!o.dead) test(o.x, o.z, .6, o, 'cop'); }); cars.forEach(c => { if (!c.wreck) test(c.x, c.z, 1.5, c, 'car'); });
  drawTracer(player.x + fx * .6, 1.3, player.z + fz * .6, player.x + fx * hd, 1.2, player.z + fz * hd);
  peds.forEach(p => { if (!p.dead && Math.hypot(p.x - player.x, p.z - player.z) < 28) p.panic = 6; });
  if (hit) {
    if (hit.kind === 'ped') { hit.ref.hp -= 30; if (hit.ref.hp <= 0) { killPed(hit.ref); addHeat(20); } }
    else if (hit.kind === 'cop') { hit.ref.hp -= 22; addHeat(12); if (hit.ref.hp <= 0) { hit.ref.dead = 1; hit.ref.mesh.rotation.x = -Math.PI / 2; hit.ref.mesh.position.y = .25; dropItem('cash', hit.ref.x, hit.ref.z, 60); addHeat(40); copsKilled++; } }
    else { hurtCar(hit.ref, 14); if (hit.ref.kind === 'cop') addHeat(25); else if (hit.ref.driver === 'ai') addHeat(8); }
  }
}

/* ---------- input ---------- */
const keys = {}; let isTouch = false;
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  keys[e.code] = true; if (!G.running) return;
  if (e.code === 'KeyE' || e.code === 'KeyF') toggleCar();
  if (e.code === 'KeyH' && player.car) { sfx.horn(); player.car.honk = 1; }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
let mouseDown = false;
canvas.addEventListener('mousedown', e => { if (G.running && document.pointerLockElement === canvas && e.button === 0) { mouseDown = true; shoot(); } });
window.addEventListener('mouseup', () => { mouseDown = false; });
document.addEventListener('mousemove', e => { if (!G.running || document.pointerLockElement !== canvas) return; G.camYaw -= e.movementX * .0025; G.camPitch = clamp(G.camPitch + e.movementY * .0025, -.1, 1.1); G.camDrag = 2; });
document.addEventListener('pointerlockchange', () => { if (isTouch || G.over) return; if (document.pointerLockElement !== canvas && G.running) pause(true); });
function lock() { if (!isTouch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
function toggleCar() {
  if (G.over) return;
  if (player.car) { if (Math.abs(player.car.speed) < 14) leaveCar(); else say('slow down first', 1.5); return; }
  let best = null, bd = 4.2; cars.forEach(c => { if (c.wreck) return; const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; best = c; } });
  if (best) enterCar(best); else say('no car close enough', 1.2);
}
const touch = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, my: 0, lx: 0, ly: 0, run: false, brake: false, fire: false };
const stickEl = $('stick');
function enableTouch() {
  isTouch = true; document.body.classList.add('touch');
  $('help').innerHTML = '<b>left side</b><span>move / steer + gas</span><b>right side</b><span>look</span><b>buttons</b><span>car in/out, shoot, brake, run</span>';
  const hold = (id, key) => { const el = $(id); const on = e => { e.preventDefault(); e.stopPropagation(); touch[key] = true; el.classList.add('on'); if (key === 'fire') shoot(); }; const off = e => { e.preventDefault(); touch[key] = false; el.classList.remove('on'); }; el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off); };
  hold('tBrake', 'brake'); hold('tRun', 'run'); hold('tFire', 'fire');
  $('tCar').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.running) toggleCar(); }, { passive: false });
  window.addEventListener('touchstart', e => {
    if (!G.running) return;
    for (const tc of e.changedTouches) {
      if (tc.target.closest && tc.target.closest('.tbtn')) continue;
      if (tc.clientX < window.innerWidth / 2 && touch.moveId === null) { touch.moveId = tc.identifier; touch.ox = touch.mx = tc.clientX; touch.oy = touch.my = tc.clientY; stickEl.style.display = 'block'; stickEl.style.left = (tc.clientX - 50) + 'px'; stickEl.style.top = (tc.clientY - 50) + 'px'; }
      else if (touch.lookId === null) { touch.lookId = tc.identifier; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    for (const tc of e.changedTouches) {
      if (tc.identifier === touch.moveId) { touch.mx = tc.clientX; touch.my = tc.clientY; const dx = clamp(touch.mx - touch.ox, -40, 40), dy = clamp(touch.my - touch.oy, -40, 40); stickEl.firstElementChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      else if (tc.identifier === touch.lookId) { G.camYaw -= (tc.clientX - touch.lx) * .006; G.camPitch = clamp(G.camPitch + (tc.clientY - touch.ly) * .004, -.1, 1.1); G.camDrag = 2; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  const end = e => { for (const tc of e.changedTouches) { if (tc.identifier === touch.moveId) { touch.moveId = null; stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = ''; } if (tc.identifier === touch.lookId) touch.lookId = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
}
if ('ontouchstart' in window && matchMedia('(pointer:coarse)').matches) enableTouch();
function readInput() {
  let fwd = 0, side = 0;
  if (keys.KeyW || keys.ArrowUp) fwd += 1; if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyD || keys.ArrowRight) side += 1; if (keys.KeyA || keys.ArrowLeft) side -= 1;
  if (touch.moveId !== null) { side += clamp((touch.mx - touch.ox) / 40, -1, 1); fwd -= clamp((touch.my - touch.oy) / 40, -1, 1); }
  return { fwd: clamp(fwd, -1, 1), side: clamp(side, -1, 1), run: keys.ShiftLeft || keys.ShiftRight || touch.run, brake: keys.Space || touch.brake, fire: mouseDown || keys.KeyJ || touch.fire };
}

/* ---------- per-frame updates ---------- */
function updatePlayer(dt) {
  const inp = readInput(); player.shootCd -= dt; player.hurt -= dt;
  if (G.over) { if (player.car) driveCar(player.car, 0, 0, true, dt); return; }
  if (player.car) {
    const c = player.car; c.hitCd -= dt;
    driveCar(c, inp.fwd, inp.side, inp.brake, dt);
    player.x = c.x; player.z = c.z; player.yaw = c.yaw;
    if (c.wreck) return;
    if (c.honk > 0) c.honk -= dt;
  } else {
    const sy = Math.sin(G.camYaw), cy = Math.cos(G.camYaw);
    let vx = sy * inp.fwd - cy * inp.side, vz = cy * inp.fwd + sy * inp.side; const l = Math.hypot(vx, vz);
    player.moving = l > .1;
    if (l > 1) { vx /= l; vz /= l; }
    const sp = inp.run ? 8.4 : 5;
    if (player.moving) { const r = pushOut(player.x + vx * sp * dt, player.z + vz * sp * dt, .45); player.x = r[0]; player.z = r[1]; player.yaw = Math.atan2(vx, vz); player.ph += dt * (inp.run ? 14 : 10); }
    if (inp.fire) shoot();
    // being run over
    cars.forEach(c => { if (c.wreck || Math.abs(c.speed) < 6 || c.driver === 'player') return; if (Math.hypot(c.x - player.x, c.z - player.z) < 1.9) { hurtPlayer(Math.abs(c.speed) * 1.1); c.speed *= .6; } });
  }
  player.mesh.position.set(player.x, 0, player.z); player.mesh.rotation.y = player.yaw; animLegs(player.mesh, player.ph, player.moving ? 1 : 0);
}
function updateTraffic(c, dt) {
  const A = c.ai; A.ghost -= dt;
  let target = A.cruise;
  if (A.ghost <= 0) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const look = (x, z, lat) => { const dx = x - c.x, dz = z - c.z, al = dx * fx + dz * fz, la = Math.abs(dx * fz - dz * fx); if (al > 0 && al < 13 && la < lat) target = Math.min(target, Math.max(0, (al - 5.5) * 1.6)); };
    cars.forEach(o => { if (o !== c) look(o.x, o.z, 2.4); }); peds.forEach(p => { if (!p.dead) look(p.x, p.z, 1.6); });
    look(player.x, player.z, 2); officers.forEach(o => { if (!o.dead) look(o.x, o.z, 1.6); });
  }
  c.speed += clamp(target - c.speed, -26 * dt, 7 * dt);
  A.stopT = c.speed < .5 ? A.stopT + dt : 0; if (A.stopT > 5) { A.ghost = 2.5; A.stopT = 0; }
  A.s += Math.max(0, c.speed) * dt;
  if (A.s >= P) {
    A.a += A.d[0]; A.b += A.d[1]; A.s -= P;
    const opts = DIRS.filter(d => !(d[0] === -A.d[0] && d[1] === -A.d[1]) && A.a + d[0] >= 0 && A.a + d[0] <= N && A.b + d[1] >= 0 && A.b + d[1] <= N);
    A.d = opts.length ? (Math.random() < .55 && opts.some(d => d[0] === A.d[0] && d[1] === A.d[1]) ? A.d : pick(opts)) : [-A.d[0], -A.d[1]];
  }
  const p = nodePos(A.a, A.b), r = [-A.d[1], A.d[0]], tx = p[0] + A.d[0] * A.s + r[0] * LANE, tz = p[1] + A.d[1] * A.s + r[1] * LANE;
  const k = Math.min(1, dt * 5); c.x += (tx - c.x) * k; c.z += (tz - c.z) * k;
  c.yaw += angDiff(Math.atan2(A.d[0], A.d[1]), c.yaw) * Math.min(1, dt * 4);
  if (Math.hypot(tx - c.x, tz - c.z) > 12) { A.a = nearestNode(c.x, c.z)[0]; A.b = nearestNode(c.x, c.z)[1]; A.s = 0; }
}
function updateCars(dt) {
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i]; c.hitCd -= dt;
    if (c.wreck) { c.burn -= dt; if (c.burn < -20 && Math.hypot(c.x - player.x, c.z - player.z) > 60) removeCar(c); }
    else if (c.driver === 'player') { /* handled by the player */ }
    else if (c.ai) updateTraffic(c, dt);
    else if (c.cop) updateCop(c, dt);
    if (c.driver !== 'player' && (c.vx || c.vz)) { // knocked about
      moveCarBy(c, c.vx * dt, c.vz * dt, false); c.yaw += c.spin * dt; const f = Math.exp(-1.8 * dt); c.vx *= f; c.vz *= f; c.spin *= f;
      if (Math.hypot(c.vx, c.vz) < .3) c.vx = c.vz = c.spin = 0;
    } else if (c.driver !== 'player' && !c.ai && !c.cop && Math.abs(c.speed) > .2) { driveCar(c, 0, 0, true, dt); }
    if (c.burn > 0 && c.wreck && Math.random() < dt * 3) { const s = new THREE.Mesh(new THREE.SphereGeometry(.5, 6, 6), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: .6 })); s.position.set(c.x + rand(-.8, .8), 1.2, c.z + rand(-.8, .8)); scene.add(s); fx.push({ mesh: s, t: 0, dur: 1.2, grow: 1.5, rise: 2 }); }
  }
  // collisions (only close pairs)
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j]; if (Math.abs(a.x - b.x) > 5.5 || Math.abs(a.z - b.z) > 5.5) continue;
    const mover = (b.driver === 'player') ? b : a, other = mover === a ? b : a;
    const rel = Math.abs(mover.speed) + Math.hypot(other.vx || 0, other.vz || 0);
    if (carVsCar(mover, other)) {
      if (mover.driver === 'player' && rel > 8 && other.kind !== 'cop' && (other.ai || other.kind === 'traffic') && other.hitCd > .2) addHeat(10);
      const dx = other.x - mover.x, dz = other.z - mover.z, d = Math.hypot(dx, dz) || 1;
      if (!(other.driver === 'player') && rel > 5 && !(other.cop && G.stars)) { other.vx += dx / d * rel * .45; other.vz += dz / d * rel * .45; other.spin = rand(-1.5, 1.5); if (other.ai) { other.ai = null; other.driver = null; other.honk = 1; } }
    }
  }
  cars.forEach(c => { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw; });
}
function updatePeds(dt) {
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (p.dead) { p.dead += dt; p.mesh.position.set(p.x, .25, p.z); if (p.dead > 14) { scene.remove(p.mesh); peds.splice(i, 1); makePed(); } continue; }
    if (p.panic > 0) p.panic -= dt;
    const dx = p.tgt[0] - p.x, dz = p.tgt[1] - p.z, d = Math.hypot(dx, dz);
    if (d < .6) pedNext(p);
    else { const sp = p.speed * (p.panic > 0 ? 3.4 : 1); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; p.yaw = Math.atan2(dx, dz); p.ph += dt * sp * 4; }
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animLegs(p.mesh, p.ph, 1);
    // cars hit people; fast cars scare them
    for (const c of cars) {
      if (c.wreck) continue; const dd = Math.hypot(c.x - p.x, c.z - p.z), spd = Math.abs(c.speed) + Math.hypot(c.vx || 0, c.vz || 0);
      if (dd < 14 && spd > 8 && p.panic <= 0) p.panic = 3;
      if (dd < 1.9 && spd > 5) { killPed(p); if (c.driver === 'player') addHeat(12); break; }
    }
  }
  for (let i = officers.length - 1; i >= 0; i--) { const o = officers[i]; if (o.dead) { o.dead += o.dead === 1 ? dt + .001 : dt; if (o.dead > 6) { scene.remove(o.mesh); officers.splice(i, 1); } } }
}
function updateWanted(dt) {
  const was = G.stars; G.stars = starsOf();
  if (G.stars > was) { banner('★'.repeat(G.stars) + ' WANTED', '#ff6', 1.6); }
  const copNear = cars.some(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && Math.hypot(c.x - player.x, c.z - player.z) < 55) || officers.some(o => !o.dead);
  if (G.heat > 0 && !copNear) { G.fuzz += dt; G.heat = Math.max(0, G.heat - (G.fuzz > 3 ? 4 : 0) * dt); }
  if (G.stars === 0 && was > 0) say('you lost them', 2.5);
  G.copTimer -= dt;
  if (G.copTimer <= 0) { G.copTimer = 1.5; const live = cars.filter(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player').length; if (G.stars && live < copTarget()) spawnCop(); }
  const nearCop = G.stars && cars.some(c => c.kind === 'cop' && !c.wreck && c.driver !== 'player' && Math.hypot(c.x - player.x, c.z - player.z) < 70);
  if (sirenGain) { sirenGain.gain.value = nearCop ? .018 : 0; sirenOsc.frequency.value = 650 + Math.sin(G.time * 6) * 220; }
}
function updateItems(dt) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.t += dt; it.mesh.rotation.y += dt * 2; it.mesh.position.y = .9 + Math.sin(it.t * 3) * .12;
    if (Math.hypot(it.x - player.x, it.z - player.z) < 2.2) {
      if (it.kind === 'cash') { G.money += it.v; store.set('money', G.money); sfx.cash(); }
      else if (it.kind === 'health') { if (player.hp >= 100) continue; player.hp = Math.min(100, player.hp + 40); sfx.cash(); say('health', 1.2); }
      scene.remove(it.mesh); items.splice(i, 1);
      if (it.kind === 'health') setTimeout(() => dropItem('health', it.x, it.z, 0), 60000);
    }
  }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const u = f.t / f.dur;
    if (f.mesh.material && f.grow) { f.mesh.scale.setScalar(1 + u * f.grow); f.mesh.material.opacity = Math.max(0, .9 * (1 - u)); if (f.rise) f.mesh.position.y += f.rise * dt; }
    if (u >= 1) { scene.remove(f.mesh); fx.splice(i, 1); }
  }
}
let shake = 0;
function updateCamera(dt) {
  const c = player.car;
  if (c) {
    G.camDrag -= dt;
    if (G.camDrag <= 0 && Math.abs(c.speed) > 2) { const t = c.speed > 0 ? c.yaw : c.yaw + Math.PI; G.camYaw += angDiff(t, G.camYaw) * Math.min(1, dt * 3); }
  }
  const dist = c ? 9.5 + Math.min(4, Math.abs(c.speed) * .1) : 6.5, tx = player.x, tz = player.z, ty = c ? 1.4 : 1.5;
  const cp = Math.cos(G.camPitch) * dist, h = Math.sin(G.camPitch) * dist + 1.2;
  let cx = tx - Math.sin(G.camYaw) * cp, cz = tz - Math.cos(G.camYaw) * cp;
  // keep the camera out of buildings by pulling it in
  for (let k = 0; k < 6; k++) { const r = pushOut(cx, cz, .6); if (!r[2]) break; cx = r[0]; cz = r[1]; }
  camera.position.set(cx, Math.max(.8, ty + h), cz);
  if (G.shake) { shake = G.shake; G.shake = 0; } shake = Math.max(0, shake - dt * 2.5);
  camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake;
  camera.lookAt(tx, ty + .6, tz);
  const fov = 65 + (c ? Math.min(14, Math.abs(c.speed) * .35) : 0); if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  if (ac && engGain) { engGain.gain.value = c && !c.wreck ? .04 + Math.min(.05, Math.abs(c.speed) * .0012) : 0; engOsc.frequency.value = 45 + Math.abs(c ? c.speed : 0) * 3.2; }
}

/* ---------- hud and minimap ---------- */
const mm = $('minimap'), mg = mm.getContext('2d'); let hudT = 0;
function drawMinimap() {
  const S = mm.width, sc = S / 230, cx = S / 2, px = player.x, pz = player.z;
  mg.clearRect(0, 0, S, S); mg.fillStyle = '#2b2d30'; mg.fillRect(0, 0, S, S);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = cx + (blockX(i) - px) * sc, z = cx + (blockZ(j) - pz) * sc;
    if (x > S || z > S || x + B * sc < 0 || z + B * sc < 0) continue;
    mg.fillStyle = isPark(i, j) ? '#3f7a3a' : (i === HOSPITAL[0] && j === HOSPITAL[1]) ? '#e8e8ec' : (i === STATION[0] && j === STATION[1]) ? '#4466aa' : '#4d4d49'; mg.fillRect(x, z, B * sc, B * sc);
  }
  const dot = (x, z, col, r) => { const X = cx + (x - px) * sc, Z = cx + (z - pz) * sc; if (X < 2 || Z < 2 || X > S - 2 || Z > S - 2) return; mg.fillStyle = col; mg.beginPath(); mg.arc(X, Z, r, 0, 7); mg.fill(); };
  const edge = (x, z, col) => { let dx = x - px, dz = z - pz; const d = Math.hypot(dx, dz) * sc, m = cx - 6; if (d > m) { dx = dx / Math.hypot(dx, dz) * m; dz = dz / Math.hypot(dx, dz || 1) * 0; } };
  givers.forEach(g => dot(g.x, g.z, '#ffd23f', 3)); dot(spawnHospital[0], spawnHospital[1], '#ff4444', 3); dot(spawnStation[0], spawnStation[1], '#4466ff', 3);
  cars.forEach(c => { if (c.kind === 'cop' && !c.wreck) dot(c.x, c.z, Math.sin(G.time * 8) > 0 ? '#ff3030' : '#3060ff', 3); });
  officers.forEach(o => { if (!o.dead) dot(o.x, o.z, '#6688ff', 2); });
  if (G.mission) { const t = G.mission.pts[G.mission.idx]; let dx = (t[0] - px) * sc, dz = (t[1] - pz) * sc; const m = cx - 7, dd = Math.max(Math.abs(dx), Math.abs(dz)); if (dd > m) { dx = dx / dd * m; dz = dz / dd * m; } mg.fillStyle = '#ffee55'; mg.beginPath(); mg.arc(cx + dx, cx + dz, 5, 0, 7); mg.fill(); }
  mg.save(); mg.translate(cx, cx); mg.rotate(Math.PI - player.yaw); mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.restore();
}
function updateHud(dt) {
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.classList.remove('on'); }
  if (G.banner > 0) { G.banner -= dt; if (G.banner <= 0) $('banner').classList.remove('on'); }
  hudT -= dt; if (hudT > 0) return; hudT = .1;
  $('money').textContent = '$' + G.money.toLocaleString();
  $('hp').firstElementChild.style.width = Math.max(0, player.hp) + '%';
  $('stars').innerHTML = [0, 1, 2, 3, 4].map(i => '<i class="' + (i < G.stars ? (Math.sin(G.time * 8) > 0 || copsNearby() ? 'on' : 'on dim') : '') + '">★</i>').join('');
  const c = player.car; $('speed').textContent = c ? Math.round(Math.abs(c.speed) * 3.6) + ' km/h' + (c.hp < 100 ? '  car ' + Math.max(0, Math.round(c.hp)) + '%' : '') : '';
  let p = '';
  if (!G.over) {
    if (c) p = (isTouch ? 'tap CAR' : 'E') + ' to get out';
    else { const near = cars.some(o => !o.wreck && Math.hypot(o.x - player.x, o.z - player.z) < 4.2); if (near) p = (isTouch ? 'tap CAR' : 'E') + ' to get in'; }
    if (!G.mission && G.missionCd <= 0 && givers.some(g => Math.hypot(g.x - player.x, g.z - player.z) < 14)) p = 'walk into the yellow beam for a job';
  }
  $('prompt').textContent = p; drawMinimap();
}
const copsNearby = () => cars.some(c => c.kind === 'cop' && !c.wreck && Math.hypot(c.x - player.x, c.z - player.z) < 60);

/* ---------- frame loop and menus ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G.running) {
    G.time += dt;
    updatePlayer(dt); updateCars(dt); updatePeds(dt); officers.forEach(o => updateOfficer(o, dt)); updateWanted(dt); updateItems(dt); updateFx(dt); updateMission(dt);
    if (cars.filter(c => c.ai).length < 24 && Math.random() < dt * 2) spawnTraffic();
    givers.forEach(g => { g.mesh.rotation.y += dt; });
  }
  updateCamera(dt); updateHud(dt);
  renderer.render(scene, camera);
}
function begin() {
  initAudio(); lock(); G.started = true; G.running = true; $('start').hidden = true; $('hud').hidden = false; last = performance.now();
  say(isTouch ? 'find a car and drive. yellow beams are jobs' : 'E: get in a car. yellow beams are jobs. click to shoot', 6);
}
function pause(on) {
  if (!G.started) return;
  if (on) { G.running = false; touch.moveId = touch.lookId = null; stickEl.style.display = 'none'; $('pause').hidden = false; $('pauseStat').textContent = '$' + G.money.toLocaleString() + (store.get('bestRace', null) ? ' - best race ' + store.get('bestRace', 0).toFixed(1) + 's' : ''); }
  else { $('pause').hidden = true; G.running = true; last = performance.now(); lock(); if (ac && ac.state === 'suspended') ac.resume(); }
}
$('go').addEventListener('click', begin);
$('resume').addEventListener('click', () => pause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running) pause(true); });

// populate the city
for (let i = 0; i < 40; i++) makePed();
for (let i = 0; i < 34; i++) parkedCar();
for (let i = 0; i < 22; i++) spawnTraffic();
[[3, 3], [1, 1], [5, 5], [0, 3], [6, 3], [3, 6]].forEach(([i, j]) => { const p = corner(i, j, 0); dropItem('health', p[0] + 3, p[1] + 3, 0); });
// a welcome car outside the hospital
{ const c = makeCar(spawnHospital[0] + 6, spawnHospital[1] + 1.5, Math.PI / 2, 'owned', 0xc8a23a); c.driver = null; }
$('money').textContent = '$' + G.money.toLocaleString();
requestAnimationFrame(frame);

window.__gta = { G, player, cars, peds, officers, items, givers, enterCar, leaveCar, toggleCar, shoot, startMission, addHeat, hurtPlayer, spawnCop, begin, pause, nodePos, N, P, WORLD, spawnHospital, spawnStation, corner };
})();
