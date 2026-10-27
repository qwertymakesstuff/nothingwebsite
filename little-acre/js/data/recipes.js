// Crafting and cooking recipes, and the machines that process items over time.
// `in` = { token: count }, where a token is an item id, `tag:<tag>` or `cat:<category>`.
// `unlock` = a condition (see conditions.js); `station: 'kitchen'` recipes are cooked at the
// kitchen, which the house only has after Mabel's kitchen renovation.

export const RECIPES = [
  // crafting
  { id: 'chest', out: 'chest', n: 1, in: { wood: 50 }, unlock: { type: 'start' } },
  { id: 'scarecrow', out: 'scarecrow', n: 1, in: { wood: 20, fiber: 10, coal: 1 }, unlock: { type: 'start' } },
  { id: 'fence', out: 'fence', n: 4, in: { wood: 4 }, unlock: { type: 'start' } },
  { id: 'wpath', out: 'wpath', n: 4, in: { wood: 2 }, unlock: { type: 'start' } },
  { id: 'spath', out: 'spath', n: 4, in: { stone: 2 }, unlock: { type: 'start' } },
  { id: 'fertilizer', out: 'fertilizer', n: 3, in: { sap: 2, fiber: 3 }, unlock: { type: 'start' } },
  { id: 'bait', out: 'bait', n: 5, in: { fiber: 3, sap: 1 }, unlock: { type: 'quest', id: 'first-fish' } },
  { id: 'trailmix', out: 'trailmix', n: 1, in: { acorn: 2, fiber: 2 }, unlock: { type: 'hearts', npc: 'juni', hearts: 2 } },
  { id: 'furnace', out: 'furnace', n: 1, in: { stone: 25, copper_ore: 20 }, unlock: { type: 'quest', id: 'bram-ore' } },
  { id: 'jar', out: 'jar', n: 1, in: { wood: 40, stone: 30, coal: 4 }, unlock: { type: 'hearts', npc: 'pip', hearts: 2 } },
  { id: 'sprinkler', out: 'sprinkler', n: 1, in: { copper_bar: 1, iron_bar: 1 }, unlock: { type: 'hearts', npc: 'bram', hearts: 3 } },
  { id: 'qsprinkler', out: 'qsprinkler', n: 1, in: { iron_bar: 1, copper_bar: 2, quartz: 1 }, unlock: { type: 'hearts', npc: 'bram', hearts: 6 } },
  { id: 'lamp', out: 'lamp', n: 1, in: { wood: 10, copper_bar: 1, sap: 2 }, unlock: { type: 'hearts', npc: 'mabel', hearts: 2 } },
  { id: 'planter', out: 'planter', n: 1, in: { wood: 15, fiber: 10, daffodil: 1 }, unlock: { type: 'hearts', npc: 'juni', hearts: 4 } },
  { id: 'birdbath', out: 'birdbath', n: 1, in: { stone: 40, quartz: 1 }, unlock: { type: 'hearts', npc: 'odessa', hearts: 3 } },
  // cooking
  { id: 'veggiesoup', out: 'veggiesoup', n: 1, in: { turnip: 1, potato: 1 }, station: 'kitchen', unlock: { type: 'start' } },
  { id: 'fishstew', out: 'fishstew', n: 1, in: { 'tag:fish': 1, tomato: 1 }, station: 'kitchen', unlock: { type: 'start' } },
  { id: 'cornchowder', out: 'cornchowder', n: 1, in: { corn: 2, clam: 1 }, station: 'kitchen', unlock: { type: 'start' } },
  { id: 'berrytart', out: 'berrytart', n: 1, in: { blueberry: 3, flour: 1 }, station: 'kitchen', unlock: { type: 'hearts', npc: 'pip', hearts: 3 } },
  { id: 'pumpkinpie', out: 'pumpkinpie', n: 1, in: { pumpkin: 1, flour: 1, sap: 1 }, station: 'kitchen', unlock: { type: 'hearts', npc: 'odessa', hearts: 2 } },
  { id: 'mushroomtoast', out: 'mushroomtoast', n: 1, in: { 'tag:mushroom': 1, bread: 1 }, station: 'kitchen', unlock: { type: 'hearts', npc: 'juni', hearts: 3 } },
  { id: 'roastveg', out: 'roastveg', n: 1, in: { beet: 1, yam: 1, eggplant: 1 }, station: 'kitchen', unlock: { type: 'hearts', npc: 'mabel', hearts: 3 } },
  { id: 'winterstew', out: 'winterstew', n: 1, in: { snowradish: 1, winterroot: 1 }, station: 'kitchen', unlock: { type: 'hearts', npc: 'teodor', hearts: 3 } },
];

export const RECIPES_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));

// Machines: `inputs` are tried in order; the first one the held item satisfies is used.
// `minutes` = in-game minutes to finish; `overnight` = ready the next morning at the earliest.
export const MACHINES = {
  furnace: {
    inputs: [
      { item: 'copper_ore', n: 5, also: { coal: 1 }, out: 'copper_bar', minutes: 60 },
      { item: 'iron_ore', n: 5, also: { coal: 1 }, out: 'iron_bar', minutes: 120 },
    ],
  },
  jar: {
    inputs: [{ cat: 'crop', n: 1, out: crop => `${crop.fruit ? 'jam' : 'pickle'}_${crop.id}`, overnight: true }],
  },
};
