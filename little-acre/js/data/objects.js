// Things that sit on a tile: debris, resource nodes and everything the player can place.
// `tool` breaks it (`any` = any tool or bare hands), `minLevel` is the tool level needed, `hp` the
// number of level-0 hits. `drops` = [itemId, min, max, chance]. `item` marks a placeable: the
// inventory item it comes from and returns to when picked up. `walk` objects (paths) can be
// walked over. `machine` objects process inputs (see recipes.js MACHINES). `light` glows at night.

export const OBJECTS = {
  weed: { name: 'Weeds', tool: 'any', hp: 1, drops: [['fiber', 1, 1, 0.7]], debris: true },
  stone: { name: 'Stone', tool: 'pickaxe', hp: 1, drops: [['stone', 1, 2, 1]], debris: true },
  twig: { name: 'Twig', tool: 'axe', hp: 1, drops: [['wood', 1, 2, 1]], debris: true },
  stump: { name: 'Stump', tool: 'axe', hp: 4, minLevel: 1, drops: [['hardwood', 2, 2, 1], ['wood', 2, 4, 1]], debris: true, big: true },
  boulder: { name: 'Boulder', tool: 'pickaxe', hp: 6, minLevel: 1, drops: [['stone', 12, 15, 1], ['coal', 0, 1, 0.5]], debris: true, big: true },
  tree: { name: 'Tree', tool: 'axe', hp: 6, drops: [['wood', 8, 12, 1], ['sap', 1, 2, 0.6], ['acorn', 1, 1, 0.3]], tall: true },
  sapling: { name: 'Sapling', tool: 'axe', hp: 1, drops: [['acorn', 1, 1, 1]] },
  rock: { name: 'Rock', tool: 'pickaxe', hp: 2, drops: [['stone', 2, 4, 1], ['coal', 1, 1, 0.12]] },
  copper: { name: 'Copper Node', tool: 'pickaxe', hp: 3, drops: [['copper_ore', 2, 4, 1], ['stone', 1, 2, 1]] },
  iron: { name: 'Iron Node', tool: 'pickaxe', hp: 4, minLevel: 1, drops: [['iron_ore', 2, 3, 1], ['stone', 1, 2, 1]] },
  gemrock: { name: 'Gem Rock', tool: 'pickaxe', hp: 4, drops: [['quartz', 1, 1, 0.8], ['amethyst', 1, 1, 0.25], ['topaz', 1, 1, 0.2], ['coal', 1, 2, 0.5]] },
  forage: { name: 'Forage', tool: 'none' }, // carries its item id; picked up by hand
  drop: { name: 'Dropped item', tool: 'none', walk: true }, // { item, n } left when the bag was full

  // placeables
  chest: { name: 'Chest', item: 'chest', storage: 24 },
  scarecrow: { name: 'Scarecrow', item: 'scarecrow' },
  sprinkler: { name: 'Sprinkler', item: 'sprinkler', sprinkles: 'cross' },
  qsprinkler: { name: 'Quality Sprinkler', item: 'qsprinkler', sprinkles: 'square' },
  furnace: { name: 'Furnace', item: 'furnace', machine: 'furnace', light: true },
  jar: { name: 'Preserves Jar', item: 'jar', machine: 'jar' },
  lamp: { name: 'Lamp Post', item: 'lamp', light: true, decor: true },
  bench: { name: 'Bench', item: 'bench', decor: true },
  planter: { name: 'Flower Planter', item: 'planter', decor: true },
  gnome: { name: 'Garden Gnome', item: 'gnome', decor: true },
  birdbath: { name: 'Birdbath', item: 'birdbath', decor: true },
  fence: { name: 'Wood Fence', item: 'fence', decor: true, fence: true },
  ribbon: { name: 'Blue Ribbon Stand', item: 'ribbon', decor: true },
  lantern: { name: 'Paper Lantern', item: 'lantern', light: true, decor: true },
  wpath: { name: 'Wood Path', item: 'wpath', walk: true, floor: true, decor: true },
  spath: { name: 'Stone Path', item: 'spath', walk: true, floor: true, decor: true },
};

// Debris scattered over a new farm (and over the north field when it is cleared).
export const FARM_DEBRIS = [['weed', 60], ['stone', 40], ['twig', 40], ['stump', 8], ['boulder', 4], ['tree', 10]];
