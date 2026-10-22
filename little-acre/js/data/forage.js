// Wild things that spring up each morning. FORAGE are the items; SPAWNS says where and how many
// appear per day (and the cap kept on the map), by season.

export const FORAGE = [
  { id: 'wildgarlic', name: 'Wild Garlic', seasons: [0], price: 40, energy: 10, color: '#e8f0d8', color2: '#6aa84a' },
  { id: 'daffodil', name: 'Daffodil', seasons: [0], price: 30, color: '#ffe24a', color2: '#f59a1a' },
  { id: 'morel', name: 'Morel', seasons: [0], price: 90, energy: 15, color: '#a0784a', color2: '#6a4a2a' },
  { id: 'sweetpea', name: 'Sweet Pea', seasons: [1], price: 50, color: '#e88ad8', color2: '#b04aa0' },
  { id: 'spiceberry', name: 'Spice Berry', seasons: [1], price: 80, energy: 12, color: '#e03a2a', color2: '#7a1a1a' },
  { id: 'fiddlehead', name: 'Fiddlehead Fern', seasons: [1], price: 60, energy: 10, color: '#6ab04a', color2: '#3a7a2a' },
  { id: 'hazelnut', name: 'Hazelnut', seasons: [2], price: 70, energy: 12, color: '#a0703a', color2: '#d8b07a' },
  { id: 'chanterelle', name: 'Chanterelle', seasons: [2], price: 120, energy: 18, color: '#f0a02a', color2: '#c07010' },
  { id: 'blackberry', name: 'Blackberry', seasons: [2], price: 25, energy: 8, color: '#3a1a4a', color2: '#7a3a8a' },
  { id: 'holly', name: 'Holly', seasons: [3], price: 80, color: '#2a7a3a', color2: '#d8202a' },
  { id: 'crocus', name: 'Snow Crocus', seasons: [3], price: 60, color: '#b08af0', color2: '#ffe060' },
  { id: 'winterroot', name: 'Winter Root', seasons: [3], price: 70, energy: 12, color: '#8a5a3a', color2: '#c08a5a' },
  { id: 'clam', name: 'River Clam', seasons: [0, 1, 2, 3], price: 50, color: '#d8c8b0', color2: '#8a7a6a' },
  { id: 'cattail', name: 'Cattail', seasons: [0, 1, 2], price: 35, color: '#7a4a2a', color2: '#6a9a4a' },
];

export const SPAWNS = [
  { map: 'forest', perDay: 4, cap: 10, ground: '.', items: { 0: ['wildgarlic', 'daffodil', 'morel'], 1: ['sweetpea', 'spiceberry', 'fiddlehead'], 2: ['hazelnut', 'chanterelle', 'blackberry'], 3: ['holly', 'crocus', 'winterroot'] } },
  { map: 'lake', perDay: 3, cap: 6, ground: 's', items: { 0: ['clam', 'cattail'], 1: ['clam', 'cattail'], 2: ['clam', 'cattail'], 3: ['clam'] } },
  { map: 'town', perDay: 1, cap: 3, ground: '.', items: { 0: ['daffodil', 'wildgarlic'], 1: ['sweetpea'], 2: ['blackberry', 'hazelnut'], 3: ['holly', 'crocus'] } },
];

// Breakable nodes that refill overnight on the quarry floor, and choppable trees in the forest.
export const NODES = [
  { map: 'quarry', ground: 'g', perDay: 10, cap: 34, kinds: [['rock', 60], ['copper', 22], ['iron', 10], ['gemrock', 8]] },
  { map: 'forest', ground: '.', perDay: 1, cap: 14, kinds: [['tree', 70], ['stump', 30]] },
];
