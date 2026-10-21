// Prestige: found a new empire. Ordinary progress resets; seals, legacy upgrades, achievements
// and all-time totals stay. The state object itself is reset in place (never replaced), so
// every system holding it keeps working.
import BigNum, { ZERO } from './bigNum.js';
import { createState } from './gameState.js';
import { sealsFor, lifetimeForSeals, LEGACY_BY_ID, legacyLevel, startingCrowns } from './legacy.js';

// what the confirmation screen promises; prestige() below does exactly this
export const RESETS = [
  'Crowns in hand and crowns earned this empire',
  'All buildings, and which buildings are unlocked',
  'All upgrades',
  'Empire rank and ownership milestones',
  'This empire\'s statistics (clicks, spending, records)',
];
export const KEEPS = [
  'Imperial Seals and their production bonus',
  'Legacy upgrades',
  'Achievements and their bonus',
  'All-time totals: crowns, clicks, play time, empires founded',
  'Your buy mode and the date your first empire was founded',
];
// state keys that survive; everything else comes back fresh from createState()
const KEPT_KEYS = new Set(['achievements', 'legacy', 'buyMode', 'startedAt', 'session']);

export function allTimeEarned(state) {
  return state.legacy.lifetimeEarned.add(state.totalEarned);
}

// seals a prestige right now would give
export function pendingSeals(state) {
  return BigNum.max(ZERO, sealsFor(allTimeEarned(state)).sub(state.legacy.sealsEarned));
}

// how far to the next seal: crowns still needed, and 0..1 progress from the previous one
export function nextSeal(state) {
  const all = allTimeEarned(state);
  const have = sealsFor(all);
  const from = lifetimeForSeals(have), to = lifetimeForSeals(have.add(1));
  const span = to.sub(from);
  return {
    total: have.add(1),
    needed: BigNum.max(ZERO, to.sub(all)),
    progress: span.sign() > 0 ? Math.max(0, Math.min(1, all.sub(from).div(span).toNumber())) : 0,
  };
}

export function canPrestige(state) {
  return pendingSeals(state).sign() > 0;
}

// resets the run and banks the seals; returns { gain, earned, runSeconds } or null when there is nothing to gain
export function prestige(state, now = Date.now()) {
  const gain = pendingSeals(state);
  if (gain.sign() <= 0) return null;
  const L = state.legacy;
  const earned = state.totalEarned;
  const runSeconds = Math.max(0, (now - state.runStartedAt) / 1000);

  L.seals = L.seals.add(gain);
  L.sealsEarned = L.sealsEarned.add(gain);
  L.prestiges += 1;
  L.lifetimeEarned = L.lifetimeEarned.add(earned);
  L.lifetimeClicks += state.totalClicks;
  L.playTime += state.stats.playTime;
  if (earned.gt(L.bestRunEarned)) L.bestRunEarned = earned;
  L.unlockedEver = { ...L.unlockedEver, ...state.buildingsUnlocked };

  const fresh = createState();
  for (const key of Object.keys(fresh)) if (!KEPT_KEYS.has(key)) state[key] = fresh[key];
  state.runStartedAt = now;
  applyLegacyStart(state);
  return { gain, earned, runSeconds };
}

// what legacy upgrades give a new empire on day one
export function applyLegacyStart(state) {
  const L = state.legacy;
  const crowns = startingCrowns(L);
  if (crowns.sign() > 0) {
    state.currency = state.currency.add(crowns);
    state.stats.granted = state.stats.granted.add(crowns);
  }
  if (legacyLevel(L, 'deeds') > 0) state.buildingsUnlocked = { ...state.buildingsUnlocked, ...L.unlockedEver };
}

export function legacyCost(state, id) {
  const def = LEGACY_BY_ID[id];
  const level = legacyLevel(state.legacy, id);
  return def && level < def.maxLevel ? BigNum.from(def.cost(level)) : null;
}

// buys the next level with seals; returns the price or null (unknown, maxed or too few seals)
export function buyLegacy(state, id) {
  const cost = legacyCost(state, id);
  const L = state.legacy;
  if (!cost || L.seals.lt(cost)) return null;
  const crownsBefore = startingCrowns(L);
  L.seals = L.seals.sub(cost);
  L.upgrades = { ...L.upgrades, [id]: legacyLevel(L, id) + 1 };
  // effects that act at the start of an empire also apply right away to this one
  // (Seed Capital: just the increase, once)
  if (id === 'deeds') state.buildingsUnlocked = { ...state.buildingsUnlocked, ...L.unlockedEver };
  if (id === 'seed') {
    const extra = startingCrowns(L).sub(crownsBefore);
    state.currency = state.currency.add(extra);
    state.stats.granted = state.stats.granted.add(extra);
  }
  return cost;
}
