// HUD (money, health, stars, speed, prompt, mission strip), toasts/banners, minimap and the start/pause menus.
import { N, B, P, RD, blockX, blockZ, blockType, DISTRICTS, districtAt } from './layout.js';
import { HW, HW_Z } from './highway.js';
import { shoreDist } from './coast.js';
import { WORLD } from './layout.js';
import { allMarkers, getMarker } from './markers.js';
import { G } from './state.js';
import { data } from './save.js';
import { player } from './player.js';
import { cars } from './vehicles.js';
import { officers, copsNearby } from './police.js';
import { missionText } from './missions.js';
import { interaction } from './interaction.js';

const $ = id => document.getElementById(id);
const msgEl = $('msg'), bannerEl = $('banner'), flashEl = $('flash'), mm = $('minimap'), mg = mm.getContext('2d');
let msgT = 0, bannerT = 0, hudT = 0, lastStars = -1, lastText = {};

export function say(text, secs) { msgEl.textContent = text; msgEl.classList.add('on'); msgT = secs || 2.5; }
export function banner(text, col, secs) { bannerEl.textContent = text; bannerEl.style.color = col || '#fff'; bannerEl.classList.add('on'); bannerT = secs || 2.2; }
export function clearBanners() { bannerEl.classList.remove('on'); msgEl.classList.remove('on'); bannerT = msgT = 0; }
export function flash(o, color) { flashEl.style.background = color || '#a00'; flashEl.style.transition = 'none'; flashEl.style.opacity = o; requestAnimationFrame(() => requestAnimationFrame(() => { flashEl.style.transition = 'opacity .7s'; flashEl.style.opacity = 0; })); }
const setText = (id, t) => { if (lastText[id] !== t) { lastText[id] = t; $(id).textContent = t; } };

export function showHud(on) { $('hud').hidden = !on; }
export function showStart(on) { $('start').hidden = !on; }
export function showPause(on) {
  $('pause').hidden = !on;
  if (on) setText('pauseStat', '$' + data.money.toLocaleString() + (data.bestRace ? ' - best race ' + data.bestRace.toFixed(1) + 's' : '') + ' - jobs ' + data.stats.jobs);
}

const hexOf = n => '#' + n.toString(16).padStart(6, '0');
function glyphDot(g, x, y, r, color, glyph) { g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.fill(); g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#0b0b0b'; g.font = 'bold ' + Math.round(r * 1.35) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, x, y + .5); }
function drawMinimap() {
  const S = mm.width, sc = S / 230, cx = S / 2, px = player.x, pz = player.z;
  mg.clearRect(0, 0, S, S); mg.fillStyle = '#2b2d30'; mg.fillRect(0, 0, S, S);
  if (px < 140 || px > WORLD - 140 || pz < 140 || pz > WORLD - 140) { // near the edge of the city: show sea, sand and grass beyond it
    const CELL = 10;
    for (let ix = 0; ix < S; ix += CELL) for (let iz = 0; iz < S; iz += CELL) { const wx = px + (ix + CELL / 2 - cx) / sc, wz = pz + (iz + CELL / 2 - cx) / sc; if (wx > 0 && wx < WORLD && wz > 0 && wz < WORLD) continue; const d = shoreDist(wx, wz); mg.fillStyle = d < 0 ? (d < -35 ? '#14405c' : '#1f6c86') : d < 26 ? '#e0cf9c' : '#5f8a4a'; mg.fillRect(ix, iz, CELL + 1, CELL + 1); }
  }
  const lo = Math.max(0, Math.floor((px - 125 - RD / 2) / P)), hi = Math.min(N - 1, Math.ceil((px + 125 - RD / 2) / P)), lz = Math.max(0, Math.floor((pz - 125 - RD / 2) / P)), hz = Math.min(N - 1, Math.ceil((pz + 125 - RD / 2) / P));
  for (let i = lo; i <= hi; i++) for (let j = lz; j <= hz; j++) {
    const x = cx + (blockX(i) - px) * sc, z = cx + (blockZ(j) - pz) * sc, t = blockType(i, j);
    mg.fillStyle = t.open ? '#3f7a3a' : DISTRICTS[t.district].color; mg.globalAlpha = t.open ? 1 : .55; mg.fillRect(x, z, B * sc, B * sc); mg.globalAlpha = 1;
  }
  // the highway deck and ramps
  mg.strokeStyle = '#e8d060'; mg.lineWidth = 3.2; mg.beginPath(); mg.moveTo(cx + (HW.w0 - px) * sc, cx + (HW_Z - pz) * sc); mg.lineTo(cx + (HW.e1 - px) * sc, cx + (HW_Z - pz) * sc); mg.stroke();
  const edge = (x, z, m) => { let dx = (x - px) * sc, dz = (z - pz) * sc; const dd = Math.max(Math.abs(dx), Math.abs(dz)), mm2 = cx - m; if (dd > mm2) { dx = dx / dd * mm2; dz = dz / dd * mm2; return [cx + dx, cx + dz, true]; } return [cx + dx, cx + dz, false]; };
  for (const m of allMarkers()) {
    if (m.kind === 'poi') { if (!m.minimap || m.category === 'park') continue; const X = cx + (m.x - px) * sc, Z = cx + (m.z - pz) * sc; if (X < 6 || Z < 6 || X > S - 6 || Z > S - 6) continue; glyphDot(mg, X, Z, 5.5, m.color, m.glyph); }
  }
  const flashRed = Math.sin(G.time * 8) > 0;
  cars.forEach(c => { if (c.kind === 'cop' && !c.wreck && c.driver !== 'player') { const X = cx + (c.x - px) * sc, Z = cx + (c.z - pz) * sc; if (X > 2 && Z > 2 && X < S - 2 && Z < S - 2) { mg.fillStyle = flashRed ? '#ff3030' : '#3060ff'; mg.beginPath(); mg.arc(X, Z, 3, 0, 7); mg.fill(); } } });
  officers.forEach(o => { if (!o.dead) { const X = cx + (o.x - px) * sc, Z = cx + (o.z - pz) * sc; if (X > 2 && Z > 2 && X < S - 2 && Z < S - 2) { mg.fillStyle = '#6688ff'; mg.beginPath(); mg.arc(X, Z, 2, 0, 7); mg.fill(); } } });
  for (const id of ['waypoint', 'mission']) { const m = getMarker(id); if (!m) continue; const [X, Z, clamped] = edge(m.x, m.z, 8); mg.fillStyle = m.color; mg.strokeStyle = '#000'; mg.lineWidth = 2; mg.beginPath(); mg.arc(X, Z, clamped ? 5 : 6, 0, 7); mg.fill(); mg.stroke(); }
  mg.save(); mg.translate(cx, cx); mg.rotate(Math.PI - player.yaw); mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.restore();
}
let lastDistrict = '';
function showDistrict() {
  const d = DISTRICTS[districtAt(player.x, player.z)].name;
  if (d !== lastDistrict) { lastDistrict = d; const el = $('district'); el.textContent = d; el.classList.add('on'); clearTimeout(showDistrict.t); showDistrict.t = setTimeout(() => el.classList.remove('on'), 2600); }
}

export function updateHud(dt) {
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.classList.remove('on'); }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) bannerEl.classList.remove('on'); }
  hudT -= dt; if (hudT > 0) return; hudT = .1;
  setText('money', '$' + data.money.toLocaleString());
  $('hp').firstElementChild.style.width = Math.max(0, player.hp) + '%';
  const blink = copsNearby() || Math.sin(G.time * 8) > 0, key = G.stars + (blink ? 'b' : 'd');
  if (key !== lastStars) { lastStars = key; $('stars').innerHTML = [0, 1, 2, 3, 4].map(i => '<i class="' + (i < G.stars ? (blink ? 'on' : 'on dim') : '') + '">★</i>').join(''); }
  const c = player.car; setText('speed', c ? Math.round(Math.abs(c.speed) * 3.6) + ' km/h' + (c.hp < 100 ? '  car ' + Math.max(0, Math.round(c.hp)) + '%' : '') : '');
  setText('prompt', interaction.text); setText('wanted', G.wantedText || ''); $('wanted').className = G.wantedPhase || '';
  const mt = missionText(); $('mission').hidden = !mt; setText('mission', mt);
  drawMinimap(); showDistrict();
}
