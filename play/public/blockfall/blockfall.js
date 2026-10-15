import { Game, shuffle, roundRect, text } from '/assets/gamekit.js';

const COLS = 10, ROWS = 20, C = 28, SIDE = 130;
const W = COLS * C + SIDE, H = ROWS * C;
const SHAPES = {
  I: { c: '#4dd9f0', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { c: '#f5d54a', m: [[1, 1], [1, 1]] },
  T: { c: '#b36bff', m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { c: '#5be37d', m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { c: '#ff5d6c', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { c: '#5c7cff', m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { c: '#ff9a3c', m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const rotCW = (m) => m.map((_, i) => m.map((row) => row[i]).reverse());
const rotCCW = (m) => m[0].map((_, i) => m.map((row) => row[row.length - 1 - i]));
const POINTS = [0, 100, 300, 500, 800];

class Blockfall extends Game {
  constructor() {
    super({
      slug: 'blockfall', title: 'Blockfall', width: W, height: H, bg: '#0a0a12', scoreLabel: 'Score',
      help: 'Fit the falling blocks together and clear full rows. Left / right to move, up or X to rotate (Z the other way), down to drop faster, space to drop instantly. P pauses.',
      controls: { buttons: [{ code: 'ArrowLeft', label: '◀', hold: true }, { code: 'ArrowRight', label: '▶', hold: true }, { code: 'ArrowDown', label: '▼', hold: true }, { code: 'ArrowUp', label: '⟳' }, { code: 'Space', label: 'Drop' }] },
    });
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.lines = 0;
    this.level = 1;
    this.next = this.draw7();
    this.hdir = 0; this.das = 0;
    this.fall = 0; this.lock = 0;
    this.flash = [];
    this.spawn();
  }

  draw7() {
    if (!this.bag.length) this.bag = shuffle(Object.keys(SHAPES));
    return this.bag.pop();
  }

  spawn() {
    this.type = this.next;
    this.next = this.draw7();
    this.m = SHAPES[this.type].m.map((r) => [...r]);
    this.x = Math.floor((COLS - this.m[0].length) / 2);
    this.y = this.type === 'I' ? -1 : 0;
    this.fall = 0; this.lock = 0;
    if (this.collides(this.m, this.x, this.y)) this.gameOver('Stacked out');
  }

  collides(m, px, py) {
    for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const gx = px + x, gy = py + y;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && this.grid[gy][gx]) return true;
    }
    return false;
  }

  shift(d) {
    if (!this.collides(this.m, this.x + d, this.y)) { this.x += d; this.lock = 0; return true; }
    return false;
  }

  rotate(cw) {
    if (this.type === 'O') return;
    const m = cw ? rotCW(this.m) : rotCCW(this.m);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!this.collides(m, this.x + kick, this.y)) { this.m = m; this.x += kick; this.lock = 0; this.sfx(520, 0.04, 'triangle'); return; }
    }
  }

  press(code) {
    if (code === 'ArrowLeft') { this.hdir = -1; this.das = 0.17; this.shift(-1); }
    else if (code === 'ArrowRight') { this.hdir = 1; this.das = 0.17; this.shift(1); }
    else if (code === 'ArrowUp' || code === 'KeyX') this.rotate(true);
    else if (code === 'KeyZ') this.rotate(false);
    else if (code === 'Space') this.hardDrop();
  }

  hardDrop() {
    let n = 0;
    while (!this.collides(this.m, this.x, this.y + 1)) { this.y++; n++; }
    this.addScore(n * 2);
    this.sfx(180, 0.07, 'square');
    this.lockPiece();
  }

  lockPiece() {
    this.m.forEach((row, y) => row.forEach((v, x) => {
      if (!v) return;
      const gy = this.y + y;
      if (gy < 0) return;
      this.grid[gy][this.x + x] = SHAPES[this.type].c;
    }));
    const full = [];
    for (let y = 0; y < ROWS; y++) if (this.grid[y].every(Boolean)) full.push(y);
    if (full.length) {
      this.grid = this.grid.filter((_, y) => !full.includes(y));
      while (this.grid.length < ROWS) this.grid.unshift(Array(COLS).fill(null));
      this.lines += full.length;
      this.addScore(POINTS[full.length] * this.level);
      this.level = 1 + Math.floor(this.lines / 10);
      this.sfx(full.length === 4 ? 880 : 660, 0.16, 'square', 0.05);
      this.flash = full.map((y) => ({ y, t: 0.25 }));
    }
    this.spawn();
  }

  update(dt) {
    // sideways auto-repeat while a direction is held
    const left = this.held('ArrowLeft'), right = this.held('ArrowRight');
    if (this.hdir === -1 && !left) this.hdir = right ? 1 : 0;
    if (this.hdir === 1 && !right) this.hdir = left ? -1 : 0;
    if (this.hdir) {
      this.das -= dt;
      while (this.das <= 0) { this.shift(this.hdir); this.das += 0.05; }
    }
    const soft = this.held('ArrowDown');
    const interval = soft ? 0.04 : Math.max(0.06, 0.8 * Math.pow(0.84, this.level - 1));
    this.fall += dt;
    while (this.fall >= interval) {
      this.fall -= interval;
      if (!this.collides(this.m, this.x, this.y + 1)) { this.y++; if (soft) this.addScore(1); }
      else break;
    }
    if (this.collides(this.m, this.x, this.y + 1)) {
      this.lock += dt;
      if (this.lock >= 0.45 || (soft && this.lock >= 0.12)) { this.lockPiece(); }
    } else this.lock = 0;
    this.flash = this.flash.map((f) => ({ ...f, t: f.t - dt })).filter((f) => f.t > 0);
  }

  cell(ctx, x, y, color, size = C, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x + 4, y + 3, size - 10, 3);
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    ctx.fillStyle = '#0d0d18'; ctx.fillRect(0, 0, COLS * C, ROWS * C);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, ROWS * C); ctx.stroke(); }
    for (let i = 1; i < ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(COLS * C, i * C); ctx.stroke(); }
    this.grid.forEach((row, y) => row.forEach((c, x) => { if (c) this.cell(ctx, x * C, y * C, c); }));
    if (this.state !== 'over' && this.m) {
      let gy = this.y;
      while (!this.collides(this.m, this.x, gy + 1)) gy++;
      this.m.forEach((row, y) => row.forEach((v, x) => { if (v && gy + y >= 0) this.cell(ctx, (this.x + x) * C, (gy + y) * C, SHAPES[this.type].c, C, 0.22); }));
      this.m.forEach((row, y) => row.forEach((v, x) => { if (v && this.y + y >= 0) this.cell(ctx, (this.x + x) * C, (this.y + y) * C, SHAPES[this.type].c); }));
    }
    for (const f of this.flash) { ctx.fillStyle = `rgba(255,255,255,${f.t * 3})`; ctx.fillRect(0, f.y * C, COLS * C, C); }
    // side panel
    const px = COLS * C;
    ctx.fillStyle = '#11111c'; ctx.fillRect(px, 0, SIDE, H);
    ctx.strokeStyle = '#2a2a3a'; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    text(ctx, 'NEXT', px + SIDE / 2, 26, { size: 13, color: '#8e8585' });
    const nm = SHAPES[this.next].m, s = 22;
    const ox = px + (SIDE - nm[0].length * s) / 2, oy = 48;
    nm.forEach((row, y) => row.forEach((v, x) => { if (v) this.cell(ctx, ox + x * s, oy + y * s, SHAPES[this.next].c, s); }));
    text(ctx, 'LEVEL', px + SIDE / 2, 190, { size: 13, color: '#8e8585' });
    text(ctx, String(this.level), px + SIDE / 2, 214, { size: 26 });
    text(ctx, 'LINES', px + SIDE / 2, 264, { size: 13, color: '#8e8585' });
    text(ctx, String(this.lines), px + SIDE / 2, 288, { size: 26 });
  }
}

new Blockfall().mount();
