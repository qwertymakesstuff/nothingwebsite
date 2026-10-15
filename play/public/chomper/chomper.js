import { Game, dirOf, rand, text } from '/assets/gamekit.js';

const MAZE = [
  '###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.###.#.###.####',
  '####.#.......#.####', '####.#.##-##.#.####', '####.#.#GGG#.#.####', 'T....#.#####.#....T', '####.#.#####.#.####', '####.#.......#.####',
  '#........#........#', '#.##.###.#.###.##.#', '#o.#.....P.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#',
  '#.................#', '###################',
];
const COLS = 19, ROWS = 21, C = 24, W = COLS * C, H = ROWS * C + 30;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const HOUSE_DOOR = [9, 8], HOUSE_IN = [9, 9], EXIT = [9, 7];
const GHOSTS = [
  { name: 'red', color: '#ff4d5e', home: [8, 9], release: 0.5, corner: [17, 1] },
  { name: 'pink', color: '#ff8ad8', home: [9, 9], release: 4, corner: [1, 1] },
  { name: 'orange', color: '#ffa63c', home: [10, 9], release: 8, corner: [1, 19] },
];

const wallsPath = new Path2D();
(() => {
  const isWall = (x, y) => y >= 0 && y < ROWS && MAZE[y][((x % COLS) + COLS) % COLS] === '#';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (MAZE[y][x] !== '#') continue;
    const px = x * C, py = y * C;
    if (!isWall(x, y - 1)) { wallsPath.moveTo(px, py + 1); wallsPath.lineTo(px + C, py + 1); }
    if (!isWall(x, y + 1)) { wallsPath.moveTo(px, py + C - 1); wallsPath.lineTo(px + C, py + C - 1); }
    if (!isWall(x - 1, y) && x > 0) { wallsPath.moveTo(px + 1, py); wallsPath.lineTo(px + 1, py + C); }
    if (!isWall(x + 1, y) && x < COLS - 1) { wallsPath.moveTo(px + C - 1, py); wallsPath.lineTo(px + C - 1, py + C); }
  }
})();

const cellAt = (x, y) => (y < 0 || y >= ROWS ? '#' : MAZE[y][((x % COLS) + COLS) % COLS]);

class Chomper extends Game {
  constructor() {
    super({
      slug: 'chomper', title: 'Chomper', width: W, height: H, bg: '#05050c',
      help: 'Eat every dot while three horned critters hunt you. Big dots turn the critters blue for a few seconds, so you can eat them. Steer with the arrow keys (WASD) or swipe; the tunnel at the sides wraps around. Three lives. P pauses.',
      controls: { dpad: true, swipe: true },
    });
  }

  reset() {
    this.level = 1; this.lives = 3;
    this.freshMaze();
    this.placeActors();
  }

  freshMaze() {
    this.dots = new Set(); this.pellets = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (MAZE[y][x] === '.') this.dots.add(`${x},${y}`);
      if (MAZE[y][x] === 'o') this.pellets.add(`${x},${y}`);
    }
    this.total = this.dots.size + this.pellets.size;
  }

  placeActors() {
    const p = { x: 9, y: 15 };
    this.pl = { tx: p.x, ty: p.y, nx: p.x, ny: p.y, prog: 0, dir: [0, 0], want: [-1, 0], moving: false, mouth: 0 };
    this.ghosts = GHOSTS.map((g) => ({ ...g, tx: g.home[0], ty: g.home[1], nx: g.home[0], ny: g.home[1], prog: 0, dir: [0, 0], mode: 'house', t: g.release, moving: false }));
    this.phase = 'scatter'; this.phaseT = 6; this.fright = 0; this.combo = 0;
    this.pause = 0.9; this.dying = 0;
  }

  press(code) {
    const d = dirOf(code);
    if (d) this.pl.want = d;
  }

  canEnter(x, y, who) {
    const c = cellAt(x, y);
    if (c === '#') return false;
    if (c === '-') return who === 'door';
    return true;
  }

  pos(a) {
    let dx = a.nx - a.tx;
    if (Math.abs(dx) > 1) dx = -Math.sign(dx) * 1; // wrapping through the tunnel
    return { x: a.tx + dx * a.prog, y: a.ty + (a.ny - a.ty) * a.prog };
  }

  update(dt) {
    this.time2 = (this.time2 || 0) + dt;
    if (this.dying > 0) { this.dying -= dt; if (this.dying <= 0) { if (this.lives <= 0) this.gameOver(); else this.placeActors(); } return; }
    if (this.pause > 0) { this.pause -= dt; return; }
    this.phaseT -= dt;
    if (this.phaseT <= 0) { this.phase = this.phase === 'scatter' ? 'chase' : 'scatter'; this.phaseT = this.phase === 'chase' ? 18 : 6; this.ghosts.forEach((g) => { if (g.mode === 'normal') g.dir = [-g.dir[0], -g.dir[1]]; }); }
    this.fright = Math.max(0, this.fright - dt);
    this.movePlayer(dt);
    for (const g of this.ghosts) this.moveGhost(g, dt);
    this.collide();
    if (this.dots.size + this.pellets.size === 0) this.nextLevel();
  }

  movePlayer(dt) {
    const p = this.pl, speed = 7.2;
    p.mouth += dt * (p.moving ? 14 : 0);
    // reversing mid-tile is instant
    if (p.moving && p.want[0] === -p.dir[0] && p.want[1] === -p.dir[1] && (p.want[0] || p.want[1])) {
      [p.tx, p.nx] = [p.nx, p.tx]; [p.ty, p.ny] = [p.ny, p.ty]; p.prog = 1 - p.prog; p.dir = p.want;
    }
    let budget = speed * dt;
    while (budget > 0) {
      if (!p.moving) {
        if (!this.startMove(p, p.want, 'player') && !this.startMove(p, p.dir, 'player')) return;
      }
      const step = Math.min(budget, 1 - p.prog);
      p.prog += step; budget -= step;
      if (p.prog >= 1 - 1e-9) {
        p.tx = ((p.nx % COLS) + COLS) % COLS; p.ty = p.ny; p.prog = 0; p.moving = false; p.nx = p.tx; p.ny = p.ty;
        this.eatAt(p.tx, p.ty);
        if (!this.startMove(p, p.want, 'player')) this.startMove(p, p.dir, 'player');
      }
    }
  }

  startMove(a, d, who) {
    if (!d || (!d[0] && !d[1])) return false;
    const nx = a.tx + d[0], ny = a.ty + d[1];
    if (!this.canEnter(((nx % COLS) + COLS) % COLS, ny, who)) return false;
    a.dir = d; a.nx = nx; a.ny = ny; a.prog = 0; a.moving = true;
    return true;
  }

  eatAt(x, y) {
    const k = `${x},${y}`;
    if (this.dots.delete(k)) { this.addScore(10); this.sfx(this.eatToggle ? 300 : 360, 0.03, 'square', 0.03); this.eatToggle = !this.eatToggle; }
    else if (this.pellets.delete(k)) {
      this.addScore(50); this.fright = Math.max(3.5, 8 - this.level * 0.7); this.combo = 0;
      this.sfx(200, 0.25, 'sawtooth', 0.05, 300);
      this.ghosts.forEach((g) => { if (g.mode === 'normal') { g.mode = 'fright'; g.dir = [-g.dir[0], -g.dir[1]]; } });
    }
  }

  moveGhost(g, dt) {
    if (g.mode === 'house') { g.t -= dt; if (g.t <= 0) g.mode = 'leaving'; else return; }
    if (g.mode === 'fright' && this.fright <= 0) g.mode = 'normal';
    const speed = g.mode === 'eaten' ? 10 : g.mode === 'fright' ? 3.6 : g.mode === 'leaving' ? 4.5 : Math.min(7.4, 5.9 + this.level * 0.3);
    let budget = speed * dt;
    while (budget > 0) {
      if (!g.moving && !this.ghostTurn(g)) return;
      const step = Math.min(budget, 1 - g.prog);
      g.prog += step; budget -= step;
      if (g.prog >= 1 - 1e-9) {
        g.tx = ((g.nx % COLS) + COLS) % COLS; g.ty = g.ny; g.prog = 0; g.moving = false; g.nx = g.tx; g.ny = g.ty;
        if (g.mode === 'leaving' && g.ty <= EXIT[1]) g.mode = this.fright > 0 ? 'fright' : 'normal';
        if (g.mode === 'eaten' && g.tx === HOUSE_IN[0] && g.ty === HOUSE_IN[1]) { g.mode = 'house'; g.t = 1.5; g.dir = [0, 0]; return; }
      }
    }
  }

  target(g) {
    if (g.mode === 'leaving') return EXIT;
    if (g.mode === 'eaten') return HOUSE_IN;
    const p = this.pl;
    if (this.phase === 'scatter') return g.corner;
    if (g.name === 'red') return [p.tx, p.ty];
    if (g.name === 'pink') return [p.tx + p.dir[0] * 3, p.ty + p.dir[1] * 3];
    return Math.hypot(p.tx - g.tx, p.ty - g.ty) > 7 ? [p.tx, p.ty] : g.corner;
  }

  ghostTurn(g) {
    const who = g.mode === 'leaving' || g.mode === 'eaten' ? 'door' : 'ghost';
    const options = DIRS.filter((d) => this.canEnter(((g.tx + d[0]) % COLS + COLS) % COLS, g.ty + d[1], who) && !(d[0] === -g.dir[0] && d[1] === -g.dir[1]));
    const list = options.length ? options : DIRS.filter((d) => this.canEnter(((g.tx + d[0]) % COLS + COLS) % COLS, g.ty + d[1], who));
    if (!list.length) return false;
    let pick;
    if (g.mode === 'fright') pick = list[Math.floor(Math.random() * list.length)];
    else {
      const [tx, ty] = this.target(g);
      pick = list.reduce((best, d) => {
        const dist = (g.tx + d[0] - tx) ** 2 + (g.ty + d[1] - ty) ** 2;
        return !best || dist < best.dist ? { d, dist } : best;
      }, null).d;
    }
    return this.startMove(g, pick, who);
  }

  collide() {
    const pp = this.pos(this.pl);
    for (const g of this.ghosts) {
      if (g.mode === 'house' || g.mode === 'leaving' || g.mode === 'eaten') continue;
      const gp = this.pos(g);
      if (Math.hypot(gp.x - pp.x, gp.y - pp.y) > 0.6) continue;
      if (g.mode === 'fright') {
        g.mode = 'eaten'; this.combo++; this.addScore(100 * 2 ** this.combo);
        this.sfx(700, 0.2, 'triangle', 0.06, 400);
      } else {
        this.lives--; this.dying = 1.2; this.sfx(240, 0.8, 'sawtooth', 0.06, -200);
        return;
      }
    }
  }

  nextLevel() {
    this.level++; this.addScore(200); this.sfx(900, 0.4, 'triangle', 0.06, 300);
    this.freshMaze(); this.placeActors(); this.pause = 1.4;
  }

  draw(ctx) {
    ctx.fillStyle = '#0a0a22';
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (MAZE[y][x] === '#') ctx.fillRect(x * C, y * C, C, C);
    ctx.strokeStyle = '#4060ff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke(wallsPath);
    ctx.strokeStyle = '#ffb0d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(HOUSE_DOOR[0] * C + 2, HOUSE_DOOR[1] * C + C / 2); ctx.lineTo(HOUSE_DOOR[0] * C + C - 2, HOUSE_DOOR[1] * C + C / 2); ctx.stroke();
    ctx.fillStyle = '#ffe9c4';
    for (const k of this.dots) { const [x, y] = k.split(',').map(Number); ctx.beginPath(); ctx.arc(x * C + C / 2, y * C + C / 2, 2.6, 0, 7); ctx.fill(); }
    const blink = Math.floor(this.time * 5) % 2 === 0;
    for (const k of this.pellets) { if (!blink) continue; const [x, y] = k.split(',').map(Number); ctx.beginPath(); ctx.arc(x * C + C / 2, y * C + C / 2, 7, 0, 7); ctx.fill(); }
    // player
    const p = this.pos(this.pl), px = p.x * C + C / 2, py = p.y * C + C / 2;
    const face = Math.atan2(this.pl.dir[1] || 0, this.pl.dir[0] || 1);
    if (this.dying > 0) {
      const t = 1 - this.dying / 1.2, open = Math.PI * Math.min(1, t * 1.2);
      ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, C * 0.46, -Math.PI / 2 + open, -Math.PI / 2 - open + Math.PI * 2); ctx.fill();
    } else {
      const m = (Math.sin(this.pl.mouth) * 0.5 + 0.5) * 0.7 + 0.05;
      ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, C * 0.46, face + m, face - m + Math.PI * 2); ctx.closePath(); ctx.fill();
    }
    if (this.dying <= 0 || this.dying > 0.8) for (const g of this.ghosts) this.drawGhost(ctx, g);
    // footer
    for (let i = 0; i < this.lives - (this.dying > 0 ? 0 : 0); i++) { ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.moveTo(18 + i * 26, ROWS * C + 15); ctx.arc(18 + i * 26, ROWS * C + 15, 9, 0.5, Math.PI * 2 - 0.5); ctx.fill(); }
    text(ctx, `Level ${this.level}`, W - 14, ROWS * C + 15, { size: 14, color: '#8e8585', align: 'right' });
    if (this.pause > 0 && this.state === 'playing') text(ctx, 'READY!', W / 2, 11 * C + C / 2, { size: 18, color: '#ffd93d' });
  }

  /** The enemies are little horned critters (not ghosts): a rounded body, two horns, two feet. */
  drawGhost(ctx, g) {
    const p = this.pos(g), x = p.x * C + C / 2, y = p.y * C + C / 2, r = C * 0.44;
    if (g.mode !== 'eaten') {
      const scared = g.mode === 'fright';
      const flash = scared && this.fright < 2 && Math.floor(this.time * 8) % 2;
      ctx.fillStyle = scared ? (flash ? '#fff' : '#2a3cff') : g.color;
      ctx.beginPath(); ctx.moveTo(x - r, y + r);
      ctx.lineTo(x - r, y - r * 0.25); ctx.quadraticCurveTo(x - r, y - r * 1.05, x, y - r * 1.05); ctx.quadraticCurveTo(x + r, y - r * 1.05, x + r, y - r * 0.25);
      ctx.lineTo(x + r, y + r); ctx.lineTo(x + r * 0.45, y + r); ctx.lineTo(x + r * 0.2, y + r * 0.55); ctx.lineTo(x - r * 0.2, y + r * 0.55); ctx.lineTo(x - r * 0.45, y + r); ctx.closePath(); ctx.fill();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.45, y - r * 0.85); ctx.lineTo(x + s * r * 0.95, y - r * 1.5); ctx.lineTo(x + s * r * 0.9, y - r * 0.5); ctx.closePath(); ctx.fill(); }
    }
    const look = g.dir || [0, 0];
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.fillRect(x + s * 4.6 - 3.2, y - 5.5, 6.4, 7.4);
      ctx.fillStyle = g.mode === 'fright' ? '#ffd0d0' : '#14143a'; ctx.fillRect(x + s * 4.6 - 1.4 + look[0] * 1.6, y - 3.5 + look[1] * 1.6, 3, 3.6);
    }
  }
}

new Chomper().mount();
