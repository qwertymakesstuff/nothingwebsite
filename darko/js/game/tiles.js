// Room tiles. A room's map is rows of characters; walls ('#') are drawn as a two-tile-tall face
// where floor lies below them and as dark ceiling everywhere else, which gives the high
// three-quarter view. Each room is baked once to an offscreen canvas when it is entered.

import { C } from './palette.js';
import { makeCanvas } from '../engine/gfx.js';

export const TILE = 16;

// '#' wall, 'h' hedge, 'X' darkness: all block movement. Everything else is floor of some kind.
export const SOLID = new Set(['#', 'h', 'X']);
export const isSolidChar = ch => ch === undefined || SOLID.has(ch);

// which floor drawer each map character uses
export const FLOOR_OF = {
  '.': 'main', '_': 'threshold', ',': 'grass', '=': 'road', '-': 'walk', ':': 'drive', '~': 'path', 's': 'stairs',
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const hash = str => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

const fr = (x, px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };

const FLOORS = {
  carpet(x, px, py, r, th) {
    fr(x, px, py, TILE, TILE, th.floor);
    for (let i = 0; i < 7; i++) fr(x, px + ((r() * TILE) | 0), py + ((r() * TILE) | 0), 1, 1, th.floorAlt);
  },
  wood(x, px, py, r, th, tx, ty) {
    fr(x, px, py, TILE, TILE, th.floor);
    for (let row = 0; row < 4; row++) {
      fr(x, px, py + row * 4 + 3, TILE, 1, th.floorAlt);
      const seam = ((tx * 7 + ty * 3 + row * 5) % 4) * 4;
      fr(x, px + seam, py + row * 4, 1, 3, th.floorAlt);
    }
  },
  tile(x, px, py, r, th) {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) fr(x, px + i * 8, py + j * 8, 8, 8, (i + j) % 2 ? th.floor : th.floorAlt);
    fr(x, px, py, TILE, 1, th.grout || C.creamD); fr(x, px, py, 1, TILE, th.grout || C.creamD);
  },
  grass(x, px, py, r) {
    fr(x, px, py, TILE, TILE, C.green);
    for (let i = 0; i < 9; i++) { const gx = px + ((r() * 15) | 0), gy = py + ((r() * 14) | 0); fr(x, gx, gy, 1, 2, r() < 0.5 ? C.greenL : C.greenD); }
  },
  road(x, px, py, r) {
    fr(x, px, py, TILE, TILE, C.asphalt);
    for (let i = 0; i < 5; i++) fr(x, px + ((r() * TILE) | 0), py + ((r() * TILE) | 0), 1, 1, '#2a2933');
  },
  walk(x, px, py, r) {
    fr(x, px, py, TILE, TILE, C.concrete);
    fr(x, px, py, 1, TILE, '#3a3842'); fr(x, px, py, TILE, 1, '#56545e');
    if (r() < 0.2) fr(x, px + 4, py + 6, 5, 1, '#3a3842');
  },
  drive(x, px, py, r) {
    fr(x, px, py, TILE, TILE, '#3e3c46');
    for (let i = 0; i < 4; i++) fr(x, px + ((r() * TILE) | 0), py + ((r() * TILE) | 0), 1, 1, '#4a4852');
    if (r() < 0.15) fr(x, px + 2, py + 9, 7, 1, '#2e2d36');
  },
  path(x, px, py, r) {
    FLOORS.grass(x, px, py, r);
    fr(x, px + 1, py + 1, 6, 6, '#56545e'); fr(x, px + 9, py + 5, 6, 5, '#56545e'); fr(x, px + 2, py + 10, 6, 5, '#56545e');
  },
  concrete(x, px, py, r, th) {
    fr(x, px, py, TILE, TILE, th.floor);
    for (let i = 0; i < 6; i++) fr(x, px + ((r() * TILE) | 0), py + ((r() * TILE) | 0), 1, 1, th.floorAlt);
    if (r() < 0.25) fr(x, px + 3, py + ((r() * 12) | 0), 6, 1, th.floorAlt);
  },
  stairs(x, px, py, r, th) {
    for (let i = 0; i < 4; i++) {
      fr(x, px, py + i * 4, TILE, 3, th.stair || C.woodL);
      fr(x, px, py + i * 4 + 3, TILE, 1, th.stairD || C.woodD);
    }
  },
};

function drawFloor(x, ch, px, py, r, th, tx, ty) {
  let kind = FLOOR_OF[ch] || 'main';
  if (kind === 'main') kind = th.floorKind || 'carpet';
  if (kind === 'threshold') { fr(x, px, py, TILE, TILE, th.threshold || C.woodD); fr(x, px, py, TILE, 1, C.ink); return; }
  FLOORS[kind](x, px, py, r, th, tx, ty);
}

function drawWall(x, px, py, depth, th, r) {
  if (depth === 0) {
    // ceiling / roof seen from above
    fr(x, px, py, TILE, TILE, th.top || C.ink);
    if (th.roof) for (let y = 2; y < TILE; y += 4) fr(x, px, py + y, TILE, 1, th.roofD || '#121119');
    return;
  }
  fr(x, px, py, TILE, TILE, th.wall);
  if (th.wallStyle === 'paper') for (let i = 1; i < TILE; i += 4) fr(x, px + i, py, 1, TILE, th.wallD);
  if (th.wallStyle === 'siding') for (let i = 3; i < TILE; i += 4) fr(x, px, py + i, TILE, 1, th.wallD);
  if (th.wallStyle === 'panel' && depth === 1) { fr(x, px, py + 4, TILE, 1, th.wallD); fr(x, px, py + 5, TILE, 11, th.wallLow || th.wallD); }
  if (depth === 2) fr(x, px, py, TILE, 2, th.trim || th.wallD);
  if (depth === 1) { fr(x, px, py + TILE - 3, TILE, 3, th.trim || th.wallD); fr(x, px, py + TILE - 1, TILE, 1, C.ink); }
}

// how far below this wall tile the floor starts (1 or 2), or 0 if it is ceiling
export function faceDepth(room, tx, ty) {
  const at = (x, y) => (room.map[y] || '')[x];
  if (!isSolidChar(at(tx, ty)) || at(tx, ty) === 'X') return 0;
  if (!isSolidChar(at(tx, ty + 1))) return 1;
  if (at(tx, ty + 1) === '#' && !isSolidChar(at(tx, ty + 2))) return 2;
  return 0;
}

export function bakeRoom(room) {
  const c = makeCanvas(room.w * TILE, room.h * TILE);
  const x = c.getContext('2d');
  const r = rng(hash(room.id));
  const th = room.theme;
  for (let ty = 0; ty < room.h; ty++) {
    for (let tx = 0; tx < room.w; tx++) {
      const ch = room.map[ty][tx], px = tx * TILE, py = ty * TILE;
      if (ch === 'X') fr(x, px, py, TILE, TILE, C.black);
      else if (ch === 'h') {
        FLOORS.grass(x, px, py, r);
        fr(x, px, py + 2, TILE, TILE - 2, C.greenD); fr(x, px + 1, py, TILE - 2, 5, C.green);
        for (let i = 0; i < 5; i++) fr(x, px + ((r() * 14) | 0), py + ((r() * 6) | 0), 2, 1, C.greenL);
      } else if (ch === '#') drawWall(x, px, py, faceDepth(room, tx, ty), th, r);
      else drawFloor(x, ch, px, py, r, th, tx, ty);
    }
  }
  return c;
}
