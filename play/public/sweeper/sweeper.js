import { Game, shuffle, roundRect, text } from '/assets/gamekit.js';

const LEVELS = { easy: { n: 9, mines: 10 }, medium: { n: 13, mines: 28 }, hard: { n: 16, mines: 46 } };
const W = 480, HEAD = 44, H = W + HEAD;
const NUM_COLORS = ['', '#5c9dff', '#5be37d', '#ff6a6a', '#b07cff', '#ff9a3c', '#4dd9f0', '#e8e8f2', '#9a9aaa'];
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

class Sweeper extends Game {
  constructor() {
    super({
      slug: 'sweeper', title: 'Sweeper', width: W, height: H, bg: '#101018', scoreLabel: 'Time', lowerIsBetter: true, format: mmss,
      choices: [{ id: 'easy', label: 'Easy 9×9' }, { id: 'medium', label: 'Medium 13×13' }, { id: 'hard', label: 'Hard 16×16' }], choiceLabel: 'Difficulty',
      help: 'Clear every safe square without touching a mine. Click (or tap) to dig, right-click or long-press to flag a mine. The number shows how many mines touch that square. Tap a number whose mines are all flagged to clear around it. Your first dig is always safe.',
      controls: { pointer: true, buttons: [{ code: 'KeyF', label: '⚑ Flag mode', wide: true }] },
    });
  }

  reset() {
    const { n, mines } = LEVELS[this.choice];
    this.n = n; this.mines = mines; this.cs = W / n;
    this.grid = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ mine: false, open: false, flag: false, count: 0 })));
    this.placed = false; this.flagMode = false; this.elapsed = 0; this.press_ = null; this.lost = null;
    this.setScore(0);
  }

  press(code) { if (code === 'KeyF') this.flagMode = !this.flagMode; }

  cellAt(x, y) {
    const cx = Math.floor(x / this.cs), cy = Math.floor((y - HEAD) / this.cs);
    return cx >= 0 && cy >= 0 && cx < this.n && cy < this.n ? { cx, cy } : null;
  }

  pointer(type, x, y, e) {
    if (type === 'down') {
      const c = this.cellAt(x, y);
      if (!c) return;
      if (e.button === 2) { this.flag(c.cx, c.cy); this.press_ = null; return; }
      this.press_ = { ...c, long: false, timer: setTimeout(() => { if (this.press_) { this.press_.long = true; this.flag(c.cx, c.cy); this.sfx(300, 0.05, 'triangle'); } }, 420) };
    } else if (type === 'up') {
      const p = this.press_;
      this.press_ = null;
      if (!p) return;
      clearTimeout(p.timer);
      const c = this.cellAt(x, y);
      if (p.long || !c || c.cx !== p.cx || c.cy !== p.cy) return;
      if (this.flagMode) this.flag(c.cx, c.cy); else this.dig(c.cx, c.cy);
    } else if (type === 'move' && this.press_) {
      const c = this.cellAt(x, y);
      if (!c || c.cx !== this.press_.cx || c.cy !== this.press_.cy) { clearTimeout(this.press_.timer); this.press_ = null; }
    }
  }

  neighbors(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && x + dx >= 0 && y + dy >= 0 && x + dx < this.n && y + dy < this.n) out.push([x + dx, y + dy]);
    }
    return out;
  }

  place(sx, sy) {
    const safe = new Set([`${sx},${sy}`, ...this.neighbors(sx, sy).map(([x, y]) => `${x},${y}`)]);
    const spots = [];
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (!safe.has(`${x},${y}`)) spots.push([x, y]);
    for (const [x, y] of shuffle(spots).slice(0, this.mines)) this.grid[y][x].mine = true;
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) this.grid[y][x].count = this.neighbors(x, y).filter(([a, b]) => this.grid[b][a].mine).length;
    this.placed = true;
  }

  flag(x, y) {
    const c = this.grid[y][x];
    if (c.open) return;
    c.flag = !c.flag;
    this.sfx(c.flag ? 420 : 340, 0.04, 'triangle');
  }

  dig(x, y) {
    const c = this.grid[y][x];
    if (c.flag) return;
    if (c.open) { this.chord(x, y); return; }
    if (!this.placed) this.place(x, y);
    this.reveal(x, y);
    this.check();
  }

  chord(x, y) {
    const c = this.grid[y][x];
    const around = this.neighbors(x, y);
    if (!c.count || around.filter(([a, b]) => this.grid[b][a].flag).length !== c.count) return;
    around.forEach(([a, b]) => { if (!this.grid[b][a].flag) this.reveal(a, b); });
    this.check();
  }

  reveal(x, y) {
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const c = this.grid[cy][cx];
      if (c.open || c.flag) continue;
      c.open = true;
      if (c.mine) { this.lost = { x: cx, y: cy }; continue; }
      if (c.count === 0) this.neighbors(cx, cy).forEach((p) => stack.push(p));
    }
    this.sfx(500, 0.03, 'square', 0.03);
  }

  check() {
    if (this.lost) {
      this.grid.forEach((row) => row.forEach((c) => { if (c.mine) c.open = true; }));
      this.sfx(110, 0.5, 'sawtooth', 0.07, -60);
      this.gameOver('Boom!', { won: false });
      return;
    }
    const left = this.grid.flat().filter((c) => !c.open && !c.mine).length;
    if (!left) {
      this.grid.forEach((row) => row.forEach((c) => { if (c.mine) c.flag = true; }));
      this.sfx(880, 0.3, 'triangle', 0.06);
      this.gameOver('Cleared!');
    }
  }

  update(dt) {
    if (!this.placed) return; // the clock starts with the first dig
    this.elapsed += dt;
    const s = Math.floor(this.elapsed);
    if (s !== this.score) this.setScore(s);
  }

  draw(ctx) {
    const flags = this.grid ? this.grid.flat().filter((c) => c.flag).length : 0;
    text(ctx, `Mines ${this.mines - flags}`, 16, HEAD / 2, { size: 16, align: 'left', color: '#ffb0b0' });
    text(ctx, this.flagMode ? '⚑ flag mode' : '', W - 16, HEAD / 2, { size: 14, align: 'right', color: '#ffd66b' });
    const cs = this.cs;
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) {
      const c = this.grid[y][x];
      const px = x * cs, py = HEAD + y * cs;
      ctx.fillStyle = c.open ? (c.mine ? (this.lost && this.lost.x === x && this.lost.y === y ? '#a02a38' : '#3a2030') : '#1b1b28') : ((x + y) % 2 ? '#34344a' : '#2e2e42');
      roundRect(ctx, px + 1, py + 1, cs - 2, cs - 2, 4); ctx.fill();
      if (c.open && c.mine) text(ctx, '✹', px + cs / 2, py + cs / 2 + 1, { size: cs * 0.6, color: '#ffcf6b' });
      else if (c.open && c.count) text(ctx, String(c.count), px + cs / 2, py + cs / 2 + 1, { size: cs * 0.58, color: NUM_COLORS[c.count] });
      else if (c.flag) text(ctx, '⚑', px + cs / 2, py + cs / 2 + 1, { size: cs * 0.6, color: '#ff6a6a' });
      if (this.state === 'over' && c.flag && !c.mine) { text(ctx, '✕', px + cs / 2, py + cs / 2, { size: cs * 0.6, color: '#fff' }); }
    }
  }
}

new Sweeper().mount();
