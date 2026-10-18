// The full-city map: districts, roads, the highway, every flagship place, the player, the current job and a waypoint you can set by clicking.
import { N, B, P, RD, WORLD, blockX, blockZ, blockType, DISTRICTS, MAP, TYPES } from './layout.js';
import { shoreDist, piers, SPURS, COAST_ROADS } from './coast.js';
import { HW, HW_Z } from './highway.js';
import { CATEGORIES } from './pois.js';
import { G } from './state.js';
import { player } from './player.js';
import { allMarkers, getMarker, setWaypoint, clearWaypoint } from './markers.js';
import { say } from './ui.js';

const $ = id => document.getElementById(id);
const cv = $('mapCanvas'), g = cv.getContext('2d'), PAD = 6, MARGIN = 230;   // the map shows the city plus the coast around it
let open = false, hover = null;
const scale = () => (cv.width - PAD * 2) / (WORLD + 2 * MARGIN);
const toX = x => PAD + (x + MARGIN) * scale(), toZ = z => PAD + (z + MARGIN) * scale();
let backdrop = null;
function coastBackdrop() { // sea, beach and grass, painted once
  if (backdrop) return backdrop; backdrop = document.createElement('canvas'); backdrop.width = cv.width; backdrop.height = cv.height; const b = backdrop.getContext('2d'), CELL = 6, s = scale();
  for (let ix = 0; ix < cv.width; ix += CELL) for (let iz = 0; iz < cv.height; iz += CELL) { const wx = (ix + CELL / 2 - PAD) / s - MARGIN, wz = (iz + CELL / 2 - PAD) / s - MARGIN, d = shoreDist(wx, wz); b.fillStyle = d < -60 ? '#103a56' : d < -18 ? '#1a5c7a' : d < 0 ? '#2c8aa0' : d < 4 ? '#f4efe0' : d < 30 ? '#e6d6a4' : '#668f52'; b.fillRect(ix, iz, CELL + 1, CELL + 1); }
  return backdrop; }
export const isMapOpen = () => open;

function glyph(x, y, r, color, ch) { g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill(); g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#0b0b0b'; g.font = 'bold ' + Math.round(r * 1.3) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y + 1); }
export function drawMap() {
  const s = scale(); g.clearRect(0, 0, cv.width, cv.height);
  g.drawImage(coastBackdrop(), 0, 0);
  g.fillStyle = '#2b2d30'; g.fillRect(toX(0), toZ(0), WORLD * s, WORLD * s);
  g.strokeStyle = '#4a4a4c'; g.lineWidth = 6 * s; for (const sp of SPURS) { g.beginPath(); g.moveTo(toX(sp.x0), toZ(sp.z0)); g.lineTo(toX(sp.x1), toZ(sp.z1)); g.stroke(); } g.lineWidth = 4 * s; for (const r of COAST_ROADS) { g.beginPath(); r.pts.forEach((q, n) => n ? g.lineTo(toX(q[0]), toZ(q[1])) : g.moveTo(toX(q[0]), toZ(q[1]))); g.stroke(); }
  g.strokeStyle = '#8a6a46'; g.lineWidth = 3 * s; for (const p of piers) { g.beginPath(); g.moveTo(toX(p.x), toZ(p.z)); g.lineTo(toX(p.x + p.dx * p.len), toZ(p.z + p.dz * p.len)); g.stroke(); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const t = blockType(i, j); g.fillStyle = t.open ? '#3f7a3a' : DISTRICTS[t.district].color; g.globalAlpha = t.open ? 1 : .7; g.fillRect(toX(blockX(i)), toZ(blockZ(j)), B * s, B * s); g.globalAlpha = 1; }
  g.strokeStyle = '#e8d060'; g.lineWidth = 5; g.beginPath(); g.moveTo(toX(HW.w0), toZ(HW_Z)); g.lineTo(toX(HW.e1), toZ(HW_Z)); g.stroke();
  g.fillStyle = '#0b0b0b'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('HIGHWAY', toX((HW.w1 + HW.e0) / 2), toZ(HW_Z) - 7);
  // district names (anchored by hand so the spread-out outskirts don't land on top of downtown)
  const ANCHOR = { downtown: [5, 4.4], residential: [2, 2.2], commercial: [8.4, 3.2], industrial: [1.6, 8.6], port: [7.4, 8.3], emergency: [8, .55], outskirts: [.2, 5.4] };
  g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.7)'; for (const d in ANCHOR) g.fillText(DISTRICTS[d].name.toUpperCase(), toX(blockX(ANCHOR[d][0]) + B / 2), toZ(blockZ(ANCHOR[d][1]) + B / 2));
  for (const m of allMarkers()) if (m.kind === 'poi' && m.map && m.category !== 'park') glyph(toX(m.x), toZ(m.z), 7, m.color, m.glyph);
  for (const id of ['mission', 'waypoint']) { const m = getMarker(id); if (m) glyph(toX(m.x), toZ(m.z), 8, m.color, id === 'mission' ? '!' : 'X'); }
  g.save(); g.translate(toX(player.x), toZ(player.z)); g.rotate(Math.PI - player.yaw); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  if (hover) { g.font = 'bold 13px sans-serif'; const w = g.measureText(hover.label).width + 12; const x = Math.min(cv.width - w - 4, toX(hover.x) + 12), y = Math.max(18, toZ(hover.z) - 12); g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(x, y - 15, w, 20); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(hover.label, x + 6, y); }
}
function worldAt(e) { const r = cv.getBoundingClientRect(), k = cv.width / r.width; return [((e.clientX - r.left) * k - PAD) / scale() - MARGIN, ((e.clientY - r.top) * k - PAD) / scale() - MARGIN]; }
cv.addEventListener('mousemove', e => { const [x, z] = worldAt(e); let best = null, bd = 18 / scale(); for (const m of allMarkers()) { if (m.kind !== 'poi' || !m.map) continue; const d = Math.hypot(m.x - x, m.z - z); if (d < bd) { bd = d; best = m; } } hover = best; if (open) drawMap(); });
cv.addEventListener('click', e => { const [x, z] = worldAt(e); if (shoreDist(x, z) < 0 && !(x > 0 && x < WORLD && z > 0 && z < WORLD)) { say('that is out at sea', 1.5); return; } setWaypoint(x, z); drawMap(); say('waypoint set', 1.5); });
cv.addEventListener('contextmenu', e => { e.preventDefault(); clearWaypoint(); drawMap(); });
$('mapClear').addEventListener('click', () => { clearWaypoint(); drawMap(); });
$('mapClose').addEventListener('click', () => closeMap());
{ // legend
  const seen = new Set(), items = [];
  for (const k in CATEGORIES) { const c = CATEGORIES[k]; if (c.hidden || k === 'park' || k === 'site' || seen.has(c.glyph + c.label)) continue; seen.add(c.glyph + c.label); items.push('<li><b style="background:' + c.color + '">' + c.glyph + '</b>' + c.label + '</li>'); }
  $('mapLegend').innerHTML = items.join('');
}
let onClose = null;
export function openMap(cb) { open = true; onClose = cb; hover = null; $('map').hidden = false; drawMap(); }
export function closeMap() { if (!open) return; open = false; $('map').hidden = true; if (onClose) onClose(); }
