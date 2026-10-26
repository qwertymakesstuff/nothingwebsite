// Tile types and how they're painted. Rooms are baked once into an indexed Frame when entered.

import { Frame } from '../engine/frame.js';
import { C } from '../engine/palette.js';
import { TILE, hash } from './config.js';

// solid: blocks movement. surface: footstep sound.
export const TILES = {
  'T': { name: 'forest', solid: true },
  '.': { name: 'ground', surface: 'dirt' },
  ',': { name: 'grass', surface: 'grass' },
  '=': { name: 'road', surface: 'gravel' },
  ':': { name: 'trail', surface: 'dirt' },
  'F': { name: 'fence', solid: true },
  'G': { name: 'gate', solid: true },
  'R': { name: 'roof', solid: true },
  'B': { name: 'clapboard', solid: true },
  'W': { name: 'boarded window', solid: true },
  'w': { name: 'lit window', solid: true },
  'D': { name: 'doorway', surface: 'wood' },
  '#': { name: 'wall top', solid: true },
  'H': { name: 'wall face', solid: true },
  '_': { name: 'floorboards', surface: 'wood' },
  'd': { name: 'threshold', surface: 'wood' },
  '+': { name: 'flagstone', surface: 'stone' },
};

export const isSolidChar = ch => !TILES[ch] || !!TILES[ch].solid;

function speckle(f, px, py, tx, ty, colors, chance, k = 0) {
  for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) {
    const r = hash(tx * 8 + i, ty * 8 + j, k);
    if (r < chance) f.pset(px + i, py + j, colors[Math.floor(r / chance * colors.length)]);
  }
}

const PAINT = {
  'T'(f, px, py, tx, ty, at) {
    f.rect(px, py, TILE, TILE, C.BLACK);
    speckle(f, px, py, tx, ty, [C.FOREST, C.NEAR], 0.12, 1);
    // the tree line: trunks where the forest meets open ground below it
    if (at(tx, ty + 1) !== 'T') {
      f.dither(px, py, TILE, 3, C.FOREST, 6);
      for (const tr of [1, 5]) if (hash(tx, ty, tr) < 0.7) {
        const x = px + tr + (hash(tx, ty, tr + 9) < 0.5 ? 0 : 1);
        f.vline(x, py + 2 + Math.floor(hash(tx, ty, tr + 3) * 3), py + TILE - 1, C.INK);
        if (hash(tx, ty, tr + 5) < 0.4) f.pset(x + 1, py + TILE - 1, C.INK);
      }
    }
    if (at(tx, ty - 1) !== 'T' && at(tx, ty - 1) !== undefined) f.dither(px, py, TILE, 2, C.FOREST, 8);
    if (at(tx - 1, ty) !== 'T' || at(tx + 1, ty) !== 'T') speckle(f, px, py, tx, ty, [C.FOREST], 0.25, 2);
  },
  '.'(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.FOREST);
    speckle(f, px, py, tx, ty, [C.MOSS, C.INK, C.NEAR], 0.09);
  },
  ','(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.FOREST);
    for (let k = 0; k < 3; k++) {
      const x = px + Math.floor(hash(tx, ty, k) * 7), y = py + 2 + Math.floor(hash(tx, ty, k + 4) * 5);
      f.pset(x, y, C.MOSS); f.pset(x + 1, y - 1, C.MOSS); f.pset(x + 2, y, C.MOSS);
    }
  },
  '='(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.DIRT);
    speckle(f, px, py, tx, ty, [C.INK, C.SLATE], 0.07);
  },
  ':'(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.FOREST);
    speckle(f, px, py, tx, ty, [C.DIRT, C.DIRT, C.INK], 0.3, 3);
  },
  'F'(f, px, py, tx, ty) {
    PAINT['.'](f, px, py, tx, ty);
    f.rect(px, py + 2, TILE, 1, C.SLATE); f.rect(px, py + 5, TILE, 1, C.SLATE);
    f.vline(px + 1, py, py + 7, C.ASH); f.vline(px + 6, py + 1, py + 7, C.ASH);
  },
  'G'(f, px, py) {
    f.rect(px, py, TILE, TILE, C.BLACK);
    for (let i = 0; i < TILE; i += 2) f.vline(px + i, py, py + 7, C.STONE);
    f.hline(px, px + 7, py + 1, C.ASH); f.hline(px, px + 7, py + 6, C.ASH);
  },
  'R'(f, px, py, tx, ty, at) {
    f.rect(px, py, TILE, TILE, C.INK);
    for (let j = 0; j < TILE; j += 3) {
      f.hline(px, px + 7, py + j, C.NEAR);
      for (let i = (j / 3 + tx) % 2 ? 0 : 2; i < TILE; i += 4) f.pset(px + i, py + j + 1, C.NEAR);
    }
    if (at(tx, ty + 1) !== 'R') f.hline(px, px + 7, py + 7, C.SLATE);
    if (hash(tx, ty, 7) < 0.3) f.rect(px + 2, py + 3, 2, 2, C.BLACK); // missing shingles
  },
  'B'(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.ASH);
    for (let j = 1; j < TILE; j += 2) f.hline(px, px + 7, py + j, C.SLATE);
    speckle(f, px, py, tx, ty, [C.SLATE, C.INK], 0.08, 5);
  },
  'W'(f, px, py, tx, ty) {
    PAINT['B'](f, px, py, tx, ty);
    f.rect(px + 1, py + 1, 6, 6, C.BLACK);
    f.hline(px, px + 7, py + 2, C.DIRT); f.hline(px, px + 7, py + 5, C.DIRT);
    f.line(px + 1, py + 6, px + 6, py + 1, C.DIRT);
  },
  'w'(f, px, py, tx, ty) {
    PAINT['B'](f, px, py, tx, ty);
    f.rect(px + 1, py + 1, 6, 6, C.BLACK);
    f.vline(px + 4, py + 1, py + 6, C.SLATE);
  },
  'D'(f, px, py) {
    f.rect(px, py, TILE, TILE, C.BLACK);
    f.vline(px, py, py + 7, C.SLATE); f.vline(px + 7, py, py + 7, C.SLATE);
    f.vline(px + 5, py + 1, py + 7, C.INK); // the door, hanging half open
    f.hline(px, px + 7, py, C.SLATE);
  },
  '#'(f, px, py) { f.rect(px, py, TILE, TILE, C.NEAR); },
  'H'(f, px, py, tx, ty, at) {
    f.rect(px, py, TILE, TILE, C.SLATE);
    speckle(f, px, py, tx, ty, [C.INK, C.ASH], 0.07, 6);
    if (hash(tx, ty, 8) < 0.25) f.dither(px, py + 2, 5, 4, C.INK, 8); // peeling plaster
    if (at(tx, ty + 1) !== 'H') { f.hline(px, px + 7, py + 6, C.INK); f.hline(px, px + 7, py + 7, C.NEAR); }
    if (at(tx, ty - 1) !== 'H') f.hline(px, px + 7, py, C.INK);
  },
  '_'(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.SLATE);
    f.hline(px, px + 7, py + 3, C.INK); f.hline(px, px + 7, py + 7, C.INK);
    f.pset(px + ((tx * 3) % 8), py + 1, C.INK); f.pset(px + ((tx * 5 + 4) % 8), py + 5, C.INK);
    speckle(f, px, py, tx, ty, [C.DIRT, C.INK], 0.06, 4);
  },
  'd'(f, px, py) {
    f.rect(px, py, TILE, TILE, C.BLACK);
    f.dither(px + 1, py + 4, 6, 4, C.COLD, 4);
    f.vline(px, py, py + 7, C.SLATE); f.vline(px + 7, py, py + 7, C.SLATE);
  },
  '+'(f, px, py, tx, ty) {
    f.rect(px, py, TILE, TILE, C.SLATE);
    f.hline(px, px + 7, py + 7, C.INK); f.vline(px + ((tx + ty) % 2 ? 3 : 7), py, py + 7, C.INK);
    speckle(f, px, py, tx, ty, [C.ASH, C.INK, C.MOSS], 0.1, 9);
  },
};

export function bakeRoom(room) {
  const tw = room.map[0].length, th = room.map.length;
  const f = new Frame(tw * TILE, th * TILE);
  const at = (x, y) => (y >= 0 && y < th && x >= 0 && x < tw ? room.map[y][x] : undefined);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const paint = PAINT[at(tx, ty)];
    if (paint) paint(f, tx * TILE, ty * TILE, tx, ty, at);
  }
  return f;
}
