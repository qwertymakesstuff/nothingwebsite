// Statistics reports: production history and the summaries the statistics screen shows.
// Recording lives in stats.js.
import { ZERO } from './bigNum.js';
import { BUILDINGS } from './buildings.js';
import { UPGRADES } from './upgrades.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS } from './achievements.js';
import { OWNERSHIP_MILESTONES, RANKS, RANK_BONUS, milestoneMult } from './milestones.js';
import * as economy from './economy.js';

export const HISTORY_INTERVAL_MS = 5000; // one production sample every 5 s
export const HISTORY_LENGTH = 120;       // keeps the last 10 minutes

// one production sample every HISTORY_INTERVAL_MS, for the chart
export function sampleHistory(state, now = Date.now()) {
  const s = state.session;
  if (now - s.lastSample < HISTORY_INTERVAL_MS) return false;
  s.lastSample = now;
  s.history.push({ t: now, pps: economy.productionPerSecond(state) });
  if (s.history.length > HISTORY_LENGTH) s.history.splice(0, s.history.length - HISTORY_LENGTH);
  return true;
}

// ---- reports (read by the statistics screen) ----

export function totalOwned(state) {
  return BUILDINGS.reduce((n, b) => n + (state.buildings[b.id] || 0), 0);
}

// per building: owned, output each and in total, share of all production, crowns made so far
export function buildingBreakdown(state) {
  const pps = economy.productionPerSecond(state);
  return BUILDINGS.filter(b => state.buildingsUnlocked[b.id]).map(b => {
    const owned = state.buildings[b.id] || 0;
    const total = economy.buildingProduction(state, b.id);
    return {
      def: b, owned,
      each: economy.unitRate(state, b),
      total,
      share: pps.sign() > 0 ? total.div(pps).toNumber() : 0,
      produced: state.stats.producedBy[b.id] || ZERO,
      milestoneMult: milestoneMult(owned),
    };
  });
}

// every bonus currently active, as display rows { label, value }
export function activeBonuses(state) {
  const mods = economy.modifiers(state);
  const achieved = Object.keys(state.achievements).length;
  const rank = state.rank;
  return [
    { label: `Empire rank (${RANKS[rank].name})`, value: `+${Math.round(rank * RANK_BONUS * 100)}%` },
    { label: `Achievements (${achieved})`, value: `+${Math.round(achieved * ACHIEVEMENT_BONUS * 100)}%` },
    { label: 'Empire-wide upgrades', value: `x${mods.global.toFixed(2)}` },
    { label: 'Click multiplier', value: `x${mods.clickMult}` },
    { label: 'Extra crowns per click', value: `+${mods.clickAdd}` },
    { label: 'Share of per-second added to clicks', value: `${Math.round(mods.clickPps * 100)}%` },
  ];
}

export function progressSummary(state) {
  const milestonesReached = BUILDINGS.reduce((n, b) => n + OWNERSHIP_MILESTONES.filter(ms => (state.buildings[b.id] || 0) >= ms.count).length, 0);
  const upgradesOwned = UPGRADES.filter(u => (state.upgrades[u.id] || 0) > 0).length;
  return [
    { label: 'Rank', value: `${RANKS[state.rank].name} (${state.rank + 1} of ${RANKS.length})` },
    { label: 'Buildings unlocked', value: `${Object.keys(state.buildingsUnlocked).length} of ${BUILDINGS.length}` },
    { label: 'Ownership milestones', value: `${milestonesReached} of ${BUILDINGS.length * OWNERSHIP_MILESTONES.length}` },
    { label: 'Upgrades owned', value: `${upgradesOwned} of ${UPGRADES.length}` },
    { label: 'Achievements', value: `${Object.keys(state.achievements).length} of ${ACHIEVEMENTS.length}` },
  ];
}

