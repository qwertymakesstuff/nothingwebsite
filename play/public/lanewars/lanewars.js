import { Game, rand, clamp, roundRect, text } from '../assets/gamekit.js';

const W = 720, H = 400, GY = 290, PB = 56, EB = W - 56, PANEL = 64;
const UNITS = {
  soldier: { name: 'Soldier', cost: 40, hp: 70, dmg: 9, rate: 0.6, range: 26, speed: 52, color: '#4a90e2', key: 'Digit1', cd: 1.2 },
  archer: { name: 'Archer', cost: 65, hp: 45, dmg: 8, rate: 0.9, range: 130, speed: 46, color: '#59c24a', key: 'Digit2', cd: 1.6 },
  tank: { name: 'Tank', cost: 130, hp: 260, dmg: 15, rate: 0.9, range: 30, speed: 32, color: '#8d6e63', key: 'Digit3', cd: 3 },
  mage: { name: 'Mage', cost: 160, hp: 55, dmg: 30, rate: 2.2, range: 150, speed: 40, color: '#b36bff', key: 'Digit4', cd: 3.5, splash: 46 },
};
const ORDER = ['soldier', 'archer', 'tank', 'mage'];

class LaneWars extends Game {
  constructor() {
    super({
      slug: 'lanewars', title: 'Lane Wars', width: W, height: H, bg: '#8fd0ff', scoreLabel: 'Score',
      help: 'Train an army and march it down the lane to wreck the enemy base while protecting yours. Tap a unit button (or press 1 to 4) to train it; gold keeps coming in. The meteor (5) hurts every enemy, and the coin upgrade (6) boosts your income. Win a battle to face a tougher enemy.',
      controls: { pointer: true, buttons: [] },
    });
  }

  reset() { this.level = 1; this.battle(); }

  battle() {
    this.gold = 90; this.income = 9; this.ecoLvl = 0;
    this.php = 600; this.pmax = 600; this.ehp = 520 + this.level * 140; this.emax = this.ehp;
    this.units = []; this.arrows = []; this.fx = []; this.cool = { soldier: 0, archer: 0, tank: 0, mage: 0, meteor: 0 };
    this.egold = 60; this.espawn = 2; this.t = 0; this.msg = `Battle ${this.level}`; this.msgT = 1.8;
  }

  press(code) {
    ORDER.forEach((k) => { if (code === UNITS[k].key) this.train(k, 'p'); });
    if (code === 'Digit5') this.meteor();
    if (code === 'Digit6') this.upgradeEco();
  }

  pointer(type, x, y) {
    if (type !== 'down' || y < H - PANEL) return;
    const i = Math.floor((x - 8) / 98);
    if (i >= 0 && i < 4) this.train(ORDER[i], 'p');
    else if (x > 8 + 4 * 98 + 6 && x < 8 + 4 * 98 + 66) this.meteor();
    else if (x > 8 + 4 * 98 + 70 && x < 8 + 4 * 98 + 136) this.upgradeEco();
  }

  train(kind, side) {
    const d = UNITS[kind];
    if (side === 'p') {
      if (this.cool[kind] > 0 || this.gold < d.cost) { this.sfx(150, 0.08, 'square', 0.04); return; }
      this.gold -= d.cost; this.cool[kind] = d.cd; this.sfx(480, 0.06, 'triangle', 0.04, 100);
    }
    const scale = side === 'e' ? 1 + this.level * 0.08 : 1;
    this.units.push({ kind, side, x: side === 'p' ? PB + 20 : EB - 20, hp: d.hp * scale, max: d.hp * scale, cd: rand(0, 0.3), dmg: d.dmg * (side === 'e' ? 1 + this.level * 0.05 : 1), phase: rand(0, 6) });
  }

  meteor() {
    if (this.cool.meteor > 0) return;
    this.cool.meteor = 28; this.sfx(120, 0.5, 'sawtooth', 0.06, -60);
    this.units.forEach((u) => { if (u.side === 'e') { u.hp -= 50; this.fx.push({ x: u.x, y: GY - 20, t: 0.5, r: 30, c: 'rgba(255,140,40,.7)' }); } });
    this.ehp -= 20;
  }

  upgradeEco() {
    const cost = 120 + this.ecoLvl * 110;
    if (this.ecoLvl >= 5 || this.gold < cost) { this.sfx(150, 0.08, 'square', 0.04); return; }
    this.gold -= cost; this.ecoLvl++; this.income += 4; this.sfx(780, 0.15, 'triangle', 0.05, 300);
  }

  update(dt) {
    this.t += dt; this.msgT = Math.max(0, this.msgT - dt);
    this.gold += this.income * dt; this.egold += (7 + this.level * 1.6) * dt;
    for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);
    // enemy brain: buy something every so often, weighted by what it can afford
    this.espawn -= dt;
    if (this.espawn <= 0) {
      const afford = ORDER.filter((k) => UNITS[k].cost <= this.egold);
      if (afford.length) {
        const mine = this.units.filter((u) => u.side === 'p').length;
        const pick = afford.length > 1 && Math.random() < 0.5 + Math.min(0.3, mine * 0.04) ? afford[afford.length - 1 - Math.floor(Math.random() * Math.min(2, afford.length))] : afford[0];
        this.egold -= UNITS[pick].cost; this.train(pick, 'e');
      }
      this.espawn = Math.max(0.9, rand(2.4, 3.8) - this.level * 0.18);
    }
    for (const u of this.units) {
      const d = UNITS[u.kind], dir = u.side === 'p' ? 1 : -1;
      u.cd -= dt; u.phase += dt * 8;
      // nearest enemy in range
      let tgt = null, best = 1e9;
      for (const o of this.units) { if (o.side === u.side || o.hp <= 0) continue; const dist = Math.abs(o.x - u.x); if (dist <= d.range && dist < best) { best = dist; tgt = o; } }
      const baseX = u.side === 'p' ? EB : PB, baseDist = Math.abs(baseX - u.x) - 22;
      if (tgt || baseDist <= d.range) {
        if (u.cd <= 0) {
          u.cd = d.rate;
          if (d.range > 60) this.arrows.push({ x: u.x, y: GY - 28, dir, to: tgt ? tgt.x : baseX, target: tgt, dmg: u.dmg, side: u.side, kind: u.kind, splash: d.splash });
          else this.strike(tgt, u, d);
          this.sfx(d.range > 60 ? 700 : 220, 0.03, 'square', 0.02);
        }
      } else {
        // do not walk through a friend standing in front
        const friend = this.units.find((o) => o !== u && o.side === u.side && o.hp > 0 && (o.x - u.x) * dir > 0 && (o.x - u.x) * dir < 18);
        if (!friend) u.x += dir * d.speed * dt;
      }
    }
    for (const a of this.arrows) {
      a.x += a.dir * 340 * dt;
      const hitX = a.target && a.target.hp > 0 ? a.target.x : a.to;
      if ((a.x - hitX) * a.dir >= 0) { a.done = true; this.arrowHit(a, hitX); }
    }
    this.arrows = this.arrows.filter((a) => !a.done);
    for (const u of this.units) if (u.hp <= 0 && !u.dead) { u.dead = true; this.fx.push({ x: u.x, y: GY - 14, t: 0.4, r: 14, c: 'rgba(255,255,255,.6)' }); if (u.side === 'e') { this.addScore(UNITS[u.kind].cost / 10 | 0); this.gold += UNITS[u.kind].cost * 0.25; } }
    this.units = this.units.filter((u) => u.hp > 0);
    this.fx.forEach((f) => { f.t -= dt; }); this.fx = this.fx.filter((f) => f.t > 0);
    if (this.ehp <= 0) { this.addScore(150 * this.level); this.sfx(900, 0.4, 'triangle', 0.06, 400); this.level++; this.battle(); }
    else if (this.php <= 0) { this.sfx(120, 0.6, 'sawtooth', 0.06, -80); this.gameOver('Your base fell'); }
  }

  strike(tgt, u, d) {
    if (tgt) tgt.hp -= u.dmg; else if (u.side === 'p') this.ehp -= u.dmg; else this.php -= u.dmg;
  }

  arrowHit(a, x) {
    const foes = this.units.filter((o) => o.side !== a.side && o.hp > 0);
    if (a.splash) { this.fx.push({ x, y: GY - 14, t: 0.35, r: a.splash, c: 'rgba(179,107,255,.55)' }); foes.forEach((o) => { if (Math.abs(o.x - x) < a.splash) o.hp -= a.dmg; }); if (!a.target || a.target.hp <= 0) { if (a.side === 'p' && Math.abs(EB - x) < a.splash + 22) this.ehp -= a.dmg; if (a.side === 'e' && Math.abs(PB - x) < a.splash + 22) this.php -= a.dmg; } return; }
    if (a.target && a.target.hp > 0) a.target.hp -= a.dmg; else if (a.side === 'p') this.ehp -= a.dmg; else this.php -= a.dmg;
  }

  drawUnit(ctx, u) {
    const d = UNITS[u.kind], dir = u.side === 'p' ? 1 : -1, x = u.x, y = GY, bob = Math.sin(u.phase) * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const col = u.side === 'p' ? d.color : '#d94a4a';
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, 7); ctx.fill();
    if (u.kind === 'tank') { ctx.fillStyle = col; roundRect(ctx, -16, -24 + bob, 32, 22, 6); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(8, -18 + bob, 18, 5); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-9, -2, 5, 0, 7); ctx.arc(9, -2, 5, 0, 7); ctx.fill(); }
    else {
      ctx.fillStyle = col; roundRect(ctx, -7, -24 + bob, 14, 18, 4); ctx.fill();
      ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(0, -30 + bob, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-3 + Math.sin(u.phase) * 4, 0); ctx.moveTo(3, -6); ctx.lineTo(3 - Math.sin(u.phase) * 4, 0); ctx.stroke(); ctx.lineWidth = 1;
      if (u.kind === 'soldier') { ctx.fillStyle = '#ccc'; ctx.fillRect(7, -24 + bob, 3, 20); ctx.fillStyle = '#654'; ctx.fillRect(5, -14 + bob, 7, 3); }
      if (u.kind === 'archer') { ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(9, -18 + bob, 10, -1.2, 1.2); ctx.stroke(); ctx.lineWidth = 1; }
      if (u.kind === 'mage') { ctx.fillStyle = '#6a3fc0'; ctx.beginPath(); ctx.moveTo(-6, -35 + bob); ctx.lineTo(0, -48 + bob); ctx.lineTo(6, -35 + bob); ctx.fill(); ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(9, -30 + bob); ctx.stroke(); ctx.fillStyle = '#ff7ae8'; ctx.beginPath(); ctx.arc(9, -32 + bob, 4, 0, 7); ctx.fill(); ctx.lineWidth = 1; }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 13, y - 54, 26, 4); ctx.fillStyle = u.side === 'p' ? '#5be37d' : '#ff6a6a'; ctx.fillRect(x - 13, y - 54, 26 * clamp(u.hp / u.max, 0, 1), 4);
  }

  drawBase(ctx, x, hp, max, color, flip) {
    ctx.fillStyle = color; ctx.fillRect(x - 24, GY - 90, 48, 90); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x - 24, GY - 90, 48, 8);
    ctx.fillStyle = color; for (let i = 0; i < 3; i++) ctx.fillRect(x - 24 + i * 18, GY - 100, 12, 12);
    ctx.fillStyle = '#222'; ctx.fillRect(x - 7, GY - 34, 14, 34); ctx.fillStyle = '#f3d27a'; ctx.fillRect(x - 8, GY - 70, 5, 8); ctx.fillRect(x + 3, GY - 70, 5, 8);
    ctx.fillStyle = flip ? '#d94a4a' : '#4a90e2'; ctx.fillRect(x - 1, GY - 128, 2, 30); ctx.beginPath(); ctx.moveTo(x + 1, GY - 128); ctx.lineTo(x + (flip ? -22 : 22), GY - 120); ctx.lineTo(x + 1, GY - 112); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 36, GY - 148, 72, 7); ctx.fillStyle = hp / max > 0.35 ? '#5be37d' : '#ff6a6a'; ctx.fillRect(x - 36, GY - 148, 72 * clamp(hp / max, 0, 1), 7);
  }

  draw(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#6fb7f0'); sky.addColorStop(1, '#dff3ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GY);
    ctx.fillStyle = '#fff'; [[110, 50], [380, 80], [590, 44]].forEach(([cx, cy], i) => { ctx.beginPath(); ctx.ellipse(cx + Math.sin(this.t * 0.2 + i) * 20, cy, 48, 14, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#a7d98a'; ctx.beginPath(); ctx.moveTo(0, GY - 40); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GY - 40 - Math.sin(x * 0.012) * 24); ctx.lineTo(W, GY); ctx.lineTo(0, GY); ctx.fill();
    ctx.fillStyle = '#6fbf4a'; ctx.fillRect(0, GY, W, H - GY); ctx.fillStyle = '#4e9a35'; ctx.fillRect(0, GY, W, 6);
    this.drawBase(ctx, PB, this.php, this.pmax, '#7b8ea8', false); this.drawBase(ctx, EB, this.ehp, this.emax, '#a86a6a', true);
    for (const u of this.units) this.drawUnit(ctx, u);
    for (const a of this.arrows) { ctx.strokeStyle = a.splash ? '#ff7ae8' : '#4b3621'; ctx.lineWidth = a.splash ? 4 : 2; ctx.beginPath(); ctx.moveTo(a.x - a.dir * 10, GY - 28); ctx.lineTo(a.x, GY - 28); ctx.stroke(); ctx.lineWidth = 1; }
    for (const f of this.fx) { ctx.globalAlpha = Math.min(1, f.t * 3); ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - f.t), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    text(ctx, `Battle ${this.level}`, W / 2, 20, { size: 15, color: '#16304f' });
    if (this.msgT > 0) text(ctx, this.msg, W / 2, 80, { size: 32, color: '#16304f' });
    this.drawPanel(ctx);
  }

  drawPanel(ctx) {
    ctx.fillStyle = '#1c2a40'; ctx.fillRect(0, H - PANEL, W, PANEL);
    ORDER.forEach((k, i) => {
      const d = UNITS[k], x = 8 + i * 98, y = H - PANEL + 8, can = this.gold >= d.cost && this.cool[k] <= 0;
      ctx.fillStyle = can ? '#2c4d78' : '#25344a'; roundRect(ctx, x, y, 92, 48, 10); ctx.fill();
      if (this.cool[k] > 0) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x, y + 48 * (1 - this.cool[k] / d.cd), 92, 48 * (this.cool[k] / d.cd)); }
      ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(x + 16, y + 24, 8, 0, 7); ctx.fill();
      text(ctx, `${i + 1} ${d.name}`, x + 56, y + 17, { size: 11, color: '#fff' }); text(ctx, `$${d.cost}`, x + 56, y + 35, { size: 13, color: this.gold >= d.cost ? '#ffd23f' : '#8aa0bd' });
    });
    const mx = 8 + 4 * 98 + 6, ready = this.cool.meteor <= 0;
    ctx.fillStyle = ready ? '#7a3a1c' : '#3a2c26'; roundRect(ctx, mx, H - PANEL + 8, 60, 48, 10); ctx.fill(); text(ctx, '5 ☄', mx + 30, H - PANEL + 24, { size: 14, color: '#fff' }); text(ctx, ready ? 'ready' : `${Math.ceil(this.cool.meteor)}s`, mx + 30, H - PANEL + 42, { size: 11, color: '#ffd2a0' });
    const ex = mx + 64, cost = 120 + this.ecoLvl * 110;
    ctx.fillStyle = this.ecoLvl < 5 && this.gold >= cost ? '#2e6e3e' : '#25344a'; roundRect(ctx, ex, H - PANEL + 8, 66, 48, 10); ctx.fill(); text(ctx, '6 Income', ex + 33, H - PANEL + 22, { size: 10, color: '#fff' }); text(ctx, this.ecoLvl >= 5 ? 'MAX' : `$${cost}`, ex + 33, H - PANEL + 40, { size: 12, color: '#ffd23f' });
    text(ctx, `$${Math.floor(this.gold)}`, W - 14, H - PANEL + 22, { size: 18, align: 'right', color: '#ffd23f' });
    text(ctx, `+${this.income}/s`, W - 14, H - PANEL + 44, { size: 12, align: 'right', color: '#9fb4d6' });
  }
}

new LaneWars().mount();
