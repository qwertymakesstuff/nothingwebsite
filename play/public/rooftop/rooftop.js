import { Game, rand, randInt, clamp, text } from '/assets/gamekit.js';

const W = 640, H = 360, RX = 130, RW = 22, RH = 42, GRAV = 1900, JUMP = 640;
const SKY = ['#ff9a5a', '#7a4fa8'];

class Rooftop extends Game {
  constructor() {
    super({
      slug: 'rooftop', title: 'Rooftop Run', width: W, height: H, bg: '#2a1f3d', scoreLabel: 'Distance',
      help: 'You cannot stop running. Jump the gaps between the buildings and over the crates. Press space, the up arrow, or tap to jump; hold for a higher jump. Falling or hitting a wall ends the run.',
      controls: { tap: 'Space', buttons: [{ code: 'Space', label: 'Jump', wide: true, hold: true }] },
    });
  }

  reset() {
    this.speed = 270; this.dist = 0;
    this.y = 220 - RH; this.vy = 0; this.ground = true; this.holding = false; this.coyote = 0; this.buffer = 0;
    this.bld = [{ x: -50, w: 520, top: 220, crates: [] }];
    this.edge = 470;
    while (this.edge < W + 800) this.addBuilding();
    this.birds = Array.from({ length: 5 }, () => ({ x: rand(0, W), y: rand(20, 120), s: rand(15, 30) }));
    this.step = 0;
  }

  addBuilding() {
    const last = this.bld.at(-1);
    const airtime = (2 * JUMP) / GRAV; // seconds in the air at most
    const maxGap = this.speed * airtime * 0.62;
    const gap = rand(70, Math.max(80, maxGap));
    const w = rand(220, 520);
    const maxUp = 80;
    let top = clamp(last.top + rand(-maxUp, 110), 150, 290);
    const b = { x: this.edge + gap, w, top, crates: [] };
    const n = w > 300 ? randInt(0, 2) : randInt(0, 1);
    for (let i = 0; i < n; i++) b.crates.push({ x: b.x + rand(130, w - 90), w: rand(26, 40), h: rand(26, 40) });
    this.bld.push(b);
    this.edge = b.x + w;
  }

  press(code) {
    if (code === 'Space' || code === 'ArrowUp') { this.buffer = 0.12; }
  }

  update(dt) {
    this.holding = this.held('Space') || this.held('ArrowUp') || this.pointerPos.down;
    this.speed = Math.min(560, 270 + this.dist / 40);
    const dx = this.speed * dt;
    this.dist += dx;
    this.bld.forEach((b) => { b.x -= dx; b.crates.forEach((c) => { c.x -= dx; }); });
    this.edge -= dx;
    this.bld = this.bld.filter((b) => b.x + b.w > -50);
    while (this.edge < W + 800) this.addBuilding();
    this.setScore(Math.floor(this.dist / 10));
    // jump
    this.buffer -= dt; this.coyote -= dt;
    if (this.ground) this.coyote = 0.09;
    if (this.buffer > 0 && this.coyote > 0) { this.vy = -JUMP; this.ground = false; this.coyote = 0; this.buffer = 0; this.sfx(420, 0.1, 'square', 0.04, 260); }
    if (!this.holding && this.vy < -250) this.vy = -250; // short hop when released early
    const prevFeet = this.y + RH;
    this.vy += GRAV * dt; this.y += this.vy * dt;
    const feet = this.y + RH;
    this.ground = false;
    for (const b of this.bld) {
      const over = RX + RW / 2 > b.x + 2 && RX - RW / 2 < b.x + b.w - 2;
      if (!over) continue;
      if (this.vy >= 0 && prevFeet <= b.top + 6 && feet >= b.top) { this.y = b.top - RH; this.vy = 0; this.ground = true; }
      else if (feet > b.top + 10 && RX + RW / 2 > b.x && RX - RW / 2 < b.x + 14 && !this.ground) { this.crash('Smacked into a wall'); return; }
      for (const c of b.crates) {
        if (RX + RW / 2 > c.x + 3 && RX - RW / 2 < c.x + c.w - 3 && this.y + RH > b.top - c.h + 4 && this.y < b.top) {
          if (this.vy >= 0 && prevFeet <= b.top - c.h + 6) { this.y = b.top - c.h - RH; this.vy = 0; this.ground = true; } else { this.crash('Tripped on a crate'); return; }
        }
      }
    }
    if (this.y > H + 60) this.crash('Missed the jump');
    this.step += dt * (this.speed / 38);
    this.birds.forEach((o) => { o.x -= (20 + o.s) * dt; if (o.x < -20) { o.x = W + 20; o.y = rand(20, 120); } });
  }

  crash(msg) { this.sfx(130, 0.5, 'sawtooth', 0.06, -90); this.gameOver(msg); }

  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, SKY[0]); g.addColorStop(1, SKY[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe3a8'; ctx.beginPath(); ctx.arc(480, 110, 46, 0, 7); ctx.fill();
    // far skyline
    ctx.fillStyle = 'rgba(70,40,100,.55)';
    for (let i = 0; i < 14; i++) { const x = ((i * 90 - this.dist * 0.15) % (W + 180) + W + 180) % (W + 180) - 90; ctx.fillRect(x, 200 - ((i * 37) % 70), 64, 200); }
    ctx.fillStyle = 'rgba(30,20,50,.8)';
    this.birds.forEach((b) => { ctx.fillRect(b.x, b.y, 8, 2); ctx.fillRect(b.x + 2, b.y - 2, 4, 2); });
    for (const b of this.bld) {
      ctx.fillStyle = '#24193a'; ctx.fillRect(b.x, b.top, b.w, H - b.top);
      ctx.fillStyle = '#3a2a5c'; ctx.fillRect(b.x, b.top, b.w, 7);
      ctx.fillStyle = '#ffd66b';
      for (let wx = b.x + 18; wx < b.x + b.w - 14; wx += 34) for (let wy = b.top + 26; wy < H - 10; wy += 34) if (((wx * 7 + wy * 3) | 0) % 5 > 1) ctx.fillRect(wx, wy, 14, 18);
      ctx.fillStyle = '#6b4a2a'; b.crates.forEach((c) => { ctx.fillRect(c.x, b.top - c.h, c.w, c.h); ctx.strokeStyle = '#3d2a14'; ctx.strokeRect(c.x + 0.5, b.top - c.h + 0.5, c.w - 1, c.h - 1); ctx.beginPath(); ctx.moveTo(c.x, b.top - c.h); ctx.lineTo(c.x + c.w, b.top); ctx.moveTo(c.x + c.w, b.top - c.h); ctx.lineTo(c.x, b.top); ctx.stroke(); });
    }
    // the runner
    const x = RX, y = this.y;
    ctx.fillStyle = '#111'; ctx.fillRect(x - 9, y + 8, 18, 22);        // body
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(x + 1, y + 4, 8, 0, 7); ctx.fill(); // head
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 10, y - 2, 20, 4);      // headband
    ctx.fillRect(x - 18 - Math.sin(this.step) * 2, y, 9, 3);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const legA = this.ground ? Math.sin(this.step * 2) * 0.9 : 0.9, legB = this.ground ? -Math.sin(this.step * 2) * 0.9 : -0.5;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x + Math.sin(legA) * 14, y + 28 + Math.cos(legA) * 14); ctx.moveTo(x, y + 28); ctx.lineTo(x + Math.sin(legB) * 14, y + 28 + Math.cos(legB) * 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + 10, y + 20 + Math.sin(this.step * 2) * 4); ctx.moveTo(x, y + 14); ctx.lineTo(x - 8, y + 18 - Math.sin(this.step * 2) * 4); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

new Rooftop().mount();
