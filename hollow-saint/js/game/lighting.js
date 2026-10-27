// Dithered darkness. Each pixel gets a light level from the brightest source reaching it; an
// ordered dither turns that into one of three bands: full colour, one shade down, or black.

import { SHADE } from '../engine/palette.js';
import { BAYER4 } from '../engine/frame.js';

let lm = null;

// lights: [{ x, y, r, i }] in screen coordinates. ambient: 0..1 base light everywhere.
export function applyLighting(fb, lights, ambient = 0) {
  const { w, h, px } = fb;
  if (!lm || lm.length !== w * h) lm = new Float32Array(w * h);
  lm.fill(ambient);
  for (const L of lights) {
    const r = Math.max(1, L.r), r2 = r * r, inten = L.i ?? 1;
    const x0 = Math.max(0, Math.floor(L.x - r)), x1 = Math.min(w - 1, Math.ceil(L.x + r));
    const y0 = Math.max(0, Math.floor(L.y - r)), y1 = Math.min(h - 1, Math.ceil(L.y + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y - L.y, row = y * w;
      for (let x = x0; x <= x1; x++) {
        const dx = x - L.x, d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const v = inten * (1 - d2 / r2);
        if (v > lm[row + x]) lm[row + x] = v;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    const row = y * w, by = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      const level = lm[i] * 2.2 + BAYER4[(x & 3) + by] / 16;
      if (level >= 2) continue;
      px[i] = level >= 1 ? SHADE[px[i]] : 0;
    }
  }
}

// light level at one point, for gameplay checks later on (can the player see this spot?)
export function lightAt(lights, x, y, ambient = 0) {
  let best = ambient;
  for (const L of lights) {
    const d2 = (x - L.x) ** 2 + (y - L.y) ** 2, r2 = L.r * L.r;
    if (d2 < r2) best = Math.max(best, (L.i ?? 1) * (1 - d2 / r2));
  }
  return best;
}
