// Tuning knobs. Everything that is a number you might want to balance lives here.

export const TILE = 16;                 // source pixels per tile
export const SAVE_KEY = 'little-acre-save';
export const SAVE_VERSION = 1;

export const CLOCK = {
  dayStart: 6 * 60,                     // wake up at 6:00
  passOut: 26 * 60,                     // 2:00 the next morning
  realMsPerGameMinute: 700,             // 10 in-game minutes every 7 real seconds
  daysPerSeason: 28,
  seasons: ['spring', 'summer', 'fall', 'winter'],
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export const PLAYER = {
  speed: 4.6,                           // tiles per second
  startMoney: 500,
  maxEnergy: 120,
  backpack: 24,                         // usable inventory slots at the start
  maxBackpack: 36,
  hotbar: 12,
  stack: 99,
  reach: 1.6,                           // tiles a mouse click can act at
  passOutPenalty: 0.1,                  // share of money lost when you pass out
  passOutPenaltyCap: 600,
};

// Energy each tool use costs, by tool level (basic, copper, iron).
export const TOOL_ENERGY = {
  hoe: [2, 4, 6],
  can: [2, 3, 4],
  axe: [3, 3, 2],
  pickaxe: [3, 3, 2],
  scythe: [1, 1, 1],
  rod: [4, 3, 2],
};
// How many tiles a hoe / watering can affects in a line at each level.
export const TOOL_AREA = [1, 3, 5];
export const CAN_CAPACITY = [40, 70, 110];
// Damage a hit does to wood / stone by axe or pickaxe level.
export const TOOL_POWER = [1, 2, 3];

export const FARM = {
  weedsPerDay: 4,                       // new debris that creeps onto the farm each night
  stonesPerDay: 2,
  debrisCap: 220,
  untilledDecay: 0.25,                  // chance dry, empty soil goes back to grass overnight
  crowChance: 0.25,                     // chance crows visit a night (per unprotected farm)
  scarecrowRadius: 7,
};

export const FRIENDSHIP = {
  perHeart: 100,
  maxHearts: 10,
  talk: 20,
  gift: { loved: 80, liked: 45, neutral: 20, disliked: -20, hated: -40 },
  birthdayMultiplier: 3,
  requestReward: 40,
};

export const RAIN_CHANCE = [0.22, 0.12, 0.2, 0.15];   // by season; winter rain falls as snow
export const DEFAULT_SELL_MULTIPLIER = 1;
