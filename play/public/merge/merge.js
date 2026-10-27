import { Game, randInt, roundRect, text, dirOf } from '../assets/gamekit.js';

const N = 4, TILE = 92, GAP = 12, PAD = 14;
const SIZE = PAD * 2 + N * TILE + (N - 1) * GAP;
const COLORS = {
  2: ['#3a3a4a', '#e8e8f2'], 4: ['#4a4560', '#f0ecff'], 8: ['#e8803a', '#fff'], 16: ['#ee6a3a', '#fff'], 32: ['#ef5440', '#fff'], 64: ['#ee3b3b', '#fff'],
  128: ['#e8c34a', '#1c1708'], 256: ['#e6c03a', '#1c1708'], 512: ['#e3bc2a', '#1c1708'], 1024: ['#e0b81a', '#1c1708'], 2048: ['#7dff3a', '#0a1a04'],
};
const pos = (i) => PAD + i * (TILE + GAP);

class Merge extends Game {
  constructor() {
    super({
      slug: 'merge', title: 'Merge Tiles', width: SIZE, height: SIZE, bg: '#15151f',
      help: 'Slide the tiles with the arrow keys (or WASD, or swipe). Two tiles with the same number merge into one. Reach 2048, then keep going for a higher score. No moves left ends the game.',
      controls: { swipe: true, dpad: true },
    });
  }

  reset() {
    this.cells = Array.from({ length: N }, () => Array(N).fill(0));
    this.anim = []; this.animT = 1; this.pop = []; this.won = false; this.toast = 0;
    this.spawn(); this.spawn();
    this.anim = [];
  }

  spawn() {
    const free = [];
    this.cells.forEach((row, y) => row.forEach((v, x) => { if (!v) free.push([x, y]); }));
    if (!free.length) return;
    const [x, y] = free[randInt(0, free.length - 1)];
    this.cells[y][x] = Math.random() < 0.9 ? 2 : 4;
    this.pop.push({ x, y, t: 0 });
  }

  /** Slide everything in direction (dx, dy). Returns false if nothing moved. */
  slide(dx, dy) {
    const before = this.cells.map((r) => [...r]);
    const moves = []; let gained = 0;
    const xs = [...Array(N).keys()]; const ys = [...Array(N).keys()];
    if (dx > 0) xs.reverse(); if (dy > 0) ys.reverse();
    const merged = Array.from({ length: N }, () => Array(N).fill(false));
    const cells = before.map((r) => [...r]);
    for (const y of ys) for (const x of xs) {
      const v = cells[y][x];
      if (!v) continue;
      let nx = x, ny = y;
      while (true) {
        const tx = nx + dx, ty = ny + dy;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) break;
        if (cells[ty][tx] === 0) { nx = tx; ny = ty; continue; }
        if (cells[ty][tx] === v && !merged[ty][tx]) { nx = tx; ny = ty; merged[ty][tx] = true; }
        break;
      }
      if (nx === x && ny === y) { moves.push({ fx: x, fy: y, tx: x, ty: y, v }); continue; }
      cells[y][x] = 0;
      if (merged[ny][nx] && cells[ny][nx] === v) { cells[ny][nx] = v * 2; gained += v * 2; moves.push({ fx: x, fy: y, tx: nx, ty: ny, v, merge: true }); }
      else { cells[ny][nx] = v; moves.push({ fx: x, fy: y, tx: nx, ty: ny, v }); }
    }
    const changed = cells.some((r, y) => r.some((v, x) => v !== before[y][x]));
    if (!changed) return false;
    this.cells = cells; this.anim = moves; this.animT = 0;
    this.addScore(gained);
    this.sfx(gained ? 520 : 330, 0.05, 'triangle', 0.04);
    this.spawn();
    if (!this.won && cells.some((r) => r.includes(2048))) { this.won = true; this.toast = 2.5; this.sfx(880, 0.3, 'square', 0.05); }
    if (!this.canMove()) { this.sfx(140, 0.35, 'sawtooth', 0.05, -80); this.gameOver('No moves left'); }
    return true;
  }

  canMove() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = this.cells[y][x];
      if (!v) return true;
      if (x + 1 < N && this.cells[y][x + 1] === v) return true;
      if (y + 1 < N && this.cells[y + 1][x] === v) return true;
    }
    return false;
  }

  press(code) {
    const d = dirOf(code);
    if (d) this.slide(d[0], d[1]);
  }

  update(dt) {
    this.animT = Math.min(1, this.animT + dt / 0.1);
    this.pop.forEach((p) => { p.t += dt / 0.18; });
    this.pop = this.pop.filter((p) => p.t < 1);
    this.toast = Math.max(0, this.toast - dt);
  }

  tile(ctx, x, y, v, scale = 1) {
    const [bg, fg] = COLORS[v] || ['#7dff3a', '#0a1a04'];
    const s = TILE * scale, o = (TILE - s) / 2;
    ctx.fillStyle = bg; roundRect(ctx, x + o, y + o, s, s, 12); ctx.fill();
    text(ctx, String(v), x + TILE / 2, y + TILE / 2 + 2, { size: (v < 100 ? 38 : v < 1000 ? 32 : 26) * scale, color: fg });
  }

  draw(ctx) {
    ctx.fillStyle = '#20202e'; roundRect(ctx, 0, 0, SIZE, SIZE, 14); ctx.fill();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = '#2b2b3c'; roundRect(ctx, pos(x), pos(y), TILE, TILE, 12); ctx.fill(); }
    if (this.animT < 1) {
      const t = 1 - Math.pow(1 - this.animT, 3);
      // moving tiles; merged ones show their old value sliding in
      for (const m of this.anim) this.tile(ctx, pos(m.fx + (m.tx - m.fx) * t), pos(m.fy + (m.ty - m.fy) * t), m.v);
    } else {
      this.cells.forEach((row, y) => row.forEach((v, x) => { if (v) this.tile(ctx, pos(x), pos(y), v); }));
    }
    for (const p of this.pop) if (this.cells[p.y][p.x]) { ctx.save(); ctx.globalAlpha = 0.9; this.tile(ctx, pos(p.x), pos(p.y), this.cells[p.y][p.x], Math.min(1, 0.4 + p.t)); ctx.restore(); }
    if (this.animT >= 1) { /* settled */ }
    if (this.toast > 0) { ctx.fillStyle = 'rgba(8,20,4,.85)'; roundRect(ctx, SIZE / 2 - 130, 12, 260, 40, 10); ctx.fill(); text(ctx, 'You made 2048! Keep going.', SIZE / 2, 33, { size: 15, color: '#caffa8' }); }
  }
}

new Merge().mount();
