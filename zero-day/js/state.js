// Game state, persistence and derived stats for ZERO DAY.
import { SAVE_KEY, START, BASE_STATS, xpForLevel, REP_TIERS } from './config.js';
import { UPGRADE_BY_ID } from './shop.js';

export function freshState() {
  return {
    version: 1,
    money: START.money,
    xp: START.xp,
    rep: START.rep,
    level: START.level,
    stats: { hacks: 0, fails: 0, earned: 0, spent: 0, detected: 0, aborts: 0, cleanRuns: 0 },
    upgrades: { cpu: 0, crack: 0, stealth: 0, storage: 0, recon: 0, netanalysis: 0, prepSlots: 0 },
    inventory: {},        // consumableId -> count
    prep: [],             // consumableIds staged for next op
    evidence: {},         // tag -> count
    cleared: [],          // targetIds + "contractId:done"
    seenStory: [],
    inbox: [],
    activeContract: null,
    board: [],
    boardSeed: Math.floor(Math.random() * 1e9),
    history: [],
    settings: { sound: true, scanlines: true, reduceMotion: false },
    archive: {},          // fileName -> targetName (files you've ever pulled)
    createdAt: Date.now(),
  };
}

let state = null;

export function getState() { return state; }

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(freshState(), parsed);
      // defensive merges for forward-compat
      state.stats = Object.assign(freshState().stats, parsed.stats || {});
      state.upgrades = Object.assign(freshState().upgrades, parsed.upgrades || {});
      state.settings = Object.assign(freshState().settings, parsed.settings || {});
      return state;
    }
  } catch (e) { /* corrupt save: start fresh */ }
  state = freshState();
  return state;
}

let saveTimer = null;
export function save() {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* storage blocked (private mode) — game still runs, just no persistence */ }
}
export function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  state = freshState();
  return state;
}

// ── Derived stats: base + upgrade effects ────────────────────────────────
export function derived(s = state) {
  const u = s.upgrades;
  return {
    timeFactor: 1 + 0.18 * u.cpu,           // multiply every timer budget
    hintTier: BASE_STATS.crack + u.crack,   // more/better hints
    detectMul: Math.max(0.3, 1 - 0.15 * u.stealth),
    storage: BASE_STATS.storage + 45 * u.storage,
    reconClues: BASE_STATS.recon + u.recon,
    netReveal: u.netanalysis * 2,
    prepSlots: BASE_STATS.prepSlots + u.prepSlots,
  };
}

export function repTier(s = state) {
  let t = REP_TIERS[0];
  for (const r of REP_TIERS) if (s.rep >= r.minRep) t = r;
  return t;
}

// ── Progression mutators ─────────────────────────────────────────────────
export function addXp(amount) {
  state.xp += amount;
  let leveled = 0;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    leveled++;
  }
  return leveled;
}

export function xpProgress(s = state) {
  const need = xpForLevel(s.level);
  return { have: s.xp, need, pct: Math.min(100, Math.round((s.xp / need) * 100)) };
}

export function addMoney(n) {
  state.money += n;
  if (n > 0) state.stats.earned += n; else state.stats.spent += -n;
  if (state.money < 0) state.money = 0;
}

export function addRep(n) {
  state.rep = Math.max(0, state.rep + n);
}

export function addEvidence(tag) {
  if (!tag) return;
  state.evidence[tag] = (state.evidence[tag] || 0) + 1;
}

export function markCleared(id) {
  if (!state.cleared.includes(id)) state.cleared.push(id);
}

export function pushInbox(beat) {
  state.inbox.unshift({ id: beat.id, from: beat.from, subj: beat.subj, body: beat.body, read: false, ts: Date.now() });
  state.seenStory.push(beat.id);
}

export function unread(s = state) { return s.inbox.filter(m => !m.read).length; }
