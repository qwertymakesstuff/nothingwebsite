// Villagers: looks (for the procedural sprites and portraits), birthdays, gift tastes, friendship
// gifts and daily schedules. Schedule entries are [time, map, x, y, facing?, hidden?]; a villager
// walks to each entry's tile when its time comes (or simply appears there if you are on another
// map), and `hidden` entries mean they have gone indoors. A schedule is picked in this order:
// festival day > a key matching the weekday (Mon..Sun) > `rain` on rainy days > `default`.
// `introGift` items are handed over the first time you talk. Gift tastes take item ids, `tag:` and `cat:` tokens (see items.js matches()).

export const NPCS = [
  {
    id: 'pip', name: 'Pip Marlow', role: 'Shopkeeper at Pip\'s Provisions',
    look: { skin: '#f2c9a0', hair: '#d8662a', hairStyle: 'bun', shirt: '#4f9a5a', pants: '#5a4a6a', extra: 'apron', eyes: '#3a2a1a' },
    birthday: { season: 0, day: 9 },
    loves: ['strawberry', 'berrytart', 'sunflower', 'pumpkinpie'], likes: ['cat:crop', 'bread', 'daffodil', 'tag:sweet'], dislikes: ['seaweed', 'coal'], hates: ['driftwood'],
    gifts: [{ hearts: 4, item: 'fertilizer', n: 10, line: 'Here, a sack of my special Growth Mix. Don\'t tell the other farmers. There are no other farmers. Still.' }],
    schedule: {
      default: [['06:00', 'town', 15, 8, 'down', true], ['08:30', 'store', 6, 3, 'down'], ['17:00', 'town', 20, 13, 'down'], ['20:00', 'town', 15, 8, 'up', true]],
      Wed: [['06:00', 'town', 15, 8, 'down', true], ['09:00', 'forest', 12, 15, 'left'], ['13:00', 'town', 18, 13, 'down'], ['18:00', 'town', 15, 8, 'up', true]],
    },
  },
  {
    id: 'bram', name: 'Bram Ostrow', role: 'Blacksmith',
    look: { skin: '#b07a52', hair: '#2a2420', hairStyle: 'short', shirt: '#7a3a2a', pants: '#3a3a44', extra: 'beard', eyes: '#1a1a1a' },
    birthday: { season: 2, day: 3 },
    loves: ['iron_bar', 'amethyst', 'fishstew', 'topaz'], likes: ['tag:mineral', 'coal', 'copper_bar', 'cat:fish'], dislikes: ['daffodil', 'sweetpea', 'crocus'], hates: ['tag:sweet'],
    gifts: [{ hearts: 4, item: 'coal', n: 15, line: 'Had some coal left over. Don\'t make it weird.' }],
    schedule: {
      default: [['06:00', 'smithy', 8, 6, 'down', true], ['08:00', 'smithy', 5, 3, 'down'], ['16:00', 'quarry', 10, 8, 'up'], ['19:00', 'town', 25, 13, 'down'], ['21:30', 'town', 32, 13, 'up', true]],
      Fri: [['06:00', 'smithy', 8, 6, 'down', true], ['09:00', 'lake', 20, 14, 'down'], ['15:00', 'town', 36, 17, 'left'], ['20:00', 'town', 32, 13, 'up', true]],
    },
  },
  {
    id: 'mabel', name: 'Mabel Fenn', role: 'Carpenter',
    look: { skin: '#e8b890', hair: '#6a4a2a', hairStyle: 'long', shirt: '#3a6ab0', pants: '#6a5030', extra: 'cap', eyes: '#2a3a1a' },
    birthday: { season: 1, day: 14 },
    loves: ['hardwood', 'pumpkinpie', 'topaz', 'roastveg'], likes: ['wood', 'sap', 'cat:artisan'], dislikes: ['clam', 'cat:fish'], hates: ['seaweed'],
    gifts: [{ hearts: 4, item: 'bench', n: 1, line: 'Built you a bench. Every farm needs somewhere to sit and do nothing.' }],
    schedule: {
      default: [['06:00', 'workshop', 8, 6, 'down', true], ['08:00', 'workshop', 5, 3, 'down'], ['17:00', 'town', 12, 26, 'down'], ['20:00', 'town', 8, 25, 'up', true]],
      Tue: [['06:00', 'workshop', 8, 6, 'down', true], ['09:00', 'forest', 25, 20, 'up'], ['15:00', 'town', 17, 18, 'down'], ['19:00', 'town', 8, 25, 'up', true]],
    },
  },
  {
    id: 'juni', name: 'Juniper Hale', role: 'Botanist in Whisperwood',
    look: { skin: '#8a5a3a', hair: '#1a1a24', hairStyle: 'curly', shirt: '#c8a03a', pants: '#3a5a3a', extra: 'glasses', eyes: '#1a1a1a' },
    birthday: { season: 0, day: 22 },
    loves: ['daffodil', 'morel', 'chanterelle', 'crocus', 'mushroomtoast'], likes: ['cat:forage', 'sunflower', 'acorn'], dislikes: ['coal', 'copper_ore', 'iron_ore'], hates: ['driftwood'],
    gifts: [{ hearts: 4, item: 'acorn', n: 5, line: 'Acorns from the oldest oak in the wood. Plant them somewhere they\'ll be loved.' }],
    schedule: {
      default: [['06:00', 'forest', 8, 9, 'down', true], ['08:00', 'forest', 14, 14, 'down'], ['12:00', 'forest', 24, 9, 'right'], ['16:00', 'town', 6, 17, 'down'], ['19:00', 'forest', 10, 12, 'down'], ['21:00', 'forest', 8, 9, 'up', true]],
      rain: [['06:00', 'forest', 8, 9, 'down', true], ['08:00', 'forest', 10, 11, 'down'], ['21:00', 'forest', 8, 9, 'up', true]],
    },
  },
  {
    id: 'teodor', name: 'Old Teodor', role: 'Fisherman at Mirror Lake',
    look: { skin: '#d8a880', hair: '#d8d8d8', hairStyle: 'bald', shirt: '#c85a3a', pants: '#3a4a6a', extra: 'beard', eyes: '#2a2a3a' },
    birthday: { season: 3, day: 10 },
    introGift: [['rod', 1], ['bait', 5]],
    loves: ['glimmerfin', 'moonscale', 'fishstew', 'pike'], likes: ['cat:fish', 'bread', 'cornchowder'], dislikes: ['tag:sweet', 'quartz'], hates: ['holly'],
    gifts: [{ hearts: 4, item: 'bait', n: 30, line: 'Thirty of my best worms. I named them. Don\'t ask.' }],
    schedule: {
      default: [['06:00', 'lake', 20, 20, 'down'], ['13:00', 'lake', 12, 12, 'down'], ['17:00', 'lake', 20, 20, 'down'], ['22:00', 'lake', 31, 9, 'up', true]],
    },
  },
  {
    id: 'odessa', name: 'Mayor Odessa Thorne', role: 'Mayor of Bramblewick',
    look: { skin: '#f0d0b0', hair: '#9a9aa8', hairStyle: 'bun', shirt: '#7a2a5a', pants: '#2a2a3a', extra: 'glasses', eyes: '#2a2a2a' },
    birthday: { season: 2, day: 20 },
    loves: ['cauliflower', 'pumpkin', 'amethyst', 'cat:artisan'], likes: ['tag:cooked', 'cat:crop', 'holly'], dislikes: ['cat:fish', 'stone'], hates: ['seaweed'],
    gifts: [{ hearts: 4, item: 'gnome', n: 1, line: 'This gnome guarded my mother\'s garden for forty years. He is yours now. Be good to him.' }],
    schedule: {
      default: [['06:00', 'town', 33, 24, 'down', true], ['09:00', 'town', 20, 11, 'down'], ['12:00', 'town', 36, 26, 'left'], ['15:00', 'town', 24, 14, 'down'], ['18:00', 'town', 33, 24, 'up', true]],
      Sun: [['06:00', 'town', 33, 24, 'down', true], ['10:00', 'lake', 26, 10, 'down'], ['14:00', 'town', 20, 11, 'down'], ['18:00', 'town', 33, 24, 'up', true]],
    },
  },
];

export const NPCS_BY_ID = Object.fromEntries(NPCS.map(n => [n.id, n]));
