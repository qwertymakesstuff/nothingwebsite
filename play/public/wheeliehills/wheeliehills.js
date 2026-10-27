import { Game, rand, clamp, text } from '../assets/gamekit.js';

const W = 720, H = 420;
// bike physics (px, seconds). One rigid body with two spring-loaded wheels.
const G = 900, M = 1, I = 1500, WR = 14, K = 140, CD = 15, MU = 1.25, DRIVE = 430, ROLL = 0.55, BRAKE = 5, LEAN = 8500;
const WHEELS = [{ lx: -34, ly: 16, rear: true }, { lx: 34, ly: 16, rear: false }];
const HEAD = { lx: 6, ly: -46 }, ROOF = { lx: -10, ly: -22 };
const STEP = 36; // terrain point spacing

class WheelieHills extends Game {
  constructor() {
    super({
      slug: 'wheeliehills', title: 'Wheelie Hills', width: W, height: H, bg: '#8fd0ff', scoreLabel: 'Distance', format: (n) => `${n} m`,
      help: 'Ride the bike as far as you can without landing on your head. Up (or W) is gas, down is brake, and left / right lean the bike back and forward, which also spins you in the air. Land flips for bonus points, grab the stars, and keep your head off the ground!',
      controls: { buttons: [{ code: 'ArrowLeft', label: '↶ Back', hold: true }, { code: 'ArrowRight', label: '↷ Fwd', hold: true }, { code: 'ArrowDown', label: 'Brake', hold: true }, { code: 'ArrowUp', label: '⛽ GAS', hold: true }] },
    });
  }

  reset() {
    this.hs = [330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330, 330]; // flat start
    this.bumps = []; this.stars = [];
    this.b = { x: 100, y: 290, vx: 0, vy: 0, th: 0, w: 0 };
    this.cam = { x: 0, y: 0 };
    this.crash = null; this.parts = []; this.air = 0; this.spin = 0; this.flips = 0; this.pop = []; this.bonus = 0; this.dist = 0; this.stars_ = 0;
    this.extend(1400);
  }

  extend(toX) {
    while (this.hs.length * STEP < toX) {
      const i = this.hs.length, dist = i * STEP / 10, prev = this.hs[i - 1];
      const slope = clamp(8 + dist / 60, 8, 26);
      let h;
      const roll = Math.random();
      if (roll < 0.05 && dist > 40) { // a ramp: steep rise, then the ground drops away
        for (let k = 0; k < 4; k++) this.hs.push(this.hs.at(-1) - 16 - dist / 400);
        h = this.hs.at(-1) + 56;
        this.hs.push(h + 18);
        continue;
      }
      h = prev + rand(-slope, slope) + (330 - prev) * 0.04;
      this.hs.push(clamp(h, 170, 420));
      if (dist > 25 && Math.random() < 0.07) this.bumps.push({ x: i * STEP + 10, w: rand(18, 30), h: rand(10, 16) });
      if (Math.random() < 0.09) this.stars.push({ x: i * STEP, y: -1, taken: false });
    }
  }

  ground(x) {
    if (x < 0) return this.hs[0];
    const i = Math.floor(x / STEP), f = x / STEP - i, a = this.hs[i] ?? this.hs.at(-1), b = this.hs[i + 1] ?? a;
    let y = a + (b - a) * f;
    for (const bp of this.bumps) if (x > bp.x && x < bp.x + bp.w) { const t = (x - bp.x) / bp.w; y -= bp.h * Math.sin(t * Math.PI); }
    return y;
  }

  slope(x) { return (this.ground(x + 2) - this.ground(x - 2)) / 4; }

  press() {}

  update(dt) {
    const frameDt = Math.min(dt, 0.033), sub = 6, h = frameDt / sub;
    if (!this.crash) for (let i = 0; i < sub; i++) { this.step(h); if (this.crash) break; }
    else this.stepFree(frameDt);
    const b = this.b;
    this.extend(b.x + 900);
    // stars sit above the ground once it exists
    for (const s of this.stars) {
      if (s.y < 0) s.y = this.ground(s.x) - rand(40, 90);
      if (!s.taken && Math.hypot(s.x - b.x, s.y - b.y) < 34) { s.taken = true; this.stars_++; this.bonus += 25; this.say('+25', s.x, s.y); this.sfx(900, 0.12, 'triangle', 0.05, 300); }
    }
    this.cam.x += (b.x - 200 - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (clamp(b.y - 250, -200, 160) - this.cam.y) * Math.min(1, dt * 3);
    this.dist = Math.max(this.dist, Math.floor((b.x - 100) / 10));
    if (!this.crash) this.setScore(this.dist + this.bonus);
    this.pop.forEach((p) => { p.t -= dt; }); this.pop = this.pop.filter((p) => p.t > 0);
    this.parts.forEach((p) => this.stepPart(p, dt));
    if (this.crash) { this.crash.t += dt; if (this.crash.t > 1.6) this.gameOver(this.crash.msg); }
  }

  say(v, x, y) { this.pop.push({ v, x, y, t: 0.9 }); }

  step(h) {
    const b = this.b;
    const gas = this.held('ArrowUp'), brake = this.held('ArrowDown');
    const lean = (this.held('ArrowRight') ? 1 : 0) - (this.held('ArrowLeft') ? 1 : 0);
    const c = Math.cos(b.th), s = Math.sin(b.th);
    let fx = 0, fy = M * G, tq = lean * LEAN, touching = 0;
    for (const wh of WHEELS) {
      const rx = wh.lx * c - wh.ly * s, ry = wh.lx * s + wh.ly * c, wx = b.x + rx, wy = b.y + ry;
      const gy = this.ground(wx), pen = wy + WR - gy;
      if (pen <= 0) continue;
      touching++;
      const sl = this.slope(wx), nrm = Math.hypot(1, sl), nx = sl / nrm, ny = -1 / nrm, tx = 1 / nrm, ty = sl / nrm;
      const vwx = b.vx - b.w * ry, vwy = b.vy + b.w * rx;
      const vn = vwx * nx + vwy * ny, vt = vwx * tx + vwy * ty;
      const Fn = clamp(K * pen - CD * vn, 0, 3000);
      let Ft = (gas && wh.rear ? DRIVE : 0) - ROLL * vt - (brake ? BRAKE * vt : 0);
      Ft = clamp(Ft, -MU * Fn, MU * Fn);
      const Fx = nx * Fn + tx * Ft, Fy = ny * Fn + ty * Ft;
      fx += Fx; fy += Fy; tq += rx * Fy - ry * Fx;
    }
    b.vx += (fx / M) * h; b.vy += (fy / M) * h; b.w += (tq / I) * h;
    b.w *= 1 - 0.6 * h;
    b.x += b.vx * h; b.y += b.vy * h; b.th += b.w * h;
    // flips: count full turns while airborne
    if (touching === 0) { this.air += h; this.spin += b.w * h; }
    else {
      if (this.air > 0.3) { const turns = Math.round(Math.abs(this.spin) / (Math.PI * 2)); if (turns >= 1 && Math.abs(this.spin) > Math.PI * 1.6) { this.flips += turns; this.bonus += 50 * turns; this.say(`${turns > 1 ? turns + 'x ' : ''}FLIP! +${50 * turns}`, b.x, b.y - 60); this.sfx(700, 0.2, 'triangle', 0.05, 300); } }
      this.air = 0; this.spin = 0;
    }
    // the rider's head or back touching the ground (or falling in a hole) ends the ride
    for (const [pt, r, why] of [[HEAD, 10, 'Head first!'], [ROOF, 8, 'Crashed!']]) {
      const px = b.x + pt.lx * c - pt.ly * s, py = b.y + pt.lx * s + pt.ly * c;
      if (py + r > this.ground(px)) { this.doCrash(why); return; }
    }
    if (b.y > 760) this.doCrash('Fell off the world');
  }

  doCrash(msg) {
    const b = this.b, c = Math.cos(b.th), s = Math.sin(b.th);
    this.crash = { t: 0, msg };
    this.sfx(120, 0.5, 'sawtooth', 0.07, -80);
    const mk = (type, lx, ly, r) => ({ type, r, x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c, vx: b.vx * 0.9 + rand(-120, 120), vy: b.vy * 0.9 - rand(100, 340), rot: b.th, vr: rand(-9, 9) });
    this.parts = [mk('head', HEAD.lx, HEAD.ly, 10), mk('torso', 0, -30, 0), mk('leg', 0, -10, 0), mk('arm', 10, -34, 0)];
  }

  stepFree(dt) { // the bike drifts on after a crash
    const b = this.b;
    b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.th += b.w * dt;
    const gy = this.ground(b.x); if (b.y + 18 > gy) { b.y = gy - 18; b.vy *= -0.3; b.vx *= 0.9; b.w *= 0.9; }
  }

  stepPart(p, dt) {
    p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    const gy = this.ground(p.x);
    if (p.y + (p.r || 6) > gy) { p.y = gy - (p.r || 6); p.vy *= -0.38; p.vx *= 0.78; p.vr *= 0.8; }
  }

  draw(ctx) {
    const cx = this.cam.x, cy = this.cam.y;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5db2ee'); sky.addColorStop(1, '#d9f1ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.arc(600, 70, 32, 0, 7); ctx.fill();
    ctx.fillStyle = '#a9d6a0'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 250 - Math.sin((x + cx * 0.25) * 0.01) * 38 - Math.sin((x + cx * 0.25) * 0.027) * 14 - cy * 0.2); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) { const x = ((i * 240 - cx * 0.3) % 1200 + 1200) % 1200 - 120; ctx.beginPath(); ctx.ellipse(x, 60 + (i % 3) * 36, 48, 14, 0, 0, 7); ctx.fill(); }
    // ground
    ctx.beginPath(); ctx.moveTo(-10, H + 20);
    for (let sx = -10; sx <= W + 10; sx += 6) ctx.lineTo(sx, this.ground(sx + cx) - cy);
    ctx.lineTo(W + 10, H + 20); ctx.closePath();
    ctx.fillStyle = '#7a5a36'; ctx.fill();
    ctx.strokeStyle = '#4fb04a'; ctx.lineWidth = 7; ctx.beginPath(); for (let sx = -10; sx <= W + 10; sx += 6) { const gy = this.ground(sx + cx) - cy; sx === -10 ? ctx.moveTo(sx, gy) : ctx.lineTo(sx, gy); } ctx.stroke(); ctx.lineWidth = 1;
    // stars
    for (const s of this.stars) if (!s.taken && s.y > 0 && s.x - cx > -30 && s.x - cx < W + 30) { ctx.save(); ctx.translate(s.x - cx, s.y - cy + Math.sin(this.time * 4 + s.x) * 3); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 6 : 13; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
    this.drawBike(ctx, cx, cy);
    for (const p of this.parts) this.drawPart(ctx, p, cx, cy);
    for (const o of this.pop) text(ctx, o.v, o.x - cx, o.y - cy - (0.9 - o.t) * 30, { size: 18, color: '#16304f' });
    text(ctx, `${this.dist} m`, W / 2, 24, { size: 22, color: '#16304f' });
    if (this.bonus) text(ctx, `bonus +${this.bonus}`, W / 2, 46, { size: 12, color: '#16304f' });
  }

  drawBike(ctx, cx, cy) {
    const b = this.b;
    ctx.save(); ctx.translate(b.x - cx, b.y - cy); ctx.rotate(b.th);
    // wheels
    for (const wh of WHEELS) {
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(wh.lx, wh.ly, WR, 0, 7); ctx.fill();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wh.lx, wh.ly, WR - 4, 0, 7); ctx.stroke();
      const a = this.time * b.vx / WR * 0.3 + (wh.rear ? 0 : 1); ctx.beginPath(); ctx.moveTo(wh.lx, wh.ly); ctx.lineTo(wh.lx + Math.cos(a) * (WR - 4), wh.ly + Math.sin(a) * (WR - 4)); ctx.stroke(); ctx.lineWidth = 1;
    }
    // frame
    ctx.strokeStyle = '#e8453c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, 16); ctx.lineTo(-8, -6); ctx.lineTo(18, -8); ctx.lineTo(34, 16); ctx.moveTo(-8, -6); ctx.lineTo(4, 16); ctx.lineTo(34, 16); ctx.moveTo(18, -8); ctx.lineTo(24, -20); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.fillRect(-18, -12, 26, 7);
    ctx.lineWidth = 1;
    if (!this.crash) {
      ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(2, -34); ctx.lineTo(18, -26); ctx.moveTo(-6, -12); ctx.lineTo(6, 4); ctx.lineTo(4, 14); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(HEAD.lx, HEAD.ly + 6, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e8453c'; ctx.beginPath(); ctx.arc(HEAD.lx, HEAD.ly + 4, 10, Math.PI, 0); ctx.fill();
    }
    ctx.restore();
  }

  drawPart(ctx, p, cx, cy) {
    ctx.save(); ctx.translate(p.x - cx, p.y - cy); ctx.rotate(p.rot);
    if (p.type === 'head') { ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e8453c'; ctx.beginPath(); ctx.arc(0, -2, 10, Math.PI, 0); ctx.fill(); }
    else { ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke(); }
    ctx.restore();
  }
}

new WheelieHills().mount();
