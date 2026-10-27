// Darkness. A light map is computed every frame from the room's ambient level
// and its lights, quantised to four steps with ordered dithering and laid over the scene, so
// light falls off in hard, chunky bands rather than smooth gradients.

import { W, H, BAYER, makeCanvas } from '../engine/gfx.js';
import { NIGHT_TINT } from './palette.js';
import { phase } from './calendar.js';
import { cond } from './state.js';
import { TILE } from './tiles.js';

const LEVELS = [0, 0.32, 0.66, 0.92];
const LW = W, LH = H;

const AMBIENT = {
  in: { day: 0.97, dusk: 0.8, night: 0.42 },
  out: { day: 1, dusk: 0.55, night: 0.16 },
};

export function ambientFor(room, state) {
  const base = AMBIENT[room.outside ? 'out' : 'in'][phase(state.time)];
  return Math.min(1, base * (room.ambient ?? 1));
}

// the room's lights that are on right now, in world pixels
export function activeLights(room, state, t, steady = false) {
  const out = [];
  for (const l of room.lights || []) {
    if (!cond(state, l.when)) continue;
    if (l.phases && !l.phases.includes(phase(state.time))) continue;
    let i = l.i ?? 0.8;
    if (l.flicker && !steady) i *= 0.8 + 0.2 * Math.abs(Math.sin(t * 7.3 + l.x) * Math.sin(t * 3.1));
    out.push({ x: l.x * TILE, y: l.y * TILE, r: (l.r ?? 3) * TILE, i });
  }
  return out;
}

export class Lighting {
  constructor() {
    this.canvas = null;
  }

  ensure() {
    if (this.canvas) return;
    this.canvas = makeCanvas(LW, LH);
    this.cx = this.canvas.getContext('2d');
    this.img = this.cx.createImageData(LW, LH);
  }

  draw(g, ambient, lights, camX, camY) {
    if (ambient >= 0.99) return;
    this.ensure();
    const d = this.img.data;
    const ls = lights
      .map(l => ({ x: l.x - camX, y: l.y - camY, r: l.r, i: l.i }))
      .filter(l => l.x + l.r > 0 && l.x - l.r < LW && l.y + l.r > 0 && l.y - l.r < LH);
    const [tr, tg, tb] = NIGHT_TINT;
    let k = 0;
    for (let y = 0; y < LH; y++) {
      for (let x = 0; x < LW; x++, k += 4) {
        let L = ambient;
        for (const l of ls) {
          const dx = x + 0.5 - l.x, dy = y + 0.5 - l.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < l.r * l.r) { const f = 1 - Math.sqrt(d2) / l.r; L += l.i * f * f; }
        }
        const dark = L >= 1 ? 0 : 1 - L;
        const lv = dark * 3;
        let base = Math.floor(lv);
        if (lv - base > BAYER[(y & 3) * 4 + (x & 3)]) base++;
        d[k] = tr; d[k + 1] = tg; d[k + 2] = tb;
        d[k + 3] = LEVELS[Math.min(3, base)] * 255;
      }
    }
    this.cx.putImageData(this.img, 0, 0);
    g.ctx.drawImage(this.canvas, 0, 0, W, H);
  }
}
