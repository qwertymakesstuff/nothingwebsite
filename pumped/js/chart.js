// Canvas price chart: area + line, price grid, average-price and liquidation lines, trade
// markers, a crosshair on hover/touch, and a short animation as each new price arrives.

import * as F from './format.js';

export const CHART_THEMES = {
  terminal:  { name: 'Terminal',   bg: '#07110b', grid: 'rgba(120,255,170,0.08)', text: '#6f9c80', up: '#2bff88', down: '#ff3b5c', avg: '#ffd23f', liq: '#ff3b5c', cross: '#c8ffe0' },
  synthwave: { name: 'Synthwave',  bg: '#160a2b', grid: 'rgba(255,94,219,0.10)',  text: '#a083c9', up: '#24f0ff', down: '#ff2e97', avg: '#ffe066', liq: '#ff2e97', cross: '#ffffff' },
  paper:     { name: 'Paper',      bg: '#f4eedf', grid: 'rgba(40,30,10,0.10)',    text: '#6d6150', up: '#127a3a', down: '#c0262d', avg: '#b07a00', liq: '#c0262d', cross: '#222222' },
  bloodmoon: { name: 'Blood Moon', bg: '#140405', grid: 'rgba(255,90,60,0.10)',   text: '#b0645a', up: '#ffb347', down: '#ff2020', avg: '#ffe7a3', liq: '#ff2020', cross: '#ffd0c0' },
  gold:      { name: 'Gold Rush',  bg: '#0d0b05', grid: 'rgba(255,215,90,0.10)',  text: '#a8904e', up: '#ffd75a', down: '#d0573a', avg: '#ffffff', liq: '#d0573a', cross: '#fff3c4' },
  matrix:    { name: 'Mainframe',  bg: '#000000', grid: 'rgba(0,255,70,0.12)',    text: '#00b33c', up: '#00ff46', down: '#9dff00', avg: '#e6ffe6', liq: '#ff3030', cross: '#ccffcc' },
};

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);

export class Chart {
  constructor(canvas, { onHover } = {}) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.theme = CHART_THEMES.terminal;
    this.data = null;
    this.prevRange = null;
    this.anim = { start: 0, from: null };
    this.hoverX = null;
    this.reducedMotion = false;
    this.onHover = onHover;
    const move = e => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      this.hoverX = p.clientX - r.left;
      this.dirty = true;
    };
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('touchmove', move, { passive: true });
    canvas.addEventListener('touchstart', move, { passive: true });
    const leave = () => { this.hoverX = null; this.dirty = true; };
    canvas.addEventListener('mouseleave', leave);
    canvas.addEventListener('touchend', leave);
    if (globalThis.ResizeObserver) new ResizeObserver(() => { this.dirty = true; }).observe(canvas);
    this.lastDraw = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  setTheme(id) { this.theme = CHART_THEMES[id] || CHART_THEMES.terminal; this.dirty = true; }

  // data: { points, step, tick, avg, liq, markers: [{tick, side}], key }
  // A new key (different asset or range) redraws instantly instead of animating.
  setData(data) {
    const prev = this.data;
    const same = prev && prev.key === data.key && !this.reducedMotion;
    this.anim.from = same ? { last: prev.points[prev.points.length - 1], range: this.range } : null;
    this.anim.start = performance.now();
    this.data = data;
    this.dirty = true;
  }

  // One animation loop: eases each new price in, keeps the live dot pulsing (~16 fps when idle).
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    if (!this.data) return;
    const t = this.anim.from ? Math.min(1, (now - this.anim.start) / 320) : 1;
    if (t < 1 || this.dirty || (!this.reducedMotion && now - this.lastDraw > 60)) {
      this.draw(ease(t));
      this.lastDraw = now;
      this.dirty = false;
    }
  }

  draw(progress = 1) {
    const d = this.data, c = this.c, g = this.g, T = this.theme;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = T.bg;
    g.fillRect(0, 0, W, H);
    if (!d || d.points.length < 2) return;

    const pts = d.points.slice();
    const from = this.anim.from;
    if (from && progress < 1) pts[pts.length - 1] = lerp(from.last, pts[pts.length - 1], progress);

    const padL = 8, padR = 70, padT = 14, padB = 22;
    const pw = W - padL - padR, ph = H - padT - padB;

    let lo = Infinity, hi = -Infinity;
    for (const v of pts) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const extra = [d.avg, d.liq].filter(v => v > 0);
    for (const v of extra) { if (v < hi * 3 && v > lo / 3) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    const log = lo > 0 && hi / lo > 6;
    const f = log ? Math.log : (v => v);
    let a = f(lo), b = f(hi);
    if (b - a < 1e-12) { const m = Math.abs(a) * 0.01 || 1e-9; a -= m; b += m; }
    const pad = (b - a) * 0.1; a -= pad; b += pad;
    if (from && progress < 1 && from.range && from.range.log === log) { a = lerp(from.range.a, a, progress); b = lerp(from.range.b, b, progress); }
    this.range = { a, b, log };
    const y = v => padT + ph * (1 - (f(Math.max(v, 1e-300)) - a) / (b - a));
    const x = i => padL + (pw * i) / (pts.length - 1);
    const inv = py => { const k = a + (1 - (py - padT) / ph) * (b - a); return log ? Math.exp(k) : k; };

    // grid + price labels
    g.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    g.textBaseline = 'middle';
    g.strokeStyle = T.grid; g.lineWidth = 1; g.fillStyle = T.text;
    for (let i = 0; i <= 4; i++) {
      const py = padT + (ph * i) / 4;
      g.beginPath(); g.moveTo(padL, py); g.lineTo(padL + pw, py); g.stroke();
      g.fillText(F.price(inv(py)), padL + pw + 6, py);
    }
    // time labels
    g.textBaseline = 'alphabetic';
    const span = (pts.length - 1) * d.step;
    for (let i = 0; i <= 3; i++) {
      const ago = Math.round(span * (1 - i / 3));
      const px = padL + (pw * i) / 3;
      g.textAlign = i === 0 ? 'left' : i === 3 ? 'right' : 'center';
      g.fillText(ago === 0 ? 'now' : '-' + F.clock(ago), px, H - 6);
    }
    g.textAlign = 'left';

    const up = pts[pts.length - 1] >= pts[0];
    const col = up ? T.up : T.down;

    // area
    const grad = g.createLinearGradient(0, padT, 0, padT + ph);
    grad.addColorStop(0, hexA(col, 0.28)); grad.addColorStop(1, hexA(col, 0));
    g.beginPath(); g.moveTo(x(0), y(pts[0]));
    for (let i = 1; i < pts.length; i++) g.lineTo(x(i), y(pts[i]));
    g.lineTo(x(pts.length - 1), padT + ph); g.lineTo(x(0), padT + ph); g.closePath();
    g.fillStyle = grad; g.fill();
    // line
    g.beginPath(); g.moveTo(x(0), y(pts[0]));
    for (let i = 1; i < pts.length; i++) g.lineTo(x(i), y(pts[i]));
    g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();

    // reference lines
    const hline = (v, color, label) => {
      const py = y(v);
      if (py < padT - 2 || py > padT + ph + 2) return;
      g.setLineDash([5, 4]); g.strokeStyle = color; g.lineWidth = 1;
      g.beginPath(); g.moveTo(padL, py); g.lineTo(padL + pw, py); g.stroke(); g.setLineDash([]);
      g.fillStyle = color; g.font = 'bold 10px "IBM Plex Mono", ui-monospace, monospace';
      g.fillText(label, padL + 4, py - 4);
    };
    if (d.avg > 0) hline(d.avg, T.avg, 'AVG ' + F.price(d.avg));
    if (d.liq > 0) hline(d.liq, T.liq, 'LIQ ' + F.price(d.liq));

    // trade markers
    const first = d.tick - (pts.length - 1) * d.step;
    for (const mk of d.markers || []) {
      if (mk.tick < first) continue;
      const i = (mk.tick - first) / d.step;
      const px = x(i), py = y(pts[Math.min(pts.length - 1, Math.round(i))]);
      const buy = mk.side === 'buy';
      g.fillStyle = buy ? T.up : T.down; g.strokeStyle = T.bg; g.lineWidth = 1.5;
      g.beginPath();
      if (buy) { g.moveTo(px, py + 6); g.lineTo(px - 6, py + 16); g.lineTo(px + 6, py + 16); }
      else { g.moveTo(px, py - 6); g.lineTo(px - 6, py - 16); g.lineTo(px + 6, py - 16); }
      g.closePath(); g.fill(); g.stroke();
    }

    // last price tag + dot
    const lx = x(pts.length - 1), ly = y(pts[pts.length - 1]);
    g.fillStyle = col;
    g.beginPath(); g.arc(lx, ly, 3.5, 0, Math.PI * 2); g.fill();
    if (!this.reducedMotion) {
      const pulse = (performance.now() % 1200) / 1200;
      g.strokeStyle = hexA(col, 1 - pulse); g.lineWidth = 1.5;
      g.beginPath(); g.arc(lx, ly, 3.5 + pulse * 9, 0, Math.PI * 2); g.stroke();
    }
    g.fillRect(padL + pw + 2, ly - 9, padR - 4, 18);
    g.fillStyle = T.bg; g.font = 'bold 11px "IBM Plex Mono", ui-monospace, monospace'; g.textBaseline = 'middle';
    g.fillText(F.price(pts[pts.length - 1]), padL + pw + 6, ly);
    if (log) { g.fillStyle = T.text; g.font = '10px "IBM Plex Mono", ui-monospace, monospace'; g.fillText('LOG', padL + 4, padT + 6); }

    // crosshair
    if (this.hoverX != null && this.hoverX >= padL && this.hoverX <= padL + pw) {
      const i = Math.round(((this.hoverX - padL) / pw) * (pts.length - 1));
      const v = pts[i], px = x(i), py = y(v);
      g.strokeStyle = hexA(T.cross, 0.4); g.lineWidth = 1;
      g.beginPath(); g.moveTo(px, padT); g.lineTo(px, padT + ph); g.moveTo(padL, py); g.lineTo(padL + pw, py); g.stroke();
      g.fillStyle = T.cross; g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
      const ago = (pts.length - 1 - i) * d.step;
      const chg = (v / pts[pts.length - 1] - 1) * 100;
      const label = `${F.price(v)}  ${ago ? '-' + F.clock(ago) : 'now'}  (${ago ? F.pct(-chg) + ' since' : 'live'})`;
      g.font = '11px "IBM Plex Mono", ui-monospace, monospace';
      const tw = g.measureText(label).width + 12;
      const bx = Math.min(Math.max(padL, px - tw / 2), padL + pw - tw);
      g.fillStyle = hexA(T.bg, 0.92); g.fillRect(bx, padT, tw, 18);
      g.strokeStyle = hexA(T.cross, 0.5); g.strokeRect(bx + 0.5, padT + 0.5, tw - 1, 17);
      g.fillStyle = T.cross; g.textBaseline = 'middle'; g.fillText(label, bx + 6, padT + 9);
    }
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

// Tiny sparkline for the asset list.
export function sparkPath(points, w, h) {
  if (!points || points.length < 2) return '';
  let lo = Infinity, hi = -Infinity;
  for (const v of points) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const r = hi - lo || hi * 0.01 || 1;
  return points.map((v, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 1 - ((v - lo) / r) * (h - 2)).toFixed(1)}`).join('');
}
