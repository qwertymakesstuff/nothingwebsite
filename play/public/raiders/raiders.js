import { Game, clamp, rand, roundRect, text } from '../assets/gamekit.js';

const W = 480, H = 580, COLS = 9, ROWS = 5, CELL_W = 40, CELL_H = 34;
// three little alien designs (original), 9 x 7 pixels each, two frames
const ART = [
  [['..#...#..', '...#.#...', '..#####..', '.##.#.##.', '#########', '#.#####.#', '..#...#..'], ['..#...#..', '#..#.#..#', '#.#####.#', '###.#.###', '#########', '..#####..', '.#.....#.']],
  [['...###...', '.#######.', '##.###.##', '#########', '..##.##..', '.#.....#.', '#.......#'], ['...###...', '.#######.', '##.###.##', '#########', '.##...##.', '#..#.#..#', '.#.....#.']],
  [['.#.....#.', '..#...#..', '.#######.', '##.###.##', '#########', '#.#####.#', '#.#...#.#'], ['.#.....#.', '#.#...#.#', '#########', '###.#.###', '.#######.', '..#...#..', '.#.....#.']],
];
const COLORS = ['#ff6a8a', '#ffb23c', '#5be37d', '#4dd9f0', '#b36bff'];
const px = 3.6;

class Raiders extends Game {
  constructor() {
    super({
      slug: 'raiders', title: 'Void Raiders', width: W, height: H, bg: '#06060e',
      help: 'Shoot the descending raiders before they reach the ground. Move with the left / right arrows (A / D), fire with space (hold to keep firing). Hide behind the shields, and shoot the red saucer for a bonus. Three lives. P pauses.',
      controls: { buttons: [{ code: 'ArrowLeft', label: '◀', hold: true }, { code: 'Space', label: 'FIRE', hold: true }, { code: 'ArrowRight', label: '▶', hold: true }] },
    });
  }

  reset() {
    this.wave = 1; this.lives = 3;
    this.x = W / 2; this.cool = 0; this.bullets = []; this.bombs = []; this.sparks = [];
    this.invuln = 0; this.saucer = null; this.saucerT = rand(10, 18);
    this.buildWave();
    this.buildShields();
  }

  buildWave() {
    this.aliens = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.aliens.push({ r, c, x: 50 + c * CELL_W, y: 70 + r * CELL_H + Math.min(80, (this.wave - 1) * 14), alive: true });
    this.dir = 1; this.stepT = 0; this.frame = 0; this.bombT = 1;
    this.bullets = []; this.bombs = [];
  }

  buildShields() {
    this.shields = [];
    for (let i = 0; i < 4; i++) {
      const bx = 52 + i * 112, by = H - 130;
      const cells = [];
      for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) {
        if (y >= 3 && x >= 3 && x <= 5) continue; // the arch
        if (y === 0 && (x === 0 || x === 8)) continue;
        cells.push({ x: bx + x * 6, y: by + y * 6, hp: 3 });
      }
      this.shields.push(...cells);
    }
  }

  press() {}

  speed() {
    const alive = this.aliens.filter((a) => a.alive).length;
    return Math.max(0.05, (0.62 - this.wave * 0.03) * (alive / (ROWS * COLS)) + 0.04);
  }

  update(dt) {
    // player
    if (this.held('ArrowLeft')) this.x -= 260 * dt;
    if (this.held('ArrowRight')) this.x += 260 * dt;
    this.x = clamp(this.x, 24, W - 24);
    this.cool -= dt; this.invuln = Math.max(0, this.invuln - dt);
    if (this.held('Space') && this.cool <= 0 && this.bullets.filter((b) => b.up).length < 2) {
      this.bullets.push({ x: this.x, y: H - 62, up: true }); this.cool = 0.3; this.sfx(900, 0.08, 'square', 0.03, -500);
    }
    // aliens march
    this.stepT += dt;
    if (this.stepT >= this.speed()) {
      this.stepT = 0; this.frame ^= 1;
      const live = this.aliens.filter((a) => a.alive);
      const edge = live.some((a) => (this.dir > 0 ? a.x + 34 > W - 10 : a.x < 10));
      if (edge) { this.dir *= -1; live.forEach((a) => { a.y += 16; }); }
      else live.forEach((a) => { a.x += this.dir * 10; });
      this.sfx(90 + this.frame * 25, 0.05, 'square', 0.03);
      if (live.some((a) => a.y + 28 >= H - 84)) { this.lives = 0; this.gameOver('They landed!'); return; }
    }
    // alien bombs
    this.bombT -= dt;
    if (this.bombT <= 0) {
      const live = this.aliens.filter((a) => a.alive);
      if (live.length) {
        const cols = {}; live.forEach((a) => { if (!cols[a.c] || a.y > cols[a.c].y) cols[a.c] = a; });
        const shooters = Object.values(cols);
        const s = shooters[Math.floor(Math.random() * shooters.length)];
        this.bombs.push({ x: s.x + 17, y: s.y + 28 });
      }
      this.bombT = Math.max(0.35, rand(0.5, 1.3) - this.wave * 0.05);
    }
    // saucer
    this.saucerT -= dt;
    if (!this.saucer && this.saucerT <= 0) { this.saucer = { x: -40, dir: 1 }; this.saucerT = rand(14, 24); }
    if (this.saucer) { this.saucer.x += 110 * dt; if (this.saucer.x > W + 40) this.saucer = null; }
    // bullets
    for (const b of this.bullets) b.y -= 520 * dt;
    for (const b of this.bombs) b.y += (190 + this.wave * 12) * dt;
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const a of this.aliens) {
        if (a.alive && b.x > a.x && b.x < a.x + 34 && b.y > a.y && b.y < a.y + 26) {
          a.alive = false; b.dead = true; this.addScore((ROWS - a.r) * 10 + 10); this.boom(a.x + 17, a.y + 13, COLORS[a.r]); this.sfx(200, 0.1, 'sawtooth', 0.04, -100); break;
        }
      }
      if (!b.dead && this.saucer && Math.abs(b.x - this.saucer.x) < 22 && b.y < 62 && b.y > 40) {
        b.dead = true; this.addScore(50 + 50 * Math.floor(rand(0, 4))); this.boom(this.saucer.x, 52, '#ff4d5e'); this.saucer = null; this.sfx(700, 0.3, 'triangle', 0.05, 300);
      }
    }
    for (const b of [...this.bullets, ...this.bombs]) {
      if (b.dead) continue;
      const hit = this.shields.find((s) => b.x > s.x && b.x < s.x + 6 && b.y > s.y && b.y < s.y + 6);
      if (hit) { hit.hp--; b.dead = true; if (hit.hp <= 0) this.shields = this.shields.filter((s) => s !== hit); }
    }
    for (const b of this.bombs) {
      if (!b.dead && this.invuln <= 0 && b.y > H - 66 && b.y < H - 40 && Math.abs(b.x - this.x) < 22) { b.dead = true; this.hit(); }
    }
    this.bullets = this.bullets.filter((b) => !b.dead && b.y > -10);
    this.bombs = this.bombs.filter((b) => !b.dead && b.y < H + 10);
    this.sparks.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; });
    this.sparks = this.sparks.filter((s) => s.t > 0);
    if (this.state === 'playing' && !this.aliens.some((a) => a.alive)) { this.wave++; this.addScore(100); this.sfx(660, 0.3, 'triangle', 0.05, 400); this.buildWave(); }
  }

  hit() {
    this.lives--;
    this.boom(this.x, H - 50, '#4dd9f0');
    this.sfx(120, 0.5, 'sawtooth', 0.07, -80);
    this.invuln = 1.6;
    if (this.lives <= 0) this.gameOver('Defenses down');
  }

  boom(x, y, c) { for (let i = 0; i < 10; i++) this.sparks.push({ x, y, vx: rand(-110, 110), vy: rand(-110, 110), t: rand(0.25, 0.5), c }); }

  sprite(ctx, art, x, y, color) {
    ctx.fillStyle = color;
    art.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') ctx.fillRect(x + rx * px, y + ry * px, px + 0.4, px + 0.4); }));
  }

  draw(ctx) {
    // stars
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53 + (this.time * 6 * (1 + (i % 3))) % H) % H, 1.5, 1.5);
    text(ctx, `Wave ${this.wave}`, 14, 22, { size: 14, color: '#8e8585', align: 'left' });
    for (let i = 0; i < this.lives; i++) { ctx.fillStyle = '#4dd9f0'; roundRect(ctx, W - 28 - i * 26, 14, 18, 9, 3); ctx.fill(); }
    for (const a of this.aliens) if (a.alive) this.sprite(ctx, ART[a.r % 3][this.frame], a.x + 1, a.y, COLORS[a.r]);
    ctx.fillStyle = '#5be37d';
    for (const s of this.shields) { ctx.globalAlpha = 0.45 + s.hp * 0.18; ctx.fillRect(s.x, s.y, 5.4, 5.4); }
    ctx.globalAlpha = 1;
    if (this.saucer) { ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.ellipse(this.saucer.x, 52, 22, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb0b8'; ctx.beginPath(); ctx.ellipse(this.saucer.x, 47, 10, 7, 0, Math.PI, 0); ctx.fill(); }
    if (this.invuln <= 0 || Math.floor(this.time * 12) % 2) {
      ctx.fillStyle = '#4dd9f0'; roundRect(ctx, this.x - 22, H - 50, 44, 14, 4); ctx.fill();
      ctx.fillRect(this.x - 4, H - 62, 8, 14); ctx.fillRect(this.x - 1, H - 68, 2, 8);
    }
    ctx.fillStyle = '#fff'; for (const b of this.bullets) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 12);
    ctx.fillStyle = '#ffd66b'; for (const b of this.bombs) { ctx.fillRect(b.x - 1.5, b.y, 3, 5); ctx.fillRect(b.x - 3, b.y + 5, 6, 3); }
    for (const s of this.sparks) { ctx.globalAlpha = Math.min(1, s.t * 3); ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 3, 3); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a2a3a'; ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
  }
}

new Raiders().mount();
