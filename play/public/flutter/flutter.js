import { Game, rand, clamp, roundRect, text } from '/assets/gamekit.js';

const W = 360, H = 540, GROUND = 70, GAP = 140, PIPE_W = 58, SPACING = 200, SPEED = 130;

class Flutter extends Game {
  constructor() {
    super({
      slug: 'flutter', title: 'Flutter', width: W, height: H, bg: '#7ec8e3',
      help: 'Keep the little bird in the air and slip through the gaps. Tap, click, press space or the up arrow to flap. Touch a pipe or the ground and it is over. P pauses.',
      controls: { tap: 'Space', buttons: [{ code: 'Space', label: 'Flap', wide: true }] },
    });
  }

  reset() {
    this.y = H / 2 - 40; this.vy = 0; this.waiting = true; this.tilt = 0;
    this.pipes = []; this.ground = 0; this.nextPipe = W + 40;
    this.dead = false; this.clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 110 + rand(0, 40), y: rand(30, 220), s: rand(0.7, 1.3) }));
  }

  press(code) {
    if (code === 'Space' || code === 'ArrowUp' || code === 'Enter') this.flap();
  }

  flap() {
    this.waiting = false;
    this.vy = -330;
    this.sfx(520, 0.07, 'triangle', 0.05, 160);
  }

  update(dt) {
    this.ground = (this.ground + SPEED * dt) % 24;
    this.clouds.forEach((c) => { c.x -= 12 * dt * c.s; if (c.x < -80) { c.x = W + 40; c.y = rand(30, 220); } });
    if (this.waiting) { this.y = H / 2 - 40 + Math.sin(this.time * 6) * 7; return; }
    this.vy = Math.min(520, this.vy + 980 * dt);
    this.y += this.vy * dt;
    this.tilt = clamp(this.vy / 520, -0.5, 1.1);
    for (const p of this.pipes) p.x -= SPEED * dt;
    this.nextPipe -= SPEED * dt;
    if (this.nextPipe <= 0) {
      this.pipes.push({ x: W + 10, top: rand(70, H - GROUND - GAP - 70), passed: false });
      this.nextPipe = SPACING;
    }
    this.pipes = this.pipes.filter((p) => p.x > -PIPE_W - 10);
    for (const p of this.pipes) {
      if (!p.passed && p.x + PIPE_W < 90) { p.passed = true; this.addScore(1); this.sfx(880, 0.07, 'square', 0.04); }
      const bx = 90, r = 13;
      if (bx + r > p.x && bx - r < p.x + PIPE_W && (this.y - r < p.top || this.y + r > p.top + GAP)) return this.die();
    }
    if (this.y + 13 >= H - GROUND || this.y - 13 < -40) this.die();
  }

  die() {
    this.sfx(160, 0.3, 'sawtooth', 0.06, -100);
    this.gameOver();
  }

  draw(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5db4e8'); sky.addColorStop(1, '#bfe9f5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    this.clouds.forEach((c) => { ctx.beginPath(); ctx.ellipse(c.x, c.y, 34 * c.s, 14 * c.s, 0, 0, 7); ctx.ellipse(c.x + 22 * c.s, c.y + 4, 24 * c.s, 11 * c.s, 0, 0, 7); ctx.fill(); });
    for (const p of this.pipes) {
      for (const [y, h, cap] of [[0, p.top, p.top - 22], [p.top + GAP, H - GROUND - p.top - GAP, p.top + GAP]]) {
        ctx.fillStyle = '#3fae49'; ctx.fillRect(p.x, y, PIPE_W, h);
        ctx.fillStyle = '#2f8a3a'; ctx.fillRect(p.x + PIPE_W - 10, y, 10, h);
        ctx.fillStyle = '#4fcb5b'; ctx.fillRect(p.x + 6, y, 7, h);
        ctx.fillStyle = '#3fae49'; roundRect(ctx, p.x - 5, cap, PIPE_W + 10, 22, 5); ctx.fill();
        ctx.fillStyle = '#2f8a3a'; ctx.fillRect(p.x - 5 + PIPE_W + 10 - 8, cap + 2, 8, 18);
      }
    }
    // ground
    ctx.fillStyle = '#d8c58a'; ctx.fillRect(0, H - GROUND, W, GROUND);
    ctx.fillStyle = '#6cc04a'; ctx.fillRect(0, H - GROUND, W, 14);
    ctx.fillStyle = '#58a63c';
    for (let x = -24 + this.ground; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, H - GROUND); ctx.lineTo(x + 12, H - GROUND); ctx.lineTo(x + 6, H - GROUND + 14); ctx.fill(); }
    // bird
    ctx.save(); ctx.translate(90, this.y); ctx.rotate(this.tilt * 0.6);
    ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2a81d'; ctx.beginPath(); ctx.ellipse(-4, 3 + Math.sin(this.time * 18) * (this.vy < 0 ? 3 : 1), 8, 5, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -4, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7.5, -4, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(21, 3); ctx.lineTo(11, 7); ctx.fill();
    ctx.restore();
    if (this.state === 'playing') text(ctx, String(this.score), W / 2, 60, { size: 46, color: '#fff' });
    if (this.waiting && this.state === 'playing') text(ctx, 'Tap to flap', W / 2, H / 2 + 50, { size: 18, color: '#1c4a63' });
  }
}

new Flutter().mount();
