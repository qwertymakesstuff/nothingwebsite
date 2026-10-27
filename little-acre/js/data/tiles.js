// The tile legend: what each character in mapRows.js is. `walk` = the player and villagers can
// stand on it, `till` = a hoe can turn it into soil (only on maps marked farmable), `water` =
// fishable and refills the watering can, `floor` = indoor ground.

export const TILES = {
  '.': { name: 'grass', walk: true, till: true },
  '"': { name: 'tall grass', walk: true, till: true },
  '=': { name: 'dirt path', walk: true },
  'c': { name: 'cobblestone', walk: true },
  's': { name: 'sand', walk: true },
  'g': { name: 'gravel', walk: true },
  'b': { name: 'boardwalk', walk: true },
  '~': { name: 'water', walk: false, water: true },
  'F': { name: 'fountain', walk: false, water: true },
  'T': { name: 'tree', walk: false },
  'h': { name: 'hedge', walk: false },
  'r': { name: 'cliff', walk: false },
  '#': { name: 'fence', walk: false },
  'x': { name: 'old fence', walk: false, locked: true },
  'B': { name: 'building', walk: false },
  'D': { name: 'door', walk: true },
  'W': { name: 'wall', walk: false },
  'f': { name: 'floorboards', walk: true, floor: true },
  'k': { name: 'rug', walk: true, floor: true },
  'u': { name: 'counter', walk: false, floor: true },
  ' ': { name: 'void', walk: false },
};

export const tileInfo = ch => TILES[ch] || TILES[' '];
