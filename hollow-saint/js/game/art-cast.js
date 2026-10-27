// People, things that are not people, faces for conversations, and pocket icons.

import { sprite, canvasSprite, withRows } from '../engine/sprite.js';
import { C } from '../engine/palette.js';
import { hash } from './config.js';

const S = canvasSprite;

// ---- the cast, standing -------------------------------------------------------------------

const ruthChair = S(16, 20, ({ rect, set }) => {
  rect(1, 2, 14, 10, C.DRIED); rect(1, 2, 14, 1, C.BLOOD);
  rect(0, 8, 3, 9, C.DRIED); rect(13, 8, 3, 9, C.DRIED);
  rect(3, 11, 10, 6, C.BLOOD);
  rect(1, 17, 1, 3, C.NEAR); rect(14, 17, 1, 3, C.NEAR);
  // Ruth: grey bun, glasses, blue cardigan
  rect(6, 0, 4, 2, C.PALE); rect(5, 2, 6, 5, C.PALE); rect(6, 3, 4, 4, C.STONE);
  set(6, 4, C.INK); set(9, 4, C.INK); set(7, 4, C.BONE);
  rect(4, 7, 8, 7, C.COLD); rect(5, 12, 2, 1, C.PALE); rect(9, 12, 2, 1, C.PALE);
  rect(5, 14, 6, 3, C.SLATE);
  rect(14, 5, 2, 3, C.BONE);
});

const cal = sprite([
  '.dddddd.',
  'dddddddd',
  '..6666..',
  '..6226..',
  '..6116..',
  '...66...',
  '.dddddd.',
  'dddeddd.',
  'd.dddd.d',
  'd.dddd.d',
  '6.2222.6',
  '..2222..',
  '..2..2..',
  '..2..2..',
  '..1..1..',
  '..1..1..',
]);

const price = sprite([
  '..5555..',
  '.555555.',
  '.566665.',
  '..6226..',
  '..6666..',
  '...77...',
  '.111111.',
  '11111111',
  '1.1111.1',
  '1.1111.1',
  '6.1111.6',
  '..1111..',
  '..1111..',
  '..1111..',
  '.111111.',
  '.11..11.',
]);

// ---- things that are not people ------------------------------------------------------------

const HOLLOW = [
  '...6666...',
  '..666666..',
  '..606606..',
  '..666666..',
  '...6006...',
  '....66....',
  '..655556..',
  '.65600565.',
  '6.560065.6',
  '6..5665..6',
  '6..6556..6',
  '...6..6...',
  '...6..6...',
  '..6....6..',
  '.66....66.',
];
const hollow = [sprite(HOLLOW), sprite(withRows(HOLLOW, 13, ['...6..6...', '..66..66..']))];
const hollowDead = S(12, 6, ({ rect, set }) => {
  rect(1, 3, 10, 2, C.PALE); rect(3, 2, 6, 1, C.STONE); set(0, 4, C.PALE); set(11, 4, C.PALE); set(5, 3, C.BLACK); set(6, 3, C.BLACK);
});

const shade = [0, 1].map(f => S(12, 24, ({ rect, set, disc }) => {
  disc(6, 3, 3, 3, C.BLACK);
  for (let y = 6; y < 24; y++) {
    const w = 6 + Math.floor((y - 6) / 3);
    rect(6 - Math.floor(w / 2), y, w, 1, C.BLACK);
    if (hash(y, f, 31) < 0.5) set(6 - Math.floor(w / 2) - 1, y, C.INK);
    if (hash(y, f, 37) < 0.5) set(6 + Math.ceil(w / 2), y, C.INK);
  }
}));
// the face is drawn after the darkness, so it can be seen from far off
const shadeFace = S(4, 5, ({ rect, set }) => { rect(0, 0, 4, 5, C.PALE); rect(1, 0, 2, 1, C.BONE); set(0, 4, C.STONE); set(3, 4, C.STONE); });

const penitent = S(12, 12, ({ rect, set, disc }) => {
  disc(6, 8, 6, 4, C.DIRT); rect(0, 10, 12, 2, C.INK);
  disc(6, 4, 3, 3, C.INK); rect(4, 6, 4, 2, C.NEAR); // bowed hood
  set(5, 9, C.PALE); set(6, 9, C.PALE);
  for (const x of [2, 9]) rect(x, 6, 1, 5, C.NEAR);
});
const penitentRise = S(12, 18, ({ rect, disc, set }) => {
  for (let y = 5; y < 18; y++) { const w = 6 + Math.floor((y - 5) / 3); rect(6 - Math.floor(w / 2), y, w, 1, C.DIRT); }
  disc(6, 3, 3, 3, C.INK); set(5, 4, C.PALE); set(7, 4, C.PALE);
});

const watcher = S(6, 22, ({ rect, disc }) => {
  disc(3, 2, 2, 2, C.SLATE);
  rect(2, 5, 3, 17, C.INK); rect(1, 7, 1, 9, C.INK); rect(5, 7, 1, 9, C.INK);
});

const heldCross = S(5, 7, ({ rect }) => { rect(2, 0, 1, 7, C.PALE); rect(0, 2, 5, 1, C.PALE); rect(2, 0, 1, 1, C.BONE); });

export const CAST_SPRITES = {
  ruth_chair: ruthChair, cal, price,
  hollow, hollow_dead: hollowDead, shade, shade_face: shadeFace,
  penitent, penitent_rise: penitentRise, watcher, held_cross: heldCross,
};

// ---- faces for the dialogue box (24x24) ---------------------------------------------------

const face = paint => S(24, 24, p => { p.rect(0, 0, 24, 24, C.BLACK); paint(p); });

export const PORTRAITS = {
  Ruth: [face(({ rect, disc, set }) => {
    disc(12, 4, 4, 3, C.STONE); disc(12, 11, 7, 8, C.PALE); disc(12, 12, 6, 7, C.STONE);
    rect(6, 10, 12, 1, C.INK); disc(8, 11, 2, 2, C.INK); disc(16, 11, 2, 2, C.INK); disc(8, 11, 1, 1, C.STONE); disc(16, 11, 1, 1, C.STONE);
    set(7, 10, C.BONE); rect(10, 17, 4, 1, C.ASH);
    rect(2, 20, 20, 4, C.COLD); rect(10, 19, 4, 2, C.PALE);
  })],
  Cal: [face(({ rect, disc }) => {
    rect(3, 3, 18, 2, C.DIRT); rect(7, 0, 10, 4, C.DIRT); rect(7, 3, 10, 1, C.INK);
    disc(12, 12, 6, 7, C.PALE); disc(12, 13, 5, 6, C.STONE);
    rect(8, 10, 2, 1, C.INK); rect(14, 10, 2, 1, C.INK);
    rect(9, 15, 6, 2, C.INK);
    rect(2, 20, 20, 4, C.DIRT); rect(16, 21, 2, 2, C.CANDLE);
  })],
  Price: [face(({ rect, disc, set }) => {
    disc(12, 7, 7, 5, C.STONE); disc(12, 12, 6, 7, C.PALE);
    rect(8, 11, 2, 1, C.INK); rect(14, 11, 2, 1, C.INK); set(8, 10, C.STONE); set(15, 10, C.STONE);
    rect(9, 16, 6, 1, C.ASH); set(8, 15, C.ASH); set(15, 15, C.ASH); // smiling
    rect(2, 20, 20, 4, C.NEAR); rect(11, 19, 2, 3, C.BONE);
  })],
  '?': [0, 1, 2].map(f => face(({ set }) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const r = hash(x, y, 50 + f);
      if (r < 0.18) set(x, y, r < 0.05 ? C.PALE : r < 0.11 ? C.ASH : C.INK);
    }
  })),
};

// ---- pocket icons (8x8) --------------------------------------------------------------------

export const ICONS = {
  i_cross: sprite(['...66...', '...66...', '.666666.', '.666666.', '...66...', '...66...', '...66...', '...55...']),
  i_tape: sprite(['........', '55555555', '53333335', '53033035', '53333335', '55444455', '55555555', '........']),
  i_lighter: sprite(['....e...', '...eee..', '....e...', '.555555.', '.565565.', '.555555.', '.544445.', '.555555.']),
  i_page: sprite(['.777777.', '.766667.', '.777777.', '.766667.', '.777777.', '.766767.', '.777777.', '........']),
  i_card: sprite(['.666666.', '.66a666.', '.6aaa66.', '.66a666.', '.666666.', '.644446.', '.666666.', '........']),
  i_keys: sprite(['..55....', '.5..5...', '.5..5...', '..55....', '...5.5..', '...5..5.', '...555..', '.....5..']),
  i_key: sprite(['.55.....', '5..5....', '5..5....', '.55.....', '..5.....', '..55....', '..5.....', '..55....']),
};
