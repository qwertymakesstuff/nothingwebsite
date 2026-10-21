// The one authoritative game state. Every system reads and writes this object;
// nothing keeps its own copy. All amounts are BigNums, counts are plain integers.
import { ZERO } from './bigNum.js';
import { BUILDINGS } from './buildings.js';
import { ECONOMY } from './config.js';

export const STATE_VERSION = 1;

export function createState() {
  return {
    version: STATE_VERSION,
    currency: ZERO,       // crowns in hand
    totalEarned: ZERO,    // every crown ever earned (clicks + production)
    totalClicks: 0,
    buildings: Object.fromEntries(BUILDINGS.map(b => [b.id, 0])),
    // upgrade levels owned ({ id: level }); replaced, never edited in place (see economy.modifiers)
    upgrades: {},
    upgradesUnlocked: {}, // { id: true } once an upgrade has appeared in the shop
    buildingsUnlocked: { [BUILDINGS[0].id]: true }, // { id: true } once a building is in the shop
    milestones: {},       // { buildingId: highest ownership milestone already celebrated }
    rank: 0,              // highest empire rank reached (index into RANKS)
    buyMode: ECONOMY.defaultBuyMode, // 1, 10, 100 or 'max'
    startedAt: Date.now(),
  };
}
