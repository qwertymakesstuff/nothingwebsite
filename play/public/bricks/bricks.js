import { Game, clamp, rand, roundRect, text } from '../assets/gamekit.js';

const W = 480, H = 560, COLS = 10, ROWS = 7, BW = 44, BH = 20, GX = 4, TOP = 70;
const OFFX = (W - (COLS * BW + (COLS - 1) * GX)) / 2;
const ROW_COLORS = ['#ff5d6c', '#ff8a3d', '#f5d54a', '#5be37d', '#4dd9f0', '#5c7cff', '#b36bff'];

class Bricks extends Game {
  constructor() {
    super({
      slug: 'bricks', title: 'Brick Breaker', width: W, height: H, bg: '#0a0a12',
      help: 'Bounce the ball off your paddle and break every brick. Move with the mouse, your finger or the left / right arrows (A / D); press space or tap to launch. Caught power-ups widen your paddle. Three lives. P pauses.',
      controls: { pointer: true, tap: 'Space', buttons: [{ code: 'ArrowLeft', label: '◀', hold: true }, { code: 'Space', label: 'Launch' }, { code: 'ArrowRight', label: '▶', hold: true }] },
    });
  }

  reset() {
    this.level = 1; this.lives = 3;
    this.px = W / 2; this.pw = 84; this.wide = 0;
    this.buildLevel();
    this.stick();
  }

  buildLevel() {
    this.bricks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (this.level % 2 === 0 && (r + c) % 5 === 4) continue; // a few gaps on even levels
      this.bricks.push({ x: OFFX + c * (BW + GX), y: TOP + r * (BH + GX), r, hp: this.level >= 3 && r < 2 ? 2 : 1 });
    }
    this.drops = []; this.particles = [];
  }

  stick() { this.ball = { x: this.px, y: H - 52, vx: 0, vy: 0, stuck: true }; }

  press(code) { if (code === 'Space' || code === 'ArrowUp') this.launch(); }
  launch() {
    if (!this.ball.stuck) return;
    const speed = 330 + this.level * 25;
    const a = rand(-0.4, 0.4);
    this.ball.vx = Math.sin(a) * speed; this.ball.vy = -Math.cos(a) * speed; this.ball.stuck = false;
    this.sfx(440, 0.06);
  }

  pointer(type, x) { if (type !== 'up') this.px = clamp(x, this.pw / 2, W - this.pw / 2); }

  update(dt) {
    if (this.held('ArrowLeft')) this.px -= 440 * dt;
    if (this.held('ArrowRight')) this.px += 440 * dt;
    if (this.pointerPos.inside && (this.pointerPos.down || matchMedia('(pointer: fine)').matches)) this.px = this.pointerPos.x;
    this.wide = Math.max(0, this.wide - dt);
    this.pw += ((this.wide > 0 ? 130 : 84) - this.pw) * Math.min(1, dt * 10);
    this.px = clamp(this.px, this.pw / 2, W - this.pw / 2);
    const b = this.ball;
    if (b.stuck) { b.x = this.px; b.y = H - 52; }
    else {
      // small sub-steps so a fast ball cannot skip through a brick
      const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6);
      for (let i = 0; i < steps && this.state === 'playing'; i++) this.moveBall(dt / steps);
    }
    for (const d of this.drops) {
      d.y += 120 * dt;
      if (d.y > H - 44 && d.y < H - 20 && Math.abs(d.x - this.px) < this.pw / 2 + 10) { d.got = true; this.wide = 10; this.sfx(780, 0.15, 'triangle', 0.05); this.addScore(25); }
    }
    this.drops = this.drops.filter((d) => !d.got && d.y < H + 20);
    this.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.t -= dt; });
    this.particles = this.particles.filter((p) => p.t > 0);
  }

  moveBall(dt) {
    const b = this.ball, R = 7;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); this.sfx(300, 0.03); }
    if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); this.sfx(300, 0.03); }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); this.sfx(300, 0.03); }
    // paddle
    const py = H - 40;
    if (b.vy > 0 && b.y + R >= py && b.y - R <= py + 12 && Math.abs(b.x - this.px) <= this.pw / 2 + R) {
      const off = clamp((b.x - this.px) / (this.pw / 2), -1, 1);
      const sp = Math.min(640, Math.hypot(b.vx, b.vy) * 1.015);
      const a = off * 1.05;
      b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.y = py - R;
      this.sfx(480, 0.04, 'square');
    }
    // bricks
    for (const br of this.bricks) {
      if (b.x + R < br.x || b.x - R > br.x + BW || b.y + R < br.y || b.y - R > br.y + BH) continue;
      const ox = Math.min(b.x + R - br.x, br.x + BW - (b.x - R)), oy = Math.min(b.y + R - br.y, br.y + BH - (b.y - R));
      if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
      br.hp--;
      this.sfx(620 + (ROWS - br.r) * 40, 0.05, 'square');
      if (br.hp <= 0) {
        br.dead = true; this.addScore((ROWS - br.r) * 10);
        for (let i = 0; i < 6; i++) this.particles.push({ x: br.x + BW / 2, y: br.y + BH / 2, vx: rand(-90, 90), vy: rand(-160, -20), t: 0.5, c: ROW_COLORS[br.r] });
        if (Math.random() < 0.1) this.drops.push({ x: br.x + BW / 2, y: br.y });
      }
      break;
    }
    this.bricks = this.bricks.filter((br) => !br.dead);
    if (!this.bricks.length) { this.level++; this.addScore(100); this.sfx(900, 0.3, 'triangle', 0.05); this.buildLevel(); this.stick(); return; }
    if (b.y > H + R) {
      this.lives--;
      this.sfx(180, 0.3, 'sawtooth', 0.06, -90);
      if (this.lives <= 0) this.gameOver(); else this.stick();
    }
  }

  draw(ctx) {
    text(ctx, `Level ${this.level}`, 16, 28, { size: 14, color: '#8e8585', align: 'left' });
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < this.lives ? '#ff5d6c' : '#2a2a3a'; ctx.beginPath(); ctx.arc(W - 22 - i * 22, 28, 7, 0, 7); ctx.fill(); }
    for (const br of this.bricks) {
      ctx.fillStyle = br.hp > 1 ? '#c9c9d8' : ROW_COLORS[br.r];
      roundRect(ctx, br.x, br.y, BW, BH, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(br.x + 3, br.y + 3, BW - 6, 3);
    }
    for (const p of this.particles) { ctx.fillStyle = p.c; ctx.globalAlpha = p.t * 2; ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1; }
    for (const d of this.drops) { ctx.fillStyle = '#7dff3a'; roundRect(ctx, d.x - 14, d.y - 7, 28, 14, 7); ctx.fill(); text(ctx, '↔', d.x, d.y, { size: 11, color: '#0a1a04' }); }
    ctx.fillStyle = '#e8e8f2'; roundRect(ctx, this.px - this.pw / 2, H - 40, this.pw, 12, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, 7, 0, 7); ctx.fill();
    if (this.ball.stuck && this.state === 'playing') text(ctx, 'Tap or press space to launch', W / 2, H - 100, { size: 14, color: '#8e8585' });
  }
}

new Bricks().mount();
