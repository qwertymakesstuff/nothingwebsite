// Saving to localStorage: the current run (so a reload continues it) and the meta profile
// (settings, high scores, upgrades, achievements). Anything missing or corrupt falls back to a
// fresh default instead of breaking the game.

import { ASSET_BY_T } from './assets.js';

export const KEYS = { run: 'pumped.run.v1', meta: 'pumped.meta.v1' };
export const SCORES_KEPT = 10;

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

export function browserStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__pumped_test__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return memoryStorage(); }
}

function read(storage, key) {
  try { const s = storage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// ── Settings ─────────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  sound: true, volume: 0.6, effects: true, reducedMotion: false, confirmBig: true,
  chartTheme: 'terminal', speed: 1, tooltips: true, leverageAccepted: false,
};

export function sanitizeSettings(s) {
  const out = { ...DEFAULT_SETTINGS };
  if (!s || typeof s !== 'object') return out;
  for (const k of ['sound', 'effects', 'reducedMotion', 'confirmBig', 'tooltips', 'leverageAccepted']) if (typeof s[k] === 'boolean') out[k] = s[k];
  if (Number.isFinite(s.volume)) out.volume = Math.min(1, Math.max(0, Math.round(s.volume * 10) / 10));
  if ([0.5, 1, 2].includes(s.speed)) out.speed = s.speed;
  if (typeof s.chartTheme === 'string' && /^[a-z]{1,20}$/.test(s.chartTheme)) out.chartTheme = s.chartTheme;
  return out;
}

// ── Meta profile ─────────────────────────────────────────────────────────────
export function defaultMeta() {
  return {
    v: 1, clout: 0, upgrades: {}, achievements: {}, themes: ['terminal'],
    scores: { sprint: [], session: [], endless: [] },
    lifetime: { runs: 0, bestWorth: 0, cloutEarned: 0, trades: 0 },
    settings: { ...DEFAULT_SETTINGS },
    watch: ['MBYT', 'CORN', 'GOB'],
  };
}

const finite = (x, d = 0) => (Number.isFinite(x) ? x : d);

export function sanitizeMeta(m) {
  const out = defaultMeta();
  if (!m || typeof m !== 'object') return out;
  out.clout = Math.max(0, Math.floor(finite(m.clout)));
  if (m.upgrades && typeof m.upgrades === 'object') for (const [k, v] of Object.entries(m.upgrades)) if (Number.isInteger(v) && v > 0 && v < 20) out.upgrades[k] = v;
  if (m.achievements && typeof m.achievements === 'object') for (const [k, v] of Object.entries(m.achievements)) if (Number.isFinite(v)) out.achievements[k] = v;
  if (Array.isArray(m.themes)) out.themes = [...new Set(['terminal', ...m.themes.filter(t => typeof t === 'string' && /^[a-z]{1,20}$/.test(t))])];
  for (const mode of Object.keys(out.scores)) {
    const list = m.scores && Array.isArray(m.scores[mode]) ? m.scores[mode] : [];
    out.scores[mode] = list.filter(s => s && Number.isFinite(s.worth)).slice(0, SCORES_KEPT)
      .map(s => ({ worth: s.worth, peak: finite(s.peak, s.worth), date: finite(s.date), seed: String(s.seed || '').slice(0, 24), reason: String(s.reason || '').slice(0, 12) }));
  }
  if (m.lifetime && typeof m.lifetime === 'object') for (const k of Object.keys(out.lifetime)) out.lifetime[k] = Math.max(0, finite(m.lifetime[k]));
  out.settings = sanitizeSettings(m.settings);
  if (Array.isArray(m.watch)) out.watch = [...new Set(m.watch.filter(t => ASSET_BY_T[t]))].slice(0, 40);
  return out;
}

// Insert a score; returns its rank (0-based) or -1 if it didn't make the table.
export function addScore(meta, mode, entry) {
  const list = meta.scores[mode] || (meta.scores[mode] = []);
  list.push(entry);
  list.sort((a, b) => b.worth - a.worth);
  const rank = list.indexOf(entry);
  list.length = Math.min(list.length, SCORES_KEPT);
  return rank < SCORES_KEPT ? rank : -1;
}

// ── Runs ─────────────────────────────────────────────────────────────────────
const sig = x => (Number.isFinite(x) ? Number(x.toPrecision(7)) : x);

export function packRun(run) {
  const copy = { ...run, market: { ...run.market, assets: {} } };
  for (const [t, a] of Object.entries(run.market.assets)) copy.market.assets[t] = { ...a, hist: a.hist.map(sig), long: a.long.map(sig) };
  return copy;
}

// Basic structural checks: a broken save is dropped, never half-loaded.
export function validRun(r) {
  try {
    if (!r || r.v !== 1 || !r.market || !r.pf || !r.stats) return false;
    const m = r.market;
    if (!Number.isInteger(m.tick) || m.tick < 0 || !Array.isArray(m.order) || !m.order.length) return false;
    if (!Number.isInteger(m.rngState)) return false;
    for (const t of m.order) {
      const a = m.assets[t];
      if (!ASSET_BY_T[t] || !a || !Number.isFinite(a.logP) || !Number.isFinite(a.p) || !(a.p > 0)) return false;
      if (!Array.isArray(a.hist) || !a.hist.length || !Array.isArray(a.long) || !a.long.length) return false;
    }
    if (!Number.isFinite(r.pf.cash) || r.pf.cash < 0) return false;
    for (const [t, p] of Object.entries(r.pf.positions || {})) {
      if (!m.assets[t] || !(p.qty > 0) || !Number.isFinite(p.cost) || !Number.isFinite(p.debt) || !(p.lev >= 1)) return false;
    }
    return true;
  } catch { return false; }
}

export class Store {
  constructor(storage = browserStorage()) { this.storage = storage; }
  loadMeta() { return sanitizeMeta(read(this.storage, KEYS.meta)); }
  saveMeta(meta) { return write(this.storage, KEYS.meta, meta); }
  loadRun() { const r = read(this.storage, KEYS.run); return validRun(r) ? r : null; }
  saveRun(run) { return write(this.storage, KEYS.run, packRun(run)); }
  clearRun() { try { this.storage.removeItem(KEYS.run); } catch { /* ignore */ } }
  resetAll() { this.clearRun(); try { this.storage.removeItem(KEYS.meta); } catch { /* ignore */ } }
}
