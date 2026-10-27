// Every sprite in the game, drawn either as hex-pixel rows or painted procedurally.

import { sprite, canvasSprite, withRows } from '../engine/sprite.js';
import { C } from '../engine/palette.js';
import { WORLD_SPRITES } from './art-world.js';
import { CAST_SPRITES } from './art-cast.js';

export { PORTRAITS, ICONS } from './art-cast.js';

// ---- Elias -------------------------------------------------------------------------------

const DOWN = [
  '...22...',
  '..2332..',
  '.222222.',
  '.266662.',
  '..6226..',
  '..6666..',
  '...66...',
  '..4444..',
  '.434434.',
  '.434434.',
  '.434434.',
  '.644446.',
  '..4334..',
  '..2..2..',
  '..1..1..',
];
const UP = [
  '...22...',
  '..2332..',
  '.223322.',
  '.222222.',
  '..2222..',
  '..2222..',
  '...66...',
  '..4444..',
  '.444444.',
  '.434434.',
  '.434434.',
  '.644446.',
  '..4444..',
  '..2..2..',
  '..1..1..',
];
const SIDE = [
  '...22...',
  '..2332..',
  '.22266..',
  '.22666..',
  '..2662..',
  '..2666..',
  '...66...',
  '..4444..',
  '..4444..',
  '..3444..',
  '..3446..',
  '..3444..',
  '..4444..',
  '..2.2...',
  '..1.1...',
];

const LEGS = {
  front: [['..2...2.', '..1...1.'], ['.2...2..', '.1...1..']],
  side: [['.2...2..', '.1....1.'], ['...22...', '...11...']],
};

function frames(base, legs) {
  return [sprite(base), sprite(withRows(base, 13, legs[0])), sprite(base), sprite(withRows(base, 13, legs[1]))];
}

export const PLAYER = {
  down: frames(DOWN, LEGS.front),
  up: frames(UP, LEGS.front),
  right: frames(SIDE, LEGS.side),
};
export const PLAYER_W = 8, PLAYER_H = 15;

// ---- props -------------------------------------------------------------------------------

const car = canvasSprite(16, 24, ({ rect, set }) => {
  rect(1, 1, 14, 22, C.SLATE);
  rect(2, 0, 12, 1, C.NEAR); rect(2, 23, 12, 1, C.NEAR);
  rect(0, 2, 1, 20, C.NEAR); rect(15, 2, 1, 20, C.NEAR);
  rect(3, 2, 10, 5, C.ASH);                      // hood, popped a finger's width
  rect(3, 6, 10, 1, C.BLACK);
  rect(2, 7, 12, 3, C.COLD); set(4, 7, C.STONE); set(5, 8, C.STONE);
  rect(3, 10, 10, 6, C.ASH); rect(3, 10, 10, 1, C.SLATE);
  rect(3, 16, 10, 2, C.INK);
  rect(3, 18, 10, 4, C.ASH);
  set(2, 0, C.PALE); set(13, 0, C.PALE);
  set(2, 23, C.BLOOD); set(13, 23, C.BLOOD);
  for (const y of [4, 16]) { rect(0, y, 1, 4, C.BLACK); rect(15, y, 1, 4, C.BLACK); }
});

const shrine = canvasSprite(32, 40, ({ rect, set }) => {
  // broken iron cross: the right arm is gone
  rect(15, 0, 2, 6, C.STONE); rect(12, 1, 3, 1, C.STONE);
  for (let r = 0; r < 5; r++) { const w = 8 + r * 6; rect(16 - w / 2, 5 + r, w, 1, C.SLATE); }
  rect(1, 9, 30, 1, C.INK);
  rect(3, 10, 5, 20, C.ASH); rect(24, 10, 5, 20, C.ASH);
  rect(3, 10, 1, 20, C.STONE); rect(24, 10, 1, 20, C.STONE);
  rect(7, 10, 1, 20, C.SLATE); rect(28, 10, 1, 20, C.SLATE);
  rect(26, 10, 3, 3, 255);                          // a bite out of the pillar
  rect(8, 10, 16, 20, C.NEAR);
  // the saint: no face, a hollow chest
  rect(14, 12, 4, 4, C.STONE); set(15, 13, C.ASH); set(16, 14, C.ASH);
  for (let y = 16; y < 30; y++) { const w = 6 + Math.floor((y - 16) / 3); rect(16 - w / 2, y, w, 1, C.STONE); }
  rect(13, 20, 1, 9, C.ASH); rect(18, 22, 1, 7, C.ASH);
  rect(15, 18, 2, 4, C.BLACK);
  set(12, 22, C.PALE); set(19, 22, C.PALE);
  rect(2, 30, 28, 10, C.ASH); rect(2, 30, 28, 1, C.STONE);
  rect(6, 33, 1, 4, C.SLATE); rect(20, 32, 5, 1, C.SLATE); rect(24, 33, 1, 3, C.SLATE);
  for (let x = 2; x < 30; x++) if ((x * 7) % 5 < 2) set(x, 39, C.MOSS);
  for (let x = 3; x < 29; x += 3) set(x, 38, C.MOSS);
  rect(0, 36, 3, 3, C.ASH); rect(29, 35, 3, 4, C.SLATE);
});

function candles(lit, frame) {
  return canvasSprite(14, 9, ({ rect, set }) => {
    rect(0, 7, 14, 2, C.DIRT); rect(0, 8, 14, 1, C.INK);
    const stubs = [[1, 4], [4, 3], [10, 5]];
    for (const [x, h] of stubs) { rect(x, 7 - h, 2, h, C.PALE); set(x, 7 - h, C.BONE); set(x + 1, 6, C.DIRT); }
    rect(6, 3, 3, 4, lit ? C.RED : C.BLOOD); set(7, 3, lit ? C.CANDLE : C.DRIED); // red glass votive
    if (lit) {
      for (const [x, h] of stubs) {
        const top = 7 - h;
        set(x + (frame ? 1 : 0), top - 1, C.CANDLE);
        set(x + (frame ? 0 : 1), top - 2, frame ? C.BONE : C.CANDLE);
      }
      set(7, 2, C.BONE);
    } else for (const [x, h] of stubs) set(x, 6 - h, C.NEAR);
  });
}

const bowl = canvasSprite(10, 6, ({ rect, set }) => {
  rect(1, 2, 8, 3, C.ASH); rect(2, 5, 6, 1, C.SLATE); rect(1, 2, 8, 1, C.STONE);
  set(3, 2, C.CANDLE); set(5, 2, C.DIRT); set(6, 2, C.CANDLE);
  set(7, 1, C.COLD); set(8, 0, C.COLD); set(8, 2, C.COLD); set(9, 3, C.COLD); // a ribbon over the rim
});

const sign = canvasSprite(22, 10, ({ rect, set }) => {
  rect(0, 7, 22, 1, C.INK);
  rect(2, 1, 16, 6, C.DIRT); rect(2, 1, 16, 1, C.SLATE); rect(2, 6, 16, 1, C.INK);
  for (let x = 4; x < 16; x += 2) set(x, 3 + (x % 4 ? 1 : 0), C.INK);
  rect(17, 4, 5, 2, C.INK); // the post, snapped
});

const pump = canvasSprite(8, 18, ({ rect, set }) => {
  rect(1, 0, 6, 18, C.DRIED); rect(1, 0, 6, 1, C.BLOOD); rect(1, 17, 6, 1, C.NEAR);
  rect(2, 2, 4, 4, C.INK); set(3, 3, C.PALE); set(4, 3, C.PALE); set(3, 5, C.STONE);
  rect(2, 8, 4, 2, C.BLOOD);
  rect(7, 6, 1, 6, C.NEAR); rect(6, 12, 1, 3, C.NEAR); set(0, 7, C.ASH);
});

const marker = canvasSprite(4, 10, ({ rect, set }) => {
  rect(0, 0, 4, 9, C.PALE); rect(0, 9, 4, 1, C.INK); rect(3, 1, 1, 8, C.STONE);
  set(1, 3, C.INK); set(1, 4, C.INK); set(1, 5, C.INK);
});

const chain = canvasSprite(32, 9, ({ set, rect }) => {
  for (let x = 0; x < 32; x++) { const y = 3 + Math.round(Math.sin(x / 5) * 1.5); set(x, y, x % 3 ? C.STONE : C.PALE); }
  rect(14, 3, 4, 4, C.CANDLE); rect(15, 1, 2, 2, C.STONE); set(15, 4, C.DIRT); // new brass padlock
});

const redWindow = [0, 1].map(f => canvasSprite(6, 6, ({ rect, set }) => {
  rect(0, 2, 6, 4, C.DRIED); rect(0, 4, 6, 2, C.BLOOD);
  if (f) { set(1, 5, C.RED); set(2, 4, C.RED); } else { set(3, 5, C.RED); }
  rect(3, 0, 1, 6, C.SLATE);
}));

const counter = canvasSprite(40, 16, ({ rect, set }) => {
  rect(0, 4, 40, 3, C.DIRT); rect(0, 4, 40, 1, C.ASH);
  rect(0, 7, 40, 9, C.INK); rect(0, 15, 40, 1, C.NEAR);
  for (let x = 4; x < 40; x += 9) rect(x, 8, 1, 7, C.NEAR);
  rect(26, 0, 9, 5, C.ASH); rect(27, 1, 7, 2, C.SLATE); set(28, 1, C.STONE); set(30, 1, C.STONE);
  rect(25, 5, 4, 2, C.BLACK); // the drawer, open
  rect(6, 2, 5, 2, C.PALE);   // paper
});

const shelves = canvasSprite(48, 20, ({ rect, set }) => {
  rect(0, 0, 48, 20, C.NEAR);
  rect(0, 0, 2, 20, C.INK); rect(46, 0, 2, 20, C.INK);
  for (const y of [5, 11, 17]) rect(0, y, 48, 1, C.DIRT);
  const cols = [C.STONE, C.ASH, C.BLOOD, C.PALE, C.ASH, C.DIRT];
  for (const [y, n] of [[1, 9], [7, 6], [13, 4]]) for (let i = 0; i < n; i++) {
    const x = 3 + i * 5 + (y === 7 ? 6 : 0);
    rect(x, y, 3, 4, cols[(i + y) % cols.length]); set(x, y, C.BONE);
  }
  rect(30, 13, 8, 4, C.PALE); rect(31, 13, 3, 1, C.CANDLE); // the box of votives
  rect(40, 17, 6, 1, C.BLACK); // shelf collapsed at the end
});

const payphone = canvasSprite(8, 22, ({ rect, set }) => {
  rect(0, 0, 8, 12, C.STONE); rect(0, 0, 8, 1, C.PALE); rect(7, 1, 1, 11, C.ASH);
  rect(2, 2, 4, 4, C.SLATE); set(3, 3, C.PALE); set(4, 4, C.PALE);
  rect(2, 7, 4, 3, C.ASH);
  set(0, 6, C.NEAR); set(0, 8, C.NEAR); set(1, 10, C.NEAR); set(1, 12, C.NEAR); // cut cord
  rect(1, 18, 2, 4, C.NEAR); set(3, 18, C.NEAR); set(3, 21, C.NEAR); // the handset, on the floor
});

const calendar = canvasSprite(8, 10, ({ rect, set }) => {
  rect(0, 0, 8, 10, C.PALE); rect(0, 0, 8, 2, C.BLOOD);
  for (let y = 3; y < 10; y += 2) for (let x = 1; x < 8; x += 2) set(x, y, C.BLOOD);
});

const boards = canvasSprite(12, 10, ({ rect }) => {
  rect(0, 0, 12, 10, C.BLACK);
  rect(0, 1, 12, 2, C.DIRT); rect(0, 6, 12, 2, C.DIRT); rect(0, 1, 12, 1, C.SLATE);
  rect(2, 0, 1, 10, C.INK); rect(9, 0, 1, 10, C.INK);
});

const footprints = canvasSprite(18, 8, ({ set }) => {
  for (let i = 0; i < 4; i++) {
    const x = 1 + i * 4, y = i % 2 ? 1 : 4;
    set(x, y, C.NEAR); set(x + 1, y, C.NEAR); set(x, y + 1, C.NEAR); set(x + 1, y + 1, C.NEAR); set(x + 2, y + 1, C.NEAR);
  }
});

const cans = canvasSprite(10, 4, ({ rect, set }) => {
  rect(0, 1, 3, 3, C.STONE); rect(5, 2, 4, 2, C.ASH); set(6, 2, C.BLOOD); set(3, 3, C.STONE);
});

const cot = canvasSprite(32, 12, ({ rect, set }) => {
  rect(0, 2, 32, 7, C.STONE); rect(0, 2, 32, 1, C.PALE);
  rect(1, 9, 1, 3, C.ASH); rect(30, 9, 1, 3, C.ASH);
  rect(10, 1, 20, 8, C.COLD); rect(10, 1, 20, 1, C.STONE);
  for (let x = 12; x < 30; x += 4) set(x, 4 + (x % 3), C.INK);
  rect(2, 3, 6, 4, C.PALE); // pillow, with the shape of a head still in it
  set(4, 4, C.STONE); set(5, 4, C.STONE); set(4, 5, C.STONE);
});

const tapeDeck = canvasSprite(14, 14, ({ rect, set }) => {
  rect(0, 6, 14, 8, C.DIRT); rect(0, 6, 14, 1, C.ASH);
  for (const y of [9, 12]) rect(0, y, 14, 1, C.INK);
  rect(2, 1, 10, 5, C.SLATE); rect(2, 1, 10, 1, C.ASH);
  rect(4, 2, 5, 2, C.BLACK);
  for (let x = 3; x < 12; x += 2) set(x, 5, C.STONE);
});
const tapeLight = [0, 1].map(f => canvasSprite(1, 1, ({ set }) => set(0, 0, f ? C.RED : C.BLOOD)));

const circle = canvasSprite(26, 16, ({ set, rect }) => {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(12 + Math.cos(a) * 11), y = Math.round(7 + Math.sin(a) * 6);
    rect(x, y, 2, 2, C.PALE); set(x, y + 2, C.DIRT); set(x + 1, y + 2, C.DIRT);
  }
});

const hatch = canvasSprite(16, 12, ({ rect, set }) => {
  rect(0, 0, 16, 12, C.DIRT);
  for (const x of [3, 7, 11]) rect(x, 0, 1, 12, C.INK);
  rect(0, 0, 16, 1, C.ASH); rect(0, 11, 16, 1, C.NEAR);
  rect(1, 2, 14, 1, C.INK); rect(1, 9, 14, 1, C.INK);
  rect(7, 5, 3, 3, C.CANDLE); set(8, 4, C.STONE); set(8, 6, C.DIRT);
});

export const SPRITES = {
  car, shrine, bowl, sign, pump, marker, chain, counter, shelves, payphone, calendar,
  boards, footprints, cans, cot, tapeDeck, circle, hatch,
  candles_unlit: candles(false, 0),
  candles_lit: [candles(true, 0), candles(true, 1)],
  red_window: redWindow,
  tape_light: tapeLight,
  ...WORLD_SPRITES,
  ...CAST_SPRITES,
};

// sprite lookup that accepts animated entries (arrays) and picks a frame
export function spriteFrame(name, tick, rate = 12) {
  const s = SPRITES[name];
  if (!s) return null;
  return Array.isArray(s) ? s[Math.floor(tick / rate) % s.length] : s;
}
