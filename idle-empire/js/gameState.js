// The one authoritative game state. Every system reads and writes this object;
// nothing keeps its own copy. All amounts are BigNums, counts are plain integers.
import { ZERO } from './bigNum.js';
import { BUILDINGS } from './buildings.js';

export const STATE_VERSION = 1;

export function createState() {
  return {
    version: STATE_VERSION,
    currency: ZERO,       // crowns in hand
    totalEarned: ZERO,    // every crown ever earned (clicks + production)
    totalClicks: 0,
    buildings: Object.fromEntries(BUILDINGS.map(b => [b.id, 0])),
    startedAt: Date.now(),
  };
}
