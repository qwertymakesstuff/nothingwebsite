import { Game, dirOf, clamp, roundRect, text } from '../assets/gamekit.js';
import { PUZZLES } from './puzzles.js';

const N = 6, CELL = 72, PAD = 22, W = N * CELL + PAD * 2, H = N * CELL + PAD * 2 + 44;
const COLORS = ['#e8453c', '#4a90e2', '#59c24a', '#f5b942', '#9b59b6', '#16a5a5', '#e67e22', '#ec6fa6', '#8d6e63', '#7f8c8d', '#2ecc71', '#34495e'];

class SlideOut extends Game {
  constructor() {
    super({
      slug: 'slideout', title: 'Slide Out', width: W, height: H, bg: '#2b2118', scoreLabel: 'Score',
      help: 'Free the red car! Drag the cars along their lanes (or tap one, then use the arrow keys) until the red car can slide out of the right-hand edge. Fewer moves earn a bonus. Z undoes a move and R restarts the puzzle.',
      controls: { pointer: true, buttons: [{ code: 'KeyZ', label: '↶ Undo' }, { code: 'KeyR', label: '↺ Restart' }] },
    });
  }

  reset() { this.level = 0; this.load(); this.setScore(0); }

  load() {
    const p = PUZZLES[this.level];
    this.cars = p.cars.map(([x, y, l, o], i) => ({ x, y, l, o, c: i === 0 ? COLORS[0] : COLORS[1 + ((i - 1) % (COLORS.length - 1))], fx: x, fy: y }));
    this.par = p.min; this.moves = 0; this.history = []; this.drag = null; this.sel = 0; this.exit = null; this.banner = 0;
  }

  snapshot() { return this.cars.map((c) => [c.x, c.y]); }
  restore(s) { this.cars.forEach((c, i) => { [c.x, c.y] = s[i]; c.fx = c.x; c.fy = c.y; }); }

  occupied(skip) {
    const g = new Set();
    this.cars.forEach((c, i) => { if (i === skip) return; for (let k = 0; k < c.l; k++) g.add(c.o === 'h' ? `${c.x + k},${c.y}` : `${c.x},${c.y + k}`); });
    return g;
  }

  range(i) {
    const c = this.cars[i], occ = this.occupied(i);
    const axisPos = c.o === 'h' ? c.x : c.y; let lo = axisPos, hi = axisPos;
    const free = (p) => { for (let k = 0; k < c.l; k++) if (occ.has(c.o === 'h' ? `${p + k},${c.y}` : `${c.x},${p + k}`)) return false; return true; };
    while (lo > 0 && free(lo - 1)) lo--;
    while (hi + c.l < N && free(hi + 1)) hi++;
    return [lo, hi];
  }

  carAt(px, py) {
    const cx = (px - PAD) / CELL, cy = (py - PAD) / CELL;
    return this.cars.findIndex((c) => cx >= c.x && cx < c.x + (c.o === 'h' ? c.l : 1) && cy >= c.y && cy < c.y + (c.o === 'v' ? c.l : 1));
  }

  pointer(type, x, y) {
    if (this.exit || this.banner > 0) return;
    if (type === 'down') {
      const i = this.carAt(x, y);
      if (i < 0) return;
      this.sel = i;
      const c = this.cars[i], [lo, hi] = this.range(i);
      this.drag = { i, lo, hi, grab: c.o === 'h' ? x / CELL - c.fx : y / CELL - c.fy, before: this.snapshot(), startPos: c.o === 'h' ? c.x : c.y };
    } else if (type === 'move' && this.drag) {
      const d = this.drag, c = this.cars[d.i];
      const pos = clamp((c.o === 'h' ? x : y) / CELL - d.grab, d.lo, d.hi);
      if (c.o === 'h') c.fx = pos; else c.fy = pos;
    } else if (type === 'up' && this.drag) {
      const d = this.drag, c = this.cars[d.i];
      const pos = Math.round(c.o === 'h' ? c.fx : c.fy);
      if (c.o === 'h') { c.x = pos; c.fx = pos; } else { c.y = pos; c.fy = pos; }
      this.drag = null;
      if (pos !== d.startPos) { this.history.push(d.before); this.moves++; this.sfx(260, 0.05, 'triangle', 0.04); this.checkWin(); }
    }
  }

  press(code) {
    if (this.exit || this.drag) return;
    if (code === 'KeyZ') { const s = this.history.pop(); if (s) { this.restore(s); this.moves = Math.max(0, this.moves - 1); } return; }
    if (code === 'KeyR') { this.load(); return; }
    const d = dirOf(code);
    if (!d) return;
    const c = this.cars[this.sel], [lo, hi] = this.range(this.sel);
    const pos = (c.o === 'h' ? c.x : c.y) + (c.o === 'h' ? d[0] : d[1]);
    if ((c.o === 'h' ? d[1] : d[0]) !== 0 || pos < lo || pos > hi) return;
    this.history.push(this.snapshot());
    if (c.o === 'h') c.x = pos; else c.y = pos;
    this.moves++; this.sfx(260, 0.05, 'triangle', 0.04);
    this.checkWin();
  }

  checkWin() {
    const r = this.cars[0];
    if (r.x === N - r.l) { this.exit = { t: 0 }; this.sfx(780, 0.3, 'triangle', 0.06, 300); }
  }

  update(dt) {
    for (const c of this.cars) { if (!this.drag || this.cars[this.drag.i] !== c) { c.fx += (c.x - c.fx) * Math.min(1, dt * 18); c.fy += (c.y - c.fy) * Math.min(1, dt * 18); } }
    if (this.exit) {
      this.exit.t += dt; this.cars[0].fx = this.cars[0].x + this.exit.t * 5;
      if (this.exit.t > 0.7) {
        this.addScore(100 + (this.moves <= this.par + 2 ? 50 : 0));
        this.level++;
        if (this.level >= PUZZLES.length) { this.gameOver('All puzzles solved!'); return; }
        this.load();
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#4a3828'; roundRect(ctx, PAD - 10, PAD - 10, N * CELL + 20, N * CELL + 20, 16); ctx.fill();
    ctx.fillStyle = '#3a2b1e'; roundRect(ctx, PAD, PAD, N * CELL, N * CELL, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(PAD + i * CELL, PAD); ctx.lineTo(PAD + i * CELL, PAD + N * CELL); ctx.moveTo(PAD, PAD + i * CELL); ctx.lineTo(PAD + N * CELL, PAD + i * CELL); ctx.stroke(); }
    // exit gap
    ctx.fillStyle = '#2b2118'; ctx.fillRect(PAD + N * CELL - 2, PAD + 2 * CELL + 6, 14, CELL - 12);
    text(ctx, 'EXIT ▶', PAD + N * CELL + 2, PAD + 2 * CELL + CELL / 2 + 1, { size: 9, color: '#e8453c', align: 'left' });
    this.cars.forEach((c, i) => {
      const x = PAD + c.fx * CELL + 4, y = PAD + c.fy * CELL + 4, w = (c.o === 'h' ? c.l : 1) * CELL - 8, h = (c.o === 'v' ? c.l : 1) * CELL - 8;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(ctx, x + 2, y + 4, w, h, 10); ctx.fill();
      ctx.fillStyle = c.c; roundRect(ctx, x, y, w, h, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; roundRect(ctx, x + 6, y + 5, w - 12, 8, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      if (c.o === 'h') { ctx.fillRect(x + w * 0.22, y + h * 0.22, w * 0.18, h * 0.56); ctx.fillRect(x + w * 0.6, y + h * 0.22, w * 0.18, h * 0.56); }
      else { ctx.fillRect(x + w * 0.22, y + h * 0.22, w * 0.56, h * 0.16); ctx.fillRect(x + w * 0.22, y + h * 0.62, w * 0.56, h * 0.16); }
      if (i === this.sel && !this.exit) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 8); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; }
    });
    text(ctx, `Puzzle ${this.level + 1} / ${PUZZLES.length}`, PAD, H - 22, { size: 14, align: 'left', color: '#d9c7ae' });
    text(ctx, `Moves ${this.moves}   (best ${this.par})`, W - PAD, H - 22, { size: 14, align: 'right', color: '#d9c7ae' });
  }
}

new SlideOut().mount();
