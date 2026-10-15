import { Game, rand, randInt, clamp, text } from '/assets/gamekit.js';

const R = 20, COLS = 10, W = COLS * 2 * R + R, H = 600, RH = R * Math.sqrt(3), SX = W / 2, SY = H - 44, LINE = H - 96;
const COLORS = ['#ff5d6c', '#ffb23c', '#f5e04a', '#5be37d', '#4dd9f0', '#b36bff'];

class BubblePop extends Game {
  constructor() {
    super({
      slug: 'bubblepop', title: 'Bubble Pop', width: W, height: H, bg: '#14183a',
      help: 'Shoot bubbles to make groups of three or more of the same colour; anything left hanging falls. Aim with the mouse or finger and click / tap to shoot, or use the left / right arrows and space. Every few misses the ceiling drops, so keep popping!',
      controls: { pointer: true, buttons: [{ code: 'ArrowLeft', label: '◀', hold: true }, { code: 'Space', label: 'Shoot' }, { code: 'ArrowRight', label: '▶', hold: true }] },
    });
  }

  reset() {
    this.level = 1; this.startLevel();
  }

  startLevel() {
    this.rows = []; this.par = 0; this.misses = 0; this.shot = null; this.fall = []; this.pops = [];
    const nColors = Math.min(6, 3 + Math.floor(this.level / 2)), rows = Math.min(9, 4 + this.level);
    this.nColors = nColors;
    for (let r = 0; r < rows; r++) this.rows.push(Array.from({ length: COLS }, () => randInt(0, nColors - 1)));
    this.aim = Math.PI / 2; this.cur = this.pick(); this.next = this.pick();
  }

  pick() {
    const present = new Set(this.rows.flat().filter((v) => v != null));
    const list = present.size ? [...present] : [0];
    return list[randInt(0, list.length - 1)];
  }

  cellX(r, c) { return R + c * 2 * R + (((r + this.par) % 2) ? R : 0); }
  cellY(r) { return R + r * RH; }

  press(code) { if (code === 'Space' || code === 'ArrowUp') this.fire(); }

  pointer(type, x, y) {
    if (type === 'move' || type === 'down') this.aimAt(x, y);
    if (type === 'up' && this.pointerPos.y < SY - 20) this.fire();
  }

  aimAt(x, y) { this.aim = clamp(Math.atan2(SY - y, x - SX), 0.2, Math.PI - 0.2); }

  fire() {
    if (this.shot || this.fall.length) return;
    this.shot = { x: SX, y: SY, vx: Math.cos(this.aim) * 820, vy: -Math.sin(this.aim) * 820, c: this.cur };
    this.cur = this.next; this.next = this.pick(); this.sfx(380, 0.08, 'square', 0.04, 200);
  }

  neighbors(r, c) {
    const odd = ((r + this.par) % 2) === 1;
    const d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    return d.map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < COLS && rr < this.rows.length + 1);
  }

  update(dt) {
    if (this.held('ArrowLeft')) this.aim = clamp(this.aim + dt * 1.6, 0.2, Math.PI - 0.2);
    if (this.held('ArrowRight')) this.aim = clamp(this.aim - dt * 1.6, 0.2, Math.PI - 0.2);
    this.fall.forEach((f) => { f.vy += 1400 * dt; f.y += f.vy * dt; f.x += f.vx * dt; });
    this.fall = this.fall.filter((f) => f.y < H + 30);
    this.pops.forEach((p) => { p.t -= dt; }); this.pops = this.pops.filter((p) => p.t > 0);
    const s = this.shot;
    if (!s) return;
    const steps = Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 6);
    for (let i = 0; i < steps && this.shot; i++) {
      s.x += (s.vx * dt) / steps; s.y += (s.vy * dt) / steps;
      if (s.x < R) { s.x = R; s.vx = Math.abs(s.vx); } if (s.x > W - R) { s.x = W - R; s.vx = -Math.abs(s.vx); }
      let stick = s.y <= R + 1;
      if (!stick) for (let r = 0; r < this.rows.length && !stick; r++) for (let c = 0; c < COLS; c++) {
        if (this.rows[r][c] != null && Math.hypot(this.cellX(r, c) - s.x, this.cellY(r) - s.y) < R * 1.8) { stick = true; break; }
      }
      if (stick) this.land();
    }
  }

  land() {
    const s = this.shot; this.shot = null;
    let row = Math.max(0, Math.round((s.y - R) / RH));
    let best = null;
    for (let r = Math.max(0, row - 1); r <= row + 1; r++) for (let c = 0; c < COLS; c++) {
      if (this.rows[r]?.[c] != null) continue;
      const d = Math.hypot(this.cellX(r, c) - s.x, this.cellY(r) - s.y);
      if (!best || d < best.d) best = { r, c, d };
    }
    if (!best) { best = { r: row, c: clamp(Math.round((s.x - R) / (2 * R)), 0, COLS - 1), d: 0 }; }
    while (this.rows.length <= best.r) this.rows.push(Array(COLS).fill(null));
    this.rows[best.r][best.c] = s.c;
    // match
    const group = [], seen = new Set([`${best.r},${best.c}`]), stack = [[best.r, best.c]];
    while (stack.length) {
      const [r, c] = stack.pop(); group.push([r, c]);
      for (const [rr, cc] of this.neighbors(r, c)) {
        if (this.rows[rr]?.[cc] === s.c && !seen.has(`${rr},${cc}`)) { seen.add(`${rr},${cc}`); stack.push([rr, cc]); }
      }
    }
    let popped = 0;
    if (group.length >= 3) {
      group.forEach(([r, c]) => { this.pops.push({ x: this.cellX(r, c), y: this.cellY(r), c: this.rows[r][c], t: 0.3 }); this.rows[r][c] = null; });
      popped = group.length;
      // anything not connected to the ceiling falls
      const keep = new Set(), st = [];
      for (let c = 0; c < COLS; c++) if (this.rows[0][c] != null) { keep.add(`0,${c}`); st.push([0, c]); }
      while (st.length) { const [r, c] = st.pop(); for (const [rr, cc] of this.neighbors(r, c)) if (this.rows[rr]?.[cc] != null && !keep.has(`${rr},${cc}`)) { keep.add(`${rr},${cc}`); st.push([rr, cc]); } }
      let drops = 0;
      this.rows.forEach((row, r) => row.forEach((v, c) => { if (v != null && !keep.has(`${r},${c}`)) { this.fall.push({ x: this.cellX(r, c), y: this.cellY(r), vx: rand(-60, 60), vy: rand(-200, -50), c: v }); this.rows[r][c] = null; drops++; } }));
      this.addScore(group.length * 10 + drops * 20);
      this.sfx(600 + popped * 30, 0.15, 'triangle', 0.05, 200);
    } else {
      this.misses++; this.sfx(180, 0.06, 'square', 0.03);
      if (this.misses >= 5) { this.misses = 0; this.descend(); }
    }
    while (this.rows.length && this.rows.at(-1).every((v) => v == null)) this.rows.pop();
    if (!this.rows.length || this.rows.every((r) => r.every((v) => v == null))) { this.addScore(200); this.level++; this.sfx(900, 0.4, 'triangle', 0.06, 400); this.startLevel(); return; }
    if (this.cur != null && !this.rows.flat().includes(this.cur)) this.cur = this.pick();
    if (this.rows.some((row, r) => r >= 0 && this.cellY(r) + R > LINE && row.some((v) => v != null))) { this.sfx(130, 0.5, 'sawtooth', 0.06, -90); this.gameOver('The bubbles got you'); }
  }

  descend() {
    this.rows.unshift(Array.from({ length: COLS }, () => randInt(0, this.nColors - 1)));
    this.par ^= 1; this.sfx(150, 0.2, 'sawtooth', 0.05, -40);
  }

  bubble(ctx, x, y, c, r = R - 1) {
    ctx.fillStyle = COLORS[c]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.28, r * 0.18, -0.6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  }

  draw(ctx) {
    ctx.fillStyle = '#1b2150'; ctx.fillRect(0, 0, W, LINE);
    ctx.strokeStyle = '#ff5d6c'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke(); ctx.setLineDash([]);
    this.rows.forEach((row, r) => row.forEach((v, c) => { if (v != null) this.bubble(ctx, this.cellX(r, c), this.cellY(r), v); }));
    this.fall.forEach((f) => this.bubble(ctx, f.x, f.y, f.c));
    this.pops.forEach((p) => { ctx.globalAlpha = p.t * 3; this.bubble(ctx, p.x, p.y, p.c, R * (1 + (0.3 - p.t) * 2)); ctx.globalAlpha = 1; });
    // aim guide
    if (!this.shot) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(SX, SY); let x = SX, y = SY, vx = Math.cos(this.aim), vy = -Math.sin(this.aim); for (let i = 0; i < 70; i++) { x += vx * 6; y += vy * 6; if (x < R || x > W - R) vx = -vx; ctx.lineTo(x, y); if (y < R) break; } ctx.stroke(); ctx.setLineDash([]); }
    // cannon
    ctx.save(); ctx.translate(SX, SY); ctx.rotate(-this.aim + Math.PI / 2); ctx.fillStyle = '#5b6bd6'; ctx.fillRect(-9, -44, 18, 44); ctx.fillStyle = '#7a8af0'; ctx.fillRect(-12, -48, 24, 8); ctx.restore();
    ctx.fillStyle = '#3a4590'; ctx.beginPath(); ctx.arc(SX, SY + 8, 26, Math.PI, 0); ctx.fill();
    if (this.shot) this.bubble(ctx, this.shot.x, this.shot.y, this.shot.c); else if (this.cur != null) this.bubble(ctx, SX, SY, this.cur);
    this.bubble(ctx, 44, H - 30, this.next, 13); text(ctx, 'next', 44, H - 56, { size: 11, color: '#9aa4e8' });
    text(ctx, `Level ${this.level}`, 14, H - 12, { size: 12, align: 'left', color: '#9aa4e8' });
    text(ctx, `${5 - this.misses} to drop`, W - 14, H - 12, { size: 12, align: 'right', color: '#9aa4e8' });
  }
}

new BubblePop().mount();
