import { Game, dirOf, randInt, roundRect } from '../assets/gamekit.js';

const N = 20, C = 24;

class Snake extends Game {
  constructor() {
    super({
      slug: 'snake', title: 'Snake', width: N * C, height: N * C, bg: '#09120c',
      help: 'Eat the apples and grow. Hit a wall or yourself and it is over. Steer with the arrow keys or WASD; on a phone swipe across the board or use the pad. P pauses.',
      controls: { dpad: true, swipe: true },
    });
  }

  reset() {
    this.body = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = [1, 0];
    this.queue = [];
    this.acc = 0;
    this.step = 0.13;
    this.grow = 0;
    this.placeFood();
  }

  placeFood() {
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!this.body.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    this.food = free.length ? free[randInt(0, free.length - 1)] : null;
  }

  press(code) {
    const d = dirOf(code);
    if (!d) return;
    const last = this.queue.length ? this.queue.at(-1) : this.dir;
    if ((d[0] === -last[0] && d[1] === -last[1]) || (d[0] === last[0] && d[1] === last[1])) return; // no U-turns, no repeats
    if (this.queue.length < 2) this.queue.push(d);
  }

  update(dt) {
    this.acc += dt;
    while (this.acc >= this.step && this.state === 'playing') { this.acc -= this.step; this.tick(); }
  }

  tick() {
    if (this.queue.length) this.dir = this.queue.shift();
    const head = { x: this.body[0].x + this.dir[0], y: this.body[0].y + this.dir[1] };
    const eating = this.food && head.x === this.food.x && head.y === this.food.y;
    const bodyToCheck = eating || this.grow > 0 ? this.body : this.body.slice(0, -1); // the tail moves away this tick
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || bodyToCheck.some((s) => s.x === head.x && s.y === head.y)) {
      this.sfx(140, 0.35, 'sawtooth', 0.06, -90);
      this.gameOver();
      return;
    }
    this.body.unshift(head);
    if (eating) {
      this.addScore(10);
      this.sfx(660, 0.08, 'square'); this.sfx(880, 0.08, 'square');
      this.step = Math.max(0.065, this.step * 0.97);
      this.placeFood();
      if (!this.food) { this.gameOver('You filled the board!'); }
    } else this.body.pop();
  }

  draw(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, N * C); ctx.moveTo(0, i * C); ctx.lineTo(N * C, i * C); ctx.stroke(); }
    if (this.food) {
      const fx = this.food.x * C + C / 2, fy = this.food.y * C + C / 2;
      ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(fx, fy + 1, C * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5be37d'; ctx.fillRect(fx - 1, fy - C * 0.5, 2, 6);
    }
    this.body.forEach((s, i) => {
      const t = 1 - i / Math.max(8, this.body.length);
      ctx.fillStyle = `hsl(${120 + (1 - t) * 20}, 65%, ${32 + t * 22}%)`;
      roundRect(ctx, s.x * C + 1.5, s.y * C + 1.5, C - 3, C - 3, i === 0 ? 8 : 6); ctx.fill();
    });
    const h = this.body[0];
    ctx.fillStyle = '#08130b';
    const ex = this.dir[0], ey = this.dir[1];
    for (const side of [-1, 1]) {
      const cx = h.x * C + C / 2 + ex * 4 - ey * side * 5, cy = h.y * C + C / 2 + ey * 4 + ex * side * 5;
      ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

new Snake().mount();
