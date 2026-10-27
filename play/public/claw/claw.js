import { Game, rand, randInt, clamp, roundRect, text } from '../assets/gamekit.js';

const W = 640, H = 440, OX = 320, OY = 62, LEVEL_TIME = 60;
const KINDS = {
  gold1: { r: 12, value: 50, weight: 1, c: '#ffd23f' }, gold2: { r: 20, value: 120, weight: 1.7, c: '#ffc107' }, gold3: { r: 30, value: 300, weight: 2.6, c: '#ffb300' },
  rock1: { r: 15, value: 12, weight: 2.4, c: '#8d8d96' }, rock2: { r: 25, value: 25, weight: 3.4, c: '#6e6e78' },
  gem: { r: 9, value: 600, weight: 0.7, c: '#57e3ff' }, bag: { r: 17, value: 0, weight: 1.5, c: '#b07a4a' },
};

class Claw extends Game {
  constructor() {
    super({
      slug: 'claw', title: 'Claw Digger', width: W, height: H, bg: '#3b2a1a', scoreLabel: 'Money',
      help: 'Dig for treasure before time runs out. The claw swings back and forth: press space, the down arrow, or tap to fire it. Big gold is worth the most but is slow to haul back; gems are small and precious; rocks are junk. Hit the money goal to reach the next level.',
      controls: { tap: 'Space', buttons: [{ code: 'Space', label: 'Fire claw', wide: true }] },
      format: (n) => `$${n}`,
    });
  }

  reset() {
    this.level = 1; this.total = 0; this.buildLevel();
  }

  buildLevel() {
    this.goal = 250 + (this.level - 1) * 280 + Math.max(0, this.level - 4) * 150;
    this.left = LEVEL_TIME; this.earned = 0;
    this.items = [];
    const mix = ['gold1', 'gold1', 'gold1', 'gold2', 'gold2', 'gold3', 'rock1', 'rock1', 'rock2', 'gem', 'bag', 'gold1', 'rock1'];
    const count = 13 + Math.min(6, this.level);
    for (let tries = 0, n = 0; n < count && tries < 600; tries++) {
      const kind = mix[randInt(0, mix.length - 1)];
      const k = KINDS[kind];
      const x = rand(k.r + 10, W - k.r - 10), y = rand(150, H - k.r - 12);
      if (this.items.some((i) => Math.hypot(i.x - x, i.y - y) < i.r + k.r + 8)) continue;
      this.items.push({ kind, x, y, r: k.r, bagValue: kind === 'bag' ? randInt(1, 4) * 80 : 0 });
      n++;
    }
    this.angle = 0; this.t = 0; this.len = 0; this.phase = 'swing'; this.held_ = null; this.flash = null;
  }

  press(code) {
    if ((code === 'Space' || code === 'ArrowDown') && this.phase === 'swing') { this.phase = 'out'; this.sfx(300, 0.08, 'square', 0.03, 200); }
  }

  tip() { return { x: OX + Math.sin(this.angle) * this.len, y: OY + Math.cos(this.angle) * this.len }; }

  update(dt) {
    this.left -= dt;
    this.banner = Math.max(0, (this.banner || 0) - dt);
    if (this.phase === 'swing') { this.t += dt; this.angle = Math.sin(this.t * 1.7) * 1.2; }
    else if (this.phase === 'out') {
      this.len += 330 * dt;
      const tip = this.tip();
      const hit = this.items.find((i) => Math.hypot(i.x - tip.x, i.y - tip.y) < i.r + 4);
      if (hit) { this.held_ = hit; this.items = this.items.filter((i) => i !== hit); this.phase = 'in'; this.sfx(200, 0.1, 'triangle', 0.05); }
      else if (tip.x < 4 || tip.x > W - 4 || tip.y > H - 4) this.phase = 'in';
    } else if (this.phase === 'in') {
      const w = this.held_ ? KINDS[this.held_.kind].weight : 0.35;
      this.len -= (330 / (1 + w * 1.4)) * dt;
      if (this.held_) { const tip = this.tip(); this.held_.x = tip.x; this.held_.y = tip.y; }
      if (this.len <= 0) {
        this.len = 0; this.phase = 'swing';
        if (this.held_) {
          const k = KINDS[this.held_.kind];
          const v = this.held_.kind === 'bag' ? this.held_.bagValue : k.value;
          this.earned += v; this.total += v; this.setScore(this.total);
          this.flash = { v, t: 0.9 }; this.sfx(v >= 100 ? 880 : 600, 0.12, 'triangle', 0.05, 200);
          this.held_ = null;
        }
        this.t = Math.asin(clamp(this.angle / 1.2, -1, 1)) / 1.7;
      }
    }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    if (this.left <= 0 && this.phase === 'swing') {
      if (this.earned >= this.goal) { this.level++; this.sfx(900, 0.4, 'triangle', 0.06, 400); this.buildLevel(); this.banner = 2; this.bannerText = `Level ${this.level}`; }
      else this.gameOver('Time is up!');
    } else if (this.left <= 0) this.left = 0.01;
  }

  draw(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, OY + 30); sky.addColorStop(0, '#79c7ff'); sky.addColorStop(1, '#cfeeff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, OY + 30);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(0, OY + 30, W, H);
    ctx.fillStyle = '#6b4a2b'; for (let i = 0; i < 60; i++) ctx.fillRect((i * 83) % W, OY + 40 + ((i * 47) % (H - OY - 50)), 12, 5);
    ctx.fillStyle = '#4b9a3a'; ctx.fillRect(0, OY + 24, W, 8);
    ctx.fillStyle = '#c0392b'; roundRect(ctx, OX - 34, OY - 28, 68, 40, 8); ctx.fill();
    ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(OX - 10, OY - 40, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#f1c40f'; ctx.fillRect(OX - 22, OY - 54, 24, 8);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(OX - 20, OY + 14, 8, 0, 7); ctx.arc(OX + 20, OY + 14, 8, 0, 7); ctx.fill();
    for (const it of this.items) this.drawItem(ctx, it);
    const tip = this.tip();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(OX, OY); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.lineWidth = 1;
    if (this.held_) this.drawItem(ctx, this.held_);
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(-this.angle);
    ctx.fillStyle = '#bbb'; ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, 12); ctx.quadraticCurveTo(-14, 2, -4, 0); ctx.moveTo(12, 12); ctx.quadraticCurveTo(14, 2, 4, 0); ctx.stroke(); ctx.lineWidth = 1;
    ctx.restore();
    text(ctx, `Goal $${this.goal}`, 14, 16, { size: 15, align: 'left', color: '#fff' });
    text(ctx, `Earned $${this.earned}`, 14, 36, { size: 15, align: 'left', color: this.earned >= this.goal ? '#7dff3a' : '#ffd23f' });
    text(ctx, `Level ${this.level}`, W - 14, 16, { size: 15, align: 'right', color: '#fff' });
    text(ctx, `${Math.ceil(this.left)}s`, W - 14, 36, { size: 18, align: 'right', color: this.left < 10 ? '#ff6a6a' : '#fff' });
    if (this.flash) text(ctx, `+$${this.flash.v}`, OX + 60, OY - 6 - (0.9 - this.flash.t) * 30, { size: 22, color: '#7dff3a' });
    if (this.banner > 0) text(ctx, this.bannerText || '', W / 2, H / 2, { size: 40, color: '#fff' });
  }

  drawItem(ctx, it) {
    const k = KINDS[it.kind];
    ctx.save(); ctx.translate(it.x, it.y);
    if (it.kind.startsWith('gold')) {
      ctx.fillStyle = k.c; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, rr = it.r * (i % 2 ? 0.85 : 1.05); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); } ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-it.r * 0.3, -it.r * 0.3, it.r * 0.3, it.r * 0.18, -0.6, 0, 7); ctx.fill();
    } else if (it.kind.startsWith('rock')) {
      ctx.fillStyle = k.c; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283, rr = it.r * (0.8 + ((i * 37) % 5) / 14); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-it.r * 0.3, 0, it.r * 0.5, 3);
    } else if (it.kind === 'gem') {
      ctx.fillStyle = k.c; ctx.beginPath(); ctx.moveTo(0, -it.r * 1.2); ctx.lineTo(it.r, -it.r * 0.2); ctx.lineTo(0, it.r * 1.2); ctx.lineTo(-it.r, -it.r * 0.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(0, -it.r * 1.2); ctx.lineTo(-it.r * 0.4, -it.r * 0.2); ctx.lineTo(0, 0); ctx.fill();
    } else {
      ctx.fillStyle = k.c; roundRect(ctx, -it.r, -it.r * 0.9, it.r * 2, it.r * 1.8, 8); ctx.fill(); text(ctx, '?', 0, 1, { size: 18, color: '#fff' });
    }
    ctx.restore();
  }
}

new Claw().mount();
