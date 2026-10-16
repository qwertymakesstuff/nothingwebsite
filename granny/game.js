/* GRANNY - a small horror escape game. Three floors, one granny. Built with three.js; no assets, everything is generated. */
(function () {
'use strict';

/* ---------- settings ---------- */
const DIFFS = {
  easy:      { label: 'easy',      lives: 5, speed: .85, hear: .7,  sight: 11, drain: 1 / 150, hint: 'slower granny, hears less, 5 lives' },
  normal:    { label: 'normal',    lives: 3, speed: 1,   hear: 1,   sight: 14, drain: 1 / 100, hint: 'the way it was meant to be played' },
  hard:      { label: 'hard',      lives: 2, speed: 1.12, hear: 1.3, sight: 16, drain: 1 / 75,  hint: 'faster, sharper ears, 2 lives' },
  nightmare: { label: 'nightmare', lives: 1, speed: 1.2,  hear: 1.5, sight: 18, drain: 1 / 60,  hint: 'one life. good luck' }
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('granny:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('granny:' + k, JSON.stringify(v)); } catch (e) {} }
};
let diffKey = store.get('difficulty', 'normal'); if (!DIFFS[diffKey]) diffKey = 'normal';
let D = DIFFS[diffKey];
let quality = store.get('quality', 'high');

/* ---------- map ---------- */
const MAPS = window.GRANNY_MAPS;
const CELL = 3, WALL_H = 3.2;
const center = (c, r) => [(c + .5) * CELL, (r + .5) * CELL];
const toCell = v => Math.floor(v / CELL);
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const floors = MAPS.floors.map((def, f) => {
  const grid = def.rows.map(r => r.split(''));
  const o = { f, name: def.name, style: def.wall, grid, rows: grid.length, cols: grid[0].length, hides: [], keySpots: [], battSpots: [], bottleSpots: [], noteSpots: [], doors: [], doorAt: {}, tables: [], shelves: [], rugs: [], stairs: {}, start: null, gstart: null, exit: null, group: null, items: [] };
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
    const ch = grid[r][c], p = center(c, r);
    if (ch === 'P') { o.start = p; grid[r][c] = '.'; }
    else if (ch === 'G') { o.gstart = p; grid[r][c] = '.'; }
    else if (ch === 'K') { o.keySpots.push(p); grid[r][c] = '.'; }
    else if (ch === 'A') { o.battSpots.push(p); grid[r][c] = '.'; }
    else if (ch === 'Q') { o.bottleSpots.push(p); grid[r][c] = '.'; }
    else if (ch === 'M') { o.noteSpots.push(p); grid[r][c] = '.'; }
    else if (ch === 'H' || ch === 'B') o.hides.push({ type: ch === 'H' ? 'wardrobe' : 'bed', c, r, pos: p, out: null, rot: 0 });
    else if (ch === 'U') o.stairs.up = { c, r, pos: p };
    else if (ch === 'N') o.stairs.down = { c, r, pos: p };
    else if (ch === 'E') o.exit = { c, r, pos: p };
    else if (ch === 'D') { const d = { c, r, pos: p, open: 0, target: 0, mesh: null, horizontal: false }; o.doors.push(d); o.doorAt[r * o.cols + c] = d; }
    else if (ch === 'T') o.tables.push({ c, r, pos: p });
    else if (ch === 'S') o.shelves.push({ c, r, pos: p });
    else if (ch === 'X') o.rugs.push({ c, r, pos: p });
  }
  return o;
});
const SOLID = '#HBTSE';
const solid = (f, c, r) => { const o = floors[f]; return c < 0 || r < 0 || c >= o.cols || r >= o.rows || SOLID.includes(o.grid[r][c]); };
const opaque = (f, c, r) => {
  const o = floors[f];
  if (c < 0 || r < 0 || c >= o.cols || r >= o.rows) return true;
  const ch = o.grid[r][c];
  if (ch === '#' || ch === 'H' || ch === 'E') return true;
  if (ch === 'D') return o.doorAt[r * o.cols + c].open < .55;
  return false;
};
// hiding spots face the open neighbour; doors swing along the corridor
floors.forEach(o => {
  o.hides.forEach(h => {
    const dirs = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]];
    for (const [dc, dr, ry] of dirs) if (!solid(o.f, h.c + dc, h.r + dr)) { h.out = [h.c + dc, h.r + dr]; h.rot = ry; break; }
  });
  o.doors.forEach(d => { d.horizontal = solid(o.f, d.c - 1, d.r) && solid(o.f, d.c + 1, d.r); });
});
const NF = floors.length, START_FLOOR = floors.findIndex(o => o.start), GRANNY_FLOOR = floors.findIndex(o => o.gstart), EXIT_FLOOR = floors.findIndex(o => o.exit);

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
renderer.setClearColor(0x050303);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050303, 0.07);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
camera.rotation.order = 'YXZ';
scene.add(camera);
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
function applyQuality() {
  const low = quality === 'low';
  renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  scene.fog.density = low ? 0.085 : 0.07;
  resize();
}
applyQuality();

scene.add(new THREE.AmbientLight(0x6a5a5a, 0.9));
const torch = new THREE.SpotLight(0xfff0cf, 2.6, 28, 0.5, 0.55, 1.4);
torch.position.set(0, 0, 0.1);
torch.target.position.set(0, 0, -1);
camera.add(torch); camera.add(torch.target);
const glow = new THREE.PointLight(0xffd9a0, 0.6, 7, 2);
camera.add(glow);

/* ---------- textures ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeTex(w, h, rx, ry, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
function speckle(g, w, h, n, a) {
  for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * a + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 3); }
}
const shade = (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.25, 'rgba(0,0,0,0)'); gr.addColorStop(.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,18,10,.7)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
const STYLE = {
  paper: {
    wall: makeTex(256, 256, 1, 1, (g, w, h) => { g.fillStyle = '#4b4a38'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = '#41402f'; g.fillRect(x, 0, 16, h); } speckle(g, w, h, 900, .25); shade(g, w, h); }),
    floor: (c, r) => makeTex(256, 256, c, r, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = 'hsl(24,' + (28 + Math.random() * 8) + '%,' + (15 + Math.random() * 6) + '%)'; g.fillRect(0, y, w, 31); g.fillStyle = '#0d0805'; g.fillRect(0, y + 31, w, 1); g.fillRect(Math.random() * w, y, 1, 32); } speckle(g, w, h, 700, .3); }),
    ceil: '#2a2622'
  },
  rose: {
    wall: makeTex(256, 256, 1, 1, (g, w, h) => { g.fillStyle = '#4a3238'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 24) { g.fillStyle = '#3d282e'; g.fillRect(x, 0, 6, h); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,70,80,.25)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 0, 7); g.fill(); } speckle(g, w, h, 700, .3); shade(g, w, h); }),
    floor: (c, r) => makeTex(256, 256, c, r, (g, w, h) => { for (let y = 0; y < h; y += 42) { g.fillStyle = 'hsl(20,' + (22 + Math.random() * 8) + '%,' + (11 + Math.random() * 5) + '%)'; g.fillRect(0, y, w, 41); g.fillStyle = '#080403'; g.fillRect(0, y + 41, w, 1); } speckle(g, w, h, 700, .3); }),
    ceil: '#231d1d'
  },
  cellar: {
    wall: makeTex(256, 256, 1, 1, (g, w, h) => { g.fillStyle = '#3a3b3d'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * 32; x < w; x += 64) { g.fillStyle = 'hsl(210,4%,' + (20 + Math.random() * 9) + '%)'; g.fillRect(x + 2, y + 2, 60, 60); } speckle(g, w, h, 1100, .35); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(20,40,20,.18)'; g.fillRect(Math.random() * w, 0, 2 + Math.random() * 3, h * Math.random()); } shade(g, w, h); }),
    floor: (c, r) => makeTex(256, 256, c, r, (g, w, h) => { g.fillStyle = '#2c2c2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } speckle(g, w, h, 1000, .4); }),
    ceil: '#1c1c1e'
  }
};
const woodMat = new THREE.MeshLambertMaterial({ color: 0x3a2515 });
const darkWood = new THREE.MeshLambertMaterial({ color: 0x24150c });
const metalMat = new THREE.MeshLambertMaterial({ color: 0x55585c });
const bedMat = new THREE.MeshLambertMaterial({ color: 0x6b5a6e });
const sheetMat = new THREE.MeshLambertMaterial({ color: 0x9a8f86 });
const crateMat = new THREE.MeshLambertMaterial({ color: 0x5a4328 });
const rugMat = new THREE.MeshLambertMaterial({ color: 0x4a1616 });
const bookColors = [0x7a2a2a, 0x2a4a6a, 0x2f5a35, 0x6a5a2a, 0x4a2a5a];

// a few creepy paintings
function paintingTex(kind) {
  return makeTex(96, 128, 1, 1, (g, w, h) => {
    g.fillStyle = '#1b1410'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d2a22'; g.fillRect(6, 6, w - 12, h - 12);
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#3a3a2e'); bg.addColorStop(1, '#1f1c16'); g.fillStyle = bg; g.fillRect(10, 10, w - 20, h - 20);
    if (kind === 0) { g.fillStyle = '#c9b79c'; g.beginPath(); g.ellipse(w / 2, 52, 17, 23, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(w / 2 - 10, 46, 6, 7); g.fillRect(w / 2 + 4, 46, 6, 7); g.fillStyle = '#3a2a40'; g.fillRect(w / 2 - 24, 78, 48, 36); g.fillStyle = '#bbb'; g.beginPath(); g.arc(w / 2, 34, 22, Math.PI, 0); g.fill(); }
    else if (kind === 1) { g.fillStyle = '#1a2a3a'; g.fillRect(10, 10, w - 20, 54); g.fillStyle = '#34402e'; g.beginPath(); g.moveTo(10, 90); g.lineTo(38, 52); g.lineTo(60, 84); g.lineTo(w - 10, 60); g.lineTo(w - 10, h - 10); g.lineTo(10, h - 10); g.fill(); g.fillStyle = '#d8d0a8'; g.beginPath(); g.arc(70, 28, 8, 0, 7); g.fill(); }
    else if (kind === 2) { for (let i = 0; i < 7; i++) { g.fillStyle = 'hsl(' + (i * 20) + ',35%,' + (20 + i * 3) + '%)'; g.fillRect(14 + i * 9, 14 + (i % 3) * 12, 14, h - 28 - (i % 3) * 20); } }
    else { g.fillStyle = '#c9b79c'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(24 + i * 16, 62 + (i % 2) * 6, 7, 10, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(21 + i * 16, 59 + (i % 2) * 6, 2, 3); g.fillRect(26 + i * 16, 59 + (i % 2) * 6, 2, 3); g.fillStyle = '#c9b79c'; } g.fillStyle = '#222'; g.fillRect(14, 82, w - 28, 3); }
  });
}
const paintings = [0, 1, 2, 3].map(paintingTex);

/* ---------- build the three floors ---------- */
const W = f => floors[f].cols * CELL, DD = f => floors[f].rows * CELL;
const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
const tmpM = new THREE.Matrix4();
const lamps = [];       // { light, base, bulb, f }
const glowMats = [];

function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function nearestWallYaw(o, c, r) { // rotation so the prop's back faces the closest wall
  for (const [dc, dr, ry] of [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]]) if (solid(o.f, c + dc, r + dr) && o.grid[r + dr]?.[c + dc] === '#') return ry;
  return 0;
}

floors.forEach(o => {
  const st = STYLE[o.style], g = new THREE.Group(); o.group = g; scene.add(g);
  const Wd = o.cols * CELL, Dp = o.rows * CELL;
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(Wd, Dp), new THREE.MeshLambertMaterial({ map: st.floor(o.cols, o.rows) }));
  floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.set(Wd / 2, 0, Dp / 2); g.add(floorMesh);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Wd, Dp), new THREE.MeshLambertMaterial({ color: st.ceil }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(Wd / 2, WALL_H, Dp / 2); g.add(ceil);

  // walls (one instanced mesh per floor)
  const wallCells = [];
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) if (o.grid[r][c] === '#' || o.grid[r][c] === 'E') wallCells.push(center(c, r));
  const walls = new THREE.InstancedMesh(wallGeo, new THREE.MeshLambertMaterial({ map: st.wall }), wallCells.length);
  wallCells.forEach(([x, z], i) => { tmpM.makeTranslation(x, WALL_H / 2, z); walls.setMatrixAt(i, tmpM); });
  g.add(walls);

  // dark lintel over doorways
  for (let r = 1; r < o.rows - 1; r++) for (let c = 1; c < o.cols - 1; c++) {
    if (o.grid[r][c] !== '.' && o.grid[r][c] !== 'D') continue;
    const open = (a, b) => !solid(o.f, c + a, r + b);
    if ((solid(o.f, c - 1, r) && solid(o.f, c + 1, r) && (open(0, -1) || open(0, 1))) || (solid(o.f, c, r - 1) && solid(o.f, c, r + 1) && (open(-1, 0) || open(1, 0)))) {
      const [x, z] = center(c, r); g.add(box(CELL, .5, CELL, darkWood, x, WALL_H - .25, z));
    }
  }

  // doors: a slab hinged at one side
  o.doors.forEach(d => {
    const pivot = new THREE.Group();
    const slab = box(CELL - .25, 2.75, .12, woodMat, 0, 1.375, 0); slab.position.x = (CELL - .25) / 2;
    const knob = box(.1, .1, .2, metalMat, CELL - .55, 1.15, 0);
    pivot.add(slab, knob);
    pivot.position.set(d.pos[0] + (d.horizontal ? -CELL / 2 + .12 : 0), 0, d.pos[1] + (d.horizontal ? 0 : -CELL / 2 + .12));
    pivot.rotation.y = d.horizontal ? 0 : -Math.PI / 2;
    d.baseRot = pivot.rotation.y; d.mesh = pivot; g.add(pivot);
  });

  // wardrobes and beds
  o.hides.forEach(h => {
    const grp = new THREE.Group();
    if (h.type === 'wardrobe') {
      grp.add(box(2, 2.7, 1.5, darkWood, 0, 1.35, 0));
      grp.add(box(.04, 2.3, 1.2, woodMat, 0, 1.35, 0));
      grp.add(box(.06, .3, .06, metalMat, .05, 1.3, .15));
    } else {
      grp.add(box(2.5, .45, 1.4, darkWood, 0, .22, 0));
      grp.add(box(2.3, .22, 1.25, bedMat, 0, .55, 0));
      grp.add(box(.55, .14, .9, sheetMat, -.85, .72, 0));
      grp.add(box(.12, 1.1, 1.5, darkWood, -1.25, .75, 0));
      grp.add(box(.12, .7, 1.5, darkWood, 1.25, .55, 0));
    }
    grp.position.set(h.pos[0], 0, h.pos[1]);
    grp.rotation.y = h.type === 'wardrobe' ? h.rot : nearestWallYaw(o, h.c, h.r) + Math.PI / 2;
    g.add(grp);
  });

  // tables, shelves, rugs
  o.tables.forEach(t => { g.add(box(1.7, .9, 1.7, woodMat, t.pos[0], .45, t.pos[1])); });
  o.shelves.forEach((s, i) => {
    const grp = new THREE.Group();
    if (o.style === 'cellar') {
      grp.add(box(1.3, 1.2, 1.3, crateMat, -.4, .6, -.3)); grp.add(box(1.1, 1, 1.1, crateMat, .5, .5, .5)); grp.add(box(.9, .8, .9, crateMat, -.2, 1.6, -.2));
      grp.rotation.y = i * 1.3;
    } else {
      grp.add(box(2.4, 2.5, .6, darkWood, 0, 1.25, 0));
      for (let sh = 0; sh < 4; sh++) for (let b = 0; b < 8; b++) { const bk = box(.18, .4 + (b % 3) * .06, .4, new THREE.MeshLambertMaterial({ color: bookColors[(b + sh) % bookColors.length] }), -1 + b * .27, .35 + sh * .6, .05); grp.add(bk); }
      grp.rotation.y = nearestWallYaw(o, s.c, s.r);
    }
    grp.position.set(s.pos[0], 0, s.pos[1]); g.add(grp);
  });
  o.rugs.forEach(rg => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), rugMat); m.rotation.x = -Math.PI / 2; m.position.set(rg.pos[0], .015, rg.pos[1]); g.add(m); });

  // stairs
  ['up', 'down'].forEach(k => {
    const s = o.stairs[k]; if (!s) return;
    let ry = 0; for (const [dc, dr, a] of [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]]) if (solid(o.f, s.c + dc, s.r + dr)) { ry = a; break; }
    const grp = new THREE.Group();
    if (k === 'up') { for (let i = 0; i < 8; i++) grp.add(box(2.4, .35 + i * .3, .3, i % 2 ? darkWood : woodMat, 0, (.35 + i * .3) / 2, -1.2 + i * .3)); grp.add(box(.1, 2.4, 2.6, darkWood, -1.25, 1.2, 0)); grp.add(box(.1, 2.4, 2.6, darkWood, 1.25, 1.2, 0)); }
    else { const pit = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.4), new THREE.MeshBasicMaterial({ color: 0x000000 })); pit.rotation.x = -Math.PI / 2; pit.position.y = .03; grp.add(pit); for (let i = 0; i < 4; i++) grp.add(box(2.3, .06, .22, woodMat, 0, .04, 1.0 - i * .3)); grp.add(box(.08, .9, 2.4, metalMat, -1.2, .45, 0)); grp.add(box(.08, .9, 2.4, metalMat, 1.2, .45, 0)); }
    grp.position.set(s.pos[0], 0, s.pos[1]); grp.rotation.y = ry; g.add(grp);
  });

  // lamps: exactly three lights per floor so switching floors never recompiles shaders
  const lampSpots = o.tables.slice(0, 3).map(t => t.pos);
  while (lampSpots.length < 3) lampSpots.push([Wd / 2 + lampSpots.length * 2, Dp / 2]);
  lampSpots.forEach((p, i) => {
    const real = i < o.tables.length;
    if (real) {
      g.add(box(.25, .35, .25, darkWood, p[0], 1.07, p[1]));
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }); glowMats.push(bulbMat);
      const bulb = box(.42, .34, .42, bulbMat, p[0], 1.42, p[1]); g.add(bulb);
      const light = new THREE.PointLight(0xffc27a, .9, 10, 2); light.position.set(p[0], 1.8, p[1]); g.add(light);
      lamps.push({ light, base: o.style === 'cellar' ? .55 : .9, bulb: bulbMat, f: o.f, ph: Math.random() * 9, broken: i === 1 && Math.random() < .5 });
    } else { const light = new THREE.PointLight(0xffc27a, 0, 10, 2); light.position.set(p[0], 1.8, p[1]); g.add(light); }
  });

  // paintings on some walls
  const rnd = rng(1000 + o.f);
  let placed = 0;
  for (let r = 1; r < o.rows - 1 && placed < 9; r++) for (let c = 1; c < o.cols - 1 && placed < 9; c++) {
    if (o.style === 'cellar' || o.grid[r][c] !== '#' || rnd() > .1) continue;
    for (const [dc, dr, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
      if (o.grid[r + dr]?.[c + dc] !== '.') continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.2), new THREE.MeshLambertMaterial({ map: paintings[Math.floor(rnd() * 4)] }));
      const [x, z] = center(c, r); m.position.set(x + dc * (CELL / 2 + .02), 1.75, z + dr * (CELL / 2 + .02)); m.rotation.y = ry; g.add(m); placed++; break;
    }
  }

  // the front door
  if (o.exit) {
    const e = o.exit;
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(.2, 2.8, 2.2), new THREE.MeshLambertMaterial({ color: 0x4a1a1a }));
    doorMesh.position.set(e.c * CELL - .1, 1.4, e.pos[1]); g.add(doorMesh);
    o.locks = [0xcc3333, 0x3366cc, 0x33aa55].map((col, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.18, .28, .28), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      m.position.set(e.c * CELL - .25, 1.9 - i * .5, e.pos[1] + .6); m.userData.col = col; g.add(m); return m;
    });
    const signTex = makeTex(128, 48, 1, 1, (gx, w, h) => { gx.fillStyle = '#0c2a12'; gx.fillRect(0, 0, w, h); gx.fillStyle = '#5dff7a'; gx.font = '34px monospace'; gx.textAlign = 'center'; gx.fillText('EXIT', w / 2, 36); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, .38), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.rotation.y = -Math.PI / 2; sign.position.set(e.c * CELL - .05, 2.95, e.pos[1]); g.add(sign);
  }
});

/* ---------- items: keys, batteries, bottles, notes ---------- */
const KEY_COLORS = [0xe03a3a, 0x3a6ee0, 0x3ac26a];
const KEY_NAMES = ['red', 'blue', 'green'];
const KEY_FLOORS = [2, 0, 1]; // red upstairs, blue in the cellar, green on the ground floor with her
const pick = a => a[Math.floor(Math.random() * a.length)];
const keyItems = KEY_COLORS.map((col, i) => {
  const o = floors[KEY_FLOORS[i]], p = pick(o.keySpots);
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: col });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 8, 16), mat);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.05, .4, .05), mat); shaft.position.y = -.28;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(.14, .05, .05), mat); tooth.position.set(.07, -.4, 0);
  g.add(ring, shaft, tooth); g.position.set(p[0], 1.1, p[1]);
  o.group.add(g);
  const it = { kind: 'key', idx: i, f: o.f, x: p[0], z: p[1], mesh: g, got: false };
  o.items.push(it); return it;
});
function spawn(kind, f, p, build) { const m = build(); m.position.set(p[0], 1.0, p[1]); floors[f].group.add(m); const it = { kind, f, x: p[0], z: p[1], mesh: m, got: false }; floors[f].items.push(it); return it; }
const battItems = [], bottleItems = [], noteItems = [];
floors.forEach(o => {
  o.battSpots.forEach(p => battItems.push(spawn('battery', o.f, p, () => {
    const g = new THREE.Group(), cell = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .3, 10), new THREE.MeshBasicMaterial({ color: 0x57e36d })); const cap = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .06, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f })); cap.position.y = .18; g.add(cell, cap); return g; })));
  o.bottleSpots.forEach(p => bottleItems.push(spawn('bottle', o.f, p, () => {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x3f9a58 }); const body = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .3, 10), m); const neck = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .16, 8), m); neck.position.y = .22; g.add(body, neck); return g; })));
  o.noteSpots.forEach(p => { const idx = noteItems.length; const it = spawn('note', o.f, p, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .44), new THREE.MeshBasicMaterial({ color: 0xe8e0c8, side: THREE.DoubleSide })); return m; }); it.idx = idx; noteItems.push(it); });
});

/* ---------- granny ---------- */
const gm = new THREE.Group();
const skin = new THREE.MeshLambertMaterial({ color: 0xc4b39a });
const dressMat = new THREE.MeshLambertMaterial({ color: 0x3b2b45 });
const hairMat = new THREE.MeshLambertMaterial({ color: 0xbdbdc4 });
const dress = new THREE.Mesh(new THREE.CylinderGeometry(.26, .55, 1.25, 12), dressMat); dress.position.y = .75; gm.add(dress);
const apron = new THREE.Mesh(new THREE.BoxGeometry(.5, .8, .06), new THREE.MeshLambertMaterial({ color: 0x8a8070 })); apron.position.set(0, .8, .3); gm.add(apron);
const upper = new THREE.Group(); upper.position.y = 1.35; upper.rotation.x = .25; gm.add(upper);
const torso = new THREE.Mesh(new THREE.CylinderGeometry(.22, .27, .5, 10), dressMat); torso.position.y = .1; upper.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 12), skin); head.position.set(0, .5, .06); upper.add(head);
const hair = new THREE.Mesh(new THREE.SphereGeometry(.23, 14, 12, 0, Math.PI * 2, 0, Math.PI * .62), hairMat); hair.position.set(0, .54, -.02); hair.rotation.x = -.3; upper.add(hair);
const bun = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 8), hairMat); bun.position.set(0, .66, -.17); upper.add(bun);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
[-.07, .07].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(.028, 6, 6), eyeMat); e.position.set(x, .53, .24); upper.add(e); });
const nose = new THREE.Mesh(new THREE.ConeGeometry(.03, .1, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, .47, .27); upper.add(nose);
const armL = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, .7, 6), skin); armL.position.set(-.3, -.05, .12); armL.rotation.x = -.5; upper.add(armL);
const armR = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, .7, 6), skin); armR.position.set(.3, -.05, .12); armR.rotation.x = -.9; upper.add(armR);
const bat = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, .9, 8), new THREE.MeshLambertMaterial({ color: 0x5a3a1c })); bat.position.set(.3, .2, .45); bat.rotation.x = .5; upper.add(bat);
const rage = new THREE.PointLight(0xff2020, 0, 7, 2); rage.position.y = 1.6; scene.add(rage);
scene.add(gm);

const granny = { f: GRANNY_FLOOR, x: floors[GRANNY_FLOOR].gstart[0], z: floors[GRANNY_FLOOR].gstart[1], yaw: 0, state: 'patrol', path: null, timer: 1, lostTimer: 0, lastKnown: null, arrived: false, repath: 0, checkIdx: -1, cool: 0, stepT: 0, moving: false, stairCool: 25, travelTo: null, follow: false, stairWait: 0, humT: 4 };

/* ---------- player ---------- */
const player = { f: START_FLOOR, x: floors[START_FLOOR].start[0], z: floors[START_FLOOR].start[1], yaw: -Math.PI / 2, pitch: 0, hidden: false, hideIdx: -1, sprinting: false, moving: false, stamina: 100, exhausted: false, lives: 3, keys: 0, bottles: 0, battery: 1, notes: [], bob: 0, stepT: 0, shake: 0, stairCool: 0 };
const state = { running: false, over: false, reading: false, t0: 0, time: 0, torchOn: true, started: false };
const startPos = () => floors[START_FLOOR].start;

/* ---------- pathfinding (per floor) ---------- */
function findPath(f, sc, sr, goal) {
  const o = floors[f], COLS = o.cols;
  const key = (c, r) => r * COLS + c, prev = new Map([[key(sc, sr), null]]), q = [[sc, sr]];
  for (let qi = 0; qi < q.length; qi++) {
    const [c, r] = q[qi];
    if (goal(c, r) && !(c === sc && r === sr)) {
      const out = []; let k = key(c, r);
      while (prev.get(k) !== null) { out.push([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
      return out.reverse();
    }
    for (const [dc, dr] of DIRS4) {
      const nc = c + dc, nr = r + dr, k = key(nc, nr);
      if (solid(f, nc, nr) || prev.has(k)) continue;
      prev.set(k, key(c, r)); q.push([nc, nr]);
    }
  }
  return [];
}
function hasLOS(f, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / .4);
  for (let i = 1; i < n; i++) { const t = i / n; if (opaque(f, toCell(ax + (bx - ax) * t), toCell(az + (bz - az) * t))) return false; }
  return true;
}
const pathTo = (tx, tz) => { granny.path = findPath(granny.f, toCell(granny.x), toCell(granny.z), (c, r) => c === toCell(tx) && r === toCell(tz)); };
function turnTo(yaw, dt) {
  let d = yaw - granny.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  granny.yaw += d * Math.min(1, dt * 8);
}
function followPath(speed, dt) {
  const g = granny;
  if (!g.path || !g.path.length) return true;
  const [tx, tz] = center(g.path[0][0], g.path[0][1]);
  const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
  if (d < .25) { g.path.shift(); return !g.path.length; }
  g.x += dx / d * speed * dt; g.z += dz / d * speed * dt;
  turnTo(Math.atan2(dx, dz), dt); g.moving = true;
  return false;
}
function randomPatrol() {
  const o = floors[granny.f];
  for (let i = 0; i < 50; i++) {
    const c = 1 + Math.floor(Math.random() * (o.cols - 2)), r = 1 + Math.floor(Math.random() * (o.rows - 2));
    if (solid(granny.f, c, r)) continue;
    const [x, z] = center(c, r);
    if (Math.hypot(x - granny.x, z - granny.z) < 8) continue;
    pathTo(x, z); if (granny.path.length) return;
  }
}
// where you arrive after taking the stairs: the open cell next to the other staircase
function arrival(f, kind) {
  const o = floors[f], s = o.stairs[kind];
  for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (!solid(f, s.c + dc, s.r + dr)) return center(s.c + dc, s.r + dr);
  return s.pos;
}

/* ---------- audio ---------- */
let ac = null, noiseBuf = null, master = null;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    [48, 50.5].forEach(f => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = .045; o.connect(g); g.connect(master); o.start(); });
  } catch (e) { ac = null; }
}
function tone(f, d, type, v, slide, delay) {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (delay || 0);
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}
function noise(d, v, cutoff) {
  if (!ac) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = cutoff || 600; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5, d + .05);
}
const step = v => { noise(.12, v, 420); tone(70, .1, 'sine', v * .8, 40); };
const creak = (v) => tone(260 + Math.random() * 120, .7 + Math.random() * .6, 'sawtooth', v || .025, 120 + Math.random() * 60);
const heart = v => { tone(58, .16, 'sine', v, 38); setTimeout(() => tone(52, .18, 'sine', v * .8, 34), 170); };
function scream() { noise(1.4, .5, 5000); tone(900, 1.1, 'sawtooth', .22, 200); tone(1350, 1.1, 'square', .1, 300); }
function sting() { tone(440, .5, 'sawtooth', .12, 120); tone(466, .5, 'sawtooth', .12, 120); }
const glassBreak = v => { noise(.5, v, 7000); [2400, 3100, 1900, 2700].forEach((f, i) => tone(f, .25, 'triangle', v * .35, f * .6, i * .03)); };
const doorCreak = v => { tone(180 + Math.random() * 40, .5, 'sawtooth', v, 90); noise(.25, v * .5, 500); };
const stairsCreak = v => { noise(.3, v, 380); tone(110, .3, 'square', v * .5, 70); setTimeout(() => { noise(.25, v, 380); tone(95, .25, 'square', v * .5, 60); }, 220); };
const paper = () => noise(.3, .12, 3500);
const pickupChime = () => { tone(880, .35, 'sine', .15); setTimeout(() => tone(1320, .5, 'sine', .12), 120); };
// granny hums a little tune you can follow (and avoid)
const LULLABY = [392, 330, 349, 294, 330, 262];
function hum(vol) { LULLABY.forEach((f, i) => tone(f * .5, .5, 'triangle', vol, f * .5 * .98, i * .55)); }

/* ---------- hud ---------- */
const $ = id => document.getElementById(id);
const msgEl = $('msg'), alertEl = $('alert');
let msgTimer = 0;
function say(text, secs) { msgEl.textContent = text; msgEl.classList.add('on'); msgTimer = secs || 2.5; }
function refreshHud() {
  document.querySelectorAll('.slot').forEach((s, i) => s.classList.toggle('got', keyItems[i].got));
  $('lives').textContent = '♥'.repeat(player.lives) + '♡'.repeat(Math.max(0, D.lives - player.lives));
  $('bottles').textContent = '🍾 ' + player.bottles;
  $('notesCount').textContent = '📄 ' + player.notes.length + '/' + noteItems.length;
  $('floorName').textContent = floors[player.f].name;
}
function refreshBattery() {
  const i = $('batt').firstElementChild; i.style.width = Math.round(player.battery * 100) + '%';
  i.style.background = player.battery < .2 ? '#b83a3a' : '#d8c26a';
}
function updateFloorVisibility() {
  floors.forEach(o => { o.group.visible = o.f === player.f; });
  gm.visible = granny.f === player.f;
  lamps.forEach(l => { l.light.visible = l.f === player.f; });
}

/* ---------- noise ---------- */
function investigate(x, z) { const g = granny; g.state = 'search'; g.lastKnown = [x, z]; g.arrived = false; g.path = null; }
function makeNoise(f, x, z, r, loud) {
  const g = granny;
  if (g.state === 'chase' || g.state === 'check') return;
  if (g.f === f) { if (Math.hypot(x - g.x, z - g.z) < r * D.hear) investigate(x, z); }
  else if (loud && Math.abs(g.f - f) === 1 && g.stairCool < 15 && g.state !== 'travel') { startTravel(f, false); }
}
function startTravel(toFloor, follow) {
  const g = granny; g.state = 'travel'; g.travelTo = toFloor; g.follow = !!follow; g.path = null; g.stairWait = 0; g.arrived = false;
}
function takeStairs() {
  const g = granny, from = g.f, to = g.travelTo, down = to > from;
  g.f = to; [g.x, g.z] = arrival(to, down ? 'down' : 'up'); g.stairCool = 30; g.stairWait = 0; g.path = null; g.timer = 1;
  if (g.follow && player.f === to) { g.state = 'search'; g.lastKnown = [player.x, player.z]; g.arrived = false; }
  else g.state = 'patrol';
  if (player.f === to || player.f === from) stairsCreak(.16);
  updateFloorVisibility();
}

/* ---------- interaction ---------- */
function nearestHide() {
  const o = floors[player.f]; let best = -1, bd = 3.3;
  o.hides.forEach((h, i) => { const d = Math.hypot(h.pos[0] - player.x, h.pos[1] - player.z); if (d < bd) { bd = d; best = i; } });
  return best;
}
const exitHere = () => player.f === EXIT_FLOOR;
const nearExit = () => exitHere() && Math.hypot(floors[EXIT_FLOOR].exit.pos[0] - player.x, floors[EXIT_FLOOR].exit.pos[1] - player.z) < 3.4;
function interact() {
  if (state.over || state.reading) return;
  const o = floors[player.f];
  if (player.hidden) {
    const h = o.hides[player.hideIdx], p = center(h.out[0], h.out[1]);
    player.x = p[0]; player.z = p[1]; player.hidden = false; $('hide').classList.remove('on'); return;
  }
  const hi = nearestHide();
  if (hi >= 0 && !nearExit()) {
    const h = o.hides[hi], g = granny;
    const seen = g.f === player.f && g.state === 'chase' && hasLOS(g.f, g.x, g.z, player.x, player.z) && Math.hypot(g.x - player.x, g.z - player.z) < 14;
    player.hidden = true; player.hideIdx = hi; player.x = h.pos[0]; player.z = h.pos[1];
    player.yaw = Math.atan2(-(h.out[0] - h.c), -(h.out[1] - h.r)); player.pitch = 0;
    $('hide').classList.add('on'); noise(.25, .15, 900); makeNoise(player.f, player.x, player.z, 3, false);
    if (seen) { g.state = 'check'; g.checkIdx = hi; g.path = findPath(g.f, toCell(g.x), toCell(g.z), (c, r) => c === h.out[0] && r === h.out[1]); g.arrived = false; }
    return;
  }
  if (nearExit()) {
    if (player.keys >= 3) win();
    else say('the door is locked: ' + player.keys + '/3 keys', 3);
  }
}
function throwBottle() {
  if (state.over || state.reading || player.hidden) return;
  if (player.bottles <= 0) { say('nothing to throw. look for bottles', 2); return; }
  player.bottles--; refreshHud();
  const f = player.f, dir = [-Math.sin(player.yaw), -Math.cos(player.yaw)];
  const reach = Math.max(4, Math.min(11, 9 * (1 - player.pitch * .7)));
  let x = player.x, z = player.z;
  for (let d = .4; d <= reach; d += .4) {
    const nx = player.x + dir[0] * d, nz = player.z + dir[1] * d;
    if (solid(f, toCell(nx), toCell(nz)) || opaque(f, toCell(nx), toCell(nz))) break;
    x = nx; z = nz;
  }
  const mesh = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .22, 8), new THREE.MeshBasicMaterial({ color: 0x3f9a58 })); mesh.add(body);
  mesh.position.set(player.x, 1.4, player.z); scene.add(mesh);
  flying.push({ mesh, f, sx: player.x, sz: player.z, x, z, t: 0, dur: .35 + reach * .04 });
  tone(300, .12, 'sine', .08, 500);
}
const flying = [];
function updateFlying(dt) {
  for (const b of flying) {
    b.t += dt; const u = Math.min(1, b.t / b.dur);
    b.mesh.position.set(b.sx + (b.x - b.sx) * u, 1.4 * (1 - u) + Math.sin(u * Math.PI) * 1.1 + .1, b.sz + (b.z - b.sz) * u); b.mesh.rotation.x += dt * 12; b.mesh.visible = b.f === player.f;
    if (u >= 1) {
      b.done = true; scene.remove(b.mesh);
      if (b.f === player.f) { const d = Math.hypot(b.x - player.x, b.z - player.z); glassBreak(Math.max(.12, .45 - d * .03)); }
      makeNoise(b.f, b.x, b.z, 13, false); if (granny.f === b.f && Math.hypot(b.x - granny.x, b.z - granny.z) < 13 * D.hear) { granny.timer = 5; }
    }
  }
  for (let i = flying.length - 1; i >= 0; i--) if (flying[i].done) flying.splice(i, 1);
}
function playerStairs(kind) {
  const from = player.f, to = kind === 'up' ? from + 1 : from - 1;
  if (to < 0 || to >= NF) return;
  const oldPos = floors[from].stairs[kind].pos;
  const [x, z] = arrival(to, kind === 'up' ? 'down' : 'up');
  player.f = to; player.x = x; player.z = z; player.stairCool = 1.4;
  stairsCreak(.2); flashScreen(.5, '#000');
  makeNoise(from, oldPos[0], oldPos[1], 8, true); makeNoise(to, x, z, 8, true);
  if (granny.state === 'chase' && granny.f === from && Math.hypot(granny.x - oldPos[0], granny.z - oldPos[1]) < 18) startTravel(to, true);
  updateFloorVisibility(); say(floors[to].name, 2); refreshHud();
}
function flashScreen(op, color) {
  const f = $('flash'); f.style.background = color || '#a00'; f.style.transition = 'none'; f.style.opacity = op; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = '0'; }));
}
function bestOf(k) { return store.get('best:' + k, null); }
function win() {
  state.over = true; state.running = false; document.exitPointerLock && document.exitPointerLock();
  const s = Math.round(state.time), best = bestOf(diffKey);
  let line = 'Out in ' + Math.floor(s / 60) + 'm ' + (s % 60) + 's on ' + D.label + ', with ' + player.lives + (player.lives === 1 ? ' life' : ' lives') + ' left and ' + player.notes.length + '/' + noteItems.length + ' notes found.';
  if (!best || state.time < best.time) { store.set('best:' + diffKey, { time: state.time, lives: player.lives }); line += ' New best time!'; }
  else line += ' Best on ' + D.label + ': ' + Math.floor(best.time / 60) + 'm ' + Math.round(best.time % 60) + 's.';
  $('winText').textContent = line;
  $('win').hidden = false; $('hud').hidden = true; tone(523, .6, 'sine', .2); setTimeout(() => tone(659, .6, 'sine', .2), 200); setTimeout(() => tone(784, .9, 'sine', .2), 400);
}
function caught() {
  const g = granny;
  scream(); player.shake = 1; player.lives--; refreshHud(); flashScreen(.85, '#a00');
  if (player.lives <= 0) {
    state.over = true; state.running = false; document.exitPointerLock && document.exitPointerLock();
    setTimeout(() => { $('over').hidden = false; $('hud').hidden = true; }, 700); return;
  }
  player.hidden = false; $('hide').classList.remove('on');
  player.f = START_FLOOR; player.x = startPos()[0]; player.z = startPos()[1]; player.yaw = -Math.PI / 2; player.pitch = 0;
  g.f = GRANNY_FLOOR; g.x = floors[GRANNY_FLOOR].gstart[0]; g.z = floors[GRANNY_FLOOR].gstart[1]; g.state = 'patrol'; g.path = null; g.timer = 4; g.cool = 4; g.stairCool = 25;
  alertEl.classList.remove('on'); updateFloorVisibility(); refreshHud();
  say('she dragged you back to bed…', 3);
}

/* ---------- notes ---------- */
function showNote(it) {
  it.got = true; it.mesh.visible = false; paper();
  if (!player.notes.includes(it.idx)) player.notes.push(it.idx);
  const seen = store.get('notes', []); if (!seen.includes(it.idx)) { seen.push(it.idx); store.set('notes', seen); }
  refreshHud();
  $('noteN').textContent = 'note ' + (it.idx + 1) + ' of ' + noteItems.length;
  $('noteText').textContent = MAPS.notes[it.idx % MAPS.notes.length];
  state.reading = true; freeze(); $('note').hidden = false; document.exitPointerLock && document.exitPointerLock();
}
function closeNote() { $('note').hidden = true; state.reading = false; thaw(); }

/* ---------- granny ai ---------- */
function updateGranny(dt) {
  const g = granny; g.moving = false; g.timer -= dt; g.cool -= dt; g.repath -= dt; g.stairCool -= dt;
  const same = g.f === player.f;
  const dx = player.x - g.x, dz = player.z - g.z, dist = same ? (Math.hypot(dx, dz) || .001) : 999;
  const los = same && hasLOS(g.f, g.x, g.z, player.x, player.z);
  const dot = same ? (dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw)) / dist : 0;
  const sees = same && !player.hidden && los && dist < D.sight && (dist < 5 || dot > .25);
  const noiseR = (player.sprinting ? 10 : player.moving ? 3.5 : 0) * D.hear;
  const hears = same && !player.hidden && dist < noiseR;
  const sp = D.speed;

  if (sees) {
    g.lastKnown = [player.x, player.z]; g.lostTimer = 0;
    if (g.state !== 'chase') { g.state = 'chase'; g.path = null; sting(); alertEl.classList.add('on'); }
  } else if (g.state === 'chase') {
    g.lostTimer += dt;
    if (g.lostTimer > 3.5) { g.state = 'search'; g.arrived = false; g.path = null; alertEl.classList.remove('on'); }
  }
  if (hears && g.state !== 'chase' && g.state !== 'check') { g.state = 'search'; g.lastKnown = [player.x, player.z]; g.arrived = false; g.path = null; }

  let speed = 2 * sp;
  if (g.state === 'chase') {
    speed = 3.7 * sp;
    if (los && !player.hidden && same) { g.x += dx / dist * speed * dt; g.z += dz / dist * speed * dt; turnTo(Math.atan2(dx, dz), dt); g.moving = true; }
    else if (g.lastKnown) {
      if (g.repath <= 0 || !g.path) { pathTo(g.lastKnown[0], g.lastKnown[1]); g.repath = .4; }
      followPath(speed, dt);
    }
  } else if (g.state === 'travel') {
    speed = (g.follow ? 3.4 : 2.4) * sp;
    if (!g.path) { const s = floors[g.f].stairs[g.travelTo > g.f ? 'up' : 'down']; if (!s) g.state = 'patrol'; else pathTo(s.pos[0], s.pos[1]); }
    if (g.state === 'travel' && g.path && followPath(speed, dt)) { g.stairWait += dt; if (g.stairWait > .7) takeStairs(); }
  } else if (g.state === 'search') {
    speed = 2.6 * sp;
    if (!g.arrived) {
      if (!g.path) pathTo(g.lastKnown[0], g.lastKnown[1]);
      if (followPath(speed, dt)) { g.arrived = true; g.timer = 4; }
    } else { g.yaw += dt * 1.6; if (g.timer <= 0) { g.state = 'patrol'; g.path = null; g.timer = 0; } }
  } else if (g.state === 'check') {
    speed = 2.6 * sp;
    if (!g.arrived) { if (followPath(speed, dt) || !g.path.length) { g.arrived = true; g.timer = 1.4; } }
    else {
      const h = floors[g.f].hides[g.checkIdx]; turnTo(Math.atan2(h.pos[0] - g.x, h.pos[1] - g.z), dt);
      if (g.timer <= 0) {
        if (player.hidden && player.f === g.f && player.hideIdx === g.checkIdx && Math.random() < .5) { caught(); return; }
        g.state = 'patrol'; g.path = null; g.timer = 0; alertEl.classList.remove('on');
      }
    }
  } else { // patrol
    if (g.timer <= 0) {
      if (!g.path || !g.path.length) {
        if (g.stairCool <= 0 && Math.random() < .3) {
          const opts = []; if (g.f + 1 < NF) opts.push(g.f + 1); if (g.f - 1 >= 0) opts.push(g.f - 1);
          startTravel(pick(opts), false);
        } else { randomPatrol(); if (!g.path || !g.path.length) g.timer = 1; }
      }
      if (g.state === 'patrol' && g.path && g.path.length && followPath(speed, dt)) g.timer = 1 + Math.random() * 1.5;
    }
  }

  if (g.state !== 'chase') alertEl.classList.remove('on');
  if (same && !player.hidden && dist < 1.15 && g.cool <= 0) { caught(); return; }

  // footsteps and humming
  g.stepT -= dt;
  const near = same ? dist : (Math.abs(g.f - player.f) === 1 ? Math.hypot(g.x - player.x, g.z - player.z) * 1.6 : 999);
  if (g.moving && g.stepT <= 0 && near < 16) { step(Math.max(0, (1 - near / 16)) * (same ? .55 : .3)); g.stepT = g.state === 'chase' ? .33 : .6; }
  g.humT -= dt;
  if (g.humT <= 0) { if (same && dist < 16 && g.state !== 'chase') hum(.045 * (1 - dist / 16) + .008); g.humT = 10 + Math.random() * 8; }

  gm.position.set(g.x, 0, g.z); gm.rotation.y = g.yaw;
  const t = performance.now() / 1000;
  upper.rotation.z = Math.sin(t * (g.moving ? 6 : 1.5)) * .05;
  gm.position.y = g.moving ? Math.abs(Math.sin(t * 6)) * .04 : 0;
  rage.position.set(g.x, 1.6, g.z); rage.intensity = g.state === 'chase' && same ? 1.2 : 0;
}

/* ---------- input ---------- */
const keysDown = {};
let isTouch = false;
function setTorch(on) {
  if (on && player.battery <= 0) { say('the battery is dead', 2); on = false; }
  state.torchOn = on; torch.visible = on; glow.intensity = on ? .6 : .2;
}
window.addEventListener('keydown', e => {
  keysDown[e.code] = true;
  if (e.code === 'Escape' && !$('note').hidden) { closeNote(); return; }
  if (!state.running || state.reading) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF') setTorch(!state.torchOn);
  if (e.code === 'KeyQ') throwBottle();
});
window.addEventListener('keyup', e => { keysDown[e.code] = false; });
document.addEventListener('mousemove', e => {
  if (!state.running || document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * .0023; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - e.movementY * .0023));
});
document.addEventListener('pointerlockchange', () => {
  if (isTouch || state.over || state.reading) return;
  if (document.pointerLockElement !== canvas && state.running) pause(true);
});
function lock() { if (!isTouch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }

const touch = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, my: 0, lx: 0, ly: 0, run: false };
const stickEl = $('stick');
function enableTouch() {
  isTouch = true; document.body.classList.add('touch');
  $('help').innerHTML = '<b>left side</b><span>move</span><b>right side</b><span>look</span><b>buttons</b><span>use / run / torch / throw</span>';
  const btn = (id, fn) => $(id).addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (state.running && !state.reading) fn(); }, { passive: false });
  btn('tUse', interact);
  btn('tThrow', throwBottle);
  btn('tTorch', () => setTorch(!state.torchOn));
  btn('tRun', () => { touch.run = !touch.run; $('tRun').classList.toggle('on', touch.run); });
  window.addEventListener('touchstart', e => {
    if (!state.running || state.reading) return;
    for (const tc of e.changedTouches) {
      if (tc.target.closest && tc.target.closest('.tbtn')) continue;
      if (tc.clientX < window.innerWidth / 2 && touch.moveId === null) { touch.moveId = tc.identifier; touch.ox = touch.mx = tc.clientX; touch.oy = touch.my = tc.clientY; stickEl.style.display = 'block'; stickEl.style.left = (tc.clientX - 50) + 'px'; stickEl.style.top = (tc.clientY - 50) + 'px'; }
      else if (touch.lookId === null) { touch.lookId = tc.identifier; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    for (const tc of e.changedTouches) {
      if (tc.identifier === touch.moveId) { touch.mx = tc.clientX; touch.my = tc.clientY; const dx = Math.max(-40, Math.min(40, touch.mx - touch.ox)), dy = Math.max(-40, Math.min(40, touch.my - touch.oy)); stickEl.firstElementChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      else if (tc.identifier === touch.lookId) { player.yaw -= (tc.clientX - touch.lx) * .006; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - (tc.clientY - touch.ly) * .006)); touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  const end = e => { for (const tc of e.changedTouches) { if (tc.identifier === touch.moveId) { touch.moveId = null; stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = ''; } if (tc.identifier === touch.lookId) touch.lookId = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
}
if ('ontouchstart' in window && matchMedia('(pointer:coarse)').matches) enableTouch();

/* ---------- player and world updates ---------- */
function blocked(x, z) {
  const r = .32, f = player.f;
  return solid(f, toCell(x - r), toCell(z - r)) || solid(f, toCell(x + r), toCell(z - r)) || solid(f, toCell(x - r), toCell(z + r)) || solid(f, toCell(x + r), toCell(z + r));
}
let heartT = 0, creakT = 6, hudT = 0;
function updatePlayer(dt) {
  let fwd = 0, side = 0;
  if (keysDown.KeyW || keysDown.ArrowUp) fwd += 1; if (keysDown.KeyS || keysDown.ArrowDown) fwd -= 1;
  if (keysDown.KeyD || keysDown.ArrowRight) side += 1; if (keysDown.KeyA || keysDown.ArrowLeft) side -= 1;
  if (touch.moveId !== null) { side += Math.max(-1, Math.min(1, (touch.mx - touch.ox) / 40)); fwd -= Math.max(-1, Math.min(1, (touch.my - touch.oy) / 40)); }
  if (player.hidden) { fwd = side = 0; }
  const len = Math.hypot(fwd, side); if (len > 1) { fwd /= len; side /= len; }
  player.moving = len > .1;
  const wantRun = (keysDown.ShiftLeft || keysDown.ShiftRight || touch.run) && player.moving;
  if (player.exhausted && player.stamina > 25) player.exhausted = false;
  player.sprinting = wantRun && !player.exhausted && player.stamina > 0;
  player.stamina = Math.max(0, Math.min(100, player.stamina + (player.sprinting ? -22 : 14) * dt));
  if (player.stamina <= 0) player.exhausted = true;
  const speed = player.sprinting ? 5.2 : 3.2;
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const vx = (-sy * fwd + cy * side) * speed * dt, vz = (-cy * fwd - sy * side) * speed * dt;
  if (!blocked(player.x + vx, player.z)) player.x += vx;
  if (!blocked(player.x, player.z + vz)) player.z += vz;
  if (player.moving) {
    player.bob += dt * (player.sprinting ? 12 : 8);
    player.stepT -= dt; if (player.stepT <= 0) { step(.12); player.stepT = player.sprinting ? .3 : .48; }
  }
  const sb = $('stam').firstElementChild;
  sb.style.width = player.stamina + '%'; sb.style.background = player.exhausted ? '#b83a3a' : '#b8a1a1';
}
function updateCamera(dt) {
  const bobY = player.moving ? Math.sin(player.bob) * .045 : 0;
  const h = player.hidden ? (floors[player.f].hides[player.hideIdx].type === 'bed' ? .8 : 1.5) : 1.6;
  camera.position.set(player.x, h + bobY, player.z);
  let ox = 0, oy = 0;
  if (player.shake > 0) { player.shake = Math.max(0, player.shake - dt * 1.4); ox = (Math.random() - .5) * player.shake * .15; oy = (Math.random() - .5) * player.shake * .15; }
  camera.rotation.set(player.pitch + oy, player.yaw + ox, 0);
}
function updateDoors(dt) {
  floors.forEach(o => {
    if (o.f !== player.f) return; // doors on other floors are only checked when someone walks through them
    o.doors.forEach(d => {
      const near = (x, z, r) => Math.hypot(d.pos[0] - x, d.pos[1] - z) < r;
      const want = (near(player.x, player.z, 2.3) && !player.hidden) || (granny.f === o.f && near(granny.x, granny.z, 2.5)) ? 1 : 0;
      if (want && d.target === 0 && d.open < .1) { doorCreak(near(player.x, player.z, 2.3) ? .07 : .12 * Math.max(0, 1 - Math.hypot(d.pos[0] - player.x, d.pos[1] - player.z) / 14)); }
      d.target = want;
      d.open += (d.target - d.open) * Math.min(1, dt * 5);
      if (Math.abs(d.target - d.open) < .01) d.open = d.target;
      d.mesh.rotation.y = d.baseRot + (d.horizontal ? -1 : 1) * d.open * 1.5;
    });
  });
}
function updateWorld(dt) {
  const t = performance.now() / 1000, o = floors[player.f];
  const can = !player.hidden;
  keyItems.forEach(k => {
    if (k.got || k.f !== player.f) return;
    k.mesh.rotation.y = t * 1.6; k.mesh.position.y = 1.05 + Math.sin(t * 2 + k.idx) * .08;
    if (can && Math.hypot(k.x - player.x, k.z - player.z) < 1.4) {
      k.got = true; k.mesh.visible = false; player.keys++; refreshHud();
      floors[EXIT_FLOOR].locks[k.idx].material.color.setHex(KEY_COLORS[k.idx]); pickupChime();
      say('picked up the ' + KEY_NAMES[k.idx] + ' key (' + player.keys + '/3)', 3);
    }
  });
  [battItems, bottleItems, noteItems].forEach(list => list.forEach(it => {
    if (it.got || it.f !== player.f) return;
    it.mesh.rotation.y = t * 1.8; it.mesh.position.y = 1.0 + Math.sin(t * 2 + it.x) * .06;
    if (!can || Math.hypot(it.x - player.x, it.z - player.z) > 1.3) return;
    if (it.kind === 'battery') { it.got = true; it.mesh.visible = false; player.battery = Math.min(1, player.battery + .6); refreshBattery(); pickupChime(); say('fresh batteries', 2); }
    else if (it.kind === 'bottle') { if (player.bottles >= 3) return; it.got = true; it.mesh.visible = false; player.bottles++; refreshHud(); pickupChime(); say('a bottle. throw it to lure her away (' + (isTouch ? 'THROW' : 'Q') + ')', 3); }
    else showNote(it);
  }));

  // stairs
  player.stairCool -= dt;
  if (player.stairCool <= 0 && can) {
    for (const kind of ['up', 'down']) { const s = o.stairs[kind]; if (s && Math.hypot(s.pos[0] - player.x, s.pos[1] - player.z) < 1.0) { playerStairs(kind); break; } }
  }
  updateDoors(dt);

  // torch battery
  if (state.torchOn) {
    player.battery = Math.max(0, player.battery - D.drain * dt);
    if (player.battery <= 0) { setTorch(false); say('the torch died. find batteries', 3); }
    else if (player.battery < .2) { const on = Math.random() > .06 * (1 - player.battery / .2) * 6; torch.intensity = on ? 2.6 * (.5 + player.battery * 2.5) : .2; }
    else torch.intensity = 2.6;
  }
  hudT -= dt; if (hudT <= 0) { refreshBattery(); hudT = .25; }

  // lamps flicker
  lamps.forEach(l => {
    if (l.f !== player.f) return;
    const fl = l.broken ? (Math.random() < .07 ? 0 : (Math.sin(t * 40 + l.ph) > -.4 ? 1 : .2)) : 1 + Math.sin(t * 3 + l.ph) * .05 + (Math.random() < .004 ? -.6 : 0);
    l.light.intensity = l.base * fl; l.bulb.color.setHex(fl < .5 ? 0x5a4a30 : 0xffd9a0);
  });

  // prompts
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) msgEl.classList.remove('on'); }
  else {
    let p = '';
    if (player.hidden) p = 'press E to get out';
    else if (nearExit()) p = player.keys >= 3 ? 'press E to unlock the door' : 'locked: find all 3 keys (' + player.keys + '/3)';
    else { const hi = nearestHide(); if (hi >= 0) p = 'press E to hide ' + (o.hides[hi].type === 'bed' ? 'under the bed' : 'in the wardrobe'); }
    if (isTouch) p = p.replace('press E', 'tap USE');
    if (p) { msgEl.textContent = p; msgEl.classList.add('on'); } else msgEl.classList.remove('on');
  }

  // heartbeat + ambient
  const same = granny.f === player.f, d = same ? Math.hypot(granny.x - player.x, granny.z - player.z) : 99;
  heartT -= dt;
  if (d < 12 && heartT <= 0) { heart(.35 * (1 - d / 12) + .08); heartT = .5 + d / 12 * .7; }
  creakT -= dt; if (creakT <= 0) { creak(); creakT = 6 + Math.random() * 10; }
}

/* ---------- frame loop ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.running && !state.reading) {
    state.time += dt;
    updatePlayer(dt); updateGranny(dt); updateWorld(dt); updateFlying(dt);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}
function freeze() { /* time only advances while the loop runs, so reading a note pauses everything */ }
function thaw() { last = performance.now(); lock(); }

/* ---------- menus ---------- */
const fmt = s => Math.floor(s / 60) + 'm ' + String(Math.round(s % 60)).padStart(2, '0') + 's';
function refreshMenu() {
  document.querySelectorAll('[data-d]').forEach(b => b.classList.toggle('on', b.dataset.d === diffKey));
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === quality));
  $('diffHint').textContent = D.hint;
  const b = bestOf(diffKey);
  $('bestTime').textContent = b ? 'best on ' + D.label + ': ' + fmt(b.time) + ' (' + b.lives + (b.lives === 1 ? ' life' : ' lives') + ' left)' : 'no escape on ' + D.label + ' yet';
  $('notesSeen').textContent = 'notes found so far: ' + store.get('notes', []).length + '/' + noteItems.length;
}
document.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { if (state.started) return; diffKey = b.dataset.d; D = DIFFS[diffKey]; store.set('difficulty', diffKey); refreshMenu(); }));
document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { quality = b.dataset.q; store.set('quality', quality); applyQuality(); refreshMenu(); }));

function begin() {
  initAudio(); lock();
  state.started = true; state.running = true; state.over = false; state.time = 0;
  player.lives = D.lives; refreshHud(); refreshBattery(); updateFloorVisibility();
  $('start').hidden = true; $('hud').hidden = false;
  last = performance.now();
  say('find 3 keys. get out. don\'t make noise.', 5);
}
function pause(on) {
  if (state.over || !state.started) return;
  if (on) {
    state.running = false; touch.moveId = touch.lookId = null; stickEl.style.display = 'none';
    $('noteList').innerHTML = player.notes.length ? player.notes.slice().sort().map(i => '<details><summary>note ' + (i + 1) + '</summary><p></p></details>').join('') : '<p>no notes yet</p>';
    $('noteList').querySelectorAll('details p').forEach((p, k) => { p.textContent = MAPS.notes[player.notes.slice().sort()[k] % MAPS.notes.length]; });
    $('pauseStat').textContent = floors[player.f].name + ' - ' + player.keys + '/3 keys - ' + fmt(state.time);
    $('pause').hidden = false;
  } else { $('pause').hidden = true; state.running = true; last = performance.now(); lock(); if (ac && ac.state === 'suspended') ac.resume(); }
}
$('go').addEventListener('click', begin);
$('resume').addEventListener('click', () => pause(false));
$('noteClose').addEventListener('click', closeNote);
document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) pause(true); });
refreshMenu(); updateFloorVisibility();
requestAnimationFrame(frame);

window.__granny = { player, granny, state, floors, keyItems, battItems, bottleItems, noteItems, interact, throwBottle, playerStairs, setTorch, begin, pause, caught, win, CELL, center };
})();
