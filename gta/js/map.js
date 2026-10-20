// The full-screen city map. Everything on it is drawn from the same data the world is built from: the block grid and districts
// (layout.js), the roads, the highway, the coast roads, piers and the shoreline (coast.js / highway.js) and the marker registry
// (markers.js: points of interest, the active objective, story starts and the player's waypoint). Zoom with the wheel or +/-, drag
// to pan, click to inspect a place, and set or remove a waypoint from the inspector. The route (nav.js) is drawn when one exists.
import { N, B, RD, WORLD, rc, blockX, blockZ, blockType, DISTRICTS, districtAt } from './layout.js';
import { shoreDist, piers, SPURS, COAST_ROADS, LOTS } from './coast.js';
import { HW, HW_Z } from './highway.js';
import { CATEGORIES } from './pois.js';
import { STREETS } from './models/props.js';
import { player } from './player.js';
import { allMarkers, getMarker } from './markers.js';
import { nav, setWaypoint, clearWaypoint, hasWaypoint } from './nav.js';
import { fmtDist } from './navroute.js';
import { say } from './ui.js';

const $ = id => document.getElementById(id);
const cv = $('mapCanvas'), g = cv.getContext('2d');
const R0 = -430, RS = WORLD + 860;                                // the part of the world the map covers: the city and the coast around it
const ZMIN = 1, ZMAX = 9;
let open = false, onClose = null, W = 800, H = 600, dpr = 1, k0 = 1;
const view = { x: WORLD / 2, z: WORLD / 2, zoom: 1 };
let hover = null, sel = null, backdrop = null, raf = 0;

/* ---- what is shown ---- */
const GROUPS = [
  { id: 'services', label: 'Services', color: '#4f78ff', cats: ['police', 'hospital', 'fire'] },
  { id: 'shops', label: 'Shops & food', color: '#5ad87a', cats: ['store', 'supermarket', 'clothing', 'restaurant', 'gas', 'dealership', 'garage', 'bank'] },
  { id: 'work', label: 'Jobs & story', color: '#ffd23f', cats: ['mission', 'story', 'safehouse'] },
  { id: 'places', label: 'Landmarks & coast', color: '#9aa4b0', cats: ['landmark', 'docks', 'beach', 'parking', 'warehouse', 'factory', 'depot', 'site', 'health'] }
];
const shown = Object.fromEntries(GROUPS.map(x => [x.id, true]));
const groupOf = cat => (GROUPS.find(x => x.cats.includes(cat)) || GROUPS[3]).id;
const catLabel = c => c === 'story' ? 'Story mission' : (CATEGORIES[c] && CATEGORIES[c].label) || 'Place';

/* ---- view maths: world metres <-> CSS pixels ---- */
const K = () => k0 * view.zoom;
const sx = x => (x - view.x) * K() + W / 2, sz = z => (z - view.z) * K() + H / 2;
const wx = px => (px - W / 2) / K() + view.x, wz = py => (py - H / 2) / K() + view.z;
function clampView() { view.zoom = Math.max(ZMIN, Math.min(ZMAX, view.zoom)); const m = RS / 2 - 40 / view.zoom; view.x = Math.max(R0 + RS / 2 - m, Math.min(R0 + RS / 2 + m, view.x)); view.z = Math.max(R0 + RS / 2 - m, Math.min(R0 + RS / 2 + m, view.z)); }
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); W = Math.max(320, window.innerWidth); H = Math.max(240, window.innerHeight);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); k0 = Math.min(W, H) * .94 / RS * 1.12; clampView(); invalidate();
}
function zoomAt(px, py, f) { const bx = wx(px), bz = wz(py); view.zoom *= f; clampView(); view.x = bx - (px - W / 2) / K(); view.z = bz - (py - H / 2) / K(); clampView(); invalidate(); }
export function centerOnPlayer() { view.x = player.x; view.z = player.z; clampView(); invalidate(); }

/* ---- the coast, painted once ---- */
function paintBackdrop() {
  const T = 512, c = document.createElement('canvas'); c.width = c.height = T; const b = c.getContext('2d'), img = b.createImageData(T, T), px = img.data, k = RS / T;
  const col = d => d < -70 ? [14, 52, 80] : d < -22 ? [26, 92, 120] : d < 0 ? [48, 142, 166] : d < 3 ? [244, 238, 220] : d < 26 ? [230, 214, 164] : [104, 140, 82];
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) { const x = R0 + (i + .5) * k, z = R0 + (j + .5) * k, inside = x > 0 && x < WORLD && z > 0 && z < WORLD, c3 = inside ? [104, 140, 82] : col(shoreDist(x, z)), o = (j * T + i) * 4; px[o] = c3[0]; px[o + 1] = c3[1]; px[o + 2] = c3[2]; px[o + 3] = 255; }
  b.putImageData(img, 0, 0); backdrop = c;
}

/* ---- drawing ---- */
function pill(text, x, y, bg, fg) { g.font = 'bold 12px sans-serif'; const w = g.measureText(text).width + 12; g.fillStyle = bg; g.fillRect(x - w / 2, y - 9, w, 18); g.fillStyle = fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1); }
function glyph(x, y, r, color, ch) { g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill(); g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#0b0b0b'; g.font = 'bold ' + Math.round(r * 1.3) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y + 1); }
function line(pts, w, color, dash) { g.beginPath(); pts.forEach((p, n) => n ? g.lineTo(sx(p[0]), sz(p[1])) : g.moveTo(sx(p[0]), sz(p[1]))); g.lineWidth = w; g.strokeStyle = color; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); }

export function drawMap() {
  if (!open) return;
  if (!backdrop) paintBackdrop();
  const k = K(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0e3450'; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true; g.drawImage(backdrop, sx(R0), sz(R0), RS * k, RS * k);
  g.lineCap = 'butt'; g.lineJoin = 'round';
  // roads outside the city: coast roads, the roads to the beach car parks, piers
  for (const r of COAST_ROADS) line(r.pts, Math.max(2, r.w * k), '#4a4b50');
  for (const sp of SPURS) line([[sp.x0, sp.z0], [sp.x1 + sp.dx * 14, sp.z1 + sp.dz * 14]], Math.max(2.5, sp.w * k), '#4a4b50');
  g.fillStyle = '#4a4b50'; for (const l of LOTS) g.fillRect(sx(l.cx - l.w / 2), sz(l.cz - l.d / 2), l.w * k, l.d * k);
  for (const p of piers) line([[p.x, p.z], [p.x + p.dx * p.len, p.z + p.dz * p.len]], Math.max(2, p.w * k), '#8a6a46');
  // the city: the road grid first, then the blocks on top, so the roads read as the gaps between them
  g.fillStyle = '#3b3d42'; g.fillRect(sx(0), sz(0), WORLD * k, WORLD * k);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j); g.fillStyle = t.open ? '#3f7a3a' : DISTRICTS[t.district].color; g.globalAlpha = t.open ? 1 : .78; g.fillRect(sx(blockX(i)), sz(blockZ(j)), B * k, B * k); g.globalAlpha = 1; }
  if (view.zoom > 2.4) { g.strokeStyle = 'rgba(232,208,96,.55)'; g.lineWidth = 1; for (let a = 0; a <= N; a++) { g.beginPath(); g.moveTo(sx(rc(a)), sz(0)); g.lineTo(sx(rc(a)), sz(WORLD)); g.moveTo(sx(0), sz(rc(a))); g.lineTo(sx(WORLD), sz(rc(a))); g.stroke(); } }
  line([[HW.w0, HW_Z], [HW.e1, HW_Z]], Math.max(3, 5 * k / 1.2), '#e8d060');
  // names: districts always, street names once zoomed in
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (view.zoom < 3.2) { const ANCHOR = { downtown: [5, 4.4], residential: [2, 2.2], commercial: [8.4, 3.2], industrial: [1.6, 8.6], port: [7.4, 8.3], emergency: [8, .55], outskirts: [.2, 5.4] }; g.font = 'bold ' + Math.round(11 + 3 * Math.min(view.zoom, 2)) + 'px sans-serif'; for (const d in ANCHOR) { const x = sx(blockX(ANCHOR[d][0]) + B / 2), y = sz(blockZ(ANCHOR[d][1]) + B / 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(DISTRICTS[d].name.toUpperCase(), x + 1, y + 1); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(DISTRICTS[d].name.toUpperCase(), x, y); } }
  if (view.zoom >= 2.4) { g.font = '600 11px sans-serif'; g.fillStyle = 'rgba(240,240,235,.85)'; for (let a = 0; a < N; a++) { const x = sx(rc(a)), y = sz(blockZ(1)); if (x > -40 && x < W + 40) { g.save(); g.translate(x, sz(blockZ(2) + B / 2)); g.rotate(-Math.PI / 2); g.fillText(STREETS.ns[a], 0, 0); g.restore(); } const yy = sz(rc(a)); if (yy > -20 && yy < H + 20) g.fillText(STREETS.ew[a], sx(blockX(2) + B / 2), yy); } }
  g.font = 'bold 11px sans-serif'; g.fillStyle = '#1a1a1a'; g.fillText('HIGHWAY', sx((HW.w1 + HW.e0) / 2), sz(HW_Z) - 9);
  // the route to the waypoint
  if (nav.route && nav.route.length > 1) { line(nav.route, Math.max(5, 7 * Math.min(view.zoom, 2) / 1.4), 'rgba(0,0,0,.65)'); line(nav.route, Math.max(3, 4 * Math.min(view.zoom, 2) / 1.4), '#ff4fd8', [10, 6]); }
  // markers
  const all = allMarkers(), t = performance.now() / 1000, minorToo = view.zoom >= 2.2, drawn = [];
  for (const m of all) {
    if (m.kind === 'mission' || m.kind === 'waypoint') continue;
    const cat = m.category || 'landmark'; if (cat === 'park' || !shown[groupOf(cat)]) continue; if (!m.map && !minorToo) continue;
    const x = sx(m.x), y = sz(m.z); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    glyph(x, y, 6.5, m.color, m.glyph); drawn.push({ m, x, y });
    if (view.zoom >= 3 || m.category === 'story') { g.font = 'bold 11px sans-serif'; const w = g.measureText(m.label).width; g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - w / 2 - 3, y + 9, w + 6, 15); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(m.label, x, y + 17); }
  }
  const obj = getMarker('mission'), wp = getMarker('waypoint');
  if (obj) { const x = sx(obj.x), y = sz(obj.z), p = (t * 1.2) % 1; g.strokeStyle = 'rgba(255,238,85,' + (1 - p) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10 + p * 18, 0, 7); g.stroke(); glyph(x, y, 9, '#ffee55', '!'); pill('OBJECTIVE', x, y - 22, 'rgba(120,96,0,.92)'); drawn.push({ m: obj, x, y }); }
  if (wp) { const x = sx(wp.x), y = sz(wp.z); g.fillStyle = '#0b0b0b'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 9, y - 22); g.lineTo(x + 9, y - 22); g.closePath(); g.fill(); g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(x, y - 24, 11, 0, 7); g.fill(); g.strokeStyle = '#0b0b0b'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#0b0b0b'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X', x, y - 24); pill('WAYPOINT ' + fmtDist(Math.hypot(wp.x - player.x, wp.z - player.z)), x, y - 44, 'rgba(110,20,92,.92)'); drawn.push({ m: wp, x, y: y - 24 }); }
  // the selection ring
  if (sel) { const x = sx(sel.x), y = sz(sel.z); g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, 14, 0, 7); g.stroke(); g.setLineDash([]); }
  // the player
  g.save(); g.translate(sx(player.x), sz(player.z)); g.rotate(Math.PI - player.yaw); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  if (hover && !sel) { const label = hover.label || catLabel(hover.category); g.font = 'bold 13px sans-serif'; const w = g.measureText(label).width + 14, x = Math.min(W - w - 6, sx(hover.x) + 14), y = Math.max(24, sz(hover.z) - 14); g.fillStyle = 'rgba(0,0,0,.88)'; g.fillRect(x, y - 16, w, 22); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(label, x + 7, y - 4); }
  g._drawn = drawn;
  if (obj || wp) raf = requestAnimationFrame(() => { raf = 0; drawMap(); });                       // the objective pulses; everything else redraws on change
}
function invalidate() { if (open && !raf) raf = requestAnimationFrame(() => { raf = 0; drawMap(); }); }

/* ---- inspecting a place ---- */
function pickMarker(px, py) { let best = null, bd = 16; for (const d of g._drawn || []) { const dd = Math.hypot(d.x - px, d.y - py); if (dd < bd) { bd = dd; best = d.m; } } return best; }
function select(px, py) {
  const m = pickMarker(px, py), x = m ? m.x : wx(px), z = m ? m.z : wz(py);
  const sea = !(x > 0 && x < WORLD && z > 0 && z < WORLD) && shoreDist(x, z) < 0;
  sel = { x, z, marker: m, sea }; showInfo(); invalidate();
}
function showInfo() {
  const box = $('mapInfo'); if (!sel) { box.hidden = true; return; }
  const m = sel.marker, dist = Math.hypot(sel.x - player.x, sel.z - player.z), wp = getMarker('waypoint'), isWp = wp && Math.hypot(wp.x - sel.x, wp.z - sel.z) < 2;
  let title, sub;
  if (sel.sea) { title = 'Open water'; sub = 'Nothing to reach here'; }
  else if (m && m.kind === 'mission') { title = m.label || 'Objective'; sub = 'Current objective'; }
  else if (m && m.kind === 'waypoint') { title = 'Your waypoint'; sub = 'Placed by you'; }
  else if (m) { title = m.label || catLabel(m.category); sub = catLabel(m.category) + (m.category === 'story' ? '' : ' · ' + DISTRICTS[districtAt(m.x, m.z)].name); }
  else { const inside = sel.x > 0 && sel.x < WORLD && sel.z > 0 && sel.z < WORLD; title = inside ? DISTRICTS[districtAt(sel.x, sel.z)].name : 'Coast'; sub = 'Map position ' + Math.round(sel.x) + ', ' + Math.round(sel.z); }
  box.hidden = false; box.querySelector('b').textContent = title; box.querySelector('span').textContent = sub; box.querySelector('i').textContent = sel.sea ? '' : fmtDist(dist) + ' away';
  $('mapSet').hidden = sel.sea || !!isWp; $('mapSet').textContent = hasWaypoint() ? 'move waypoint here' : 'set waypoint';
  $('mapRemove').hidden = !hasWaypoint();
}
function setHere() { if (!sel || sel.sea) return; const r = setWaypoint(sel.x, sel.z); say(r.message, 1.6); showInfo(); invalidate(); }
function removeWp() { if (clearWaypoint()) say('waypoint removed', 1.4); showInfo(); invalidate(); }

/* ---- input: drag to pan, wheel / pinch to zoom, click to inspect, keys ---- */
const ptr = new Map(); let downAt = null, pinch = 0;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); downAt = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (!ptr.has(e.pointerId)) { const dd = (g._drawn || []).find(d => Math.hypot(d.x - px, d.y - py) < 14); const h = dd ? dd.m : null; if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'crosshair'; invalidate(); } return; }
  const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch); pinch = d; if (downAt) downAt.moved = true; return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) downAt.moved = true;
  if (downAt && downAt.moved) { view.x -= dx / K(); view.z -= dy / K(); clampView(); invalidate(); }
});
const up = e => { const r = cv.getBoundingClientRect(); ptr.delete(e.pointerId); pinch = 0; if (e.type === 'pointerup' && downAt && !downAt.moved && ptr.size === 0 && performance.now() - downAt.t < 600) select(e.clientX - r.left, e.clientY - r.top); if (!ptr.size) downAt = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.25 : 1 / 1.25); }, { passive: false });
cv.addEventListener('contextmenu', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); select(e.clientX - r.left, e.clientY - r.top); setHere(); });   // right-click: waypoint straight away
window.addEventListener('keydown', e => {
  if (!open || e.target.tagName === 'INPUT') return;
  const step = 60 / view.zoom;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') view.x -= step; else if (e.code === 'ArrowRight' || e.code === 'KeyD') view.x += step;
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') view.z -= step; else if (e.code === 'ArrowDown' || e.code === 'KeyS') view.z += step;
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') view.zoom *= 1.25; else if (e.code === 'Minus' || e.code === 'NumpadSubtract') view.zoom /= 1.25;
  else if (e.code === 'KeyC') { centerOnPlayer(); return; }
  else if (e.code === 'Enter' && e.target === document.body) { setHere(); return; }
  else if ((e.code === 'Delete' || e.code === 'Backspace')) { removeWp(); return; }
  else return;
  e.preventDefault(); clampView(); invalidate();
});
window.addEventListener('resize', () => { if (open) resize(); });
$('mapSet').addEventListener('click', setHere); $('mapRemove').addEventListener('click', removeWp);
$('mapClear').addEventListener('click', removeWp); $('mapClose').addEventListener('click', () => closeMap());
$('mapCenter').addEventListener('click', centerOnPlayer);
$('mapIn').addEventListener('click', () => zoomAt(W / 2, H / 2, 1.5)); $('mapOut').addEventListener('click', () => zoomAt(W / 2, H / 2, 1 / 1.5));
{ // legend: one toggle per kind of place
  const box = $('mapLegend'); box.innerHTML = '';
  for (const grp of GROUPS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip on'; b.innerHTML = '<s style="background:' + grp.color + '"></s>' + grp.label; b.setAttribute('aria-pressed', 'true'); b.addEventListener('click', () => { shown[grp.id] = !shown[grp.id]; b.classList.toggle('on', shown[grp.id]); b.setAttribute('aria-pressed', String(shown[grp.id])); invalidate(); }); box.appendChild(b); }
}

export const isMapOpen = () => open;
/** open the map. `cb` runs when it closes (back to the game, or back to the pause menu) */
export function openMap(cb, focusWp) {
  open = true; onClose = cb; hover = null; sel = null; $('mapInfo').hidden = true; $('map').hidden = false; resize();
  if (focusWp && getMarker('waypoint')) { const w = getMarker('waypoint'); view.x = w.x; view.z = w.z; view.zoom = 2.5; } else { view.zoom = 1; centerOnPlayer(); if (Math.abs(player.x - WORLD / 2) + Math.abs(player.z - WORLD / 2) < 40) { view.x = WORLD / 2; view.z = WORLD / 2; } }
  clampView(); drawMap(); setTimeout(() => $('mapClose').focus && $('mapClose').focus(), 0);
}
export function closeMap() { if (!open) return; open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } $('map').hidden = true; if (onClose) { const f = onClose; onClose = null; f(); } }
/** the pause menu's Map page can show a waypoint set from elsewhere */
export function refreshMap() { showInfo(); invalidate(); }
