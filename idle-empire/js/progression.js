// Progression: notices what the player has just reached and reports it once.
// checkProgress(state) records every new building unlock, ownership milestone, rank and achievement in
// the state and returns them as events for the notifications; calling it again reports nothing new.
import { BUILDINGS } from './buildings.js';
import { allMet } from './conditions.js';
import { OWNERSHIP_MILESTONES, rankIndex } from './milestones.js';
import { checkUnlocks } from './upgradeSystem.js';
import { checkAchievements } from './achievementSystem.js';

export function isBuildingUnlocked(state, id) {
  return !!state.buildingsUnlocked[id];
}

// the first building still locked, for the "coming next" card (null once everything is open)
export function nextLockedBuilding(state) {
  return BUILDINGS.find(b => !state.buildingsUnlocked[b.id]) || null;
}

export function lockedCount(state) {
  return BUILDINGS.filter(b => !state.buildingsUnlocked[b.id]).length;
}

export function checkProgress(state, now = Date.now()) {
  const events = [];

  for (const b of BUILDINGS) {
    if (!state.buildingsUnlocked[b.id] && allMet(state, b.unlock)) {
      state.buildingsUnlocked[b.id] = true;
      events.push({ type: 'building', id: b.id });
    }
  }

  // with bulk buying several milestones can pass at once: report the highest, with the combined bonus
  for (const b of BUILDINGS) {
    const owned = state.buildings[b.id] || 0;
    const seen = state.milestones[b.id] || 0;
    const passed = OWNERSHIP_MILESTONES.filter(ms => ms.count > seen && ms.count <= owned);
    if (!passed.length) continue;
    const top = passed[passed.length - 1].count;
    state.milestones[b.id] = top;
    events.push({ type: 'milestone', id: b.id, count: top, mult: passed.reduce((m, ms) => m * ms.mult, 1) });
  }

  const rank = rankIndex(state.totalEarned);
  if (rank > state.rank) {
    state.rank = rank;
    events.push({ type: 'rank', index: rank });
  }

  const fresh = checkUnlocks(state);
  if (fresh.length) events.push({ type: 'upgrades', ids: fresh });

  // last, so achievements see this tick's ranks and unlocks
  for (const id of checkAchievements(state, now)) events.push({ type: 'achievement', id });

  return events;
}
