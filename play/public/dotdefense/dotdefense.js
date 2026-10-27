import { Game, clamp, rand, roundRect, text } from '../assets/gamekit.js';

const T = 48, COLS = 15, ROWS = 9, GW = COLS * T, GH = ROWS * T, PANEL = 60, W = GW, H = GH + PANEL;
const WAYPOINTS = [[-1, 1], [3, 1], [3, 6], [7, 6], [7, 2], [11, 2], [11, 7], [15, 7]];
const TOWERS = {
  pellet: { name: 'Pellet', cost: 50, range: 120, rate: 0.42, dmg: 8, color: '#4dd9f0', key: 'Digit1' },
  frost: { name: 'Frost', cost: 70, range: 105, rate: 0.9, dmg: 3, color: '#a5e8ff', key: 'Digit2' },
  cannon: { name: 'Cannon', cost: 110, range: 140, rate: 1.5, dmg: 34, color: '#ff9a3c', key: 'Digit3' },
};
const ORDER = ['pellet', 'frost', 'cannon'];

function buildPath() {
  const pts = [], blocked = new Set();
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [x0, y0] = WAYPOINTS[i], [x1, y1] = WAYPOINTS[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = x0 + Math.sign(x1 - x0) * s, y = y0 + Math.sign(y1 - y0) * s;
      blocked.add(`${x},${y}`);
    }
    pts.push({ x: x1 * T + T / 2, y: y1 * T + T / 2 });
  }
  return { pts: [{ x: WAYPOINTS[0][0] * T + T / 2, y: WAYPOINTS[0][1] * T + T / 2 }, ...pts], blocked };
}
const { pts: PATH, blocked: PATHCELLS } = buildPath();

class DotDefense extends Game {
  constructor() {
    super({
      slug: 'dotdefense', title: 'Dot Defense', width: W, height: H, bg: '#17361f', scoreLabel: 'Score',
      help: 'Stop the dots before they reach the end of the road. Pick a tower at the bottom (or press 1, 2, 3) and tap a grass tile to build it. Tap a tower to upgrade or sell it. Frost slows dots, cannons hit groups. Space (or the button) starts the next wave early.',
      controls: { pointer: true, buttons: [{ code: 'Space', label: 'Next wave', wide: true }] },
    });
  }

  reset() {
    this.gold = 150; this.lives = 15; this.wave = 0; this.kills = 0;
    this.towers = []; this.dots = []; this.shots = []; this.fx = [];
    this.pick = 'pellet'; this.sel = null; this.cursor = { x: 5, y: 3 }; this.hover = null;
    this.spawnQ = []; this.spawnT = 0; this.countdown = 6; this.active = false; this.msg = ''; this.msgT = 0;
  }

  press(code) {
    ORDER.forEach((k) => { if (code === TOWERS[k].key) { this.pick = k; this.sel = null; } });
    if (code === 'Space') this.sendWave();
    if (code === 'ArrowLeft') this.cursor.x = Math.max(0, this.cursor.x - 1);
    if (code === 'ArrowRight') this.cursor.x = Math.min(COLS - 1, this.cursor.x + 1);
    if (code === 'ArrowUp') this.cursor.y = Math.max(0, this.cursor.y - 1);
    if (code === 'ArrowDown') this.cursor.y = Math.min(ROWS - 1, this.cursor.y + 1);
    if (code === 'Enter') this.clickCell(this.cursor.x, this.cursor.y);
    if (code === 'KeyU') this.upgrade();
    if (code === 'KeyX') this.sell();
  }

  say(m) { this.msg = m; this.msgT = 1.6; }

  pointer(type, x, y) {
    if (type === 'move') { this.hover = y < GH ? { x: Math.floor(x / T), y: Math.floor(y / T) } : null; return; }
    if (type !== 'down') return;
    if (y >= GH) return this.panelClick(x, y);
    this.clickCell(Math.floor(x / T), Math.floor(y / T));
  }

  panelClick(x) {
    ORDER.forEach((k, i) => { if (x > 8 + i * 106 && x < 8 + i * 106 + 100) { this.pick = k; this.sel = null; } });
    if (this.sel) { if (x > 330 && x < 440) this.upgrade(); else if (x > 446 && x < 556) this.sell(); }
    if (x > 590) this.sendWave();
  }

  clickCell(cx, cy) {
    const t = this.towers.find((q) => q.x === cx && q.y === cy);
    this.cursor = { x: cx, y: cy };
    if (t) { this.sel = t; return; }
    this.sel = null;
    if (PATHCELLS.has(`${cx},${cy}`) || cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) { this.say("Can't build on the road"); return; }
    const def = TOWERS[this.pick];
    if (this.gold < def.cost) { this.say('Not enough gold'); this.sfx(150, 0.1, 'square', 0.04); return; }
    this.gold -= def.cost;
    this.towers.push({ kind: this.pick, x: cx, y: cy, lvl: 1, cd: 0, spent: def.cost, ang: 0 });
    this.sfx(520, 0.1, 'triangle', 0.05, 200);
  }

  stats(t) {
    const d = TOWERS[t.kind], m = 1 + (t.lvl - 1) * 0.55;
    return { range: d.range * (1 + (t.lvl - 1) * 0.08), rate: d.rate * (1 - (t.lvl - 1) * 0.08), dmg: d.dmg * m };
  }
  upCost(t) { return Math.round(TOWERS[t.kind].cost * 0.8 * t.lvl); }

  upgrade() {
    const t = this.sel;
    if (!t || t.lvl >= 4) return;
    const c = this.upCost(t);
    if (this.gold < c) { this.say('Not enough gold'); return; }
    this.gold -= c; t.lvl++; t.spent += c; this.sfx(700, 0.12, 'triangle', 0.05, 300);
  }
  sell() {
    const t = this.sel; if (!t) return;
    this.gold += Math.round(t.spent * 0.7); this.towers = this.towers.filter((q) => q !== t); this.sel = null; this.sfx(300, 0.1, 'square', 0.04);
  }

  sendWave() {
    if (this.active || this.spawnQ.length) return;
    this.wave++;
    const n = 7 + this.wave * 2, q = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let kind = 'dot';
      if (this.wave >= 3 && r < 0.25) kind = 'fast';
      if (this.wave >= 5 && r > 0.82) kind = 'tank';
      q.push(kind);
    }
    if (this.wave % 5 === 0) q.push('boss');
    this.spawnQ = q; this.spawnT = 0; this.active = true; this.countdown = 0;
    this.say(`Wave ${this.wave}`);
  }

  spawn(kind) {
    const s = 1 + this.wave * 0.2 + Math.pow(this.wave, 1.4) * 0.03;
    const base = { dot: { hp: 22, sp: 62, r: 9, c: '#ff6a8a', gold: 4, dmg: 1 }, fast: { hp: 14, sp: 108, r: 7, c: '#ffd23f', gold: 5, dmg: 1 }, tank: { hp: 90, sp: 40, r: 13, c: '#9b6cff', gold: 10, dmg: 2 }, boss: { hp: 420, sp: 34, r: 18, c: '#222', gold: 60, dmg: 5 } }[kind];
    this.dots.push({ ...base, kind, hp: base.hp * s, max: base.hp * s, seg: 0, x: PATH[0].x, y: PATH[0].y, slow: 0, d: 0 });
  }

  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (!this.active && !this.spawnQ.length) { this.countdown -= dt; if (this.countdown <= 0) this.sendWave(); }
    if (this.spawnQ.length) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawn(this.spawnQ.shift()); this.spawnT = this.wave > 8 ? 0.45 : 0.7; } }
    // dots
    for (const d of this.dots) {
      d.slow = Math.max(0, d.slow - dt);
      const sp = d.sp * (d.slow > 0 ? 0.5 : 1);
      let move = sp * dt;
      while (move > 0 && d.seg < PATH.length - 1) {
        const a = PATH[d.seg + 1], dx = a.x - d.x, dy = a.y - d.y, dist = Math.hypot(dx, dy);
        if (dist <= move) { d.x = a.x; d.y = a.y; d.seg++; move -= dist; } else { d.x += (dx / dist) * move; d.y += (dy / dist) * move; move = 0; }
      }
      d.d += sp * dt;
      if (d.seg >= PATH.length - 1) { d.leaked = true; this.lives -= d.dmg; this.sfx(120, 0.2, 'sawtooth', 0.05, -60); }
    }
    const alive = [];
    for (const d of this.dots) { if (d.leaked) continue; if (d.hp <= 0) { this.kill(d); continue; } alive.push(d); }
    this.dots = alive;
    if (this.lives <= 0) { this.gameOver('The dots broke through'); return; }
    // towers
    for (const t of this.towers) {
      t.cd -= dt;
      const st = this.stats(t), tx = t.x * T + T / 2, ty = t.y * T + T / 2;
      let target = null;
      for (const d of this.dots) if (Math.hypot(d.x - tx, d.y - ty) <= st.range && (!target || d.d > target.d)) target = d;
      if (target) t.ang = Math.atan2(target.y - ty, target.x - tx);
      if (target && t.cd <= 0) {
        t.cd = st.rate;
        this.shots.push({ x: tx, y: ty, target, kind: t.kind, dmg: st.dmg, sp: t.kind === 'cannon' ? 260 : 520, tx: target.x, ty: target.y });
        this.sfx(t.kind === 'cannon' ? 140 : t.kind === 'frost' ? 900 : 640, 0.04, 'square', 0.02);
      }
    }
    for (const s of this.shots) {
      const tgt = s.target.hp > 0 ? s.target : null; if (tgt) { s.tx = tgt.x; s.ty = tgt.y; }
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy), step = s.sp * dt;
      if (dist <= step + 4) { this.impact(s); s.done = true; } else { s.x += (dx / dist) * step; s.y += (dy / dist) * step; }
    }
    this.shots = this.shots.filter((s) => !s.done);
    this.fx.forEach((f) => { f.t -= dt; }); this.fx = this.fx.filter((f) => f.t > 0);
    if (this.active && !this.spawnQ.length && !this.dots.length) {
      this.active = false; this.countdown = 8; const bonus = 20 + this.wave * 5; this.gold += bonus; this.addScore(this.wave * 50);
      this.say(`Wave ${this.wave} cleared! +${bonus} gold`); this.sfx(800, 0.25, 'triangle', 0.05, 300);
    }
  }

  kill(d) {
    this.gold += d.gold; this.kills++; this.addScore(d.kind === 'boss' ? 100 : 2);
    this.fx.push({ x: d.x, y: d.y, t: 0.35, r: d.r, c: d.c });
    this.sfx(300 + Math.random() * 200, 0.04, 'triangle', 0.025);
  }

  impact(s) {
    if (s.kind === 'cannon') {
      this.fx.push({ x: s.tx, y: s.ty, t: 0.3, r: 44, c: 'rgba(255,170,60,.6)', ring: true });
      for (const d of this.dots) if (Math.hypot(d.x - s.tx, d.y - s.ty) < 46) d.hp -= s.dmg;
    } else {
      s.target.hp -= s.dmg;
      if (s.kind === 'frost') s.target.slow = 1.6;
    }
  }

  draw(ctx) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = PATHCELLS.has(`${x},${y}`) ? '#d9c28f' : (x + y) % 2 ? '#3c8a4a' : '#398447';
      ctx.fillRect(x * T, y * T, T, T);
    }
    ctx.strokeStyle = 'rgba(80,55,20,.35)'; ctx.lineWidth = 2; ctx.beginPath(); PATH.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.lineWidth = 1;
    text(ctx, 'IN', 14, 1 * T + T / 2, { size: 11, color: '#6b5530' }); text(ctx, 'OUT ▶', GW - 24, 7 * T + T / 2 - 22, { size: 11, color: '#6b5530' });
    // hover / cursor preview
    const c = this.hover || (this.cursor && !this.pointerPos.inside ? this.cursor : null);
    if (c && c.x >= 0 && c.y >= 0 && c.x < COLS && c.y < ROWS && !this.towers.some((t) => t.x === c.x && t.y === c.y)) {
      const ok = !PATHCELLS.has(`${c.x},${c.y}`) && this.gold >= TOWERS[this.pick].cost;
      ctx.fillStyle = ok ? 'rgba(255,255,255,.22)' : 'rgba(255,60,60,.3)'; ctx.fillRect(c.x * T, c.y * T, T, T);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(c.x * T + T / 2, c.y * T + T / 2, TOWERS[this.pick].range, 0, 7); ctx.stroke();
    }
    for (const t of this.towers) {
      const x = t.x * T + T / 2, y = t.y * T + T / 2, def = TOWERS[t.kind];
      ctx.fillStyle = '#2a3a2e'; roundRect(ctx, t.x * T + 5, t.y * T + 5, T - 10, T - 10, 9); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(t.ang); ctx.fillStyle = '#222'; ctx.fillRect(2, -4 - (t.kind === 'cannon' ? 2 : 0), 18, 8 + (t.kind === 'cannon' ? 4 : 0)); ctx.restore();
      for (let i = 0; i < t.lvl; i++) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(t.x * T + 8 + i * 8, t.y * T + T - 9, 5, 4); }
      if (this.sel === t) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, this.stats(t).range, 0, 7); ctx.stroke(); ctx.lineWidth = 1; }
    }
    for (const d of this.dots) {
      ctx.fillStyle = d.slow > 0 ? '#8fd8ff' : d.c; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.3, 0, 7); ctx.fill();
      if (d.hp < d.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(d.x - 12, d.y - d.r - 7, 24, 4); ctx.fillStyle = '#5be37d'; ctx.fillRect(d.x - 12, d.y - d.r - 7, 24 * clamp(d.hp / d.max, 0, 1), 4); }
    }
    for (const s of this.shots) { ctx.fillStyle = s.kind === 'cannon' ? '#222' : s.kind === 'frost' ? '#cfeeff' : '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.kind === 'cannon' ? 6 : 3.5, 0, 7); ctx.fill(); }
    for (const f of this.fx) { if (f.ring) { ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - f.t / 0.3 * 0.4), 0, 7); ctx.stroke(); ctx.lineWidth = 1; } else { ctx.globalAlpha = f.t * 2.5; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.4 - f.t), 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
    if (this.msgT > 0) text(ctx, this.msg, GW / 2, 24, { size: 20, color: '#fff' });
    this.drawPanel(ctx);
  }

  drawPanel(ctx) {
    ctx.fillStyle = '#10271a'; ctx.fillRect(0, GH, W, PANEL);
    ORDER.forEach((k, i) => {
      const d = TOWERS[k], x = 8 + i * 106, y = GH + 8, can = this.gold >= d.cost;
      ctx.fillStyle = this.pick === k ? '#2a5a3a' : '#1c3a28'; roundRect(ctx, x, y, 100, 44, 10); ctx.fill();
      if (this.pick === k) { ctx.strokeStyle = '#7dff3a'; ctx.stroke(); }
      ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(x + 18, y + 22, 9, 0, 7); ctx.fill();
      text(ctx, d.name, x + 56, y + 15, { size: 12, color: '#fff' }); text(ctx, `$${d.cost}`, x + 56, y + 32, { size: 13, color: can ? '#ffd23f' : '#8a8a8a' });
    });
    if (this.sel) {
      const t = this.sel, up = this.upCost(t), maxed = t.lvl >= 4;
      ctx.fillStyle = maxed ? '#2c3a31' : this.gold >= up ? '#2e6e3e' : '#2c3a31'; roundRect(ctx, 330, GH + 8, 110, 44, 10); ctx.fill();
      text(ctx, maxed ? 'Max level' : `Upgrade $${up}`, 385, GH + 30, { size: 12, color: '#fff' });
      ctx.fillStyle = '#6e2e2e'; roundRect(ctx, 446, GH + 8, 110, 44, 10); ctx.fill();
      text(ctx, `Sell $${Math.round(t.spent * 0.7)}`, 501, GH + 30, { size: 12, color: '#fff' });
    } else text(ctx, 'tap a tower to upgrade or sell', 442, GH + 30, { size: 11, color: '#7da58a' });
    ctx.fillStyle = this.active ? '#2c3a31' : '#2e6e3e'; roundRect(ctx, 590, GH + 8, 122, 20, 8); ctx.fill();
    text(ctx, this.active ? `Wave ${this.wave}` : `Next wave ${Math.ceil(this.countdown)}s`, 651, GH + 19, { size: 11, color: '#fff' });
    text(ctx, `$${Math.floor(this.gold)}   ♥ ${this.lives}`, 651, GH + 42, { size: 13, color: '#ffd23f' });
  }
}

new DotDefense().mount();
