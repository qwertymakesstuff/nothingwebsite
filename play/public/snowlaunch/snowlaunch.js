import { Game, clamp, rand, roundRect, text, saved } from '/assets/gamekit.js';

const W = 720, H = 420, GROUND = 340, FLIGHTS = 8;
const UPGRADES = [
  { id: 'ramp', name: 'Ramp', desc: 'Launch faster' },
  { id: 'glider', name: 'Wings', desc: 'Glide further' },
  { id: 'rocket', name: 'Rocket', desc: 'More boost fuel' },
  { id: 'bounce', name: 'Skis', desc: 'Slide and bounce further' },
];
const price = (lvl) => Math.round(30 * Math.pow(1.75, lvl));
const MAX_LVL = 7;

class SnowLaunch extends Game {
  constructor() {
    super({
      slug: 'snowlaunch', title: 'Snow Launch', width: W, height: H, bg: '#a9dcff', scoreLabel: 'Best flight', format: (n) => `${n} m`,
      help: 'Launch the penguin as far as you can! Press space (or tap) when the power bar is high. In the air hold up to glide and down to dive, and hold space for rocket boost. Spend your coins on upgrades between flights. Each season has 8 flights, and your upgrades are kept.',
      controls: { pointer: true, buttons: [{ code: 'ArrowUp', label: '▲ Glide', hold: true }, { code: 'ArrowDown', label: '▼ Dive', hold: true }, { code: 'Space', label: '🔥 Boost', hold: true }] },
    });
  }

  reset() {
    this.up = saved.get('play:snowlaunch:upgrades', { ramp: 0, glider: 0, rocket: 0, bounce: 0 });
    this.coins = saved.get('play:snowlaunch:coins', 0);
    this.flight = 0; this.bestRun = 0; this.phase = 'power'; this.resetPenguin();
    this.setScore(0);
  }

  persist() { saved.set('play:snowlaunch:upgrades', this.up); saved.set('play:snowlaunch:coins', this.coins); }

  resetPenguin() {
    this.p = { x: 60, y: GROUND - 36, vx: 0, vy: 0, ang: -0.6 };
    this.cam = 0; this.fuel = 0; this.meter = 0; this.t = 0; this.result = null; this.maxX = 0; this.trail = [];
  }

  launch() {
    const power = 0.35 + 0.65 * this.meter;
    const sp = 330 + this.up.ramp * 90 + power * (330 + this.up.ramp * 45);
    const a = 0.62 + power * 0.1;
    this.p.vx = Math.cos(a) * sp; this.p.vy = -Math.sin(a) * sp;
    this.fuel = this.up.rocket * 0.9;
    this.phase = 'fly'; this.sfx(240, 0.25, 'sawtooth', 0.05, 400);
  }

  press(code) {
    if (this.phase === 'power' && (code === 'Space' || code === 'Enter')) this.launch();
    else if (this.phase === 'shop' && (code === 'Space' || code === 'Enter')) this.nextFlight();
    else if (this.phase === 'shop' && /^Digit[1-4]$/.test(code)) this.buy(Number(code.slice(5)) - 1);
  }

  pointer(type, x, y) {
    if (type !== 'down') return;
    if (this.phase === 'power') { this.launch(); return; }
    if (this.phase !== 'shop') return;
    UPGRADES.forEach((u, i) => { const bx = 40 + i * 166, by = 150; if (x > bx && x < bx + 150 && y > by && y < by + 130) this.buy(i); });
    if (x > W / 2 - 90 && x < W / 2 + 90 && y > 300 && y < 352) this.nextFlight();
  }

  buy(i) {
    const u = UPGRADES[i]; const lvl = this.up[u.id];
    if (!u || lvl >= MAX_LVL || this.coins < price(lvl)) { this.sfx(150, 0.1, 'square', 0.04); return; }
    this.coins -= price(lvl); this.up[u.id]++; this.persist(); this.sfx(760, 0.15, 'triangle', 0.05, 300);
  }

  nextFlight() {
    if (this.flight >= FLIGHTS) { this.gameOver('Season over!'); return; }
    this.resetPenguin(); this.phase = 'power';
  }

  update(dt) {
    this.t += dt;
    const p = this.p;
    if (this.phase === 'power') { this.meter = (Math.sin(this.t * 3.2) + 1) / 2; return; }
    if (this.phase !== 'fly') return;
    const glide = this.up.glider;
    const upKey = this.held('ArrowUp'), downKey = this.held('ArrowDown');
    p.vy += 520 * dt;
    if (p.y < GROUND - 30) {
      if (upKey && p.vy > -60) { p.vy -= (360 + glide * 150) * dt; p.vx *= 1 - 0.12 * dt; }
      if (downKey) { p.vy += 900 * dt; p.vx += 120 * dt; }
      if (this.held('Space') && this.fuel > 0) { this.fuel -= dt; p.vx += 520 * dt; p.vy -= 160 * dt; if (Math.floor(this.t * 30) % 3 === 0) this.trail.push({ x: p.x - 18, y: p.y + 10, t: 0.5 }); }
      p.vx *= 1 - 0.05 * dt; // air drag
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.ang = Math.atan2(p.vy, p.vx);
    if (p.y >= GROUND - 30) {
      p.y = GROUND - 30;
      if (Math.abs(p.vy) > 120) { p.vy = -p.vy * (0.34 + this.up.bounce * 0.05); p.vx *= 0.8 + this.up.bounce * 0.018; this.sfx(160, 0.08, 'square', 0.04); }
      else { p.vy = 0; p.vx *= 1 - (1.1 - this.up.bounce * 0.1) * dt; }
      if (p.vx < 35) { this.endFlight(); return; }
    }
    this.trail.forEach((o) => { o.t -= dt; }); this.trail = this.trail.filter((o) => o.t > 0);
    this.maxX = Math.max(this.maxX, p.x);
    this.cam = Math.max(0, p.x - 220);
    this.setScore(Math.max(this.bestRun, this.dist()));
  }

  dist() { return Math.max(0, Math.round((this.maxX - 60) / 10)); }

  endFlight() {
    this.flight++;
    const d = this.dist();
    this.bestRun = Math.max(this.bestRun, d);
    this.setScore(this.bestRun);
    const earned = Math.round(d * 0.9 + 12);
    this.coins += earned; this.persist();
    this.result = { d, earned };
    this.phase = 'shop'; this.sfx(520, 0.2, 'triangle', 0.05, 200);
  }

  draw(ctx) {
    // sky + sun + parallax mountains
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#4aa3e8'); sky.addColorStop(1, '#d8f1ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.arc(600, 70, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#bcd9ee'; for (let i = -1; i < 8; i++) { const x = i * 220 - ((this.cam * 0.2) % 220); ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 110, GROUND - 120 - (i % 3) * 25); ctx.lineTo(x + 220, GROUND); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) { const x = ((i * 260 - this.cam * 0.4) % 1300 + 1300) % 1300 - 100; ctx.beginPath(); ctx.ellipse(x, 60 + (i % 3) * 40, 50, 15, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#dcecf7'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 120 - this.cam) % (W + 120) + W + 120) % (W + 120) - 60, GROUND + 20 + (i % 3) * 18, 50, 4);
    // distance markers
    ctx.fillStyle = '#7ba7c6'; for (let m = 0; m < 400; m += 25) { const x = 60 + m * 10 - this.cam; if (x > -20 && x < W + 20) { ctx.fillRect(x, GROUND - 8, 2, 8); text(ctx, `${m}`, x, GROUND + 12, { size: 10, color: '#7ba7c6' }); } }
    // ramp
    const rx = 20 - this.cam; ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.moveTo(rx, GROUND); ctx.lineTo(rx + 80, GROUND); ctx.lineTo(rx + 80, GROUND - 6); ctx.lineTo(rx + 8, GROUND - 40); ctx.closePath(); ctx.fill();
    // rocket trail
    this.trail.forEach((o) => { ctx.fillStyle = `rgba(255,${140 + o.t * 200 | 0},40,${o.t * 1.6})`; ctx.beginPath(); ctx.arc(o.x - this.cam, o.y, 5 + (0.5 - o.t) * 10, 0, 7); ctx.fill(); });
    // penguin
    const px = this.p.x - this.cam, py = this.p.y;
    ctx.save(); ctx.translate(px, py); ctx.rotate(this.phase === 'power' ? -0.5 : this.p.ang * 0.8);
    if (this.up.glider > 0 && this.phase === 'fly' && !(this.p.y >= GROUND - 31)) { ctx.fillStyle = '#e8453c'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-10 - this.up.glider * 3, -18 - this.up.glider * 2); ctx.lineTo(18 + this.up.glider * 4, -4); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#1d2433'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6f6f6'; ctx.beginPath(); ctx.ellipse(3, 3, 15, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.moveTo(20, -3); ctx.lineTo(32, 0); ctx.lineTo(20, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(14, -5, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(15, -5, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9a2e'; ctx.fillRect(-8, 12, 10, 4); ctx.fillRect(2, 12, 10, 4);
    if (this.phase === 'fly' && this.held('Space') && this.fuel > 0) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-44 - Math.random() * 10, 0); ctx.lineTo(-22, 4); ctx.fill(); }
    ctx.restore();
    // HUD
    text(ctx, `🪙 ${this.coins}`, 14, 20, { size: 15, align: 'left', color: '#16304f' });
    text(ctx, `Flight ${Math.min(this.flight + (this.phase === 'shop' ? 0 : 1), FLIGHTS)} / ${FLIGHTS}`, W - 14, 20, { size: 14, align: 'right', color: '#16304f' });
    if (this.phase === 'fly') {
      text(ctx, `${this.dist()} m`, W / 2, 28, { size: 26, color: '#16304f' });
      if (this.up.rocket) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(14, 34, 90, 8); ctx.fillStyle = '#ff7a2e'; ctx.fillRect(14, 34, 90 * clamp(this.fuel / (this.up.rocket * 0.9), 0, 1), 8); }
    }
    if (this.phase === 'power') {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(ctx, W / 2 - 110, 60, 220, 22, 11); ctx.fill();
      ctx.fillStyle = this.meter > 0.8 ? '#7dff3a' : this.meter > 0.45 ? '#ffd23f' : '#ff6a3d'; roundRect(ctx, W / 2 - 108, 62, 216 * this.meter, 18, 9); ctx.fill();
      text(ctx, 'Press space or tap to launch', W / 2, 104, { size: 15, color: '#16304f' });
    }
    if (this.phase === 'shop') this.drawShop(ctx);
  }

  drawShop(ctx) {
    ctx.fillStyle = 'rgba(14,30,52,.88)'; ctx.fillRect(0, 0, W, H);
    text(ctx, `Flight ${this.flight}: ${this.result.d} m   (+${this.result.earned} coins)`, W / 2, 50, { size: 24, color: '#fff' });
    text(ctx, `Best this season: ${this.bestRun} m      Coins: ${this.coins}`, W / 2, 86, { size: 15, color: '#9fd0ff' });
    UPGRADES.forEach((u, i) => {
      const bx = 40 + i * 166, by = 150, lvl = this.up[u.id], can = this.coins >= price(lvl) && lvl < MAX_LVL;
      ctx.fillStyle = can ? '#27456e' : '#1d2d44'; roundRect(ctx, bx, by, 150, 130, 14); ctx.fill();
      ctx.strokeStyle = can ? '#7dff3a' : '#3a4d68'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      text(ctx, `${i + 1}. ${u.name}`, bx + 75, by + 24, { size: 17, color: '#fff' });
      text(ctx, u.desc, bx + 75, by + 48, { size: 11, color: '#9fd0ff' });
      for (let k = 0; k < MAX_LVL; k++) { ctx.fillStyle = k < lvl ? '#ffd23f' : '#3a4d68'; ctx.fillRect(bx + 14 + k * 18, by + 66, 14, 8); }
      text(ctx, lvl >= MAX_LVL ? 'MAX' : `🪙 ${price(lvl)}`, bx + 75, by + 104, { size: 16, color: can ? '#7dff3a' : '#8aa0bd' });
    });
    ctx.fillStyle = '#2e9e4f'; roundRect(ctx, W / 2 - 90, 300, 180, 52, 26); ctx.fill();
    text(ctx, this.flight >= FLIGHTS ? 'Finish season' : 'Launch again', W / 2, 327, { size: 19, color: '#fff' });
    text(ctx, 'tap an upgrade to buy it, or press 1 to 4; space launches', W / 2, 384, { size: 12, color: '#9fd0ff' });
  }
}

new SnowLaunch().mount();
