// Statistics bookkeeping: what the empire has done, kept in state.stats (saved with the game
// in a later phase) and state.session (this visit only). The economy calls the record
// functions as things happen. No economy import here, so the economy can use this module.
//
// Bookkeeping that must always agree:
//   totalEarned = crowns earned by clicking + crowns produced by every building
//   crowns in hand = totalEarned + crowns granted - crowns spent
import BigNum, { ZERO } from './bigNum.js';
import { BUILDINGS } from './buildings.js';

const AMOUNTS = ['clickEarned', 'spent', 'granted', 'highestPps', 'highestClick'];
const COUNTS = ['bestBurst', 'denied', 'modeSwitches', 'buildingsBought', 'upgradesBought', 'playTime'];

export function createStats() {
  return {
    clickEarned: ZERO,   // crowns earned by clicking
    spent: ZERO,         // crowns spent on buildings and upgrades
    granted: ZERO,       // crowns given rather than earned (Seed Capital at the start of an empire)
    highestPps: ZERO,    // best production per second reached
    highestClick: ZERO,  // most valuable single click
    producedBy: Object.fromEntries(BUILDINGS.map(b => [b.id, ZERO])), // crowns each building has made
    buildingsBought: 0,  // copies bought, all kinds together
    upgradesBought: 0,   // upgrade levels bought
    playTime: 0,         // seconds the game has run (credited by the game loop)
    bestBurst: 0,        // most clicks inside one second
    burstStart: 0, burstCount: 0, // (working values for bestBurst)
    denied: 0,           // purchases refused for lack of crowns
    modeSwitches: 0,     // times the buy mode was changed
  };
}

export function createSession(now = Date.now()) {
  return { startedAt: now, history: [], lastSample: 0 };
}

// ---- recording (called by the economy) ----

export function recordSpend(state, cost, kind, count = 1) {
  const st = state.stats;
  st.spent = st.spent.add(cost);
  if (kind === 'building') st.buildingsBought += count;
  else st.upgradesBought += count;
}

export function recordClick(state, value, now) {
  const st = state.stats;
  st.clickEarned = st.clickEarned.add(value);
  if (value.gt(st.highestClick)) st.highestClick = value;
  if (now - st.burstStart < 1000) st.burstCount += 1;
  else { st.burstStart = now; st.burstCount = 1; }
  if (st.burstCount > st.bestBurst) st.bestBurst = st.burstCount;
}

export function recordProduction(state, id, amount) {
  const by = state.stats.producedBy;
  by[id] = (by[id] || ZERO).add(amount);
}

export function recordTick(state, seconds, pps) {
  const st = state.stats;
  st.playTime += seconds;
  if (pps.gt(st.highestPps)) st.highestPps = pps;
}

// ---- saving: plain JSON in, validated stats out ----

export function serializeStats(st) {
  const out = {};
  for (const k of AMOUNTS) out[k] = st[k].toJSON();
  for (const k of COUNTS) out[k] = st[k];
  out.producedBy = Object.fromEntries(Object.entries(st.producedBy).map(([id, v]) => [id, v.toJSON()]));
  return out;
}

// anything missing, negative or not a number falls back to the fresh value
export function deserializeStats(data) {
  const st = createStats();
  if (!data || typeof data !== 'object') return st;
  const amount = v => { const b = BigNum.from(v); return b.sign() > 0 ? b : ZERO; };
  for (const k of AMOUNTS) st[k] = amount(data[k]);
  for (const k of COUNTS) {
    const v = Number(data[k]);
    st[k] = Number.isFinite(v) && v > 0 ? (k === 'playTime' ? v : Math.floor(v)) : 0;
  }
  if (data.producedBy && typeof data.producedBy === 'object') {
    for (const b of BUILDINGS) st.producedBy[b.id] = amount(data.producedBy[b.id]);
  }
  return st;
}

// "1 h 02 m", "4 m 05 s", "12 s"
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, sec = s % 60;
  const two = n => String(n).padStart(2, '0');
  if (d) return `${d} d ${two(h)} h`;
  if (h) return `${h} h ${two(m)} m`;
  if (m) return `${m} m ${two(sec)} s`;
  return `${sec} s`;
}
