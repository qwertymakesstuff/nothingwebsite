// HUD (money, health, stars, speed, prompt, mission strip), toasts/banners, minimap and the start/pause menus.
import { N, B, blockX, blockZ, isPark, HOSPITAL, STATION } from './layout.js';
import { G } from './state.js';
import { data } from './save.js';
import { POIS } from './locations.js';
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

function drawMinimap() {
  const S = mm.width, sc = S / 230, cx = S / 2, px = player.x, pz = player.z;
  mg.clearRect(0, 0, S, S); mg.fillStyle = '#2b2d30'; mg.fillRect(0, 0, S, S);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = cx + (blockX(i) - px) * sc, z = cx + (blockZ(j) - pz) * sc;
    if (x > S || z > S || x + B * sc < 0 || z + B * sc < 0) continue;
    mg.fillStyle = isPark(i, j) ? '#3f7a3a' : (i === HOSPITAL[0] && j === HOSPITAL[1]) ? '#e8e8ec' : (i === STATION[0] && j === STATION[1]) ? '#4466aa' : '#4d4d49'; mg.fillRect(x, z, B * sc, B * sc);
  }
  const dot = (x, z, col, r) => { const X = cx + (x - px) * sc, Z = cx + (z - pz) * sc; if (X < 2 || Z < 2 || X > S - 2 || Z > S - 2) return; mg.fillStyle = col; mg.beginPath(); mg.arc(X, Z, r, 0, 7); mg.fill(); };
  POIS.forEach(p => { if (p.type !== 'health') dot(p.x, p.z, '#' + p.color.toString(16).padStart(6, '0'), 3); });
  const flashRed = Math.sin(G.time * 8) > 0;
  cars.forEach(c => { if (c.kind === 'cop' && !c.wreck && c.driver !== 'player') dot(c.x, c.z, flashRed ? '#ff3030' : '#3060ff', 3); });
  officers.forEach(o => { if (!o.dead) dot(o.x, o.z, '#6688ff', 2); });
  if (G.mission) { const t = G.mission.pts[G.mission.idx]; let dx = (t[0] - px) * sc, dz = (t[1] - pz) * sc; const m = cx - 7, dd = Math.max(Math.abs(dx), Math.abs(dz)); if (dd > m) { dx = dx / dd * m; dz = dz / dd * m; } mg.fillStyle = '#ffee55'; mg.beginPath(); mg.arc(cx + dx, cx + dz, 5, 0, 7); mg.fill(); }
  mg.save(); mg.translate(cx, cx); mg.rotate(Math.PI - player.yaw); mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.restore();
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
  setText('prompt', interaction.text);
  const mt = missionText(); $('mission').hidden = !mt; setText('mission', mt);
  drawMinimap();
}
