// The world of BORDERLINE: the country the player serves, the post they work and the
// neighbouring nations whose travellers arrive. Every name here is fictional.

export const SETTING = {
  country: {
    code: 'COR',
    name: 'Corvenna',
    formal: 'Republic of Corvenna',
    ministry: 'Ministry of Passage',
    capital: 'Halvost',
  },
  checkpoint: {
    name: 'Ilvar Pass',
    post: 'Checkpoint 9',
    description: 'a single-lane crossing on the mountain road between Corvenna and the eastern states',
  },
  currency: { symbol: 'K', name: 'kesh' },
  startingMoney: 40,
};

// Issuing nations. `cover` and `ink` colour the passport, `emblem` picks its seal shape.
export const NATIONS = {
  COR: { code: 'COR', name: 'Corvenna', adjective: 'Corvennan', cities: ['Halvost', 'Brenna', 'Ostrel'], cover: '#5a2424', ink: '#e8cf8a', emblem: 'star' },
  OSK: { code: 'OSK', name: 'Oskaria', adjective: 'Oskarian', cities: ['Vel Oskar', 'Mirn', 'Tavrask'], cover: '#1f3d5a', ink: '#d8dde4', emblem: 'wheel' },
  VEL: { code: 'VEL', name: 'Velsund', adjective: 'Velsundi', cities: ['Aarnhal', 'Skeld', 'Lorvik'], cover: '#2c4a32', ink: '#e4dcb8', emblem: 'tree' },
  DRA: { code: 'DRA', name: 'Dravenmark', adjective: 'Dravish', cities: ['Draven', 'Kolm', 'Essfurt'], cover: '#3b2b4a', ink: '#e0d0e8', emblem: 'tower' },
  KAL: { code: 'KAL', name: 'Kaltrin', adjective: 'Kaltrini', cities: ['Kaltra', 'Sevan', 'Ormuz Ridge'], cover: '#5a4320', ink: '#f0e2b0', emblem: 'sun' },
};
