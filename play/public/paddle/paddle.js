import { Game, clamp, rand, roundRect, text } from '../assets/gamekit.js';

const W = 640, H = 400, PW = 12, PH = 76, R = 8, WIN = 7;

class Paddle extends Game {
  constructor() {
    super({
      slug: 'paddle', title: 'Paddle Duel', width: W, height: H, bg: '#0a0a10', scoreLabel: 'Points',
      help: 'First to seven wins. Move your paddle (left) with the mouse, your finger, or the up / down arrows (W / S). Hit the ball with the edge of the paddle to send it at a sharper angle. P pauses.',
      controls: { pointer: true, buttons: [{ code: 'ArrowUp', label: '▲ Up', hold: true }, { code: 'ArrowDown', label: '▼ Down', hold: true }] },
    });
  }

  reset() {
    this.py = H / 2; this.ay = H / 2;
    this.pScore = 0; this.aScore = 0;
    this.serve(1);
    this.aiOffset = 0; this.aiTimer = 0;
  }

  serve(dir) {
    this.bx = W / 2; this.by = H / 2;
    const a = rand(-0.35, 0.35);
    this.speed = 330;
    this.bvx = Math.cos(a) * this.speed * dir; this.bvy = Math.sin(a) * this.speed;
    this.wait = 0.8; this.trail = [];
  }

  pointer(type, x, y) { if (type !== 'up') this.py = clamp(y, PH / 2, H - PH / 2); }
  press() {}

  update(dt) {
    // player: pointer drag moves directly, keys move at a speed
    if (this.held('ArrowUp')) this.py -= 420 * dt;
    if (this.held('ArrowDown')) this.py += 420 * dt;
    if (this.pointerPos.inside && (this.pointerPos.down || matchMedia('(pointer: fine)').matches)) this.py = this.pointerPos.y;
    this.py = clamp(this.py, PH / 2, H - PH / 2);
    // computer: follows the ball with a delay and an error, so it can be beaten
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) { this.aiTimer = 0.18; this.aiOffset = rand(-PH * 0.42, PH * 0.42); }
    const target = this.bvx > 0 ? this.by + this.aiOffset : H / 2;
    const maxMove = (250 + this.pScore * 12) * dt;
    this.ay += clamp(target - this.ay, -maxMove, maxMove);
    this.ay = clamp(this.ay, PH / 2, H - PH / 2);
    if (this.wait > 0) { this.wait -= dt; return; }

    this.bx += this.bvx * dt; this.by += this.bvy * dt;
    this.trail.push({ x: this.bx, y: this.by }); if (this.trail.length > 8) this.trail.shift();
    if (this.by < R) { this.by = R; this.bvy = Math.abs(this.bvy); this.sfx(300, 0.03); }
    if (this.by > H - R) { this.by = H - R; this.bvy = -Math.abs(this.bvy); this.sfx(300, 0.03); }
    // paddles
    const hit = (px, dir, py) => {
      if (Math.abs(this.by - py) <= PH / 2 + R && Math.abs(this.bx - px) <= PW / 2 + R && Math.sign(this.bvx) === -dir) {
        const off = clamp((this.by - py) / (PH / 2), -1, 1);
        this.speed = Math.min(780, this.speed * 1.06);
        const a = off * 0.95;
        this.bvx = Math.cos(a) * this.speed * dir; this.bvy = Math.sin(a) * this.speed;
        this.bx = px + dir * (PW / 2 + R + 1);
        this.sfx(dir === 1 ? 520 : 400, 0.05, 'square');
      }
    };
    hit(28, 1, this.py); hit(W - 28, -1, this.ay);
    if (this.bx < -R) this.point(false);
    else if (this.bx > W + R) this.point(true);
  }

  point(player) {
    if (player) { this.pScore++; this.setScore(this.pScore * 10); this.sfx(760, 0.2, 'triangle', 0.05); } else { this.aScore++; this.sfx(200, 0.25, 'sawtooth', 0.05, -80); }
    if (this.pScore >= WIN) { this.addScore(50); this.gameOver('You win!'); return; }
    if (this.aScore >= WIN) { this.gameOver('The computer wins', { won: false }); return; }
    this.serve(player ? -1 : 1);
  }

  draw(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, String(this.pScore), W / 2 - 60, 50, { size: 44, color: 'rgba(255,255,255,.35)' });
    text(ctx, String(this.aScore), W / 2 + 60, 50, { size: 44, color: 'rgba(255,255,255,.35)' });
    ctx.fillStyle = '#7dff3a'; roundRect(ctx, 28 - PW / 2, this.py - PH / 2, PW, PH, 5); ctx.fill();
    ctx.fillStyle = '#e8e8f2'; roundRect(ctx, W - 28 - PW / 2, this.ay - PH / 2, PW, PH, 5); ctx.fill();
    (this.trail || []).forEach((t, i) => { ctx.fillStyle = `rgba(255,255,255,${i / 24})`; ctx.beginPath(); ctx.arc(t.x, t.y, R * (i / 10), 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.bx, this.by, R, 0, 7); ctx.fill();
  }
}

new Paddle().mount();
