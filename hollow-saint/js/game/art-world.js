// Props for Bellwether, St. Oran's and the passages below.

import { canvasSprite } from '../engine/sprite.js';
import { C } from '../engine/palette.js';

const S = canvasSprite;

export const WORLD_SPRITES = {
  chain_open: S(32, 9, ({ set, rect }) => {
    for (let y = 1; y < 9; y++) set(1 + (y % 2), y, y % 3 ? C.STONE : C.PALE);
    rect(4, 7, 4, 2, C.CANDLE); set(5, 6, C.STONE);
  }),

  hatch_open: S(16, 12, ({ rect }) => {
    rect(0, 0, 16, 12, C.BLACK);
    rect(0, 0, 16, 1, C.ASH); rect(0, 11, 16, 1, C.NEAR);
    rect(4, 1, 1, 11, C.DIRT); rect(11, 1, 1, 11, C.DIRT);
    for (let y = 3; y < 12; y += 3) rect(4, y, 8, 1, C.DIRT);
  }),

  stand: S(16, 24, ({ rect, line }) => {
    line(2, 23, 4, 8, C.INK); line(13, 23, 11, 8, C.INK); line(6, 23, 6, 9, C.NEAR); line(9, 23, 10, 9, C.NEAR);
    for (let y = 12; y < 23; y += 4) rect(3, y, 10, 1, C.INK);
    rect(1, 5, 14, 3, C.DIRT); rect(1, 5, 14, 1, C.ASH);
    rect(1, 0, 1, 5, C.DIRT); rect(14, 1, 1, 4, C.DIRT); line(1, 1, 14, 2, C.DIRT);
    rect(9, 3, 3, 2, C.PALE); // the note
  }),

  cruiser: S(16, 24, ({ rect, set }) => {
    rect(1, 1, 14, 22, C.INK);
    rect(2, 0, 12, 1, C.NEAR); rect(2, 23, 12, 1, C.NEAR);
    rect(0, 2, 1, 20, C.NEAR); rect(15, 2, 1, 20, C.NEAR);
    rect(3, 2, 10, 5, C.SLATE);
    rect(2, 7, 12, 3, C.COLD); set(4, 8, C.STONE);
    rect(3, 10, 10, 6, C.PALE); rect(3, 10, 10, 1, C.STONE);
    rect(4, 12, 4, 1, C.BLOOD); rect(8, 12, 4, 1, C.COLD); // light bar
    rect(3, 16, 10, 2, C.INK);
    rect(3, 18, 10, 4, C.SLATE);
    set(2, 0, C.PALE); set(13, 0, C.PALE); set(2, 23, C.BLOOD); set(13, 23, C.BLOOD);
    for (const y of [4, 16]) { rect(0, y, 1, 4, C.BLACK); rect(15, y, 1, 4, C.BLACK); }
  }),

  booth: S(10, 20, ({ rect, dith, set }) => {
    rect(0, 2, 10, 18, C.SLATE); rect(1, 4, 8, 15, C.NEAR);
    dith(1, 4, 8, 15, C.COLD);
    rect(0, 0, 10, 3, C.ASH); rect(2, 1, 6, 1, C.PALE);
    rect(4, 6, 1, 7, C.BLACK); set(4, 13, C.STONE); // the cut cord
    rect(0, 19, 10, 1, C.BLACK);
  }),

  lamp: S(4, 20, ({ rect, set }) => {
    rect(1, 3, 1, 17, C.SLATE); rect(0, 19, 3, 1, C.INK);
    rect(0, 0, 4, 2, C.ASH); set(1, 2, C.CANDLE); set(2, 2, C.BONE);
  }),

  mailbox: S(6, 10, ({ rect, set }) => {
    rect(2, 5, 2, 5, C.DIRT);
    rect(0, 1, 6, 4, C.ASH); rect(0, 1, 6, 1, C.STONE); rect(5, 2, 1, 3, C.SLATE);
    set(5, 0, C.RED); set(5, 1, C.RED);
  }),

  warm_window: [0, 1].map(f => S(6, 6, ({ rect, set }) => {
    rect(0, 0, 6, 6, C.DIRT); rect(1, 1, 4, 4, C.CANDLE);
    if (f) set(2, 2, C.BONE);
    rect(3, 0, 1, 6, C.INK); rect(0, 3, 6, 1, C.INK);
  })),

  armchair: S(16, 20, ({ rect, set }) => {
    rect(1, 2, 14, 10, C.DRIED); rect(1, 2, 14, 1, C.BLOOD);
    rect(0, 8, 3, 9, C.DRIED); rect(13, 8, 3, 9, C.DRIED); rect(0, 8, 3, 1, C.BLOOD); rect(13, 8, 3, 1, C.BLOOD);
    rect(3, 11, 10, 6, C.BLOOD); rect(3, 11, 10, 1, C.RED);
    rect(1, 17, 1, 3, C.NEAR); rect(14, 17, 1, 3, C.NEAR);
    rect(14, 5, 2, 3, C.BONE); set(15, 3, C.STONE); set(14, 2, C.STONE); // the cup, steaming
  }),

  table_lamp: S(6, 12, ({ rect, set }) => {
    rect(0, 0, 6, 4, C.CANDLE); rect(0, 3, 6, 1, C.DIRT);
    rect(2, 4, 2, 5, C.ASH); rect(1, 9, 4, 3, C.DIRT);
    set(2, 1, C.BONE);
  }),

  photo: S(10, 8, ({ rect, set }) => {
    rect(0, 0, 10, 8, C.DIRT); rect(1, 1, 8, 6, C.STONE);
    rect(2, 3, 1, 3, C.INK); set(2, 2, C.PALE); rect(4, 3, 1, 3, C.INK); set(4, 2, C.PALE);
    rect(6, 4, 1, 2, C.INK); set(6, 3, C.PALE);
    rect(7, 2, 2, 4, C.BONE); // scratched to the white
  }),

  clock: S(8, 14, ({ rect, set }) => {
    rect(0, 0, 8, 14, C.DIRT); rect(1, 1, 6, 6, C.PALE);
    set(4, 2, C.INK); set(4, 3, C.INK); set(4, 4, C.INK); set(5, 4, C.INK);
    rect(1, 8, 6, 5, C.NEAR); rect(4, 8, 1, 3, C.CANDLE); set(4, 11, C.CANDLE);
  }),

  rotary: S(10, 10, ({ rect, set }) => {
    rect(0, 4, 10, 2, C.DIRT); rect(1, 6, 1, 4, C.INK); rect(8, 6, 1, 4, C.INK);
    rect(2, 1, 6, 3, C.NEAR); rect(1, 0, 8, 1, C.INK); set(4, 2, C.ASH); set(5, 2, C.ASH);
  }),

  notice: S(12, 15, ({ rect }) => {
    rect(4, 9, 1, 6, C.DIRT); rect(8, 9, 1, 6, C.DIRT);
    rect(0, 0, 12, 10, C.DIRT); rect(1, 1, 10, 8, C.PALE);
    for (const y of [2, 4, 6]) rect(2, y, 8, 1, C.ASH);
    rect(7, 6, 2, 1, C.BONE);
  }),

  cigarette: S(4, 2, ({ set }) => { set(0, 1, C.PALE); set(1, 1, C.PALE); set(2, 1, C.STONE); set(3, 1, C.RED); set(3, 0, C.ASH); }),

  stained_glow: [0, 1].map(f => S(6, 6, ({ rect, set }) => {
    rect(0, 0, 6, 6, C.DRIED);
    set(1, 1, C.RED); set(4, 2, f ? C.CANDLE : C.BLOOD); set(2, 4, C.COLD); set(1, 3, C.BLOOD); set(4, 4, f ? C.RED : C.BLOOD);
    rect(2, 0, 1, 6, C.NEAR); rect(0, 2, 6, 1, C.NEAR);
  })),

  grave: S(8, 10, ({ rect, set }) => {
    rect(1, 2, 6, 7, C.ASH); rect(2, 1, 4, 1, C.ASH); rect(1, 2, 1, 7, C.STONE); rect(2, 1, 2, 1, C.STONE);
    rect(3, 4, 2, 1, C.SLATE); rect(2, 6, 4, 1, C.SLATE);
    rect(0, 9, 8, 1, C.MOSS);
  }),

  grave_pair: S(20, 10, ({ rect }) => {
    for (const x of [0, 13]) { rect(x + 1, 1, 6, 8, C.ASH); rect(x + 1, 1, 1, 8, C.STONE); rect(x + 2, 3, 4, 1, C.SLATE); rect(x + 2, 5, 4, 1, C.SLATE); }
    rect(0, 9, 20, 1, C.MOSS); rect(7, 7, 6, 2, C.SLATE);
  }),

  urn: S(6, 7, ({ rect }) => {
    rect(1, 0, 4, 1, C.STONE); rect(0, 1, 6, 4, C.ASH); rect(0, 1, 1, 4, C.STONE); rect(2, 5, 2, 1, C.ASH); rect(1, 6, 4, 1, C.SLATE);
  }),

  grave_fresh: S(12, 12, ({ rect, disc, set }) => {
    disc(6, 9, 6, 2, C.DIRT); rect(1, 8, 10, 1, C.INK);
    rect(5, 0, 2, 9, C.DIRT); rect(3, 2, 6, 2, C.DIRT); rect(4, 2, 4, 1, C.PALE);
    set(8, 9, C.NEAR); set(9, 10, C.NEAR); set(7, 10, C.NEAR); // the handprint
  }),

  mausoleum: S(40, 32, ({ rect, line }) => {
    for (let r = 0; r < 8; r++) rect(20 - r * 2.5, r, r * 5 + 1, 1, C.SLATE);
    rect(0, 8, 40, 2, C.ASH); rect(0, 8, 40, 1, C.STONE);
    rect(2, 10, 36, 20, C.ASH);
    for (const x of [3, 10, 28, 35]) { rect(x, 10, 3, 20, C.STONE); rect(x + 2, 10, 1, 20, C.SLATE); }
    rect(15, 14, 10, 16, C.NEAR); rect(19, 14, 2, 16, C.STONE); // iron door, lead seam
    line(16, 18, 24, 18, C.INK);
    rect(0, 30, 40, 2, C.SLATE);
  }),

  saint_big: S(24, 40, ({ rect, set, disc }) => {
    disc(12, 5, 4, 5, C.STONE); set(13, 4, C.ASH); set(11, 7, C.ASH);
    for (let y = 10; y < 34; y++) { const w = 8 + Math.floor((y - 10) / 2); rect(12 - Math.floor(w / 2), y, w, 1, C.STONE); }
    rect(6, 18, 1, 14, C.ASH); rect(17, 20, 1, 12, C.ASH); rect(10, 26, 1, 8, C.ASH);
    disc(12, 18, 3, 5, C.BLACK); set(12, 14, C.DIRT); set(11, 22, C.DIRT); // wax in the hollow
    set(5, 22, C.PALE); set(18, 22, C.PALE);
    rect(0, 34, 24, 6, C.ASH); rect(0, 34, 24, 1, C.PALE);
  }),

  altar: S(56, 14, ({ rect, set }) => {
    rect(0, 4, 56, 10, C.DIRT); rect(0, 4, 56, 1, C.ASH);
    rect(4, 4, 48, 7, C.BONE); rect(4, 10, 48, 1, C.PALE);
    for (let x = 6; x < 52; x += 6) set(x, 9, C.STONE);
    rect(10, 0, 1, 4, C.PALE); set(10, 0, C.CANDLE); rect(45, 0, 1, 4, C.PALE); set(45, 0, C.CANDLE);
    rect(26, 5, 5, 3, C.NEAR); set(27, 6, C.ASH); set(29, 6, C.ASH); // the cassette
  }),

  hymn_board: S(10, 14, ({ rect }) => {
    rect(0, 0, 10, 14, C.DIRT); rect(1, 1, 8, 12, C.NEAR);
    for (const y of [2, 6]) { rect(2, y, 6, 3, C.PALE); rect(3, y + 1, 4, 1, C.INK); }
    rect(4, 10, 2, 3, C.PALE); rect(4, 11, 2, 1, C.INK);
  }),

  chairs: S(40, 24, ({ rect, set }) => {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const x = Math.round(20 + Math.cos(a) * 17) - 2, y = Math.round(12 + Math.sin(a) * 9) - 2;
      rect(x, y, 4, 3, C.ASH); rect(x, y + 3, 1, 2, C.SLATE); rect(x + 3, y + 3, 1, 2, C.SLATE);
      set(x + 1, y + 5, C.CANDLE);
    }
    rect(18, 10, 4, 3, C.STONE); rect(18, 13, 1, 2, C.SLATE); rect(21, 13, 1, 2, C.SLATE);
  }),

  candle_stand: [0, 1].map(f => S(4, 12, ({ rect, set }) => {
    rect(1, 6, 2, 6, C.INK); rect(0, 11, 4, 1, C.NEAR);
    rect(1, 3, 2, 3, C.PALE);
    set(1 + f, 2, C.CANDLE); set(2 - f, 1, f ? C.BONE : C.CANDLE);
  })),

  reel: [0, 1].map(f => S(14, 10, ({ rect, set, disc }) => {
    rect(0, 4, 14, 6, C.SLATE); rect(0, 4, 14, 1, C.ASH);
    for (const cx of [3, 10]) {
      disc(cx, 3, 3, 3, C.ASH); set(cx, 3, C.NEAR);
      if (f) { set(cx - 2, 3, C.NEAR); set(cx + 2, 3, C.NEAR); } else { set(cx, 1, C.NEAR); set(cx, 5, C.NEAR); }
    }
    rect(3, 6, 8, 1, C.DIRT); set(12, 8, C.RED);
  })),

  grate: S(10, 6, ({ rect }) => {
    rect(0, 0, 10, 6, C.BLACK); rect(0, 0, 10, 1, C.SLATE);
    for (let x = 0; x < 10; x += 2) rect(x, 0, 1, 6, C.INK);
  }),

  pew: S(56, 8, ({ rect }) => {
    rect(0, 0, 56, 3, C.NEAR); rect(0, 0, 56, 1, C.DIRT);
    rect(0, 3, 56, 3, C.DIRT); rect(0, 5, 56, 1, C.INK);
    for (const x of [1, 27, 54]) rect(x, 6, 1, 2, C.NEAR);
  }),

  bolt: S(6, 12, ({ rect }) => { rect(0, 0, 3, 12, C.INK); rect(1, 4, 5, 2, C.STONE); rect(4, 3, 1, 4, C.ASH); }),
  bolt_open: S(6, 12, ({ rect }) => { rect(0, 0, 3, 12, C.INK); rect(1, 4, 2, 2, C.STONE); rect(1, 7, 1, 3, C.ASH); }),

  desk: S(24, 16, ({ rect, set }) => {
    rect(0, 6, 24, 3, C.DIRT); rect(0, 6, 24, 1, C.ASH); rect(1, 9, 3, 7, C.INK); rect(20, 9, 3, 7, C.INK);
    rect(5, 2, 12, 5, C.PALE); rect(11, 2, 1, 5, C.STONE);
    for (let y = 3; y < 6; y++) { rect(6, y, 4, 1, C.ASH); rect(12, y, 4, 1, C.ASH); }
    set(19, 4, C.CANDLE); rect(19, 5, 1, 2, C.PALE);
  }),

  stove: [0, 1].map(f => S(12, 20, ({ rect, set }) => {
    rect(5, 0, 2, 8, C.NEAR);
    rect(0, 8, 12, 10, C.NEAR); rect(0, 8, 12, 1, C.SLATE);
    rect(3, 11, 6, 4, f ? C.RED : C.BLOOD); set(4, 12, C.CANDLE); set(7, 13, f ? C.CANDLE : C.RED);
    rect(1, 18, 2, 2, C.BLACK); rect(9, 18, 2, 2, C.BLACK);
    rect(11, 4, 1, 1, C.ASH); // the nail
  })),

  bed: S(28, 14, ({ rect, set }) => {
    rect(0, 2, 28, 9, C.DIRT); rect(1, 3, 26, 7, C.PALE); rect(1, 3, 6, 6, C.BONE);
    rect(7, 3, 20, 1, C.STONE);
    rect(0, 11, 1, 3, C.INK); rect(27, 11, 1, 3, C.INK);
    rect(10, 12, 3, 2, C.DRIED); rect(14, 12, 3, 2, C.DRIED); set(11, 12, C.BLOOD); set(15, 12, C.BLOOD);
  }),

  chair_back: S(8, 12, ({ rect }) => {
    rect(0, 0, 1, 12, C.DIRT); rect(7, 0, 1, 12, C.DIRT);
    for (const y of [1, 4]) rect(0, y, 8, 1, C.DIRT);
    rect(0, 7, 8, 2, C.INK); rect(0, 9, 1, 3, C.DIRT); rect(7, 9, 1, 3, C.DIRT);
  }),

  pipes: S(40, 6, ({ rect }) => {
    rect(0, 0, 40, 2, C.ASH); rect(0, 0, 40, 1, C.STONE);
    rect(0, 3, 40, 2, C.SLATE);
    for (const x of [8, 22, 34]) { rect(x, 0, 2, 2, C.STONE); rect(x + 1, 3, 2, 2, C.ASH); }
  }),

  page: S(7, 5, ({ rect, set }) => { rect(0, 0, 7, 5, C.PALE); rect(1, 1, 4, 1, C.ASH); rect(1, 3, 5, 1, C.ASH); set(6, 4, C.STONE); }),

  ash: S(12, 5, ({ rect, set }) => {
    rect(2, 2, 8, 3, C.SLATE); rect(4, 1, 4, 1, C.SLATE); set(5, 0, C.ASH); set(3, 2, C.ASH); set(8, 3, C.ASH); set(6, 2, C.STONE);
  }),
};
