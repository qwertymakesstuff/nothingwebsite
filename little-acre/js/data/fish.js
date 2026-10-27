// Fish. `where` = the water bodies it lives in (farm pond, forest creek, lake); `seasons` indices;
// `hours` = [from, to) in 24h clock (to may pass midnight, e.g. [18, 26]); `rain` = only bites in
// rain. `difficulty` 1-100 sets how fast and far it darts in the catch minigame; `motion` picks
// the movement style. `weight` is its share of bites when several fish can bite.

export const FISH = [
  { id: 'bream', name: 'Pond Bream', where: ['farm'], seasons: [0, 1, 2, 3], hours: [6, 26], price: 30, difficulty: 15, motion: 'smooth', weight: 10, color: '#8aa66a', color2: '#d9c77a' },
  { id: 'catfish', name: 'Whiskered Catfish', where: ['farm', 'lake'], seasons: [0, 2], hours: [6, 24], rain: true, price: 110, difficulty: 65, motion: 'sink', weight: 3, color: '#6e6250', color2: '#a89878' },
  { id: 'chub', name: 'Creek Chub', where: ['forest'], seasons: [0, 1, 2, 3], hours: [6, 26], price: 25, difficulty: 10, motion: 'smooth', weight: 10, color: '#9aa4a8', color2: '#d6dade' },
  { id: 'trout', name: 'Rainbow Trout', where: ['forest'], seasons: [1], hours: [6, 19], price: 65, difficulty: 40, motion: 'dart', weight: 6, color: '#7fae8a', color2: '#e88aa0' },
  { id: 'salmon', name: 'Autumn Salmon', where: ['forest'], seasons: [2], hours: [6, 19], price: 75, difficulty: 50, motion: 'dart', weight: 6, color: '#d06a4a', color2: '#f0b08a' },
  { id: 'perch', name: 'Yellow Perch', where: ['lake'], seasons: [0, 2, 3], hours: [6, 26], price: 40, difficulty: 20, motion: 'smooth', weight: 9, color: '#c9b23a', color2: '#5b7a3a' },
  { id: 'carp', name: 'Mirror Carp', where: ['lake', 'farm'], seasons: [0, 1, 2, 3], hours: [6, 26], price: 30, difficulty: 15, motion: 'float', weight: 8, color: '#b08a4a', color2: '#e0c48a' },
  { id: 'sunfish', name: 'Sunfish', where: ['lake'], seasons: [0, 1], hours: [6, 19], price: 30, difficulty: 10, motion: 'smooth', weight: 8, color: '#e0a02a', color2: '#3a8ab0' },
  { id: 'pike', name: 'Silver Pike', where: ['lake'], seasons: [1, 3], hours: [6, 26], price: 95, difficulty: 55, motion: 'dart', weight: 4, color: '#8a9a8a', color2: '#c8d0c0' },
  { id: 'laketrout', name: 'Lake Trout', where: ['lake'], seasons: [2], hours: [6, 26], price: 75, difficulty: 45, motion: 'smooth', weight: 5, color: '#5a7a6a', color2: '#b0c8a0' },
  { id: 'eel', name: 'Marsh Eel', where: ['lake', 'forest'], seasons: [0, 2], hours: [16, 26], rain: true, price: 85, difficulty: 60, motion: 'sink', weight: 4, color: '#4a4a3a', color2: '#8a8a5a' },
  { id: 'moonscale', name: 'Moonscale', where: ['lake'], seasons: [3], hours: [20, 26], price: 150, difficulty: 75, motion: 'dart', weight: 2, color: '#b8c8f0', color2: '#f4f8ff' },
  { id: 'glimmerfin', name: 'Glimmerfin', where: ['lake'], seasons: [1], hours: [20, 26], price: 300, difficulty: 85, motion: 'dart', weight: 1, color: '#6ae0d0', color2: '#fff38a' },
];

export const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));

// What else can end up on the hook.
export const JUNK = [{ id: 'seaweed', weight: 1 }, { id: 'driftwood', weight: 1 }];
export const JUNK_CHANCE = 0.08;
