// Procedural pictures: avatars, video thumbnails and photo posts are drawn on a canvas from a
// seed, so the internet has thousands of distinct images without shipping image files.
import { rng, pick } from './rng.js';
import { media } from './media.js';

const cache = new Map();
function cached(key, w, hgt, draw) {
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    draw(c.getContext('2d'), w, hgt);
    url = c.toDataURL('image/png');
  } catch { url = ''; }
  cache.set(key, url);
  return url;
}

const SKIN = ['#f5d2b8', '#e8b796', '#d39a72', '#b07650', '#8a5636', '#5e3a22', '#f0c8a0'];
const HAIR = ['#1c1410', '#3b2518', '#6b4423', '#a8743a', '#d9b56b', '#b3401f', '#2b2b2b', '#8c8c8c', '#5a2b7a', '#1f6f8b'];
const BG = ['#7fa8d1', '#b9d17f', '#d18f7f', '#c7a3d6', '#f2d16b', '#7fd1c1', '#9aa0a6', '#e8a0bf', '#5d7fa3', '#d9d2c5', '#4f6b52', '#f29c50'];

export function avatar(seed, spec = {}) {
  const real = media('avatars', seed); if (real) return real;
  const key = 'av:' + seed + ':' + JSON.stringify(spec);
  return cached(key, 96, 96, (g, w, hh) => drawAvatar(g, w, hh, seed, spec));
}

export function drawAvatar(g, w, hh, seed, spec = {}) {
  const r = rng(seed + ':avatar');
  const kind = spec.kind || 'face';
  const bg = spec.bg || pick(r, BG);
  g.fillStyle = bg; g.fillRect(0, 0, w, hh);
  const s = w / 96;
  g.save(); g.scale(s, s);
  if (kind === 'blank') {
    g.fillStyle = '#c9ccd1'; g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#a3a8b0'; g.beginPath(); g.arc(48, 38, 17, 0, 7); g.fill();
    g.beginPath(); g.ellipse(48, 96, 32, 34, 0, 0, 7); g.fill();
  } else if (kind === 'initial') {
    const grad = g.createLinearGradient(0, 0, 96, 96);
    grad.addColorStop(0, bg); grad.addColorStop(1, shade(bg, -40));
    g.fillStyle = grad; g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#fff'; g.font = 'bold 48px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((spec.text || seed[0] || '?').toUpperCase(), 48, 52);
  } else if (kind === 'cat' || kind === 'dog') {
    g.fillStyle = shade(bg, 30); g.fillRect(0, 60, 96, 36);
    const fur = spec.fur || pick(r, ['#e0a050', '#3a3a3a', '#f2f2f2', '#9a7b5c', '#c06a2c', '#777']);
    g.fillStyle = fur;
    g.beginPath(); g.ellipse(48, 56, 28, 25, 0, 0, 7); g.fill();
    if (kind === 'cat') {
      tri(g, 24, 42, 30, 18, 42, 36); tri(g, 72, 42, 66, 18, 54, 36);
    } else {
      g.beginPath(); g.ellipse(22, 52, 9, 18, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(74, 52, 9, 18, -0.3, 0, 7); g.fill();
      g.fillStyle = shade(fur, 30); g.beginPath(); g.ellipse(48, 68, 13, 10, 0, 0, 7); g.fill();
    }
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(38, 54, 3.5, 0, 7); g.arc(58, 54, 3.5, 0, 7); g.fill();
    g.fillStyle = '#d0707a'; tri(g, 44, 63, 52, 63, 48, 67);
  } else if (kind === 'logo') {
    g.fillStyle = shade(bg, -50); g.fillRect(0, 0, 96, 96);
    g.fillStyle = bg; g.beginPath();
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? 16 : 34; g.lineTo(48 + Math.cos(a) * rad, 48 + Math.sin(a) * rad); }
    g.fill();
    if (spec.text) { g.fillStyle = '#fff'; g.font = 'bold 20px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(spec.text, 48, 50); }
  } else if (kind === 'photo') {
    landscape(g, 96, 96, r);
  } else if (kind === 'object') {
    g.fillStyle = shade(bg, 20); g.fillRect(0, 0, 96, 96);
    g.fillStyle = spec.color || '#444';
    const o = spec.object || 'toaster';
    if (o === 'toaster') { round(g, 18, 36, 60, 40, 10); g.fill(); g.fillStyle = '#222'; g.fillRect(30, 34, 12, 4); g.fillRect(54, 34, 12, 4); g.fillStyle = '#c9a36b'; g.fillRect(31, 26, 10, 9); }
    else if (o === 'controller') { round(g, 14, 38, 68, 28, 14); g.fill(); g.fillStyle = '#ddd'; g.fillRect(26, 48, 14, 4); g.fillRect(31, 43, 4, 14); g.beginPath(); g.arc(62, 48, 3, 0, 7); g.arc(70, 54, 3, 0, 7); g.fill(); }
    else if (o === 'pan') { g.beginPath(); g.arc(42, 50, 26, 0, 7); g.fill(); g.fillRect(64, 46, 28, 8); g.fillStyle = '#f3d36b'; g.beginPath(); g.arc(42, 50, 10, 0, 7); g.fill(); }
    else if (o === 'eye') { g.fillStyle = '#eee'; g.beginPath(); g.ellipse(48, 48, 34, 18, 0, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(48, 48, 11, 0, 7); g.fill(); }
    else if (o === 'note') { g.fillStyle = spec.color || '#222'; g.beginPath(); g.ellipse(36, 66, 12, 9, -0.4, 0, 7); g.fill(); g.fillRect(44, 22, 5, 44); g.fillRect(44, 22, 22, 6); }
    else if (o === 'tower') { g.fillRect(30, 14, 36, 70); g.fillStyle = '#7cf'; g.fillRect(36, 22, 24, 4); g.fillStyle = '#1f1'; g.fillRect(56, 74, 4, 4); }
    else if (o === 'bike') { g.strokeStyle = spec.color || '#333'; g.lineWidth = 4; g.beginPath(); g.arc(26, 60, 14, 0, 7); g.moveTo(84, 60); g.arc(70, 60, 14, 0, 7); g.moveTo(26, 60); g.lineTo(44, 36); g.lineTo(70, 60); g.moveTo(44, 36); g.lineTo(64, 36); g.lineTo(48, 60); g.lineTo(26, 60); g.stroke(); }
  } else {
    // a person
    const skin = spec.skin || pick(r, SKIN), hair = spec.hair || pick(r, HAIR);
    const shirt = spec.shirt || pick(r, ['#2d4f8a', '#8a2d2d', '#2d8a4f', '#333', '#e0e0e0', '#a36bd1', '#d18a2d', '#59636e']);
    g.fillStyle = shirt; g.beginPath(); g.ellipse(48, 100, 36, 30, 0, 0, 7); g.fill();
    g.fillStyle = skin; g.fillRect(41, 60, 14, 12);
    const long = spec.long ?? r() < 0.4;
    if (long) { g.fillStyle = hair; round(g, 22, 24, 52, 56, 18); g.fill(); }
    g.fillStyle = skin; g.beginPath(); g.ellipse(48, 46, 20, 23, 0, 0, 7); g.fill();
    g.fillStyle = hair;
    const style = Math.floor(r() * 4);
    if (style === 0 || long) { g.beginPath(); g.ellipse(48, 30, 22, 13, 0, Math.PI, 0); g.fill(); g.fillRect(26, 28, 44, 7); }
    else if (style === 1) { g.beginPath(); g.ellipse(48, 28, 21, 11, 0, Math.PI, 0); g.fill(); }
    else if (style === 2) { for (let i = 0; i < 6; i++) tri(g, 28 + i * 8, 32, 32 + i * 8, 14 + (i % 2) * 5, 36 + i * 8, 32); }
    else { g.beginPath(); g.ellipse(48, 30, 21, 9, 0, Math.PI, 0); g.fill(); }
    if (spec.cap ?? r() < 0.15) { g.fillStyle = spec.capColor || pick(r, ['#c0392b', '#2c3e50', '#16a085', '#f39c12']); g.beginPath(); g.ellipse(48, 28, 23, 12, 0, Math.PI, 0); g.fill(); g.fillRect(44, 24, 32, 6); }
    g.fillStyle = '#222';
    g.beginPath(); g.arc(40, 46, 2.4, 0, 7); g.arc(56, 46, 2.4, 0, 7); g.fill();
    if (spec.glasses ?? r() < 0.3) { g.strokeStyle = '#222'; g.lineWidth = 2; g.strokeRect(33, 41, 13, 10); g.strokeRect(50, 41, 13, 10); g.beginPath(); g.moveTo(46, 45); g.lineTo(50, 45); g.stroke(); }
    g.strokeStyle = shade(skin, -60); g.lineWidth = 2; g.beginPath();
    const mood = spec.mood || pick(r, ['smile', 'smile', 'flat', 'grin']);
    if (mood === 'flat') { g.moveTo(42, 58); g.lineTo(54, 58); }
    else if (mood === 'grin') { g.fillStyle = '#fff'; g.arc(48, 56, 6, 0, Math.PI); g.fill(); }
    else g.arc(48, 54, 6, 0.3, Math.PI - 0.3);
    g.stroke();
    if (spec.beard ?? r() < 0.15) { g.fillStyle = hair; g.beginPath(); g.ellipse(48, 62, 15, 9, 0, 0, Math.PI); g.fill(); }
  }
  g.restore();
}

function landscape(g, w, hh, r, opt = {}) {
  const t = opt.time ?? r();
  const sky = t < 0.33 ? ['#ff9a5a', '#ffd1a1'] : t < 0.75 ? ['#5aa0e6', '#c9e6ff'] : ['#1b1f4a', '#5b4b8a'];
  const grad = g.createLinearGradient(0, 0, 0, hh); grad.addColorStop(0, sky[0]); grad.addColorStop(1, sky[1]);
  g.fillStyle = grad; g.fillRect(0, 0, w, hh);
  g.fillStyle = t < 0.75 ? 'rgba(255,240,200,.9)' : '#f4f1d0';
  g.beginPath(); g.arc(w * (0.2 + r() * 0.6), hh * 0.3, w * 0.07, 0, 7); g.fill();
  for (let L = 0; L < 3; L++) {
    g.fillStyle = shade(opt.land || '#4f7a4a', -L * 18 + (t > 0.75 ? -60 : 0));
    g.beginPath(); g.moveTo(0, hh);
    for (let x = 0; x <= w; x += w / 12) g.lineTo(x, hh * (0.55 + L * 0.12) - Math.sin(x / w * 6 + L * 2 + r() * 2) * hh * 0.06);
    g.lineTo(w, hh); g.fill();
  }
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return '#' + ((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0');
}
function tri(g, a, b, c, d, e, f) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.fill(); }
export function round(g, x, y, w, hh, rad) { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + hh, rad); g.arcTo(x + w, y + hh, x, y + hh, rad); g.arcTo(x, y + hh, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); }

// --- photo posts (Blink) ---------------------------------------------------------------
export function photo(seed, kind = 'landscape', caption) {
  const real = media('photos', seed); if (real) return real;
  return cached('ph:' + seed + kind, 480, 360, (g, w, hh) => drawPhoto(g, w, hh, seed, kind, caption));
}
function drawPhoto(g, w, hh, seed, kind, caption) {
  const r = rng(seed + ':photo');
  if (kind === 'landscape') landscape(g, w, hh, r);
  else if (kind === 'beach') { landscape(g, w, hh, r, { land: '#e8d39a', time: 0.5 }); g.fillStyle = '#3d8fd1'; g.fillRect(0, hh * 0.55, w, hh * 0.12); }
  else if (kind === 'food') {
    g.fillStyle = pick(r, ['#7b5a3c', '#d9cbb3', '#3c3c3c', '#a8b8a0']); g.fillRect(0, 0, w, hh);
    g.fillStyle = '#f4f4f0'; g.beginPath(); g.ellipse(w / 2, hh / 2, w * 0.36, hh * 0.38, 0, 0, 7); g.fill();
    g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(w / 2, hh / 2, w * 0.27, hh * 0.28, 0, 0, 7); g.fill();
    const cols = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#8e5b2b', '#f5e6c8'];
    for (let i = 0; i < 26; i++) { g.fillStyle = pick(r, cols); g.beginPath(); g.ellipse(w / 2 + (r() - .5) * w * .4, hh / 2 + (r() - .5) * hh * .4, 8 + r() * 22, 6 + r() * 14, r() * 3, 0, 7); g.fill(); }
  } else if (kind === 'cat' || kind === 'dog') {
    g.fillStyle = pick(r, ['#b8a690', '#6e7f8f', '#c9b9a6', '#8f6e5a']); g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, hh * 0.62, w, hh);
    g.save(); g.translate(w / 2 - 110, hh / 2 - 130); g.scale(2.4, 2.4);
    drawAvatar(g, 96, 96, seed, { kind, bg: 'transparent' }); g.restore();
  } else if (kind === 'selfie') {
    g.fillStyle = pick(r, ['#d8c8b0', '#9fb3c8', '#e6e0d8']); g.fillRect(0, 0, w, hh);
    g.save(); g.translate(w / 2 - 150, 10); g.scale(3.4, 3.6); drawAvatar(g, 96, 96, seed, { bg: 'rgba(0,0,0,0)' }); g.restore();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, w, hh);
  } else if (kind === 'night') {
    g.fillStyle = '#0d1020'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 30; i++) { g.fillStyle = `hsl(${r() * 60 + 20},90%,${50 + r() * 30}%)`; g.globalAlpha = .5 + r() * .5; g.beginPath(); g.arc(r() * w, hh * .4 + r() * hh * .5, 2 + r() * 10, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#05060c';
    for (let x = 0; x < w; x += 30 + r() * 30) { const bh = 60 + r() * 140; g.fillRect(x, hh - bh, 28 + r() * 30, bh); }
  } else if (kind === 'screenshot') {
    g.fillStyle = '#2b2f3a'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#e8ebf0'; g.fillRect(14, 14, w - 28, hh - 28);
    g.fillStyle = '#5b7fb0'; g.fillRect(14, 14, w - 28, 26);
    for (let i = 0; i < 9; i++) { g.fillStyle = '#9aa3b0'; g.fillRect(30, 56 + i * 28, 120 + r() * 260, 10); }
  } else if (kind === 'room') {
    g.fillStyle = pick(r, ['#c8b89c', '#9cb0c8', '#b8a0a0']); g.fillRect(0, 0, w, hh);
    g.fillStyle = '#6b4f36'; g.fillRect(0, hh * .7, w, hh * .3);
    g.fillStyle = '#ccd8e8'; g.fillRect(w * .6, hh * .15, w * .25, hh * .3);
    g.fillStyle = '#334'; g.fillRect(w * .1, hh * .5, w * .35, hh * .22); g.fillStyle = '#58a'; g.fillRect(w * .12, hh * .52, w * .31, hh * .16);
  } else if (kind === 'pcbuild') {
    g.fillStyle = '#1a1a1e'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#2c2c34'; g.fillRect(w * .2, hh * .08, w * .6, hh * .84);
    g.fillStyle = '#0f5'; g.globalAlpha = .25; g.fillRect(w * .2, hh * .08, w * .6, hh * .84); g.globalAlpha = 1;
    g.fillStyle = '#444'; g.fillRect(w * .3, hh * .2, w * .4, hh * .35);
    g.fillStyle = '#7af'; g.beginPath(); g.arc(w * .5, hh * .37, 34, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(w * .5, hh * .37, 26, 0, 7); g.fill();
    g.fillStyle = '#c33'; g.fillRect(w * .3, hh * .65, w * .4, hh * .08);
  } else if (kind === 'blurry') {
    g.fillStyle = '#3a3a30'; g.fillRect(0, 0, w, hh);
    g.filter = 'blur(10px)';
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(${150 + r() * 100},${130 + r() * 80},${90 + r() * 60},.5)`; g.fillRect(r() * w, r() * hh, 80, 120); }
    g.filter = 'none';
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(w * .62, hh * .55, 14, 50, 0, 0, 7); g.fill();
  } else {
    landscape(g, w, hh, r);
  }
  if (caption) {
    g.font = 'bold 30px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000'; g.fillStyle = '#fff';
    g.strokeText(caption.toUpperCase(), w / 2, hh - 24); g.fillText(caption.toUpperCase(), w / 2, hh - 24);
  }
}

// --- video thumbnails ------------------------------------------------------------------
export function thumb(video) {
  const real = media('thumbs', video.id); if (real) return real;
  return cached('th:' + video.id, 320, 180, (g, w, hh) => { drawScene(g, w, hh, video, video.thumbAt ?? 0.37, 'thumb'); });
}

// A frame of a video at progress p (0..1). The player calls this every animation frame.
export function drawScene(g, w, hh, video, p, mode, talking) {
  const r = rng(video.id + ':scene');
  const sc = video.scene || {};
  const kind = sc.kind || 'vlog';
  const t = p * (video.seconds || 120);
  const col = sc.color || pick(r, BG);
  g.save();
  if (kind === 'vlog' || kind === 'rant') {
    g.fillStyle = shade(col, -30); g.fillRect(0, 0, w, hh);
    g.fillStyle = shade(col, -10); g.fillRect(w * .62, hh * .1, w * .28, hh * .4);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(w * .64, hh * .12, w * .24, hh * .36);
    g.fillStyle = '#3a2a1e'; g.fillRect(0, hh * .82, w, hh * .18);
    const bob = Math.sin(t * (kind === 'rant' ? 9 : 3)) * hh * .012;
    g.save(); g.translate(w / 2 - hh * .42, hh * .12 + bob); g.scale(hh * .9 / 96, hh * .9 / 96);
    drawAvatar(g, 96, 96, sc.face || video.channel, { ...(sc.faceSpec || {}), bg: 'rgba(0,0,0,0)', mood: talking && Math.sin(t * 14) > 0 ? 'grin' : (sc.faceSpec?.mood || 'smile') });
    g.restore();
  } else if (kind === 'game') {
    const sky = g.createLinearGradient(0, 0, 0, hh); sky.addColorStop(0, sc.sky || '#5fa8ff'); sky.addColorStop(1, '#bfe3ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, hh);
    const off = t * 60;
    g.fillStyle = sc.ground || '#6b4f2a';
    for (let i = -1; i < 12; i++) { const x = i * 60 - (off % 60), gh = 30 + (Math.sin((i + Math.floor(off / 60)) * 1.7) * .5 + .5) * 30; g.fillRect(x, hh - gh, 61, gh); g.fillStyle = '#3c9a3c'; g.fillRect(x, hh - gh, 61, 6); g.fillStyle = sc.ground || '#6b4f2a'; }
    g.fillStyle = '#ffdc3c';
    for (let i = 0; i < 5; i++) { const x = (i * 97 - off * 1.1) % (w + 40); g.beginPath(); g.arc(x < -20 ? x + w + 40 : x, hh * .45 + Math.sin(i) * 20, 6, 0, 7); g.fill(); }
    g.fillStyle = sc.hero || '#e33'; const jump = Math.abs(Math.sin(t * 2.2)) * hh * .25;
    g.fillRect(w * .3, hh * .62 - jump, 18, 24);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(8, 8, 110, 18); g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText('SCORE ' + String(Math.floor(t * 37)).padStart(6, '0'), 14, 21);
  } else if (kind === 'cooking') {
    g.fillStyle = '#d9cfc0'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#888'; g.fillRect(0, hh * .55, w, hh * .45);
    g.fillStyle = '#222'; g.beginPath(); g.ellipse(w / 2, hh * .66, w * .26, hh * .16, 0, 0, 7); g.fill();
    g.fillStyle = '#444'; g.fillRect(w * .74, hh * .63, w * .26, hh * .06);
    g.fillStyle = sc.food || '#e8b04a'; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(w / 2 + Math.sin(t * 2 + i) * w * .12, hh * .65 + Math.cos(t * 1.4 + i * 2) * hh * .05, 12, 7, i, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { const y = (hh * .5 - ((t * 30 + i * 30) % (hh * .5))); g.beginPath(); g.arc(w / 2 + Math.sin(y / 9 + i) * 20, y, 8 + i, 0, 7); g.fill(); }
  } else if (kind === 'music') {
    const grad = g.createLinearGradient(0, 0, w, hh); grad.addColorStop(0, col); grad.addColorStop(1, shade(col, -90));
    g.fillStyle = grad; g.fillRect(0, 0, w, hh);
    const bars = 24;
    for (let i = 0; i < bars; i++) {
      const v = (Math.sin(t * 5 + i * .7) * .5 + .5) * (Math.sin(t * 1.3 + i * 1.9) * .4 + .6);
      g.fillStyle = `rgba(255,255,255,${.35 + v * .5})`;
      const bh = 10 + v * hh * .5; g.fillRect(w * .08 + i * (w * .84 / bars), hh * .82 - bh, w * .84 / bars - 3, bh);
    }
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(hh * .09)}px Georgia, serif`; g.textAlign = 'center';
    g.fillText(sc.label || video.title.split(/[-–(]/)[0].trim().slice(0, 28), w / 2, hh * .2);
  } else if (kind === 'slides' || kind === 'tutorial') {
    g.fillStyle = kind === 'tutorial' ? '#2a4d7a' : col; g.fillRect(0, 0, w, hh);
    if (kind === 'tutorial') {
      g.fillStyle = '#e9edf2'; g.fillRect(w * .08, hh * .1, w * .84, hh * .78); g.fillStyle = '#4a6a96'; g.fillRect(w * .08, hh * .1, w * .84, hh * .07);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#b8c0cc'; g.fillRect(w * .12, hh * (.25 + i * .09), w * (.3 + ((i * 37) % 40) / 100), hh * .035); }
      const cx = w * (.3 + Math.sin(t * .8) * .25), cy = hh * (.45 + Math.cos(t * .6) * .2);
      g.fillStyle = '#000'; tri(g, cx, cy, cx, cy + 14, cx + 9, cy + 10);
    } else {
      const cards = sc.cards || [video.title];
      const idx = Math.min(cards.length - 1, Math.floor(p * cards.length));
      g.fillStyle = '#fff'; g.font = `bold ${Math.round(hh * .08)}px Verdana, sans-serif`; g.textAlign = 'center';
      wrap(g, cards[idx], w / 2, hh * .45, w * .8, hh * .1);
    }
  } else if (kind === 'unboxing') {
    g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#8a6a48'; g.fillRect(0, hh * .7, w, hh * .3);
    const open = Math.min(1, (t % 40) / 20);
    g.fillStyle = '#c8a070'; g.fillRect(w * .32, hh * .38, w * .36, hh * .34);
    g.fillStyle = '#b08858'; g.save(); g.translate(w * .32, hh * .38); g.rotate(-open * 1.2); g.fillRect(0, -6, w * .18, 8); g.restore();
    g.save(); g.translate(w * .68, hh * .38); g.rotate(open * 1.2); g.fillRect(-w * .18, -6, w * .18, 8); g.restore();
    g.fillStyle = sc.item || '#333'; g.fillRect(w * .43, hh * .42 - open * hh * .18, w * .14, hh * .14);
    g.fillStyle = '#f0c8a0'; g.beginPath(); g.ellipse(w * .2 + Math.sin(t * 2) * 10, hh * .62, 26, 14, .3, 0, 7); g.fill();
  } else if (kind === 'outdoor' || kind === 'bike') {
    const off = t * 40;
    landscape(g, w, hh, rng(video.id), { time: sc.time ?? .5 });
    g.fillStyle = '#555'; g.fillRect(0, hh * .82, w, hh * .18);
    g.fillStyle = '#ddd'; for (let x = -(off % 60); x < w; x += 60) g.fillRect(x, hh * .9, 30, 3);
    if (kind === 'bike') { g.save(); g.translate(w * .35, hh * .52 + Math.sin(t * 8) * 2); g.scale(.9, .9); drawAvatar(g, 96, 96, video.channel, { kind: 'object', object: 'bike', bg: 'rgba(0,0,0,0)', color: '#222' }); g.restore(); }
  } else if (kind === 'cat') {
    g.fillStyle = sc.color || '#c9b9a6'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#8a7a66'; g.fillRect(0, hh * .7, w, hh * .3);
    g.save(); const jx = Math.sin(t * 1.5) * w * .15; g.translate(w / 2 - hh * .35 + jx, hh * .2 - Math.abs(Math.sin(t * 3)) * hh * .1); g.scale(hh * .7 / 96, hh * .7 / 96);
    drawAvatar(g, 96, 96, sc.face || video.id, { kind: sc.animal || 'cat', bg: 'rgba(0,0,0,0)', fur: sc.fur }); g.restore();
  } else if (kind === 'static') {
    const img = g.createImageData(w, hh); const rr = rng(Math.floor(t * 12) + video.id);
    for (let i = 0; i < img.data.length; i += 4) { const v = rr() * (sc.dark ? 60 : 200); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    if (sc.shape) { g.globalAlpha = .55 + Math.sin(t) * .2; g.fillStyle = '#000'; g.beginPath(); g.ellipse(w * .5, hh * .55, w * .05, hh * .3, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  } else if (kind === 'hallway') {
    g.fillStyle = '#1a1712'; g.fillRect(0, 0, w, hh);
    const fl = Math.sin(t * 17) > .93 ? .4 : 1;
    g.fillStyle = `rgba(200,180,120,${.25 * fl})`; g.beginPath(); g.moveTo(w * .3, 0); g.lineTo(w * .7, 0); g.lineTo(w * .56, hh * .6); g.lineTo(w * .44, hh * .6); g.fill();
    g.fillStyle = `rgba(120,100,70,${.5 * fl})`; g.beginPath(); g.moveTo(0, hh); g.lineTo(w * .44, hh * .6); g.lineTo(w * .56, hh * .6); g.lineTo(w, hh); g.fill();
    g.fillStyle = '#060504'; g.fillRect(w * .47, hh * .42, w * .06, hh * .18);
  } else if (kind === 'news') {
    g.fillStyle = '#1d2c4a'; g.fillRect(0, 0, w, hh);
    g.save(); g.translate(w * .55, hh * .1); g.scale(hh * .9 / 96, hh * .9 / 96); drawAvatar(g, 96, 96, sc.face || video.channel, { bg: 'rgba(0,0,0,0)', shirt: '#222' }); g.restore();
    g.fillStyle = '#b8222a'; g.fillRect(0, hh * .78, w, hh * .1); g.fillStyle = '#fff'; g.font = `bold ${Math.round(hh * .06)}px Arial`; g.fillText((sc.ticker || 'BREAKING').toUpperCase(), w * .03, hh * .85);
    g.fillStyle = '#c9d6ee'; g.fillRect(w * .05, hh * .15, w * .4, hh * .5);
  }
  g.restore();
  if (mode === 'thumb' && sc.text) {
    g.font = `bold ${Math.round(hh * .13)}px Impact, "Arial Black", sans-serif`; g.textAlign = 'left'; g.lineWidth = 5; g.strokeStyle = '#000'; g.fillStyle = sc.textColor || '#ffef3a';
    g.strokeText(sc.text, w * .05, hh * .9); g.fillText(sc.text, w * .05, hh * .9);
  }
}
function wrap(g, text, x, y, maxW, lh) {
  const words = String(text).split(' '); const lines = []; let line = '';
  for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > maxW && line) { lines.push(line); line = wd; } else line = tst; }
  lines.push(line);
  lines.forEach((l, i) => g.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh));
}

// Wallpapers are drawn once at screen size.
export function wallpaper(name, w, hh) {
  const real = media('wallpapers', name); if (real) return real;
  return cached('wp:' + name + w + 'x' + hh, w, hh, (g) => {
    const r = rng(name);
    if (name === 'aurora') {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#0b2a4a'); gr.addColorStop(.6, '#145a7a'); gr.addColorStop(1, '#0a1e33');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = `rgba(${90 + i * 20},${220 - i * 15},${200},.12)`; g.lineWidth = 60 + i * 20; g.beginPath();
        for (let x = 0; x <= w; x += 20) g.lineTo(x, hh * (.35 + i * .06) + Math.sin(x / w * 5 + i) * hh * .08);
        g.stroke();
      }
      const glow = g.createRadialGradient(w * .7, hh * .9, 0, w * .7, hh * .9, w * .6); glow.addColorStop(0, 'rgba(120,255,220,.25)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, hh);
    } else if (name === 'meadow') {
      landscape(g, w, hh, r, { time: .5 });
    } else if (name === 'dusk') {
      landscape(g, w, hh, r, { time: .1, land: '#3a3a5a' });
    } else if (name === 'night') {
      landscape(g, w, hh, r, { time: .9, land: '#2a2f52' });
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .7})`; const s = r() < .1 ? 2 : 1; g.fillRect(r() * w, r() * hh * .5, s, s); }
    } else if (name === 'bubbles') {
      const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#4fb3e8'); gr.addColorStop(1, '#2a5fa8'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * hh, rad = 20 + r() * 120; const b = g.createRadialGradient(x - rad * .3, y - rad * .3, 0, x, y, rad); b.addColorStop(0, 'rgba(255,255,255,.35)'); b.addColorStop(1, 'rgba(255,255,255,.02)'); g.fillStyle = b; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    } else if (name === 'carbon') {
      g.fillStyle = '#1b1d21'; g.fillRect(0, 0, w, hh);
      for (let y = 0; y < hh; y += 6) for (let x = (y / 6 % 2) * 6; x < w; x += 12) { g.fillStyle = '#23262b'; g.fillRect(x, y, 6, 6); }
      const glow = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w * .7); glow.addColorStop(0, 'rgba(80,140,255,.18)'); glow.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = glow; g.fillRect(0, 0, w, hh);
    } else if (name === 'petals') {
      const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#f6d5e5'); gr.addColorStop(1, '#c8a0d8'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .4})`; g.save(); g.translate(r() * w, r() * hh); g.rotate(r() * 6); g.beginPath(); g.ellipse(0, 0, 10 + r() * 20, 5 + r() * 8, 0, 0, 7); g.fill(); g.restore(); }
    } else {
      g.fillStyle = name.startsWith('#') ? name : '#2f5f8f'; g.fillRect(0, 0, w, hh);
    }
  });
}
