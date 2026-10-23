// The shared game state. Plain JSON so it saves as-is.

import { DAY_START, DIFFICULTIES, SAVE_VERSION } from './config.js';
import { TOOLS } from '../data/tools.js';
import { makePart } from './parts.js';
import { tutorialOffers } from './jobs.js';
import { refreshBargains } from './economy.js';

export function emptyStats() {
  return { jobsDone: 0, repairs: 0, builds: 0, highEnd: 0, recoveries: 0, contracts: 0, failed: 0, cancelled: 0, fiveStars: 0, profit: 0, revenue: 0, partsSold: 0, recentSat: [], comebacks: 0, wrongParts: 0 };
}

export function newGame({ shopName = 'Silicon Dreams', owner = 'You', difficulty = 'standard', seed } = {}) {
  const diff = DIFFICULTIES[difficulty] ? difficulty : 'standard';
  const state = {
    version: SAVE_VERSION,
    seed: seed ?? Math.floor(Math.random() * 2 ** 31),
    shopName, owner, difficulty: diff,
    day: 1, minute: DAY_START,
    money: DIFFICULTIES[diff].money, reputation: 10, xp: 0, level: 1,
    parts: {}, inventory: [], pcs: {}, benches: [null], intake: [],
    consumables: { paste: 6, air: 3, wipes: 10 },
    licenses: {},
    tools: Object.fromEntries(TOOLS.filter(t => t.start).map(t => [t.id, true])),
    upgrades: {}, subs: {},
    jobs: {}, orders: [], bargains: [], bargainDay: 0,
    ledger: [], totals: {}, stats: emptyStats(), milestones: {},
    log: [], tutorial: { step: 0, done: false }, nextUid: 1,
  };
  // a few spares on the shelf to get going
  for (const id of ['fan-zp-breeze120', 'fan-zp-breeze120', 'ram-mw-8-2666', 'sto-pebble-240']) {
    const p = makePart(state, id, { cost: 0, used: true, cond: 80 });
    state.inventory.push(p.uid);
  }
  tutorialOffers(state);
  refreshBargains(state);
  return state;
}
