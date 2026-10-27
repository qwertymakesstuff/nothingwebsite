import { Game, clamp, rand, roundRect, text } from '../assets/gamekit.js';

const W = 360, H = 560, G = 1500, BOUNCE = 740, SPRING = 1150, PW = 62, PH = 14;

class SkyHop extends Game {
  constructor() {
    super({
      slug: 'skyhop', title: 'Sky Hop', width: W, height: H, bg: '#8fd3f4', scoreLabel: 'Height',
      help: 'Hop up from platform to platform and never fall. Steer left and right with the arrow keys (A / D), or drag your finger. Springs fling you high, brown platforms crumble, and the purple spiky things hurt. Reach for the sky!',
      controls: { pointer: true, buttons: [{ code: 'ArrowLeft', label: '◀', hold: true }, { code: 'ArrowRight', label: '▶', hold: true }] },
    });
  }

  reset() {
    this.cam = 0; // world y of the top of the screen (negative = higher up)
    this.p = { x: W / 2, y: H - 120, vx: 0, vy: -BOUNCE, face: 1 };
    this.plats = [{ x: W / 2 - PW / 2, y: H - 60, type: 'solid' }];
    this.top = H - 60;
    this.items = [];
    while (this.top > -H) this.spawnRow();
    this.maxH = 0; this.dead = false;
  }

  spawnRow() {
    const h = Math.max(0, -this.top) / 10;
    const gap = rand(55, Math.min(150, 80 + h / 12));
    this.top -= gap;
    const roll = Math.random();
    let type = 'solid';
    if (h > 150 && roll < 0.22) type = 'move';
    else if (h > 80 && roll < 0.38) type = 'crumble';
    const pl = { x: rand(0, W - PW), y: this.top, type, dir: Math.random() < 0.5 ? -1 : 1, gone: false };
    this.plats.push(pl);
    if (type === 'solid' && Math.random() < 0.09) this.items.push({ kind: 'spring', pl });
    if (type === 'solid' && h > 300 && Math.random() < 0.07) this.items.push({ kind: 'spike', pl, t: rand(0, 6) });
  }

  update(dt) {
    const p = this.p;
    const dirKey = (this.held('ArrowRight') ? 1 : 0) - (this.held('ArrowLeft') ? 1 : 0);
    if (dirKey) p.vx = dirKey * 270;
    else if (this.pointerPos.down) p.vx = clamp((this.pointerPos.x - p.x) * 7, -300, 300);
    else p.vx *= 0.8;
    if (dirKey) p.face = dirKey;
    p.x += p.vx * dt;
    if (p.x < -14) p.x = W + 14; if (p.x > W + 14) p.x = -14;
    const prevY = p.y;
    p.vy += G * dt; p.y += p.vy * dt;
    // landing
    if (p.vy > 0) {
      for (const pl of this.plats) {
        if (pl.gone) continue;
        const feet = p.y + 16, pfeet = prevY + 16;
        if (pfeet <= pl.y + 2 && feet >= pl.y && p.x > pl.x - 8 && p.x < pl.x + PW + 8) {
          if (pl.type === 'crumble') { pl.gone = true; this.sfx(120, 0.15, 'sawtooth', 0.04, -60); continue; }
          p.vy = -BOUNCE; p.y = pl.y - 16;
          const sp = this.items.find((i) => i.kind === 'spring' && i.pl === pl);
          if (sp && Math.abs(p.x - (pl.x + PW / 2)) < 20) { p.vy = -SPRING; this.sfx(900, 0.2, 'triangle', 0.05, 500); } else this.sfx(520, 0.07, 'square', 0.03, 120);
          break;
        }
      }
    }
    for (const it of this.items) {
      if (it.kind !== 'spike') continue;
      const sx = it.pl.x + PW / 2 + Math.sin(this.time * 1.5 + it.t) * 14, sy = it.pl.y - 20;
      if (Math.hypot(p.x - sx, p.y - sy) < 24) { this.sfx(150, 0.4, 'sawtooth', 0.06, -100); this.gameOver('Ouch!'); return; }
    }
    for (const pl of this.plats) if (pl.type === 'move' && !pl.gone) { pl.x += pl.dir * 70 * dt; if (pl.x < 0 || pl.x > W - PW) pl.dir *= -1; }
    // camera follows upwards only
    if (p.y < this.cam + H * 0.4) this.cam = p.y - H * 0.4;
    const h = Math.max(0, Math.round(-(p.y - (H - 120)) / 10));
    if (h > this.maxH) { this.maxH = h; this.setScore(h); }
    while (this.top > this.cam - 200) this.spawnRow();
    this.plats = this.plats.filter((pl) => pl.y < this.cam + H + 60);
    this.items = this.items.filter((i) => i.pl.y < this.cam + H + 60);
    if (p.y > this.cam + H + 30) { this.sfx(140, 0.5, 'sawtooth', 0.06, -90); this.gameOver('You fell!'); }
  }

  draw(ctx) {
    const cam = this.cam;
    const sky = ctx.createLinearGradient(0, 0, 0, H); const t = clamp(-cam / 12000, 0, 1);
    sky.addColorStop(0, `hsl(${205 + t * 50}, 70%, ${70 - t * 45}%)`); sky.addColorStop(1, `hsl(${195 + t * 40}, 75%, ${85 - t * 40}%)`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 6; i++) { const cy = ((i * 213 - cam * 0.3) % (H + 120) + H + 120) % (H + 120) - 40; ctx.beginPath(); ctx.ellipse((i * 97) % W, cy, 46, 15, 0, 0, 7); ctx.fill(); }
    for (const pl of this.plats) {
      if (pl.gone) continue;
      const y = pl.y - cam;
      ctx.fillStyle = pl.type === 'solid' ? '#59c24a' : pl.type === 'move' ? '#4a90e2' : '#b5835a';
      roundRect(ctx, pl.x, y, PW, PH, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(pl.x + 6, y + 2, PW - 12, 3);
      if (pl.type === 'crumble') { ctx.strokeStyle = 'rgba(60,30,10,.6)'; ctx.beginPath(); ctx.moveTo(pl.x + 20, y); ctx.lineTo(pl.x + 26, y + PH); ctx.moveTo(pl.x + 42, y); ctx.lineTo(pl.x + 36, y + PH); ctx.stroke(); }
    }
    for (const it of this.items) {
      const base = it.pl.y - cam;
      if (it.kind === 'spring') { ctx.fillStyle = '#ddd'; ctx.fillRect(it.pl.x + PW / 2 - 8, base - 12, 16, 12); ctx.strokeStyle = '#e24a4a'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(it.pl.x + PW / 2 - 8, base - 3 * i - 1); ctx.lineTo(it.pl.x + PW / 2 + 8, base - 3 * i - 4); } ctx.stroke(); ctx.lineWidth = 1; }
      else { const sx = it.pl.x + PW / 2 + Math.sin(this.time * 1.5 + it.t) * 14, sy = base - 20; ctx.fillStyle = '#8a3fd1'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? 11 : 19; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(sx - 6, sy - 4, 4, 5); ctx.fillRect(sx + 2, sy - 4, 4, 5); }
    }
    // the hopper: a round green fellow with big eyes
    const p = this.p, x = p.x, y = p.y - cam;
    const squash = clamp(p.vy / 1500, -0.25, 0.25);
    ctx.save(); ctx.translate(x, y); ctx.scale(1 - squash * 0.5, 1 + squash);
    ctx.fillStyle = '#ffd23f'; roundRect(ctx, -15, -16, 30, 32, 13); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.face * 4 - 5, -5, 6, 0, 7); ctx.arc(p.face * 4 + 6, -5, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.face * 6 - 5, -5, 2.6, 0, 7); ctx.arc(p.face * 6 + 6, -5, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8892b'; ctx.fillRect(-10 + p.face * 3, 4, 20, 4);
    ctx.fillStyle = '#e8892b'; ctx.fillRect(-12, 14, 8, 5); ctx.fillRect(4, 14, 8, 5);
    ctx.restore();
    text(ctx, `${this.maxH} m`, 14, 22, { size: 16, align: 'left', color: 'rgba(0,0,0,.55)' });
  }
}

new SkyHop().mount();
