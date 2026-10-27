// Every map: its tile rows (mapRows.js), buildings, edge warps and fixed "things" (shipping bin,
// bed, shop counters, bulletin board...). Coordinates are tiles. A building's door is the tile
// `door`; doors with `to` lead inside, doors with `locked` only show their message.
// Warps carry the player across by keeping the offset along the edge (`tx`/`ty` = where the
// warp's first tile lands).

import { MAP_ROWS } from './mapRows.js';

export const MAPS = {
  farm: {
    name: 'Little Acre Farm', outdoor: true, farmable: true, music: 'farm', water: 'farm',
    buildings: [
      { id: 'farmhouse', style: 'farmhouse', x: 6, y: 3, w: 6, h: 4, door: { x: 8, y: 6 }, to: { map: 'house', x: 6, y: 8, dir: 'up' }, light: true },
    ],
    warps: [{ x: 39, y: 14, w: 1, h: 2, to: 'town', tx: 2, ty: 15, dir: 'right' }],
    things: [
      { type: 'bin', x: 10, y: 7, name: 'Shipping Bin' },
      { type: 'well', x: 4, y: 8, name: 'Well' },
      { type: 'sign', x: 12, y: 13, text: 'Little Acre Farm. Est. long ago, re-est. today.' },
    ],
    spawn: { x: 8, y: 8 },
    lockedArea: { expansion: 'northfield', x: 14, y: 2, w: 24, h: 7 }, // the old fence row is y=8
  },
  house: {
    name: 'Farmhouse', outdoor: false, music: 'home',
    warps: [{ x: 6, y: 9, w: 1, h: 1, to: 'farm', tx: 8, ty: 7, dir: 'down' }],
    things: [
      { type: 'bed', x: 1, y: 2, w: 2, h: 2, name: 'Bed' },
      { type: 'kitchen', x: 7, y: 2, w: 4, h: 1, name: 'Stove' },
      { type: 'decor', sprite: 'bookshelf', x: 4, y: 2, w: 2, h: 1 },
      { type: 'decor', sprite: 'plant', x: 10, y: 8, w: 1, h: 1 },
    ],
  },
  town: {
    name: 'Bramblewick', outdoor: true, music: 'town', festivalSpot: { x: 21, y: 12 },
    buildings: [
      { id: 'store', style: 'store', x: 4, y: 8, w: 7, h: 5, door: { x: 7, y: 12 }, to: { map: 'store', x: 7, y: 8, dir: 'up' }, sign: 'seed', light: true },
      { id: 'piphouse', style: 'cottage', x: 13, y: 4, w: 5, h: 4, door: { x: 15, y: 7 }, locked: "Pip's cottage. It smells like cinnamon.", light: true },
      { id: 'hall', style: 'hall', x: 30, y: 3, w: 5, h: 3, door: { x: 32, y: 5 }, locked: 'Town Hall. Open on festival days only.', sign: 'star' },
      { id: 'smithy', style: 'smithy', x: 30, y: 8, w: 6, h: 5, door: { x: 32, y: 12 }, to: { map: 'smithy', x: 6, y: 7, dir: 'up' }, sign: 'anvil', light: true },
      { id: 'workshop', style: 'workshop', x: 5, y: 20, w: 7, h: 5, door: { x: 8, y: 24 }, to: { map: 'workshop', x: 6, y: 7, dir: 'up' }, sign: 'saw', light: true },
      { id: 'odessahouse', style: 'manor', x: 31, y: 20, w: 6, h: 4, door: { x: 33, y: 23 }, locked: "The mayor's house. A brass knocker shaped like a turnip.", light: true },
    ],
    warps: [
      { x: 0, y: 15, w: 1, h: 2, to: 'farm', tx: 37, ty: 14, dir: 'left' },
      { x: 21, y: 0, w: 2, h: 1, to: 'forest', tx: 21, ty: 27, dir: 'up' },
      { x: 21, y: 31, w: 2, h: 1, to: 'lake', tx: 21, ty: 2, dir: 'down' },
      { x: 43, y: 15, w: 1, h: 2, to: 'quarry', tx: 2, ty: 11, dir: 'right' },
    ],
    things: [
      { type: 'board', x: 19, y: 10, name: 'Bulletin Board' },
      { type: 'decor', sprite: 'bench', x: 26, y: 12, w: 1, h: 1, walk: false },
      { type: 'decor', sprite: 'bench', x: 17, y: 19, w: 1, h: 1, walk: false },
      { type: 'decor', sprite: 'lamp', x: 15, y: 14, w: 1, h: 1, light: true },
      { type: 'decor', sprite: 'lamp', x: 28, y: 14, w: 1, h: 1, light: true },
      { type: 'decor', sprite: 'lamp', x: 15, y: 17, w: 1, h: 1, light: true },
      { type: 'decor', sprite: 'lamp', x: 28, y: 17, w: 1, h: 1, light: true },
      { type: 'sign', x: 2, y: 14, text: 'Bramblewick. North: Whisperwood. South: Mirror Lake. East: Old Quarry.' },
    ],
  },
  forest: {
    name: 'Whisperwood', outdoor: true, music: 'forest', water: 'forest',
    buildings: [
      { id: 'cabin', style: 'cabin', x: 6, y: 5, w: 5, h: 4, door: { x: 8, y: 8 }, locked: "Juni's cabin. Seed trays line every window.", light: true },
    ],
    warps: [{ x: 21, y: 29, w: 2, h: 1, to: 'town', tx: 21, ty: 2, dir: 'down' }],
    things: [{ type: 'sign', x: 20, y: 26, text: 'Whisperwood. Please leave the mushrooms you will not eat.' }],
  },
  lake: {
    name: 'Mirror Lake', outdoor: true, music: 'lake', water: 'lake',
    buildings: [
      { id: 'hut', style: 'hut', x: 29, y: 5, w: 5, h: 4, door: { x: 31, y: 8 }, locked: "Teodor's hut. Nets drying on every hook.", light: true },
    ],
    warps: [{ x: 21, y: 0, w: 2, h: 1, to: 'town', tx: 21, ty: 29, dir: 'up' }],
    things: [{ type: 'sign', x: 23, y: 10, text: 'Mirror Lake. Fishing welcome. Swimming at your own risk.' }],
  },
  quarry: {
    name: 'Old Quarry', outdoor: true, music: 'quarry', water: 'lake',
    warps: [{ x: 0, y: 11, w: 1, h: 2, to: 'town', tx: 41, ty: 15, dir: 'left' }],
    things: [{ type: 'sign', x: 3, y: 10, text: 'Old Quarry. Rock falls nightly. Copper near the top, iron for the well-equipped.' }],
  },
  store: {
    name: "Pip's Provisions", outdoor: false, music: 'shop',
    warps: [{ x: 7, y: 9, w: 1, h: 1, to: 'town', tx: 7, ty: 13, dir: 'down' }],
    things: [
      { type: 'shop', shop: 'pip', x: 6, y: 4, name: 'Counter' },
      { type: 'decor', sprite: 'shelf', x: 2, y: 2, w: 3, h: 1 },
      { type: 'decor', sprite: 'shelf', x: 7, y: 2, w: 3, h: 1 },
      { type: 'decor', sprite: 'barrel', x: 10, y: 7, w: 1, h: 1 },
    ],
  },
  smithy: {
    name: 'Ostrow Smithy', outdoor: false, music: 'shop',
    warps: [{ x: 6, y: 8, w: 1, h: 1, to: 'town', tx: 32, ty: 13, dir: 'down' }],
    things: [
      { type: 'shop', shop: 'bram', x: 5, y: 4, name: 'Counter' },
      { type: 'decor', sprite: 'forge', x: 1, y: 2, w: 2, h: 1, light: true },
      { type: 'decor', sprite: 'anvil', x: 9, y: 6, w: 1, h: 1 },
    ],
  },
  workshop: {
    name: "Fenn's Workshop", outdoor: false, music: 'shop',
    warps: [{ x: 6, y: 8, w: 1, h: 1, to: 'town', tx: 8, ty: 25, dir: 'down' }],
    things: [
      { type: 'shop', shop: 'mabel', x: 5, y: 4, name: 'Workbench' },
      { type: 'decor', sprite: 'lumber', x: 1, y: 2, w: 2, h: 1 },
      { type: 'decor', sprite: 'shelf', x: 7, y: 2, w: 3, h: 1 },
    ],
  },
};

for (const [id, m] of Object.entries(MAPS)) {
  m.id = id;
  m.rows = MAP_ROWS[id];
  m.h = m.rows.length;
  m.w = m.rows[0].length;
  m.buildings = m.buildings || [];
  m.warps = m.warps || [];
  m.things = (m.things || []).map(t => ({ w: 1, h: 1, ...t }));
}

// Rough positions of each outdoor map on the world map screen (in map-screen cells).
export const WORLD_LAYOUT = {
  forest: { x: 2, y: 0 }, farm: { x: 0, y: 1 }, town: { x: 2, y: 1 }, quarry: { x: 4, y: 1 }, lake: { x: 2, y: 2 },
};
// Indoor maps show as the outdoor map their door is on.
export const INDOOR_PARENT = { house: 'farm', store: 'town', smithy: 'town', workshop: 'town' };
