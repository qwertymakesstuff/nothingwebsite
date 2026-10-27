// Original pixel art, drawn in code. Every sprite is painted once with fillRect calls onto a
// small offscreen canvas and cached; the renderer scales them up with smoothing off.

import { CROPS_BY_ID } from '../data/crops.js';
import { ITEMS_BY_ID } from '../data/items.js';

const cache = new Map();
function make(key, w, h, paint) {
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  paint(pen(ctx), ctx);
  cache.set(key, c);
  return c;
}

// A tiny drawing kit: r = rect, p = pixel, many = list of pixels.
function pen(ctx) {
  const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  return {
    r, p: (x, y, c) => r(x, y, 1, 1, c),
    many: (pts, c) => { ctx.fillStyle = c; for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1); },
    circle: (cx, cy, rad, c) => { ctx.fillStyle = c; for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + rad * 0.8) ctx.fillRect(cx + x, cy + y, 1, 1); },
    ellipse: (cx, cy, rx, ry, c) => { ctx.fillStyle = c; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) ctx.fillRect(cx + x, cy + y, 1, 1); },
    ctx,
  };
}

// deterministic per-tile noise
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export { hash };

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};
export { shade };

export const GRASS = [
  { base: '#79bd57', dark: '#5ea443', light: '#98d46d', flower: ['#ffd7f0', '#fff27a', '#ffffff'] },
  { base: '#5fac47', dark: '#4a9137', light: '#7cc45c', flower: ['#ffe14a', '#ff8ac8', '#ffffff'] },
  { base: '#b5a648', dark: '#968836', light: '#cfc05e', flower: ['#e8762a', '#c8402a', '#ffd04a'] },
  { base: '#e9eff5', dark: '#cbd7e3', light: '#ffffff', flower: ['#b8c8d8', '#d0dce8', '#ffffff'] },
];

// ---------------------------------------------------------------- ground tiles
export function tileSprite(ch, season, v) {
  return make(`t${ch}${season}${v}`, 16, 16, ({ r, p, many }) => {
    const g = GRASS[season];
    const speck = (n, c, s) => { for (let i = 0; i < n; i++) p(Math.floor(hash(i, v, s) * 16), Math.floor(hash(v, i, s + 1) * 16), c); };
    switch (ch) {
      case '.': case 'T': case 'B': case 'D': case 'h': case '#': case 'x': {
        r(0, 0, 16, 16, g.base);
        speck(10, g.dark, 1); speck(6, g.light, 2);
        if (season !== 3 && v % 3 === 0) { many([[3, 5], [4, 4], [5, 5]], g.dark); many([[11, 11], [12, 10], [13, 11]], g.dark); }
        if (v === 5) { p(7, 8, g.flower[0]); p(12, 3, g.flower[1]); }
        break;
      }
      case '"': {
        r(0, 0, 16, 16, g.base);
        speck(8, g.dark, 3);
        for (let i = 0; i < 5; i++) { const x = 1 + Math.floor(hash(i, v, 9) * 13), y = 4 + Math.floor(hash(v, i, 8) * 9); r(x, y, 1, 3, g.dark); r(x + 1, y - 1, 1, 3, g.light); }
        if (season < 3) { p(3 + (v % 9), 3 + (v % 5), g.flower[v % 3]); p(10 - (v % 4), 11, g.flower[(v + 1) % 3]); }
        break;
      }
      case '=': {
        const c = season === 3 ? '#ddd6cf' : '#c9a26c';
        r(0, 0, 16, 16, c);
        speck(9, shade(c, -0.1), 4); speck(5, shade(c, 0.07), 5);
        if (v % 2) { r(4, 9, 2, 1, shade(c, -0.18)); r(11, 3, 2, 1, shade(c, -0.18)); }
        break;
      }
      case 'c': {
        r(0, 0, 16, 16, season === 3 ? '#c9ccd4' : '#a3a3ab');
        const st = season === 3 ? '#e2e5ec' : '#bdbdc6';
        const off = (v % 2) * 4;
        for (let y = 0; y < 16; y += 4) for (let x = ((y / 4) % 2) * 4 - off; x < 16; x += 8) { r(x + 1, y + 1, 6, 3, st); r(x + 1, y + 3, 6, 1, shade(st, -0.12)); }
        break;
      }
      case 's': r(0, 0, 16, 16, '#e9d9a3'); speck(10, '#d4c286', 6); speck(4, '#f6ecc4', 7); if (v === 3) { p(6, 7, '#f0c8d0'); p(7, 7, '#e8b0bc'); } break;
      case 'g': r(0, 0, 16, 16, season === 3 ? '#d6d4d2' : '#a59b8c'); speck(14, '#8a8072', 8); speck(6, '#c2b8a8', 9); break;
      case 'b': {
        r(0, 0, 16, 16, '#3f8bd2');
        for (let x = 0; x < 16; x += 4) { r(x, 0, 4, 16, x % 8 ? '#b5844e' : '#a6763f'); r(x + 3, 0, 1, 16, '#7d5228'); }
        p(1, 3, '#5a3a1a'); p(9, 11, '#5a3a1a');
        break;
      }
      case 'r': {
        r(0, 0, 16, 16, '#7d6d5e');
        r(0, 0, 16, 3, '#968676'); speck(10, '#5f5246', 10); speck(6, '#a49484', 11);
        r(0, 12, 16, 4, '#66584b');
        if (season === 3) r(0, 0, 16, 2, '#f2f6fa');
        break;
      }
      case 'W': r(0, 0, 16, 16, '#4a3226'); r(0, 14, 16, 2, '#3a261c'); break;
      case 'f': {
        r(0, 0, 16, 16, '#b88855');
        for (let y = 0; y < 16; y += 4) { r(0, y + 3, 16, 1, '#946638'); r(((y / 4) * 5 + v) % 16, y, 1, 3, '#a2744a'); }
        break;
      }
      case 'k': r(0, 0, 16, 16, '#a83a3a'); r(1, 1, 14, 14, '#c0504a'); for (let i = 2; i < 14; i += 4) { r(i, 7, 2, 2, '#f0c070'); r(7, i, 2, 2, '#f0c070'); } break;
      case 'u': r(0, 0, 16, 16, '#b88855'); r(0, 2, 16, 10, '#8a5a2e'); r(0, 2, 16, 3, '#c49060'); r(0, 11, 16, 2, '#5e3c1c'); break;
      default: r(0, 0, 16, 16, '#000');
    }
  });
}

export function waterSprite(frame, season, deep = false) {
  return make(`w${frame}${season}${deep}`, 16, 16, ({ r }) => {
    const base = season === 3 ? '#6a9cc8' : deep ? '#2f72bd' : '#3b86cf';
    r(0, 0, 16, 16, base);
    const hi = shade(base, 0.16);
    for (let i = 0; i < 3; i++) { const y = (i * 5 + frame * 2) % 16, x = (i * 7 + frame * 3) % 12; r(x, y, 4, 1, hi); r(x + 1, y + 1, 2, 1, shade(base, 0.08)); }
  });
}

// ---------------------------------------------------------------- trees and plants
export function treeSprite(season, v) {
  return make(`tree${season}${v % 3}`, 32, 44, ({ r, circle, many }) => {
    const leaf = [['#4f9e3f', '#3c8231', '#6cb84f'], ['#3f8f36', '#2f7429', '#58a948'], ['#d8842a', '#b0601e', '#eea84a'], ['#c8d8e6', '#a8bccc', '#ffffff']][season];
    r(13, 26, 6, 16, '#7a5230'); r(13, 26, 2, 16, '#5e3c20'); r(11, 40, 10, 3, '#6a4426');
    if (season === 3) {
      // bare branches with snow
      r(9, 18, 2, 10, '#6a4426'); r(21, 16, 2, 12, '#6a4426'); r(15, 10, 2, 16, '#6a4426');
      r(7, 17, 6, 2, '#f4f8fc'); r(19, 15, 6, 2, '#f4f8fc'); r(13, 9, 6, 2, '#f4f8fc');
      return;
    }
    circle(16, 16, 11, leaf[1]);
    circle(10, 20, 7, leaf[1]); circle(22, 20, 7, leaf[1]);
    circle(15, 14, 9, leaf[0]); circle(10, 19, 5, leaf[0]); circle(22, 19, 5, leaf[0]);
    circle(13, 10, 4, leaf[2]); circle(20, 14, 3, leaf[2]);
    if (season === 0) many([[8, 14], [18, 8], [24, 18], [12, 22], [20, 23], [15, 16]], '#ffc8e0');
    if (season === 2 && v % 2) many([[9, 23], [23, 24], [16, 21]], '#c84a1e');
    if (v % 3 === 1 && season === 1) many([[10, 15], [21, 12], [17, 20]], '#d83a3a');
  });
}

export function hedgeSprite(season) {
  return make(`hedge${season}`, 16, 18, ({ circle, r }) => {
    const c = ['#4a9a3c', '#3c8a32', '#a87a2e', '#d8e4ee'][season];
    circle(8, 10, 7, shade(c, -0.12)); circle(7, 8, 6, c); circle(10, 9, 4, shade(c, 0.08));
    if (season === 0) { r(4, 7, 1, 1, '#ffffff'); r(11, 11, 1, 1, '#ffd0e8'); }
  });
}

// ---------------------------------------------------------------- crops
export function cropSprite(cropId, stage, dead) {
  return make(`crop${cropId}${stage}${dead}`, 16, 24, ({ r, p, circle, ellipse, many }) => {
    const c = CROPS_BY_ID[cropId];
    const leaf = dead ? '#8a7450' : c.leaf, dark = shade(leaf, -0.15);
    const base = 22;
    if (stage === 0) { r(7, base - 1, 2, 1, '#6a4a2a'); p(7, base - 2, leaf); p(8, base - 3, leaf); return; }
    if (stage === 1) { r(7, base - 4, 1, 4, dark); many([[5, base - 5], [6, base - 4], [9, base - 5], [10, base - 6], [8, base - 4]], leaf); return; }
    const big = stage >= 3;
    switch (c.shape) {
      case 'root': {
        const h = big ? 9 : 6;
        for (let i = -2; i <= 2; i++) r(7 + i * 2, base - h + Math.abs(i), 2, h - Math.abs(i) - 1, i % 2 ? dark : leaf);
        if (stage === 4 && !dead) { ellipse(8, base - 1, 3, 2, c.color); r(6, base - 3, 5, 1, c.color2); }
        break;
      }
      case 'head': {
        circle(8, base - 4, big ? 6 : 4, leaf); circle(4, base - 3, 3, dark); circle(12, base - 3, 3, dark);
        if (stage === 4 && !dead) { circle(8, base - 6, 4, c.color); many([[6, base - 8], [9, base - 7], [7, base - 5]], c.color2); }
        break;
      }
      case 'bush': {
        circle(8, base - 6, big ? 6 : 4, dark); circle(7, base - 7, big ? 5 : 3, leaf);
        if (stage === 4 && !dead) { const pts = [[4, base - 8], [10, base - 10], [11, base - 5], [6, base - 4], [8, base - 7]]; for (const [x, y] of pts) { r(x, y, 2, 2, c.color); p(x, y, shade(c.color, 0.25)); } }
        break;
      }
      case 'vine': {
        r(11, base - 18, 1, 18, '#a8804a'); r(4, base - 18, 1, 18, '#a8804a');
        const h = big ? 16 : 10;
        for (let y = 0; y < h; y += 3) { r(5, base - y - 2, 3, 2, leaf); r(8, base - y - 3, 3, 2, dark); }
        if (stage === 4 && !dead) for (const [x, y] of [[5, base - 6], [9, base - 10], [6, base - 13], [8, base - 4]]) { r(x, y, 2, 3, c.color); p(x, y, shade(c.color, 0.25)); }
        break;
      }
      case 'ground': {
        for (const [x, y] of [[3, base - 4], [11, base - 5], [7, base - 7]]) circle(x, y, 2, leaf);
        r(2, base - 2, 12, 1, dark);
        if (stage === 4 && !dead) { ellipse(8, base - 4, 6, 4, c.color); r(3, base - 5, 10, 1, c.color2); r(5, base - 8, 1, 2, c.color2); r(10, base - 7, 1, 2, c.color2); p(8, base - 9, '#5a8a2a'); }
        else if (big) ellipse(8, base - 3, 3, 2, shade(c.color, -0.2));
        break;
      }
      case 'tall': {
        const h = big ? 20 : 12;
        r(7, base - h, 2, h, leaf);
        for (let y = 4; y < h; y += 4) { r(3, base - y, 4, 1, dark); r(9, base - y - 2, 4, 1, dark); }
        if (stage === 4 && !dead) { r(9, base - 14, 3, 6, c.color); r(9, base - 15, 3, 1, '#e8e0a0'); r(4, base - 12, 3, 5, c.color); }
        break;
      }
      case 'flower': {
        const h = big ? 18 : 11;
        r(7, base - h, 2, h, leaf); r(4, base - 8, 3, 2, dark); r(9, base - 11, 3, 2, dark);
        if (stage === 4 && !dead) { circle(8, base - h - 1, 4, c.color); circle(8, base - h - 1, 2, c.color2); }
        else if (big) circle(8, base - h - 1, 2, '#6a9a3a');
        break;
      }
    }
  });
}

export function soilSprite(watered, season) {
  return make(`soil${watered}${season}`, 16, 16, ({ r, p }) => {
    const c = watered ? '#5e3e22' : '#8f6236';
    r(1, 1, 14, 14, c);
    r(1, 1, 14, 1, shade(c, -0.12)); r(1, 14, 14, 1, shade(c, 0.1));
    for (let y = 4; y < 14; y += 4) r(2, y, 12, 1, shade(c, -0.08));
    p(4, 6, shade(c, 0.12)); p(11, 10, shade(c, 0.12));
    if (season === 3 && !watered) { r(2, 2, 3, 1, '#f0f4f8'); r(10, 12, 3, 1, '#f0f4f8'); }
  });
}

// ---------------------------------------------------------------- objects
export function objectSprite(type, season = 0, extra = '') {
  return make(`obj${type}${season}${extra}`, 16, 24, ({ r, p, circle, ellipse, many }) => {
    const b = 22; // ground line
    switch (type) {
      case 'weed': {
        const c = ['#5aa83e', '#4e9a36', '#a8902e', '#9aa8b4'][season];
        for (const [x, h] of [[4, 6], [6, 9], [8, 7], [10, 10], [12, 6]]) { r(x, b - h, 1, h, c); p(x + 1, b - h + 1, shade(c, 0.12)); }
        break;
      }
      case 'stone': ellipse(8, b - 3, 5, 3, '#8a8a92'); ellipse(7, b - 4, 4, 2, '#a4a4ac'); p(6, b - 5, '#c4c4cc'); break;
      case 'twig': r(3, b - 3, 10, 2, '#7a5230'); r(5, b - 5, 2, 2, '#7a5230'); r(10, b - 2, 3, 1, '#5e3c20'); p(3, b - 3, '#a8784a'); break;
      case 'stump': ellipse(8, b - 4, 6, 4, '#6a4426'); ellipse(8, b - 6, 6, 3, '#b8884e'); ellipse(8, b - 6, 3, 1, '#8a5e30'); break;
      case 'boulder': ellipse(8, b - 6, 7, 6, '#6e6e78'); ellipse(7, b - 7, 6, 5, '#8a8a94'); ellipse(5, b - 9, 2, 2, '#a8a8b2'); r(9, b - 4, 4, 1, '#5a5a64'); break;
      case 'rock': ellipse(8, b - 4, 6, 4, '#7e766c'); ellipse(7, b - 5, 5, 3, '#9a9286'); p(5, b - 6, '#b4ac9e'); break;
      case 'copper': ellipse(8, b - 4, 6, 4, '#7a7068'); ellipse(7, b - 5, 5, 3, '#968c82'); many([[5, b - 6], [9, b - 5], [7, b - 3], [11, b - 4]], '#e8884a'); break;
      case 'iron': ellipse(8, b - 4, 6, 4, '#6a6a70'); ellipse(7, b - 5, 5, 3, '#86868e'); many([[5, b - 5], [9, b - 6], [8, b - 3], [11, b - 4]], '#e4dcd4'); break;
      case 'gemrock': ellipse(8, b - 4, 6, 4, '#6a6478'); ellipse(7, b - 5, 5, 3, '#847e94'); many([[6, b - 6], [10, b - 4]], '#d0a8ff'); many([[8, b - 3]], '#ffe08a'); break;
      case 'sapling': r(7, b - 7, 2, 7, '#7a5230'); circle(8, b - 9, 3, season === 3 ? '#a8b8c4' : '#5aa83e'); break;
      case 'chest': r(2, b - 10, 12, 10, '#a8703a'); r(2, b - 10, 12, 3, '#c48a4e'); r(2, b - 7, 12, 1, '#6a4020'); r(7, b - 8, 2, 3, '#e0c040'); r(2, b - 1, 12, 1, '#6a4020'); break;
      case 'scarecrow': {
        r(7, b - 18, 2, 18, '#7a5230'); r(3, b - 13, 10, 2, '#7a5230');
        r(5, b - 14, 6, 7, '#5a7ac8'); r(4, b - 13, 1, 4, '#5a7ac8'); r(11, b - 13, 1, 4, '#5a7ac8');
        circle(8, b - 18, 3, '#e8c878'); r(4, b - 21, 8, 2, '#8a5a2a'); r(6, b - 23, 4, 2, '#8a5a2a');
        p(7, b - 18, '#3a2a1a'); p(9, b - 18, '#3a2a1a'); r(7, b - 16, 3, 1, '#a04030');
        break;
      }
      case 'sprinkler': case 'qsprinkler': {
        const c = type === 'qsprinkler' ? '#c8ccd2' : '#c07a3a';
        ellipse(8, b - 3, 5, 3, shade(c, -0.2)); ellipse(8, b - 4, 4, 2, c); r(7, b - 8, 2, 5, c); r(6, b - 9, 4, 1, '#6ac0f0');
        break;
      }
      case 'furnace': {
        r(2, b - 14, 12, 14, '#7a7a82'); r(2, b - 14, 12, 2, '#9a9aa2');
        for (let y = b - 11; y < b; y += 3) r(2, y, 12, 1, '#62626a');
        r(5, b - 8, 6, 5, '#2a2020'); if (extra === 'on') { r(6, b - 6, 4, 3, '#ff8a2a'); r(7, b - 5, 2, 2, '#ffe07a'); }
        r(6, b - 18, 4, 4, '#62626a');
        break;
      }
      case 'jar': {
        r(4, b - 12, 8, 12, '#a8d0e0'); r(5, b - 11, 6, 10, extra === 'on' ? '#e05a3a' : '#d8eef6'); r(4, b - 14, 8, 2, '#8a5a2a');
        p(5, b - 10, '#ffffff'); r(3, b - 1, 10, 1, '#7a9aa8');
        break;
      }
      case 'lamp': case 'lantern': {
        if (type === 'lamp') { r(7, b - 20, 2, 20, '#3a3a40'); r(5, b - 23, 6, 4, '#3a3a40'); r(6, b - 22, 4, 2, '#ffe08a'); r(5, b - 1, 6, 1, '#2a2a30'); }
        else { r(7, b - 12, 2, 12, '#6a4426'); ellipse(8, b - 15, 4, 4, '#e05a3a'); r(5, b - 16, 6, 1, '#ffd08a'); r(5, b - 13, 6, 1, '#c03a2a'); }
        break;
      }
      case 'bench': r(1, b - 7, 14, 2, '#a8703a'); r(1, b - 11, 14, 2, '#c48a4e'); r(2, b - 5, 2, 5, '#6a4020'); r(12, b - 5, 2, 5, '#6a4020'); break;
      case 'planter': { r(2, b - 6, 12, 6, '#a8703a'); r(2, b - 6, 12, 1, '#c48a4e'); const fl = ['#ff7ab0', '#ffe04a', '#ffffff', '#b07aff']; for (let i = 0; i < 5; i++) { r(3 + i * 2, b - 9, 1, 3, '#4a9a3a'); r(3 + i * 2, b - 10, 2, 2, fl[i % 4]); } break; }
      case 'gnome': r(5, b - 8, 6, 8, '#3a7ac8'); circle(8, b - 10, 3, '#f0c8a0'); r(5, b - 9, 6, 2, '#ffffff'); r(6, b - 16, 4, 4, '#d83a3a'); r(7, b - 18, 2, 2, '#d83a3a'); r(5, b - 13, 6, 1, '#d83a3a'); break;
      case 'birdbath': r(6, b - 10, 4, 10, '#a8a8b0'); ellipse(8, b - 11, 6, 2, '#b8b8c0'); ellipse(8, b - 11, 4, 1, '#6ac0f0'); r(4, b - 1, 8, 1, '#8a8a92'); break;
      case 'fence': {
        const [, e, , w] = extra.split('').map(Number);
        r(6, b - 12, 4, 12, '#c8a070'); r(6, b - 12, 4, 1, '#e0bc8a'); r(9, b - 11, 1, 11, '#8a6030');
        if (w) { r(0, b - 10, 6, 2, '#b8905e'); r(0, b - 5, 6, 2, '#b8905e'); }
        if (e) { r(10, b - 10, 6, 2, '#b8905e'); r(10, b - 5, 6, 2, '#b8905e'); }
        break;
      }
      case 'oldfence': r(2, b - 10, 2, 10, '#8a7a6a'); r(12, b - 8, 2, 8, '#8a7a6a'); r(0, b - 8, 16, 2, '#9a8a7a'); r(5, b - 4, 7, 2, '#7a6a5a'); break;
      case 'ribbon': r(7, b - 10, 2, 10, '#c8a070'); circle(8, b - 13, 4, '#3a6ad8'); circle(8, b - 13, 2, '#ffd34d'); r(6, b - 9, 2, 4, '#3a6ad8'); r(9, b - 9, 2, 4, '#3a6ad8'); break;
      case 'wpath': r(0, b - 16, 16, 16, '#b0804a'); for (let x = 0; x < 16; x += 5) r(x, b - 16, 1, 16, '#8a5a2a'); r(0, b - 9, 16, 1, '#8a5a2a'); break;
      case 'spath': r(0, b - 16, 16, 16, '#8f8f98'); for (const [x, y, w, h] of [[1, 1, 6, 6], [9, 1, 6, 5], [1, 9, 5, 6], [8, 8, 7, 7]]) { r(x, b - 16 + y, w, h, '#b4b4bc'); r(x, b - 16 + y + h - 1, w, 1, '#9a9aa2'); } break;
      case 'bin': r(1, b - 12, 14, 12, '#8a5a2e'); r(1, b - 12, 14, 3, '#b07a42'); r(0, b - 13, 16, 2, '#6a4020'); for (let x = 3; x < 14; x += 4) r(x, b - 9, 1, 9, '#6a4020'); r(6, b - 7, 4, 3, '#e0c040'); break;
      case 'well': circle(8, b - 6, 7, '#8a8a92'); circle(8, b - 6, 5, '#2a4a6a'); r(1, b - 20, 2, 14, '#6a4426'); r(13, b - 20, 2, 14, '#6a4426'); r(0, b - 21, 16, 3, '#a8703a'); break;
      case 'board': r(1, b - 18, 14, 11, '#8a5a2e'); r(2, b - 17, 12, 9, '#d8c098'); r(3, b - 7, 2, 7, '#6a4020'); r(11, b - 7, 2, 7, '#6a4020'); r(4, b - 15, 4, 3, '#ffffff'); r(9, b - 14, 4, 4, '#f8e8a0'); p(6, b - 15, '#d83a3a'); p(11, b - 14, '#3a6ad8'); break;
      case 'sign': r(7, b - 8, 2, 8, '#6a4020'); r(2, b - 14, 12, 7, '#a8703a'); r(3, b - 13, 10, 5, '#c48a4e'); r(4, b - 11, 8, 1, '#6a4020'); break;
      case 'bed': break;
      default: r(4, b - 8, 8, 8, '#ff00ff');
    }
  });
}

// Larger things inside buildings: beds, stoves, shelves, forge...
export function furnitureSprite(kind, w, h, extra = '') {
  return make(`furn${kind}${w}${h}${extra}`, w * 16, h * 16 + 8, ({ r, p, circle }) => {
    const W = w * 16, H = h * 16 + 8;
    switch (kind) {
      case 'bed': r(1, 4, W - 2, H - 6, '#6a4020'); r(3, 6, W - 6, 8, '#f4f0e8'); r(3, 14, W - 6, H - 18, '#4a7ac8'); r(3, 14, W - 6, 2, '#6a9ae0'); r(0, 2, W, 4, '#8a5a2e'); break;
      case 'kitchen':
        r(0, 4, W, H - 4, '#8a5a2e'); r(0, 4, W, 4, extra === 'new' ? '#d8d8e0' : '#a89a8a');
        r(4, 10, 20, 12, extra === 'new' ? '#3a3a44' : '#5a4a3a'); circle(10, 8, 3, '#2a2a30'); circle(18, 8, 3, '#2a2a30');
        r(32, 10, 28, 12, '#a8703a'); r(34, 12, 10, 8, '#c48a4e'); r(48, 12, 10, 8, '#c48a4e');
        if (extra !== 'new') { r(6, 12, 3, 3, '#8a7a6a'); p(20, 16, '#3a2a1a'); }
        break;
      case 'bookshelf': r(0, 0, W, H, '#6a4020'); for (let y = 3; y < H - 2; y += 7) { r(2, y, W - 4, 6, '#3a2418'); for (let x = 3; x < W - 3; x += 3) r(x, y + 1, 2, 5, ['#c83a3a', '#3a6ac8', '#3aa85a', '#e0c040'][(x + y) % 4]); } break;
      case 'shelf': r(0, 0, W, H, '#7a4a26'); for (let y = 3; y < H - 2; y += 7) { r(2, y, W - 4, 6, '#4a2c18'); for (let x = 4; x < W - 4; x += 6) { r(x, y + 2, 4, 4, ['#e8384b', '#f5d33f', '#7cc04f', '#c79a5b', '#f08a1c'][(x / 6 + y) % 5 | 0]); } } break;
      case 'barrel': r(2, 8, W - 4, H - 8, '#8a5a2e'); r(2, 10, W - 4, 2, '#4a3020'); r(2, H - 5, W - 4, 2, '#4a3020'); r(4, 6, W - 8, 3, '#a8703a'); break;
      case 'forge': r(0, 4, W, H - 4, '#5a5a62'); r(2, 2, W - 4, 4, '#7a7a82'); r(6, 12, W - 12, 8, '#2a1a14'); r(8, 14, W - 16, 5, extra === 'night' ? '#ff6a1a' : '#ff8a2a'); r(10, 15, W - 20, 3, '#ffe07a'); break;
      case 'anvil': r(2, 12, 12, 4, '#4a4a52'); r(5, 16, 6, 6, '#3a3a42'); r(3, 22, 10, 2, '#2a2a32'); r(0, 12, 3, 2, '#4a4a52'); break;
      case 'lumber': for (let i = 0; i < 4; i++) { r(0, 6 + i * 5, W, 4, i % 2 ? '#b0804a' : '#c8965a'); circle(3, 8 + i * 5, 2, '#8a5a2a'); } break;
      case 'plant': r(4, 14, 8, 8, '#a8603a'); circle(8, 10, 5, '#4a9a3a'); circle(6, 8, 2, '#6aba4a'); break;
      case 'bench': r(0, 10, W, 3, '#c48a4e'); r(0, 15, W, 3, '#a8703a'); r(1, 18, 2, 6, '#6a4020'); r(W - 3, 18, 2, 6, '#6a4020'); break;
      case 'lamp': r(7, 0, 2, H, '#3a3a40'); r(5, 0, 6, 4, '#3a3a40'); r(6, 1, 4, 2, '#ffe08a'); break;
      default: r(0, 0, W, H, '#f0f');
    }
  });
}

// ---------------------------------------------------------------- buildings
const STYLES = {
  farmhouse: { wall: '#e8d8b8', trim: '#8a5a2e', roof: '#b8483a', door: '#7a4a26' },
  store: { wall: '#f0e0c0', trim: '#4f7a4a', roof: '#4f9a5a', door: '#5a3a20' },
  cottage: { wall: '#f4e4d4', trim: '#a87a5a', roof: '#d8784a', door: '#7a4a26' },
  hall: { wall: '#e0dcd4', trim: '#6a6a7a', roof: '#5a5a8a', door: '#4a3a5a' },
  smithy: { wall: '#9a8a7a', trim: '#4a3a30', roof: '#5a4a44', door: '#3a2a20' },
  workshop: { wall: '#d8b088', trim: '#7a5030', roof: '#3a6ab0', door: '#6a4020' },
  manor: { wall: '#ece4f0', trim: '#7a2a5a', roof: '#7a3a6a', door: '#5a2a4a' },
  cabin: { wall: '#a8784a', trim: '#6a4426', roof: '#4a7a3a', door: '#5a3a20' },
  hut: { wall: '#b8a080', trim: '#6a5030', roof: '#8a7a5a', door: '#5a4030' },
};

export function buildingSprite(b, season, night) {
  const W = b.w * 16, roofH = 12, H = b.h * 16 + roofH;
  return make(`bld${b.id}${season}${night}`, W, H, ({ r, p }) => {
    const s = STYLES[b.style];
    const wallTop = roofH + Math.floor(b.h * 16 * 0.38);
    // roof (top part of the footprint) — shingle rows
    const roofBottom = wallTop + 2;
    for (let y = 0; y < roofBottom; y++) {
      const inset = Math.max(0, Math.floor((roofH - y) * 0.9));
      const c = (Math.floor(y / 3) % 2) ? s.roof : shade(s.roof, -0.08);
      r(inset, y, W - inset * 2, 1, c);
    }
    r(0, roofBottom - 2, W, 2, shade(s.roof, -0.25));
    if (season === 3) { for (let y = 0; y < 6; y++) { const inset = Math.max(0, Math.floor((roofH - y) * 0.9)); r(inset, y, W - inset * 2, 1, '#f4f8fc'); } r(0, roofBottom - 4, W, 2, '#e8eef4'); }
    // chimney
    if (['farmhouse', 'cottage', 'smithy', 'cabin', 'manor'].includes(b.style)) { r(W - 22, 0, 6, roofH, '#8a5a4a'); r(W - 23, 0, 8, 2, '#6a4a3a'); }
    // walls
    r(0, roofBottom, W, H - roofBottom, s.wall);
    for (let y = roofBottom + 3; y < H; y += 4) r(0, y, W, 1, shade(s.wall, -0.06));
    r(0, roofBottom, 2, H - roofBottom, s.trim); r(W - 2, roofBottom, 2, H - roofBottom, s.trim);
    r(0, H - 2, W, 2, shade(s.trim, -0.1));
    // door
    const dx = (b.door.x - b.x) * 16;
    r(dx + 3, H - 14, 10, 14, s.trim); r(dx + 4, H - 13, 8, 13, s.door); p(dx + 10, H - 7, '#e0c040');
    // windows
    const lit = night ? '#ffe08a' : '#a8d8f0';
    for (let wx = 6; wx + 10 <= W - 4; wx += 22) {
      if (wx + 10 > dx && wx < dx + 16) continue;
      r(wx, H - 16, 10, 9, s.trim); r(wx + 1, H - 15, 8, 7, lit); r(wx + 5, H - 15, 1, 7, s.trim); r(wx + 1, H - 12, 8, 1, s.trim);
      if (!night) p(wx + 2, H - 14, '#ffffff');
    }
    // shop signs
    if (b.sign) {
      const sx = Math.floor(W / 2) - 7, sy = roofBottom + 1;
      r(sx, sy, 14, 9, '#6a4020'); r(sx + 1, sy + 1, 12, 7, '#f0e0b0');
      if (b.sign === 'seed') { r(sx + 5, sy + 2, 4, 5, '#4f9a5a'); p(sx + 7, sy + 2, '#8fd65a'); }
      if (b.sign === 'anvil') { r(sx + 3, sy + 3, 8, 2, '#3a3a42'); r(sx + 5, sy + 5, 4, 2, '#3a3a42'); }
      if (b.sign === 'saw') { r(sx + 3, sy + 4, 8, 2, '#a8a8b0'); r(sx + 10, sy + 3, 2, 4, '#8a5a2e'); }
      if (b.sign === 'star') { r(sx + 6, sy + 2, 2, 5, '#e0a020'); r(sx + 4, sy + 4, 6, 1, '#e0a020'); }
    }
  });
}

// ---------------------------------------------------------------- characters
// 16 x 24, feet at the bottom. dir: down/up/left/right, frame 0-3 (walk cycle).
export function charSprite(look, dir, frame, tool = '') {
  const k = `ch${JSON.stringify(look)}${dir}${frame}${tool}`;
  return make(k, 16, 24, ({ r, p }) => {
    const { skin, hair, shirt, pants, eyes = '#2a1a10', hairStyle = 'short', extra } = look;
    const step = frame % 2 === 1 ? (frame === 1 ? 1 : -1) : 0;
    const bob = frame % 2 ? 0 : 0;
    const shoe = '#3a2a20';
    const side = dir === 'left' || dir === 'right';
    const flip = dir === 'left';
    const X = x => (flip ? 15 - x : x);
    const R = (x, y, w, h, c) => r(flip ? 16 - x - w : x, y + bob, w, h, c);
    const P = (x, y, c) => p(X(x), y + bob, c);
    // legs
    if (side) {
      R(6, 18, 2, 4 - Math.max(0, step), pants); R(8, 18, 2, 4 - Math.max(0, -step), pants);
      R(5 + step, 21, 3, 2, shoe); R(8 - step, 21, 3, 2, shoe);
    } else {
      R(5, 18, 2, 4 + (step > 0 ? -1 : 0), pants); R(9, 18, 2, 4 + (step < 0 ? -1 : 0), pants);
      R(5, 21 + (step > 0 ? -1 : 0), 2, 2, shoe); R(9, 21 + (step < 0 ? -1 : 0), 2, 2, shoe);
    }
    // body
    R(4, 11, 8, 8, shirt); R(4, 17, 8, 1, shade(shirt, -0.15));
    if (extra === 'apron') { R(5, 13, 6, 6, '#f4f0e8'); R(5, 13, 6, 1, '#d8d0c0'); }
    // arms
    if (side) { R(7 - step, 12, 2, 5, shade(shirt, -0.1)); R(7 - step, 17, 2, 1, skin); }
    else { R(3, 12, 1, 5, shade(shirt, -0.1)); R(12, 12, 1, 5, shade(shirt, -0.1)); R(3, 16 - Math.max(0, step), 1, 2, skin); R(12, 16 - Math.max(0, -step), 1, 2, skin); }
    // head
    R(4, 3, 8, 8, skin); R(5, 10, 6, 1, shade(skin, -0.1));
    // hair
    const hairDark = shade(hair, -0.12);
    if (hairStyle !== 'bald') {
      R(4, 2, 8, 3, hair); R(3, 3, 1, 4, hair); R(12, 3, 1, 4, hair);
      if (dir === 'up') R(4, 3, 8, 7, hair);
      if (side) { R(3, 3, 6, 5, hair); R(9, 3, 3, 2, hair); }
      if (hairStyle === 'long') { R(3, 6, 1, 7, hair); R(12, 6, 1, 7, hair); if (dir === 'up') R(4, 9, 8, 4, hairDark); if (side) R(3, 6, 3, 7, hair); }
      if (hairStyle === 'bun') { R(6, 0, 4, 3, hairDark); }
      if (hairStyle === 'curly') { R(3, 1, 10, 3, hair); R(2, 3, 2, 5, hair); R(12, 3, 2, 5, hair); P(5, 1, hairDark); P(9, 1, hairDark); }
    } else { R(3, 5, 1, 3, hair); R(12, 5, 1, 3, hair); }
    if (extra === 'cap') { R(3, 1, 10, 3, '#c83a3a'); if (dir === 'down') R(3, 4, 10, 1, '#a02a2a'); if (side) R(10, 3, 4, 1, '#a02a2a'); }
    // face
    if (dir === 'down') {
      P(6, 7, eyes); P(9, 7, eyes);
      P(7, 9, shade(skin, -0.2)); P(8, 9, shade(skin, -0.2));
      if (extra === 'glasses') { R(5, 6, 3, 3, '#2a2a2a'); R(8, 6, 3, 3, '#2a2a2a'); P(6, 7, '#c8e0f0'); P(9, 7, '#c8e0f0'); P(6, 8, eyes); P(9, 8, eyes); }
      if (extra === 'beard') { R(4, 8, 8, 3, hair === '#d8d8d8' ? '#e8e8e8' : hairDark); P(7, 9, skin); P(8, 9, skin); }
    } else if (side) {
      P(10, 7, eyes);
      if (extra === 'glasses') { R(9, 6, 3, 3, '#2a2a2a'); P(10, 7, '#c8e0f0'); }
      if (extra === 'beard') R(8, 8, 4, 3, hair === '#d8d8d8' ? '#e8e8e8' : hairDark);
      P(12, 8, skin);
    }
    // held tool (when swinging)
    if (tool) {
      R(side ? 11 : 12, 10, 1, 8, '#8a5a2e');
      if (tool === 'hoe' || tool === 'axe' || tool === 'pickaxe') R(side ? 11 : 11, 9, 3, 2, '#a8a8b0');
      if (tool === 'can') R(side ? 10 : 11, 15, 4, 3, '#6a9ae0');
    }
  });
}

// 48 x 48 portrait for dialogue boxes.
export function portraitSprite(look) {
  return make(`pt${JSON.stringify(look)}`, 48, 48, ({ r, p, circle, ellipse }) => {
    const { skin, hair, shirt, eyes = '#2a1a10', hairStyle = 'short', extra } = look;
    const dark = shade(hair, -0.12);
    r(0, 0, 48, 48, '#f6e8c8');
    r(10, 36, 28, 12, shirt); r(8, 40, 32, 8, shirt);
    if (extra === 'apron') r(16, 38, 16, 10, '#f4f0e8');
    r(19, 32, 10, 6, skin);
    if (hairStyle === 'long') r(10, 14, 28, 26, hair);
    if (hairStyle === 'curly') { circle(24, 16, 15, hair); circle(11, 22, 6, hair); circle(37, 22, 6, hair); }
    ellipse(24, 22, 11, 13, skin);
    if (hairStyle !== 'bald') { ellipse(24, 11, 12, 6, hair); r(12, 10, 4, 12, hair); r(32, 10, 4, 12, hair); r(14, 9, 20, 4, hair); }
    else { r(12, 16, 3, 8, hair); r(33, 16, 3, 8, hair); }
    if (hairStyle === 'bun') circle(24, 4, 5, dark);
    if (extra === 'cap') { r(11, 5, 26, 7, '#c83a3a'); r(9, 11, 30, 2, '#a02a2a'); }
    r(18, 21, 3, 3, eyes); r(27, 21, 3, 3, eyes); p(19, 21, '#ffffff'); p(28, 21, '#ffffff');
    r(17, 18, 5, 1, dark); r(26, 18, 5, 1, dark);
    r(21, 29, 6, 1, shade(skin, -0.3));
    p(23, 26, shade(skin, -0.15)); p(24, 26, shade(skin, -0.15));
    circle(15, 27, 2, shade(skin, 0.04)); circle(33, 27, 2, shade(skin, 0.04));
    if (extra === 'glasses') { r(16, 19, 7, 1, '#2a2a2a'); r(25, 19, 7, 1, '#2a2a2a'); r(16, 24, 7, 1, '#2a2a2a'); r(25, 24, 7, 1, '#2a2a2a'); r(16, 19, 1, 6, '#2a2a2a'); r(22, 19, 1, 6, '#2a2a2a'); r(25, 19, 1, 6, '#2a2a2a'); r(31, 19, 1, 6, '#2a2a2a'); r(23, 21, 2, 1, '#2a2a2a'); }
    if (extra === 'beard') { const bc = hair === '#d8d8d8' ? '#ececec' : dark; ellipse(24, 31, 10, 6, bc); r(21, 28, 6, 2, shade(skin, -0.3)); }
  });
}

// ---------------------------------------------------------------- item icons
export function itemIcon(id) {
  return make(`it${id}`, 16, 16, ({ r, p, circle, ellipse, many }) => {
    const it = ITEMS_BY_ID[id];
    if (!it) { r(4, 4, 8, 8, '#f0f'); return; }
    const ic = it.icon || {};
    const c1 = ic.c1 || '#ccc', c2 = ic.c2 || '#888';
    switch (ic.shape) {
      case 'tool': drawToolIcon(ic.tool, r, p); break;
      case 'root': ellipse(8, 10, 5, 4, c1); r(4, 8, 8, 2, c2); r(7, 1, 2, 5, ic.leaf); r(4, 2, 2, 4, ic.leaf); r(10, 2, 2, 4, ic.leaf); p(8, 14, shade(c1, -0.2)); break;
      case 'head': circle(8, 9, 5, '#5aa24a'); circle(8, 8, 4, c1); many([[6, 6], [9, 7], [7, 9]], c2); break;
      case 'bush': for (const [x, y] of [[5, 7], [10, 6], [8, 10], [4, 11], [11, 11]]) { circle(x, y, 2, c1); p(x - 1, y - 1, shade(c1, 0.3)); } r(7, 1, 2, 4, ic.leaf); break;
      case 'vine': ellipse(8, 9, 5, 5, c1); r(6, 3, 4, 2, ic.leaf); p(6, 7, shade(c1, 0.3)); p(5, 8, shade(c1, 0.3)); break;
      case 'ground': ellipse(8, 9, 6, 5, c1); for (let x = 4; x < 13; x += 3) r(x, 5, 1, 9, c2); r(7, 2, 2, 3, '#6a8a2a'); break;
      case 'tall': r(6, 2, 4, 12, c1); for (let y = 3; y < 13; y += 2) r(7, y, 2, 1, shade(c1, -0.15)); r(4, 8, 2, 7, ic.leaf); r(10, 8, 2, 7, ic.leaf); break;
      case 'flower': if (it.cat === 'forage') { r(7, 7, 2, 8, '#5a9a3a'); circle(8, 6, 4, c1); circle(8, 6, 1, c2); } else { r(7, 7, 2, 8, ic.leaf); circle(8, 6, 5, c1); circle(8, 6, 2, c2); } break;
      case 'packet': r(3, 2, 10, 12, '#f0e0b8'); r(3, 2, 10, 2, '#c8a870'); circle(8, 9, 3, c1); r(7, 5, 2, 2, c2); r(3, 13, 10, 1, '#a88850'); break;
      case 'fish': ellipse(7, 8, 5, 3, c1); r(12, 6, 3, 5, c1); r(3, 9, 7, 1, c2); p(4, 7, '#1a1a1a'); r(7, 4, 3, 1, shade(c1, -0.15)); break;
      case 'log': r(2, 5, 12, 6, c1); ellipse(13, 8, 2, 3, c2); r(2, 6, 10, 1, shade(c1, -0.15)); r(2, 9, 10, 1, shade(c1, -0.15)); break;
      case 'stone': ellipse(8, 9, 6, 4, c1); ellipse(7, 8, 4, 2, c2); break;
      case 'leaf': r(7, 3, 1, 11, c2); ellipse(5, 7, 2, 4, c1); ellipse(10, 9, 2, 4, c1); break;
      case 'drop': circle(8, 10, 4, c1); r(7, 3, 2, 4, c1); p(6, 9, c2); p(7, 8, c2); break;
      case 'seed': ellipse(8, 9, 4, 5, c1); r(5, 4, 6, 3, c2); r(7, 2, 2, 2, '#5a3a1a'); break;
      case 'ore': ellipse(8, 9, 6, 5, c1); many([[5, 7], [9, 6], [7, 11], [11, 10]], c2); break;
      case 'bar': r(2, 6, 12, 6, c1); r(3, 5, 10, 2, c2); r(2, 11, 12, 1, shade(c1, -0.2)); break;
      case 'gem': for (let y = 0; y < 5; y++) r(8 - y, 4 + y, y * 2 + 1, 1, c1); for (let y = 0; y < 5; y++) r(4 + y, 9 + y, 9 - y * 2, 1, shade(c1, -0.15)); p(7, 6, c2); break;
      case 'sack': r(3, 5, 10, 9, c1); r(5, 3, 6, 3, c1); r(6, 4, 4, 1, shade(c1, -0.2)); r(5, 9, 6, 2, c2); break;
      case 'bread': ellipse(8, 9, 6, 4, c1); r(4, 7, 8, 1, c2); p(6, 6, c2); p(10, 6, c2); break;
      case 'bowl': ellipse(8, 9, 6, 2, c1); r(2, 9, 12, 2, c2); ellipse(8, 11, 5, 3, c2); r(4, 7, 1, 2, '#ffffff'); break;
      case 'pie': ellipse(8, 10, 6, 3, c2); ellipse(8, 9, 5, 2, c1); r(3, 11, 10, 2, shade(c2, -0.15)); break;
      case 'shell': for (let i = 0; i < 4; i++) r(4 + i, 6 + i, 8 - i * 2, 1, c1); ellipse(8, 9, 5, 3, c1); for (let x = 5; x < 12; x += 2) r(x, 7, 1, 5, c2); break;
      case 'chest': r(2, 5, 12, 9, c1); r(2, 5, 12, 3, shade(c1, 0.12)); r(7, 7, 2, 3, c2); r(2, 8, 12, 1, shade(c1, -0.25)); break;
      case 'jar': r(4, 4, 8, 10, '#c8e0e8'); r(5, 6, 6, 7, c2); r(4, 2, 8, 2, '#8a5a2a'); p(5, 6, '#ffffff'); break;
      case 'scarecrow': r(7, 2, 2, 13, '#7a5230'); r(3, 6, 10, 2, '#7a5230'); r(5, 6, 6, 5, c2); circle(8, 4, 2, c1); r(5, 1, 6, 1, '#8a5a2a'); break;
      case 'sprinkler': ellipse(8, 11, 5, 3, c1); r(7, 5, 2, 6, c1); r(5, 4, 6, 1, c2); many([[3, 3], [13, 3], [8, 1]], c2); break;
      case 'furnace': r(3, 3, 10, 12, c1); r(5, 8, 6, 5, '#2a2020'); r(6, 10, 4, 3, c2); break;
      case 'lamp': r(7, 5, 2, 10, c1); r(5, 1, 6, 5, c1); r(6, 2, 4, 3, c2); break;
      case 'bench': r(1, 6, 14, 2, c1); r(1, 9, 14, 2, c1); r(2, 11, 2, 4, c2); r(12, 11, 2, 4, c2); break;
      case 'planter': r(2, 9, 12, 6, c1); for (let i = 0; i < 4; i++) { r(3 + i * 3, 5, 1, 4, '#4a9a3a'); r(3 + i * 3, 4, 2, 2, [c2, '#ffe04a', '#ffffff', '#b07aff'][i]); } break;
      case 'gnome': r(5, 8, 6, 7, c2); circle(8, 7, 2, '#f0c8a0'); r(6, 2, 4, 4, c1); r(7, 1, 2, 1, c1); r(5, 8, 6, 1, '#ffffff'); break;
      case 'birdbath': r(7, 8, 2, 7, c1); ellipse(8, 7, 6, 2, c1); ellipse(8, 6, 4, 1, c2); break;
      case 'fence': r(3, 3, 3, 12, c1); r(10, 3, 3, 12, c1); r(1, 6, 14, 2, c2); r(1, 11, 14, 2, c2); break;
      case 'ribbon': circle(8, 6, 5, c1); circle(8, 6, 2, c2); r(5, 10, 2, 5, c1); r(9, 10, 2, 5, c1); break;
      case 'tile': r(1, 1, 14, 14, c1); r(1, 8, 14, 1, c2); r(8, 1, 1, 7, c2); r(4, 9, 1, 6, c2); break;
      default: circle(8, 8, 5, c1);
    }
  });
}

function drawToolIcon(tool, r, p) {
  const wood = '#9a6a3a', metal = '#b8bcc4';
  switch (tool) {
    case 'hoe': r(7, 3, 2, 12, wood); r(4, 2, 6, 3, metal); r(4, 5, 2, 1, '#8a8e96'); break;
    case 'can': r(3, 6, 8, 7, '#5a8ad8'); r(3, 6, 8, 1, '#8ab0f0'); r(11, 7, 3, 2, '#5a8ad8'); r(13, 5, 1, 3, '#5a8ad8'); r(5, 3, 4, 1, '#3a6ab8'); r(4, 4, 1, 2, '#3a6ab8'); r(9, 4, 1, 2, '#3a6ab8'); break;
    case 'axe': r(7, 3, 2, 12, wood); r(9, 2, 4, 6, metal); r(12, 3, 1, 4, '#e8ecf0'); break;
    case 'pickaxe': r(7, 4, 2, 11, wood); r(2, 2, 12, 2, metal); r(2, 4, 2, 2, metal); r(12, 4, 2, 2, metal); break;
    case 'scythe': r(9, 3, 2, 12, wood); r(2, 2, 9, 2, metal); r(2, 4, 3, 2, metal); break;
    case 'rod': for (let i = 0; i < 12; i++) p(3 + i, 14 - i, wood); r(3, 12, 3, 3, '#4a4a52'); for (let i = 0; i < 6; i++) p(14, 3 + i, '#e8e8e8'); p(14, 9, '#d83a3a'); break;
  }
}

export function iconURL(id) {
  const k = `url${id}`;
  if (cache.has(k)) return cache.get(k);
  const u = itemIcon(id).toDataURL();
  cache.set(k, u);
  return u;
}
export function portraitURL(look) {
  const k = `purl${JSON.stringify(look)}`;
  if (cache.has(k)) return cache.get(k);
  const u = portraitSprite(look).toDataURL();
  cache.set(k, u);
  return u;
}
export function canvasURL(canvas, k) {
  if (cache.has(k)) return cache.get(k);
  const u = canvas.toDataURL();
  cache.set(k, u);
  return u;
}
