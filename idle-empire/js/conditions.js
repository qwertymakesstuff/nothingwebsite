// Unlock conditions, shared by buildings and upgrades. A condition is plain data:
//   { type: 'owned', building, count }  own at least `count` of a building
//   { type: 'earned', amount }          crowns earned in total
//   { type: 'pps', amount }             production per second
//   { type: 'clicks', count }           clicks on the Mint
import BigNum from './bigNum.js';
import * as economy from './economy.js';

export function conditionMet(state, c) {
  switch (c.type) {
    case 'owned': return (state.buildings[c.building] || 0) >= c.count;
    case 'earned': return state.totalEarned.gte(c.amount);
    case 'pps': return economy.productionPerSecond(state).gte(c.amount);
    case 'clicks': return state.totalClicks >= c.count;
    default: return false;
  }
}

export function allMet(state, conditions) {
  return conditions.every(c => conditionMet(state, c));
}

// how far along a condition is, 0..1 (for progress bars)
export function conditionProgress(state, c) {
  const ratio = (have, need) => (BigNum.from(need).sign() > 0 ? Math.min(1, BigNum.from(have).div(need).toNumber()) : 1);
  switch (c.type) {
    case 'owned': return ratio(state.buildings[c.building] || 0, c.count);
    case 'earned': return ratio(state.totalEarned, c.amount);
    case 'pps': return ratio(economy.productionPerSecond(state), c.amount);
    case 'clicks': return ratio(state.totalClicks, c.count);
    default: return 0;
  }
}
