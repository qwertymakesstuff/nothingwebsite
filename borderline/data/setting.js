// The world of BORDERLINE: the country the player serves, the post they work and the
// neighbouring nations whose travellers arrive. Every name here is fictional.

export const SETTING = {
  country: {
    code: 'COR',
    name: 'Corvenna',
    formal: 'Republic of Corvenna',
    ministry: 'Ministry of Passage',
    labour: 'Ministry of Labour',
    capital: 'Halvost',
  },
  checkpoint: {
    name: 'Ilvar Pass',
    post: 'Checkpoint 9',
    description: 'a single-lane crossing on the mountain road between Corvenna and the eastern states',
  },
  currency: { symbol: 'K', name: 'kesh' },
  startingMoney: 40,
  // districts that issue Corvennan identity cards
  districts: ['Halvost Central', 'Halvost East', 'Brenna', 'Ostrel', 'Ilvar', 'Sarnow'],
  // destinations inside Corvenna named on entry declarations
  destinations: ['Halvost', 'Brenna', 'Ostrel', 'Sarnow', 'Ilvar Town', 'Kessel'],
  // the routes a transit pass can name: in at Ilvar Pass, out at another border post
  transitRoutes: ['Ilvar Pass → Sarn Bridge', 'Ilvar Pass → Port Kessel', 'Ilvar Pass → Westmark Gate'],
  employers: ['Ostrel Quarry Works', 'Halvost Rail Yards', 'Brenna Textile Mill', 'Sarnow Timber Company', 'Kessel Docks', 'State Grain Office'],
  occupations: ['Quarryman', 'Rail fitter', 'Loom operator', 'Forester', 'Dock labourer', 'Clerk', 'Mechanic', 'Nurse'],
  // the vaccination northern travellers must prove during the outbreak (from Day 8)
  vaccine: 'Skeld fever',
  // invented places that issue no documents; forgers print them on fake passports
  unrecognizedCities: ['Vel Oskara', 'Nordmirn', 'Skeldborg', 'Upper Kolm', 'Kaltra Nova', 'Ostravin', 'Draven Fort', 'Lorvikstad'],
};

// Issuing nations. `cover` and `ink` colour the passport, `emblem` is its official seal and
// `number` the passport number pattern (# = digit).
export const NATIONS = {
  COR: { code: 'COR', name: 'Corvenna', adjective: 'Corvennan', cities: ['Halvost', 'Brenna', 'Ostrel'], cover: '#5a2424', ink: '#e8cf8a', emblem: 'star', number: 'CR-#####' },
  OSK: { code: 'OSK', name: 'Oskaria', adjective: 'Oskarian', cities: ['Vel Oskar', 'Mirn', 'Tavrask'], cover: '#1f3d5a', ink: '#d8dde4', emblem: 'wheel', number: 'OK-####-#' },
  VEL: { code: 'VEL', name: 'Velsund', adjective: 'Velsundi', cities: ['Aarnhal', 'Skeld', 'Lorvik'], cover: '#2c4a32', ink: '#e4dcb8', emblem: 'tree', number: 'VS-######' },
  DRA: { code: 'DRA', name: 'Dravenmark', adjective: 'Dravish', cities: ['Draven', 'Kolm', 'Essfurt'], cover: '#3b2b4a', ink: '#e0d0e8', emblem: 'tower', number: 'DM-##-####' },
  KAL: { code: 'KAL', name: 'Kaltrin', adjective: 'Kaltrini', cities: ['Kaltra', 'Sevan', 'Ormuz Ridge'], cover: '#5a4320', ink: '#f0e2b0', emblem: 'sun', number: 'KT-#####' },
};

// Seals forgers use: close to the real one, but visibly different when compared side by side.
export const FORGED_SEALS = { star: 'star6', wheel: 'wheel3', tree: 'tree2', tower: 'towerFlat', sun: 'sunRay' };
