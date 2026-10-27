// Crop definitions. `days` = watered nights from seed to harvest; `regrow` = nights until the next
// harvest for crops that keep producing (0 = the plant is used up). `seasons` are indices into
// CLOCK.seasons; a crop still in the ground when its last season ends withers. `tier` decides when
// Pip starts stocking the seed (see SEED_TIERS); `fair` seeds are only sold at the Seedling Fair.
// `shape` and the colours drive the procedural pixel art; `fruit` picks jam vs pickles.

export const CROPS = [
  // spring
  { id: 'turnip', name: 'Turnip', seasons: [0], days: 4, regrow: 0, seedPrice: 20, price: 35, yield: [1, 1], tier: 0, shape: 'root', color: '#f3eef7', color2: '#b65fc2', leaf: '#5fae3e' },
  { id: 'potato', name: 'Potato', seasons: [0], days: 6, regrow: 0, seedPrice: 50, price: 80, yield: [1, 2], tier: 0, shape: 'root', color: '#c79a5b', color2: '#8c6533', leaf: '#4f9a3a' },
  { id: 'snappea', name: 'Snap Pea', seasons: [0], days: 7, regrow: 3, seedPrice: 60, price: 40, yield: [1, 1], tier: 0, shape: 'vine', color: '#8fd65a', color2: '#5aa23a', leaf: '#3f8a35' },
  { id: 'cauliflower', name: 'Cauliflower', seasons: [0], days: 10, regrow: 0, seedPrice: 80, price: 175, yield: [1, 1], tier: 1, shape: 'head', color: '#f4f1df', color2: '#d8d2b5', leaf: '#5aa24a' },
  { id: 'strawberry', name: 'Strawberry', seasons: [0], days: 8, regrow: 4, seedPrice: 100, price: 120, yield: [1, 2], tier: 0, fair: true, shape: 'bush', color: '#e8384b', color2: '#ffd34d', leaf: '#3f9a40', fruit: true },
  // summer
  { id: 'tomato', name: 'Tomato', seasons: [1], days: 9, regrow: 4, seedPrice: 50, price: 60, yield: [1, 2], tier: 0, shape: 'vine', color: '#e24a32', color2: '#b8301f', leaf: '#3f8f35', fruit: true },
  { id: 'pepper', name: 'Hot Pepper', seasons: [1], days: 5, regrow: 3, seedPrice: 40, price: 40, yield: [1, 1], tier: 0, shape: 'bush', color: '#e63b1f', color2: '#ff8a2a', leaf: '#3c8b37', fruit: true },
  { id: 'blueberry', name: 'Blueberry', seasons: [1], days: 11, regrow: 4, seedPrice: 80, price: 50, yield: [3, 3], tier: 1, shape: 'bush', color: '#4a62d8', color2: '#2d3f9e', leaf: '#3d7f3a', fruit: true },
  { id: 'melon', name: 'Melon', seasons: [1], days: 12, regrow: 0, seedPrice: 80, price: 250, yield: [1, 1], tier: 1, shape: 'ground', color: '#7cc04f', color2: '#3f8a2c', leaf: '#4f9a3a', fruit: true },
  { id: 'corn', name: 'Corn', seasons: [1, 2], days: 12, regrow: 4, seedPrice: 150, price: 50, yield: [1, 1], tier: 0, shape: 'tall', color: '#f5d33f', color2: '#c99b1e', leaf: '#5ca83b' },
  { id: 'sunflower', name: 'Sunflower', seasons: [1, 2], days: 8, regrow: 0, seedPrice: 120, price: 90, yield: [1, 1], tier: 1, shape: 'flower', color: '#ffd23a', color2: '#6b3e1c', leaf: '#4c9a35' },
  // fall
  { id: 'eggplant', name: 'Eggplant', seasons: [2], days: 5, regrow: 5, seedPrice: 20, price: 60, yield: [1, 1], tier: 0, shape: 'bush', color: '#5b2c7a', color2: '#7f45a3', leaf: '#3f8a35' },
  { id: 'beet', name: 'Beet', seasons: [2], days: 6, regrow: 0, seedPrice: 20, price: 50, yield: [1, 1], tier: 0, shape: 'root', color: '#a3204a', color2: '#d34a6c', leaf: '#4c9a3a' },
  { id: 'yam', name: 'Yam', seasons: [2], days: 10, regrow: 0, seedPrice: 60, price: 160, yield: [1, 1], tier: 1, shape: 'root', color: '#c45a2a', color2: '#8f3a1a', leaf: '#5a9a35' },
  { id: 'pumpkin', name: 'Pumpkin', seasons: [2], days: 13, regrow: 0, seedPrice: 100, price: 320, yield: [1, 1], tier: 1, shape: 'ground', color: '#f08a1c', color2: '#c0600e', leaf: '#4a8f32' },
  { id: 'cranberry', name: 'Cranberry', seasons: [2], days: 7, regrow: 5, seedPrice: 240, price: 75, yield: [2, 2], tier: 1, shape: 'bush', color: '#c41e3a', color2: '#e8506a', leaf: '#3a7a33', fruit: true },
  // winter
  { id: 'snowradish', name: 'Snow Radish', seasons: [3], days: 7, regrow: 0, seedPrice: 60, price: 110, yield: [1, 1], tier: 1, shape: 'root', color: '#e9f4ff', color2: '#7fb6e6', leaf: '#4f8f6a' },
];

export const CROPS_BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]));

// Pip stocks a seed once its tier is unlocked: tier 0 from the start, tier 1 after shipping this
// many items in total.
export const SEED_TIERS = [0, 50];

// Fertilized soil grows a crop in this share of its normal time (rounded up).
export const FERTILIZER_SPEED = 0.75;

export const seedId = cropId => `seed_${cropId}`;
