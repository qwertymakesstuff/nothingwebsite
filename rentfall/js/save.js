// Persistence in localStorage: the active run, the profile (wins, losses, best run, history) and
// settings, each under its own key. Loading never trusts stored data: every field is checked and
// clamped, unknown symbol / relic / item ids are dropped, and a run that cannot be repaired is
// discarded rather than loaded half-broken.

import { RUN_KEY, PROFILE_KEY, SAVE_VERSION, GRID_SIZE, MAX_ITEMS, HISTORY_LIMIT, MAX_EXTRA_SPINS_PER_DEADLINE } from './config.js';
import { SYMBOL_BY_ID } from './symbols.js';
import { RELIC_BY_ID, ITEM_BY_ID, SERVICE_BY_ID } from './relics.js';
import { DEADLINES, FINAL_DEADLINE } from './rent.js';
import { PHASE_LIST, emptyStats, runSummary } from './state.js';

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
const str = (v, d, max = 40) => (typeof v === 'string' && v.length ? v.slice(0, max) : d);
const collectible = id => !!SYMBOL_BY_ID[id] && !SYMBOL_BY_ID[id].board;

function cleanData(d) {
  const out = {};
  if (!isObj(d)) return out;
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'boolean') out[k] = v;
    else if (Number.isFinite(v)) out[k] = Math.max(-1e6, Math.min(1e6, v));
  }
  return out;
}

function cleanOffers(list, valid) {
  if (!Array.isArray(list)) return [];
  return list.filter(o => isObj(o) && valid(o.id)).map(o => ({ id: o.id, base: int(o.base, 0, 0, 10000), sold: !!o.sold }));
}

function cleanLast(last) {
  if (!isObj(last) || !Array.isArray(last.cells) || last.cells.length !== GRID_SIZE) return null;
  const cells = last.cells.map((c, i) => {
    if (!isObj(c) || (c.id != null && !SYMBOL_BY_ID[c.id])) return { i, id: null, value: 0, base: 0, parts: [], notes: [] };
    return {
      i, row: Math.floor(i / 5), col: i % 5, uid: typeof c.uid === 'string' ? c.uid : null, id: c.id ?? null,
      base: int(c.base, 0), value: int(c.value, 0), destroyed: !!c.destroyed, disabled: !!c.disabled,
      parts: Array.isArray(c.parts) ? c.parts.filter(isObj).slice(0, 40) : [],
      notes: Array.isArray(c.notes) ? c.notes.filter(n => typeof n === 'string').slice(0, 20) : [],
    };
  });
  const grid = Array.isArray(last.grid) && last.grid.length === GRID_SIZE ? last.grid.map(g => (typeof g === 'string' ? g.slice(0, 24) : null)) : cells.map(c => c.uid);
  return {
    grid, cells, total: int(last.total, 0),
    payouts: Array.isArray(last.payouts) ? last.payouts.filter(isObj).slice(0, 60) : [],
    log: Array.isArray(last.log) ? last.log.filter(isObj).slice(0, 300) : [],
    transforms: Array.isArray(last.transforms) ? last.transforms.filter(t => isObj(t) && SYMBOL_BY_ID[t.from] && SYMBOL_BY_ID[t.to]).slice(0, 40) : [],
    added: Array.isArray(last.added) ? last.added.filter(collectible) : [],
    extraSpins: int(last.extraSpins, 0, 0, 10), rentUp: int(last.rentUp, 0, 0), spinMult: Number.isFinite(last.spinMult) ? last.spinMult : 1,
    multReasons: Array.isArray(last.multReasons) ? last.multReasons.filter(s => typeof s === 'string') : [], leftOver: int(last.leftOver, 0, 0),
  };
}

export function sanitizeRun(raw) {
  if (!isObj(raw)) return null;
  const version = Number.isInteger(raw.version) ? raw.version : 0;
  if (version < 1 || version > SAVE_VERSION) return null;
  if (!Array.isArray(raw.collection)) return null;

  const seen = new Set();
  let maxUid = 0;
  const collection = [];
  for (const s of raw.collection) {
    if (!isObj(s) || typeof s.uid !== 'string' || seen.has(s.uid) || !collectible(s.id)) continue;
    seen.add(s.uid);
    const n = parseInt(s.uid.replace(/\D/g, ''), 10);
    if (Number.isFinite(n)) maxUid = Math.max(maxUid, n);
    collection.push({ uid: s.uid, id: s.id, bonus: int(s.bonus, 0, 0, 99), laminated: !!s.laminated, data: cleanData(s.data) });
  }
  if (!collection.length && !['won', 'lost'].includes(raw.phase)) return null;

  const deadline = int(raw.deadline, 0, 0, FINAL_DEADLINE);
  const run = {
    version: SAVE_VERSION,
    seed: str(raw.seed, 'RECOVERED'),
    rng: int(raw.rng, 1, 0, 4294967295) >>> 0,
    createdAt: int(raw.createdAt, Date.now(), 0),
    deadline,
    spinsLeft: int(raw.spinsLeft, 0, 0, DEADLINES[deadline].spins + MAX_EXTRA_SPINS_PER_DEADLINE + 10),
    spinInDeadline: int(raw.spinInDeadline, 0, 0, 100),
    extraSpinsThisDeadline: int(raw.extraSpinsThisDeadline, 0, 0, MAX_EXTRA_SPINS_PER_DEADLINE),
    money: int(raw.money, 0, 0, 1e9),
    totalEarned: int(raw.totalEarned, 0, 0, 1e12),
    earnedThisDeadline: int(raw.earnedThisDeadline, 0, 0, 1e12),
    rentExtra: int(raw.rentExtra, 0, 0, 1e7),
    rentDiscount: [0, 0.15].includes(raw.rentDiscount) ? raw.rentDiscount : 0,
    collection,
    nextUid: Math.max(int(raw.nextUid, 1, 1), maxUid + 1),
    relics: Array.isArray(raw.relics) ? [...new Set(raw.relics.filter(id => RELIC_BY_ID[id]))] : [],
    items: Array.isArray(raw.items) ? raw.items.filter(id => ITEM_BY_ID[id]).slice(0, MAX_ITEMS) : [],
    rerolls: int(raw.rerolls, 0, 0, 99),
    doubleNext: !!raw.doubleNext,
    phase: PHASE_LIST.includes(raw.phase) ? raw.phase : 'spin',
    delivery: null,
    shop: null,
    last: cleanLast(raw.last),
    ledger: Array.isArray(raw.ledger) ? raw.ledger.filter(e => isObj(e) && Number.isInteger(e.deadline) && DEADLINES[e.deadline]).map(e => ({
      deadline: e.deadline, title: DEADLINES[e.deadline].title, rent: int(e.rent, 0, 0), earned: int(e.earned, 0, 0), spins: int(e.spins, 0, 0),
      before: int(e.before, 0, 0), after: int(e.after, 0, 0), interest: int(e.interest, 0, 0), paid: !!e.paid,
    })).slice(0, DEADLINES.length + 1) : [],
    removeCount: int(raw.removeCount, 0, 0, 999),
    serviceCount: {},
    stats: emptyStats(),
    result: null,
  };
  if (isObj(raw.serviceCount)) for (const k of Object.keys(SERVICE_BY_ID)) run.serviceCount[k] = int(raw.serviceCount[k], 0, 0, 999);
  if (isObj(raw.stats)) for (const k of Object.keys(run.stats)) run.stats[k] = int(raw.stats[k], 0, 0);

  if (run.phase === 'delivery') {
    const opts = Array.isArray(raw.delivery?.options) ? raw.delivery.options.filter(id => collectible(id) && SYMBOL_BY_ID[id].draftable !== false) : [];
    if (opts.length) run.delivery = { options: opts.slice(0, 5), rerollsUsed: int(raw.delivery.rerollsUsed, 0, 0, 99) };
    else run.phase = run.spinsLeft > 0 ? 'spin' : 'rent';
  }
  if (run.phase === 'spin' && run.spinsLeft <= 0) run.phase = 'rent';
  if (run.phase === 'shop') {
    const s = isObj(raw.shop) ? raw.shop : {};
    run.shop = {
      visit: int(s.visit, 1, 1), rerollsUsed: int(s.rerollsUsed, 0, 0, 99), extraDiscount: [0, 0.2].includes(s.extraDiscount) ? s.extraDiscount : 0,
      symbols: cleanOffers(s.symbols, id => collectible(id) && SYMBOL_BY_ID[id].draftable !== false),
      relics: cleanOffers(s.relics, id => !!RELIC_BY_ID[id]),
      items: cleanOffers(s.items, id => !!ITEM_BY_ID[id]),
      service: SERVICE_BY_ID[s.service] ? s.service : 'polish',
    };
  }
  if (run.phase === 'won' || run.phase === 'lost') {
    const r = isObj(raw.result) ? raw.result : {};
    run.result = { won: run.phase === 'won', deadline: run.deadline, rent: int(r.rent, 0, 0), short: int(r.short, 0, 0) };
  }
  return run;
}

function read(storage, key) {
  try { const s = storage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const loadRun = storage => sanitizeRun(read(storage, RUN_KEY));
export const saveRun = (storage, run) => write(storage, RUN_KEY, run);
export function clearRun(storage) { try { storage.removeItem(RUN_KEY); } catch { /* ignore */ } }

// ── Profile: records and run history ─────────────────────────────────────────

export const emptyProfile = () => ({ version: SAVE_VERSION, wins: 0, losses: 0, best: null, history: [] });
const runId = run => `${run.seed}@${run.createdAt}`;

export function sanitizeProfile(raw) {
  const p = emptyProfile();
  if (!isObj(raw)) return p;
  p.wins = int(raw.wins, 0, 0);
  p.losses = int(raw.losses, 0, 0);
  if (isObj(raw.best)) p.best = { seed: str(raw.best.seed, '?'), reached: int(raw.best.reached, 0, 0, DEADLINES.length), totalEarned: int(raw.best.totalEarned, 0, 0), won: !!raw.best.won };
  if (Array.isArray(raw.history)) {
    p.history = raw.history.filter(isObj).map(h => ({
      id: str(h.id, '?', 80), seed: str(h.seed, '?'), won: !!h.won, reached: int(h.reached, 0, 0, DEADLINES.length),
      totalEarned: int(h.totalEarned, 0, 0), spins: int(h.spins, 0, 0), bestSpin: int(h.bestSpin, 0, 0),
      collection: int(h.collection, 0, 0), relics: Array.isArray(h.relics) ? h.relics.filter(id => RELIC_BY_ID[id]) : [], endedAt: int(h.endedAt, 0, 0),
    })).slice(0, HISTORY_LIMIT);
  }
  return p;
}

const better = (a, b) => !b || a.reached > b.reached || (a.reached === b.reached && a.totalEarned > b.totalEarned);

// Records a finished run once (calling it again for the same run changes nothing).
export function recordRun(profile, run, now = Date.now()) {
  if (!['won', 'lost'].includes(run.phase)) return profile;
  const id = runId(run);
  if (profile.history.some(h => h.id === id)) return profile;
  const p = structuredClone(profile);
  const s = runSummary(run);
  if (s.won) p.wins += 1; else p.losses += 1;
  const entry = { id, ...s, endedAt: now };
  p.history = [entry, ...p.history].slice(0, HISTORY_LIMIT);
  if (better(s, p.best)) p.best = { seed: s.seed, reached: s.reached, totalEarned: s.totalEarned, won: s.won };
  return p;
}

export const loadProfile = storage => sanitizeProfile(read(storage, PROFILE_KEY));
export const saveProfile = (storage, p) => write(storage, PROFILE_KEY, p);

export function resetProgress(storage) {
  try { storage.removeItem(RUN_KEY); storage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
}
