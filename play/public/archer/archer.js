import { Game, rand, clamp, text } from '../assets/gamekit.js';

const W = 720, H = 420, GROUND = 340, GRAV = 620, MAX_SPEED = 820;
const PX = 100, EX = 620; // archers' feet x

const stickHit = (x, y, ax, ay) => {
  // head circle above the feet position (x, y); body capsule below it
  if (Math.hypot(ax - x, ay - (y - 52)) < 12) return 'head';
  if (ax > x - 11 && ax < x + 11 && ay > y - 42 && ay < y) return 'body';
  return null;
};

class Archer extends Game {
  constructor() {
    super({
      slug: 'archer', title: 'Archer Duel', width: W, height: H, bg: '#8ec9ff', scoreLabel: 'Score',
      help: 'Take turns shooting an enemy archer. Press and drag back anywhere, like pulling a bowstring, then let go to fire. A headshot is an instant win; watch the wind flag. On a keyboard: up / down aim, hold space to charge and release to shoot.',
      controls: { pointer: true, buttons: [{ code: 'ArrowUp', label: '▲', hold: true }, { code: 'ArrowDown', label: '▼', hold: true }, { code: 'Space', label: 'Hold to charge', hold: true }] },
    });
  }

  reset() {
    this.level = 1; this.php = 100; this.newEnemy();
  }

  newEnemy() {
    this.ehp = 70 + this.level * 12; this.emax = this.ehp;
    this.arrows = []; this.turn = 'player'; this.wait = 0; this.afterShot = false; this.switching = false; this.enemyDelay = 0; this.pull = null; this.aim = 0.7; this.charge = 0;
    this.wind = rand(-1, 1); this.msg = ''; this.msgT = 0; this.pop = []; this.shots = 0;
  }

  press() {}

  say(m) { this.msg = m; this.msgT = 1.4; }

  pointer(type, x, y) {
    if (this.turn !== 'player' || this.arrows.length) return;
    if (type === 'down') this.pull = { x, y, cx: x, cy: y };
    else if (type === 'move' && this.pull && this.pointerPos.down) { this.pull.cx = x; this.pull.cy = y; this.updateAimFromPull(); }
    else if (type === 'up' && this.pull) {
      const power = this.pullPower();
      if (power > 0.12) this.shoot('player', this.aim, power);
      this.pull = null;
    }
  }

  pullVec() { return this.pull ? { dx: this.pull.x - this.pull.cx, dy: this.pull.y - this.pull.cy } : { dx: 0, dy: 0 }; }
  pullPower() { const { dx, dy } = this.pullVec(); return clamp(Math.hypot(dx, dy) / 130, 0, 1); }
  updateAimFromPull() { const { dx, dy } = this.pullVec(); if (Math.hypot(dx, dy) > 6) this.aim = clamp(Math.atan2(-dy, dx), -0.3, 1.5); }

  shoot(who, aim, power) {
    const x0 = who === 'player' ? PX + 6 : EX - 6, y0 = GROUND - 44;
    const dir = who === 'player' ? 1 : -1, sp = MAX_SPEED * (0.25 + 0.75 * power);
    this.arrows.push({ x: x0, y: y0, vx: Math.cos(aim) * sp * dir, vy: -Math.sin(aim) * sp, who, trail: [], stuck: null });
    this.sfx(260, 0.12, 'sawtooth', 0.04, 300);
    this.shots++; this.afterShot = true;
  }

  // simulate an arrow (used by the computer opponent to line up a shot)
  simulate(aim, power) {
    let x = EX - 6, y = GROUND - 44, vx = -Math.cos(aim) * MAX_SPEED * (0.25 + 0.75 * power), vy = -Math.sin(aim) * MAX_SPEED * (0.25 + 0.75 * power), best = 1e9;
    for (let t = 0; t < 4; t += 1 / 60) {
      vx += this.wind * 38 / 60; vy += GRAV / 60; x += vx / 60; y += vy / 60;
      best = Math.min(best, Math.hypot(x - PX, y - (GROUND - 30)));
      if (y > GROUND + 5 || x < 0) break;
    }
    return best;
  }

  enemyShot() {
    let best = null;
    for (let a = 0.15; a < 1.3; a += 0.02) for (let p = 0.35; p <= 1; p += 0.03) { const d = this.simulate(a, p); if (!best || d < best.d) best = { a, p, d }; }
    const err = Math.max(0.015, 0.2 - this.level * 0.018);
    this.shoot('enemy', best.a + rand(-err, err), clamp(best.p + rand(-err, err) * 2, 0.2, 1));
  }

  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt);
    this.pop.forEach((o) => { o.t -= dt; }); this.pop = this.pop.filter((o) => o.t > 0);
    if (this.turn === 'player' && !this.arrows.length) {
      if (!this.pull) {
        if (this.held('ArrowUp')) this.aim = clamp(this.aim + dt * 0.9, -0.3, 1.5);
        if (this.held('ArrowDown')) this.aim = clamp(this.aim - dt * 0.9, -0.3, 1.5);
        if (this.held('Space')) this.charge = Math.min(1, this.charge + dt * 0.9);
        else if (this.charge > 0.1) { this.shoot('player', this.aim, this.charge); this.charge = 0; } else this.charge = 0;
      }
    }
    for (const a of this.arrows) {
      if (a.stuck) { a.stuck.t -= dt; continue; }
      a.vx += this.wind * 38 * dt; a.vy += GRAV * dt; a.x += a.vx * dt; a.y += a.vy * dt;
      a.trail.push({ x: a.x, y: a.y }); if (a.trail.length > 14) a.trail.shift();
      const target = a.who === 'player' ? { x: EX, hit: 'e' } : { x: PX, hit: 'p' };
      const part = stickHit(target.x, GROUND, a.x, a.y);
      if (part) { this.hit(a, target.hit, part); continue; }
      if (a.y >= GROUND || a.x < -20 || a.x > W + 20 || a.y > H) a.stuck = { t: 0.5 };
    }
    this.arrows = this.arrows.filter((a) => !a.stuck || a.stuck.t > 0);
    // turn flow: shot lands -> short pause -> other side's turn -> (enemy thinks, then shoots)
    if (this.state === 'playing' && !this.arrows.length) {
      if (this.afterShot) { this.afterShot = false; this.wait = 0.7; this.switching = true; }
      else if (this.switching) { this.wait -= dt; if (this.wait <= 0) { this.switching = false; this.nextTurn(); if (this.turn === 'enemy') this.enemyDelay = 0.8; } }
      else if (this.turn === 'enemy' && this.enemyDelay > 0) { this.enemyDelay -= dt; if (this.enemyDelay <= 0) this.enemyShot(); }
    }
  }

  nextTurn() {
    this.turn = this.turn === 'player' ? 'enemy' : 'player';
    this.wind = clamp(this.wind + rand(-0.5, 0.5), -1, 1);
    this.pull = null;
  }

  hit(a, who, part) {
    a.stuck = { t: 0.01 };
    const dmg = part === 'head' ? 999 : 34;
    const x = who === 'e' ? EX : PX;
    this.pop.push({ x, y: GROUND - (part === 'head' ? 70 : 40), t: 0.9, v: part === 'head' ? 'HEADSHOT!' : `-${dmg}` });
    this.sfx(part === 'head' ? 900 : 200, 0.2, part === 'head' ? 'triangle' : 'sawtooth', 0.06, part === 'head' ? 300 : -60);
    if (who === 'e') {
      this.ehp -= dmg;
      if (this.ehp <= 0) { this.addScore(100 + (part === 'head' ? 50 : 0) + Math.max(0, 5 - this.shots) * 10); this.level++; this.php = Math.min(100, this.php + 30); this.say(`Enemy down! Level ${this.level}`); this.newEnemy(); }
    } else {
      this.php -= dmg;
      if (this.php <= 0) { this.gameOver('You were defeated'); }
    }
  }

  stick(ctx, x, color, hp, max, flip) {
    const y = GROUND;
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 18); ctx.lineTo(x - 7, y); ctx.moveTo(x, y - 18); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 36); ctx.lineTo(x + flip * 14, y - 40); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - 52, 10, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 28, y - 82, 56, 7); ctx.fillStyle = hp / max > 0.35 ? '#5be37d' : '#ff6a6a'; ctx.fillRect(x - 28, y - 82, 56 * clamp(hp / max, 0, 1), 7);
  }

  bow(ctx, x, aim, flip, pull) {
    ctx.save(); ctx.translate(x + flip * 12, GROUND - 42); ctx.rotate(flip > 0 ? -aim : Math.PI + aim);
    ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 20, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; const pb = pull * 14; ctx.beginPath(); ctx.moveTo(20 * Math.cos(-1.2), 20 * Math.sin(-1.2)); ctx.lineTo(-pb, 0); ctx.lineTo(20 * Math.cos(1.2), 20 * Math.sin(1.2)); ctx.stroke();
    if (pull > 0.05 || this.turn === 'player') { ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-pb, 0); ctx.lineTo(24, 0); ctx.stroke(); }
    ctx.restore();
  }

  draw(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#79b8f2'); sky.addColorStop(1, '#d9f0ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; [[120, 60], [380, 90], [560, 50]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.ellipse(cx + ((this.time * 6 * this.wind) % 40), cy, 44, 14, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#6fbf4a'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#4e9a35'; ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(PX - 30, GROUND, 60, 14); ctx.fillRect(EX - 30, GROUND, 60, 14);
    this.stick(ctx, PX, '#1d3557', this.php, 100, 1); this.stick(ctx, EX, '#9b2226', this.ehp, this.emax, -1);
    const pull = this.pull ? this.pullPower() : this.charge;
    this.bow(ctx, PX, this.aim, 1, pull); this.bow(ctx, EX, 0.7, -1, 0);
    // aiming preview
    if (this.turn === 'player' && !this.arrows.length && (pull > 0.05 || this.turn === 'player')) {
      const p = Math.max(pull, 0.0), sp = MAX_SPEED * (0.25 + 0.75 * Math.max(p, 0.5));
      let x = PX + 6, y = GROUND - 44, vx = Math.cos(this.aim) * sp, vy = -Math.sin(this.aim) * sp;
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 12; i++) { for (let k = 0; k < 4; k++) { vx += this.wind * 38 / 240; vy += GRAV / 240; x += vx / 240; y += vy / 240; } ctx.globalAlpha = 1 - i / 13; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    for (const a of this.arrows) {
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); a.trail.forEach((t, i) => (i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y))); ctx.stroke();
      const ang = Math.atan2(a.vy, a.vx); ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang);
      ctx.strokeStyle = '#4b3621'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 0); ctx.lineTo(8, 3); ctx.fill(); ctx.restore();
    }
    // wind flag
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, GROUND); ctx.lineTo(W / 2, GROUND - 60); ctx.stroke();
    ctx.fillStyle = '#ff7b3d'; ctx.beginPath(); ctx.moveTo(W / 2, GROUND - 60); ctx.lineTo(W / 2 + this.wind * 46, GROUND - 52 + Math.sin(this.time * 6) * 3); ctx.lineTo(W / 2, GROUND - 44); ctx.fill();
    text(ctx, `wind ${this.wind > 0 ? '→' : '←'} ${Math.abs(Math.round(this.wind * 10))}`, W / 2, GROUND + 22, { size: 12, color: '#fff' });
    text(ctx, `Level ${this.level}`, 14, 20, { size: 15, align: 'left', color: '#16304f' });
    text(ctx, this.turn === 'player' ? (this.arrows.length ? '' : 'Your turn: drag back and let go') : 'Enemy is aiming…', W / 2, 24, { size: 14, color: '#16304f' });
    for (const o of this.pop) text(ctx, o.v, o.x, o.y - (0.9 - o.t) * 30, { size: 20, color: o.v === 'HEADSHOT!' ? '#ffd23f' : '#fff' });
    if (this.msgT > 0) text(ctx, this.msg, W / 2, 120, { size: 26, color: '#16304f' });
    if (this.pull && this.pointerPos.down) {
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(this.pull.x, this.pull.y); ctx.lineTo(this.pull.cx, this.pull.cy); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}

new Archer().mount();
