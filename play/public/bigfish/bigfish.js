import { Game, rand, clamp, text } from '../assets/gamekit.js';

const W = 720, H = 440;

class BigFish extends Game {
  constructor() {
    super({
      slug: 'bigfish', title: 'Big Fish', width: W, height: H, bg: '#0c4f7a', scoreLabel: 'Score',
      help: 'Eat fish smaller than you to grow, and swim away from the bigger ones. Steer with the mouse, your finger, or the arrow keys. Fish that are safe to eat glow green; red ones will eat you. Grow big enough and you rule the sea.',
      controls: { pointer: true, dpad: true },
    });
  }

  reset() {
    this.p = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 14, face: 1, chomp: 0 };
    this.fish = []; this.bubbles = Array.from({ length: 24 }, () => ({ x: rand(0, W), y: rand(0, H), s: rand(2, 6), v: rand(10, 40) }));
    this.spawnT = 0; this.eaten = 0; this.pop = [];
    for (let i = 0; i < 8; i++) this.spawn(true);
  }

  spawn(initial = false) {
    const pr = this.p.r;
    const roll = Math.random();
    const r = roll < 0.62 ? pr * rand(0.4, 0.92) : roll < 0.82 ? pr * rand(0.95, 1.2) : pr * rand(1.25, 2.4);
    const radius = clamp(r, 6, 120);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x = initial ? rand(0, W) : dir > 0 ? -radius * 2 : W + radius * 2;
    const y = rand(radius + 6, H - radius - 6);
    if (initial && Math.hypot(x - this.p.x, y - this.p.y) < pr * 3 + radius) return;
    this.fish.push({ x, y, r: radius, vx: dir * rand(40, 120) * (14 / Math.sqrt(radius) / 3.5 + 0.4), dir, phase: rand(0, 6), hue: Math.floor(rand(0, 360)) });
  }

  update(dt) {
    const p = this.p;
    const kx = (this.held('ArrowRight') ? 1 : 0) - (this.held('ArrowLeft') ? 1 : 0);
    const ky = (this.held('ArrowDown') ? 1 : 0) - (this.held('ArrowUp') ? 1 : 0);
    let tx = 0, ty = 0;
    const speed = clamp(260 - p.r * 1.1, 130, 260);
    if (kx || ky) { const l = Math.hypot(kx, ky); tx = (kx / l) * speed; ty = (ky / l) * speed; }
    else if (this.pointerPos.inside && (this.pointerPos.down || matchMedia('(pointer: fine)').matches)) {
      const dx = this.pointerPos.x - p.x, dy = this.pointerPos.y - p.y, d = Math.hypot(dx, dy);
      if (d > 8) { const s = Math.min(speed, d * 4); tx = (dx / d) * s; ty = (dy / d) * s; }
    }
    p.vx += (tx - p.vx) * Math.min(1, dt * 6); p.vy += (ty - p.vy) * Math.min(1, dt * 6);
    p.x = clamp(p.x + p.vx * dt, p.r, W - p.r); p.y = clamp(p.y + p.vy * dt, p.r, H - p.r);
    if (Math.abs(p.vx) > 12) p.face = Math.sign(p.vx);
    p.chomp = Math.max(0, p.chomp - dt * 4);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.fish.length < 16) { this.spawn(); this.spawnT = rand(0.35, 0.9); }
    for (const f of this.fish) {
      f.x += f.vx * dt; f.y += Math.sin(this.time * 2 + f.phase) * 14 * dt;
      f.y = clamp(f.y, f.r, H - f.r);
      if (Math.hypot(f.x - p.x, f.y - p.y) < (f.r + p.r) * 0.78) {
        if (p.r > f.r * 1.06) { f.dead = true; p.r = Math.sqrt(p.r * p.r + f.r * f.r * 0.22); p.chomp = 1; this.eaten++; this.addScore(Math.round(f.r * 2)); this.pop.push({ x: f.x, y: f.y, t: 0.6, v: Math.round(f.r * 2) }); this.sfx(500 + Math.random() * 200, 0.06, 'triangle', 0.04, 150); }
        else if (f.r > p.r * 1.06) { this.sfx(120, 0.5, 'sawtooth', 0.07, -80); this.gameOver('You were eaten!'); return; }
      }
    }
    this.fish = this.fish.filter((f) => !f.dead && f.x > -f.r * 3 && f.x < W + f.r * 3);
    this.bubbles.forEach((b) => { b.y -= b.v * dt; if (b.y < -10) { b.y = H + 10; b.x = rand(0, W); } });
    this.pop.forEach((o) => { o.t -= dt; }); this.pop = this.pop.filter((o) => o.t > 0);
    if (p.r >= 90) { this.sfx(880, 0.5, 'triangle', 0.06, 300); this.gameOver('Biggest fish in the sea!'); }
  }

  drawFish(ctx, f, color, glow) {
    const dir = f.dir ?? f.face;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(dir, 1);
    const r = f.r, wag = Math.sin(this.time * 9 + (f.phase || 0)) * r * 0.25;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-r * 1.1, 0); ctx.lineTo(-r * 1.9, -r * 0.7 + wag); ctx.lineTo(-r * 1.9, r * 0.7 + wag); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r, 0, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 1.0, r * 0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.9); ctx.lineTo(r * 0.3, -r * 1.35); ctx.lineTo(r * 0.7, -r * 0.8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.7, -r * 0.2, r * 0.26, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.78, -r * 0.2, r * 0.13, 0, 7); ctx.fill();
    if (f.chomp > 0) { ctx.fillStyle = '#4a0d0d'; ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(r * 0.7, -r * 0.3 * f.chomp); ctx.lineTo(r * 0.7, r * 0.3 * f.chomp); ctx.fill(); }
    ctx.restore();
  }

  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3aa8d8'); g.addColorStop(1, '#06304f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 170 + 40, 0); ctx.lineTo(i * 170 + 120, 0); ctx.lineTo(i * 170 + 20, H); ctx.lineTo(i * 170 - 60, H); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; this.bubbles.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, b.s, 0, 7); ctx.stroke(); });
    ctx.fillStyle = '#d8c58a'; ctx.fillRect(0, H - 14, W, 14); ctx.fillStyle = '#2f9e44'; for (let i = 0; i < 12; i++) { ctx.fillRect(i * 64 + 12, H - 44, 5, 34); ctx.fillRect(i * 64 + 22, H - 34, 4, 24); }
    for (const f of this.fish) {
      const edible = this.p.r > f.r * 1.06, danger = f.r > this.p.r * 1.06;
      this.drawFish(ctx, f, `hsl(${f.hue}, 60%, 55%)`, edible ? '#7dff3a' : danger ? '#ff3b3b' : null);
    }
    this.drawFish(ctx, { ...this.p, dir: this.p.face, chomp: this.p.chomp, phase: 0 }, '#ffb340', null);
    for (const o of this.pop) text(ctx, `+${o.v}`, o.x, o.y - (0.6 - o.t) * 40, { size: 16, color: '#fff' });
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(14, 14, 160, 12); ctx.fillStyle = '#ffb340'; ctx.fillRect(14, 14, 160 * clamp((this.p.r - 14) / 76, 0, 1), 12);
    text(ctx, 'size', 182, 20, { size: 12, align: 'left', color: '#fff' });
  }
}

new BigFish().mount();
