import { Game, dirOf, clamp, roundRect, text } from '../assets/gamekit.js';
import { LEVELS } from './levels.js';
import { parseLevel, cellsOf, step, solve } from './solver.js';

const W = 560, H = 440, HEAD = 46;
const KEYDIR = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' };
const ARROW = { L: '←', R: '→', U: '↑', D: '↓' };

class BlockRoll extends Game {
  constructor() {
    super({
      slug: 'blockroll', title: 'Block Roll', width: W, height: H, bg: '#101826', scoreLabel: 'Score',
      help: 'Roll the block across the floor and drop it, standing upright, into the square hole. Arrow keys (or WASD, or swipe) roll it. If any part hangs off the edge you fall and restart the level. Orange tiles break if you stand on them; the round switch makes bridges appear and disappear. R restarts, H shows a hint.',
      controls: { swipe: true, dpad: true, buttons: [{ code: 'KeyR', label: '↺', aria: 'Restart level' }, { code: 'KeyH', label: '💡', aria: 'Show a hint' }] },
    });
  }

  reset() { this.level = 0; this.loadLevel(); this.setScore(0); }

  loadLevel() {
    this.lvl = parseLevel(LEVELS[this.level]);
    this.par = solve(this.lvl).length;
    this.tile = Math.min(52, Math.floor((W - 40) / this.lvl.w), Math.floor((H - HEAD - 30) / this.lvl.h));
    this.ox = Math.round((W - this.tile * this.lvl.w) / 2); this.oy = HEAD + Math.round((H - HEAD - this.tile * this.lvl.h) / 2);
    this.restartLevel(false);
  }

  restartLevel(count = true) {
    if (count) this.falls = (this.falls || 0);
    this.st = { x: this.lvl.start[0], y: this.lvl.start[1], o: 'U', bridge: false };
    this.moves = 0; this.anim = null; this.fall = null; this.win = null; this.hint = null; this.bridgeAnim = 0; this.intro = 0.5;
  }

  press(code) {
    if (this.anim || this.fall || this.win) return;
    if (code === 'KeyR') { this.restartLevel(); return; }
    if (code === 'KeyH') { this.hint = solve(this.lvl, this.st); this.hintT = 2.5; return; }
    const dir = KEYDIR[code];
    if (!dir) return;
    const from = { ...this.st };
    const r = step(this.lvl, this.st, dir);
    this.hint = null;
    if (r.ok) {
      this.moves++;
      this.anim = { from, to: r, t: 0 };
      this.sfx(220, 0.05, 'triangle', 0.04, 80);
    } else {
      this.fall = { from, to: r, t: 0 };
      this.sfx(120, 0.4, 'sawtooth', 0.05, -80);
    }
  }

  rect(o) { const [x, y, ox] = [o.x, o.y, o.o]; return { x, y, w: ox === 'H' ? 2 : 1, h: ox === 'V' ? 2 : 1 }; }

  update(dt) {
    this.intro = Math.max(0, this.intro - dt);
    this.hintT = Math.max(0, (this.hintT || 0) - dt); if (!this.hintT) this.hint = null;
    if (this.anim) {
      this.anim.t += dt / 0.13;
      if (this.anim.t >= 1) {
        const r = this.anim.to; const toggled = r.bridge !== this.st.bridge;
        this.st = { x: r.x, y: r.y, o: r.o, bridge: r.bridge }; this.anim = null;
        if (toggled) { this.bridgeAnim = 1; this.sfx(520, 0.12, 'square', 0.04); }
        if (r.won) { this.win = { t: 0 }; this.sfx(780, 0.3, 'triangle', 0.06, 300); }
      }
    }
    if (this.bridgeAnim > 0) this.bridgeAnim = Math.max(0, this.bridgeAnim - dt * 3);
    if (this.fall) { this.fall.t += dt; if (this.fall.t > 0.7) this.restartLevel(); }
    if (this.win) {
      this.win.t += dt;
      if (this.win.t > 0.8) {
        const bonus = this.moves <= this.par + 2 ? 50 : 0;
        this.addScore(100 + bonus);
        this.level++;
        if (this.level >= LEVELS.length) { this.gameOver('All levels clear!'); return; }
        this.loadLevel();
      }
    }
  }

  draw(ctx) {
    const { tile: T, lvl } = this;
    text(ctx, `Level ${this.level + 1} / ${LEVELS.length}`, 16, 24, { size: 15, align: 'left', color: '#9fb4d6' });
    text(ctx, `Moves ${this.moves}   (par ${this.par})`, W - 16, 24, { size: 14, align: 'right', color: '#9fb4d6' });
    const bridgeOn = this.st.bridge;
    for (const [k, ch] of lvl.tiles) {
      const [tx, ty] = k.split(',').map(Number);
      let x = this.ox + tx * T, y = this.oy + ty * T;
      if (ch === 'b') {
        const a = bridgeOn ? 1 - this.bridgeAnim : this.bridgeAnim; if (a <= 0.02) continue;
        ctx.globalAlpha = a; y += (1 - a) * 8;
      }
      const base = ch === 'f' ? '#e8923a' : ch === 'b' ? '#6fb0ff' : '#c7d3e6';
      ctx.fillStyle = (tx + ty) % 2 ? base : shade(base, -8);
      roundRect(ctx, x + 1, y + 1, T - 2, T - 2, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 1, y + T - 5, T - 2, 4);
      if (ch === 'x') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, T * 0.26, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a4300'; ctx.stroke(); }
      if (ch === 'G') { ctx.fillStyle = '#0a0f18'; roundRect(ctx, x + 5, y + 5, T - 10, T - 10, 4); ctx.fill(); ctx.strokeStyle = '#7dff3a'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
      if (ch === 'S') { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + T * 0.3, y + T * 0.3, T * 0.4, T * 0.4); }
      ctx.globalAlpha = 1;
    }
    // hint arrow
    if (this.hint && this.hint.length && !this.anim) {
      const r = cellsOf(this.st.x, this.st.y, this.st.o)[0];
      text(ctx, `Hint: ${[...this.hint.slice(0, 4)].map((d) => ARROW[d]).join(' ')}`, W / 2, H - 14, { size: 16, color: '#ffd23f' });
    }
    this.drawBlock(ctx);
  }

  drawBlock(ctx) {
    const T = this.tile;
    let r = this.rect(this.st), lift = 0, alpha = 1, scale = 1;
    if (this.anim) {
      const a = this.rect(this.anim.from), b = this.rect(this.anim.to), t = this.anim.t;
      r = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
      lift = Math.sin(Math.PI * t) * 7;
    } else if (this.fall) {
      const b = this.rect(this.fall.to), t = Math.min(1, this.fall.t / 0.7);
      r = b; lift = -t * 90; alpha = 1 - t; scale = 1 - t * 0.35;
    } else if (this.win) { lift = -this.win.t * 60; alpha = 1 - this.win.t / 0.8; scale = 1 - this.win.t * 0.3; }
    const up = (this.st.o === 'U' && !this.anim) || (this.anim && this.anim.to.o === 'U' && this.anim.t > 0.5) ? 1 : 0;
    const x = this.ox + r.x * T, y = this.oy + r.y * T - lift;
    ctx.globalAlpha = Math.max(0, alpha) * (this.intro > 0 ? 1 - this.intro : 1);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(ctx, x + 5, y + 8 + lift, r.w * T - 6, r.h * T - 6, 6); ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + r.w * T, y + r.h * T); grad.addColorStop(0, '#ffb36b'); grad.addColorStop(1, '#e0702a');
    ctx.fillStyle = grad; roundRect(ctx, x + 2 + (1 - scale) * 12, y - up * 6 + 2, r.w * T - 4 - (1 - scale) * 24, r.h * T - 4, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 7, y - up * 6 + 5, r.w * T - 14, 5);
    ctx.globalAlpha = 1;
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => clamp(v + amt, 0, 255);
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

new BlockRoll().mount();
