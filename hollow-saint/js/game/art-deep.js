// Beneath St. Oran's: the records, the bones, the bells, the sanctum, and the things down there.

import { sprite, canvasSprite } from '../engine/sprite.js';
import { C } from '../engine/palette.js';
import { hash } from './config.js';

const S = canvasSprite;

// a standing figure in someone's colours, for the sanctum and for the thing that copies them
function person({ hair, face, coat, legs = C.INK, bun = false, long = false }) {
  return S(8, 16, ({ rect, set }) => {
    if (bun) rect(3, 0, 2, 1, hair);
    rect(2, 1, 4, 2, hair);
    rect(2, 3, 4, 3, face);
    if (long) { rect(1, 2, 1, 6, hair); rect(6, 2, 1, 6, hair); }
    rect(1, 6, 6, 6, coat); rect(0, 7, 1, 4, coat); rect(7, 7, 1, 4, coat);
    rect(2, 12, 4, 2, coat);
    rect(2, 14, 1, 2, legs); rect(5, 14, 1, 2, legs);
    set(3, 4, C.INK); set(4, 4, C.INK);
  });
}

const ruthStand = person({ hair: C.PALE, face: C.STONE, coat: C.COLD, bun: true });
const maraStand = person({ hair: C.NEAR, face: C.PALE, coat: C.ASH, long: true });
// the same shapes, a little wrong: no eyes, the mouth too low, the hands too long
const wrong = base => S(8, 18, ({ set }) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const c = base.px[y * 8 + x]; if (c !== 255) set(x, y + (y > 6 ? 2 : 0), c); }
  set(3, 4, base.px[4 * 8 + 2]); set(4, 4, base.px[4 * 8 + 2]);
  set(3, 6, C.BLACK); set(4, 6, C.BLACK); set(3, 7, C.BLACK); set(4, 7, C.BLACK);
  set(0, 15, C.PALE); set(7, 15, C.PALE); set(0, 16, C.PALE); set(7, 16, C.PALE);
});
const mimicTrue = S(10, 20, ({ rect, set, disc }) => {
  for (let y = 4; y < 20; y++) { const w = 4 + Math.floor((y - 4) / 3); rect(5 - Math.floor(w / 2), y, w, 1, C.PALE); }
  disc(5, 3, 3, 3, C.PALE);
  rect(4, 1, 2, 9, C.BLACK); // split down the middle
  set(4, 10, C.BLOOD); set(5, 11, C.BLOOD);
  rect(0, 8, 1, 10, C.PALE); rect(9, 8, 1, 10, C.PALE);
});

const choir = [0, 1].map(f => S(24, 18, ({ rect, set, disc }) => {
  for (const [x, h] of [[3, 15], [11, 17], [19, 14]]) {
    const dy = 18 - h + ((x + f * 3) % 2);
    disc(x, dy + 2, 2, 2, C.PALE);
    rect(x - 2, dy + 4, 5, h - 4, C.STONE); rect(x - 1, dy + 4, 3, h - 4, C.PALE);
    set(x - 1, dy + 2, C.BLACK); set(x + 1, dy + 2, C.BLACK); set(x, dy + 3, C.BLACK);
  }
}));

const bell = S(10, 14, ({ rect, set }) => {
  rect(4, 0, 2, 3, C.DIRT);
  rect(3, 3, 4, 2, C.DIRT); rect(2, 5, 6, 4, C.DIRT); rect(1, 9, 8, 2, C.DIRT); rect(0, 11, 10, 1, C.DIRT);
  rect(3, 4, 1, 6, C.CANDLE); set(2, 9, C.CANDLE);
  rect(4, 12, 2, 2, C.NEAR);
});

const plaqueOf = edge => S(16, 16, ({ rect, set }) => {
  rect(0, 0, 16, 16, C.SLATE); rect(1, 1, 14, 14, C.ASH); rect(0, 0, 16, 1, edge);
  for (let y = 4; y < 13; y += 3) for (let x = 3; x < 13; x++) if (hash(x, y, edge) < 0.6) set(x, y, C.INK);
});

const saintHuge = S(64, 56, ({ rect, disc, set, line }) => {
  disc(32, 9, 9, 9, C.STONE); disc(33, 10, 7, 7, C.ASH);
  for (let y = 18; y < 52; y++) { const w = 18 + Math.floor((y - 18) / 1.2); rect(32 - Math.floor(w / 2), y, Math.min(w, 64), 1, C.STONE); }
  for (const x of [14, 22, 42, 50]) line(x, 30, x - 2, 51, C.ASH);
  disc(32, 32, 8, 12, C.BLACK); // the hollow: a door
  rect(30, 30, 4, 10, C.NEAR); set(31, 31, C.PALE); set(32, 31, C.PALE); // someone curled inside
  rect(0, 52, 64, 4, C.SLATE); rect(0, 52, 64, 1, C.ASH);
  set(30, 8, C.INK); set(35, 12, C.INK);
});

const ritualAltar = S(32, 12, ({ rect, set }) => {
  rect(0, 4, 32, 8, C.SLATE); rect(0, 4, 32, 1, C.ASH);
  for (const x of [5, 15, 25]) { rect(x - 2, 5, 5, 2, C.NEAR); set(x, 5, C.INK); }
  rect(1, 11, 30, 1, C.INK);
});

const confessional = S(16, 22, ({ rect, set }) => {
  rect(0, 0, 16, 22, C.NEAR); rect(0, 0, 16, 2, C.DIRT); rect(0, 0, 1, 22, C.DIRT); rect(15, 0, 1, 22, C.DIRT);
  rect(8, 2, 1, 20, C.DIRT);
  rect(10, 6, 4, 5, C.INK); for (let y = 6; y < 11; y += 2) rect(10, y, 4, 1, C.DIRT);
  rect(2, 4, 5, 14, C.DRIED); set(4, 9, C.PALE); // a curtain, and a face behind it
});

const stoup = S(8, 10, ({ rect, set }) => {
  rect(3, 5, 2, 5, C.ASH); rect(0, 2, 8, 3, C.ASH); rect(1, 2, 6, 1, C.COLD); rect(0, 4, 8, 1, C.SLATE);
  rect(6, 0, 2, 2, C.BONE); set(6, 0, C.STONE);
});

const ledgers = S(48, 20, ({ rect }) => {
  rect(0, 0, 48, 20, C.NEAR);
  for (const y of [6, 13, 19]) rect(0, y, 48, 1, C.DIRT);
  const cols = [C.DRIED, C.DIRT, C.SLATE, C.BLOOD, C.INK];
  for (const y0 of [1, 8, 14]) for (let x = 1; x < 47; x += 3) rect(x, y0 + (x % 2), 2, 5 - (x % 2), cols[(x + y0) % cols.length]);
});

const lectern = S(12, 16, ({ rect }) => {
  rect(5, 6, 2, 10, C.DIRT); rect(2, 15, 8, 1, C.INK);
  rect(0, 2, 12, 5, C.DIRT); rect(1, 1, 10, 3, C.PALE); rect(6, 1, 1, 3, C.STONE);
});

const cabinet = S(16, 20, ({ rect }) => {
  rect(0, 0, 16, 20, C.SLATE); rect(0, 0, 16, 1, C.ASH);
  for (const y of [2, 8, 14]) { rect(1, y, 14, 5, C.ASH); rect(6, y + 2, 4, 1, C.STONE); }
  rect(1, 9, 14, 3, C.BLACK); rect(3, 8, 2, 2, C.PALE); // a drawer standing open
});

const drainGrate = S(14, 10, ({ rect }) => {
  rect(0, 0, 14, 10, C.BLACK); rect(0, 0, 14, 1, C.ASH); rect(0, 9, 14, 1, C.SLATE);
  for (let x = 1; x < 14; x += 3) rect(x, 1, 1, 8, C.SLATE);
  rect(1, 6, 12, 2, C.COLD);
});

const stairHole = S(16, 14, ({ rect }) => {
  rect(0, 0, 16, 14, C.BLACK); rect(0, 0, 16, 1, C.PALE);
  for (let y = 2; y < 14; y += 3) rect(1, y, 14, 1, C.SLATE);
});

const bonePile = S(14, 8, ({ rect, set }) => {
  rect(2, 4, 10, 4, C.ASH); rect(4, 2, 6, 2, C.STONE);
  set(5, 3, C.BLACK); set(7, 3, C.BLACK); rect(0, 7, 14, 1, C.SLATE); rect(9, 3, 5, 1, C.PALE);
});

const congregation = S(56, 14, ({ rect, disc }) => {
  rect(0, 9, 56, 3, C.DIRT); rect(0, 12, 56, 2, C.NEAR);
  for (let x = 4; x < 56; x += 9) { disc(x, 3, 2, 2, C.SLATE); rect(x - 3, 5, 7, 5, C.INK); }
});

const chairFront = S(8, 12, ({ rect }) => {
  rect(0, 0, 1, 7, C.DIRT); rect(7, 0, 1, 7, C.DIRT); rect(0, 1, 8, 1, C.DIRT);
  rect(0, 6, 8, 3, C.DIRT); rect(0, 6, 8, 1, C.ASH); rect(0, 9, 1, 3, C.DIRT); rect(7, 9, 1, 3, C.DIRT);
});

const pillar = S(8, 16, ({ rect }) => {
  rect(1, 0, 6, 16, C.ASH); rect(1, 0, 1, 16, C.STONE); rect(6, 0, 1, 16, C.SLATE);
  rect(0, 0, 8, 2, C.STONE); rect(0, 14, 8, 2, C.SLATE);
});

export const DEEP_SPRITES = {
  ruth_stand: ruthStand, mara_stand: maraStand,
  ruth_wrong: wrong(ruthStand), mara_wrong: wrong(maraStand), mimic_true: mimicTrue,
  choir, bell, plaque: plaqueOf(C.STONE), plaque_b: plaqueOf(C.SLATE), saint_huge: saintHuge,
  ritual_altar: ritualAltar, confessional, stoup, ledgers, lectern, cabinet, drain_grate: drainGrate,
  stair_hole: stairHole, bone_pile: bonePile, congregation, chair_front: chairFront, pillar,
};

export const DEEP_ICONS = {
  i_ribbon: sprite(['........', '.ff..ff.', 'ffff.fff', '.ffffff.', '...ff...', '..f..f..', '.f....f.', '........']),
  i_candle: sprite(['...e....', '..e7e...', '...7....', '..666...', '..666...', '..666...', '..666...', '.55555..']),
  i_bottle: sprite(['...55...', '...44...', '..6666..', '.6ffff6.', '.6ffff6.', '.6ffff6.', '.666666.', '........']),
};

export const MARA_PORTRAIT = [0, 1].map(f => S(24, 24, ({ rect, disc, set }) => {
  rect(0, 0, 24, 24, C.BLACK);
  disc(12, 9, 8, 8, C.NEAR); rect(4, 9, 3, 12, C.NEAR); rect(17, 9, 3, 12, C.NEAR);
  disc(12, 12, 6, 7, C.PALE); disc(12, 13, 5, 6, C.STONE);
  rect(8, 11, 2, 1, C.INK); rect(14, 11, 2, 1, C.INK);
  rect(10, 16, 4, 1, C.ASH);
  if (f) { set(9, 13, C.COLD); set(9, 14, C.COLD); } // a tear, every other frame of the static
  rect(3, 20, 18, 4, C.ASH); rect(9, 18, 6, 1, C.COLD);
}));
