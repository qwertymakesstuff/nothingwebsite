// Saving and loading. Loading never trusts stored data: structure is checked, references between
// parts, machines, benches and jobs are repaired, unknown part ids are dropped, and a save that
// can't be repaired is kept aside as a backup instead of being loaded half-broken.

import { SAVE_KEY, SETTINGS_KEY, SAVE_VERSION, DAY_START, DAY_END, DIFFICULTIES } from './config.js';
import { PART } from '../data/catalog.js';
import { TOOL, UPGRADE, SUBSCRIPTION } from '../data/tools.js';
import { emptyStats } from './state.js';
import { defaultBios, emptyData } from './parts.js';
import { benchCount } from './business.js';

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v, d, max = 60) => (typeof v === 'string' ? v.slice(0, max) : d);

export const DEFAULT_SETTINGS = { textSize: 100, reducedMotion: false, highContrast: false, sound: true, volume: 60, tooltips: true, confirm: true, autosave: true, colorblind: false };

export function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (!isObj(raw)) return s;
  s.textSize = num(raw.textSize, 100, 80, 150);
  s.volume = num(raw.volume, 60, 0, 100);
  for (const k of ['reducedMotion', 'highContrast', 'sound', 'tooltips', 'confirm', 'autosave', 'colorblind']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  return s;
}

export function loadSettings(storage) {
  try { return sanitizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY) || 'null')); } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(storage, s) {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; } catch { return false; }
}

function cleanPart(p) {
  if (!isObj(p) || !PART[p.id] || typeof p.uid !== 'string') return null;
  const d = PART[p.id];
  const out = { uid: p.uid, id: p.id, cond: num(p.cond, 100, 0, 100), fault: typeof p.fault === 'string' ? p.fault : null, owner: str(p.owner, 'shop', 20), cost: num(p.cost, d.price, 0, 1e6), used: !!p.used };
  if (p.sign) out.sign = true;
  if (d.cat === 'storage') {
    const data = isObj(p.data) ? p.data : emptyData();
    out.data = {
      os: PART[data.os] ? data.os : null, osOk: data.osOk !== false, drivers: !!data.drivers, malware: num(data.malware, 0, 0, 3),
      files: Array.isArray(data.files) ? data.files.filter(isObj).slice(0, 20).map(f => ({ label: str(f.label, 'Files', 40), gb: num(f.gb, 1, 0, 4000), owner: str(f.owner, 'shop', 20), pct: num(f.pct, 100, 0, 100) })) : [],
    };
    out.health = num(p.health, 100, 0, 100);
  }
  if (d.cat === 'motherboard') {
    const b = isObj(p.bios) ? p.bios : {};
    out.bios = { ...defaultBios(), xmp: !!b.xmp, fan: ['silent', 'standard', 'performance', 'off'].includes(b.fan) ? b.fan : 'standard', boot: str(b.boot, 'auto', 20), volt: b.volt === 'high' ? 'high' : 'auto' };
  }
  if (d.cat === 'cooler') out.pasteFresh = !!p.pasteFresh;
  return out;
}

function cleanTests(t) {
  const out = {};
  if (!isObj(t)) return out;
  for (const [k, v] of Object.entries(t)) if (isObj(v) && typeof v.hash === 'string') {
    const r = { hash: v.hash.slice(0, 4000), ok: !!v.ok };
    for (const f of ['score', 'pct', 'cpu', 'gpu', 'noise', 'load', 'idle', 'watts', 'day']) if (Number.isFinite(v[f])) r[f] = v[f];
    if (typeof v.cause === 'string') r.cause = v.cause;
    out[k] = r;
  }
  return out;
}

function cleanPC(pc, parts) {
  if (!isObj(pc) || typeof pc.uid !== 'string' || !parts[pc.caseUid]) return null;
  const slots = {};
  if (isObj(pc.slots)) for (const [z, u] of Object.entries(pc.slots)) if (typeof u === 'string' && parts[u]) slots[z] = u;
  const cables = {};
  if (isObj(pc.cables)) for (const [k, v] of Object.entries(pc.cables)) if (v === 'ok' || v === 'loose') cables[k] = v;
  const fanDir = {};
  if (isObj(pc.fanDir)) for (const [k, v] of Object.entries(pc.fanDir)) if (v === 'in' || v === 'out') fanDir[k] = v;
  const paste = isObj(pc.paste) && ['good', 'thin', 'excess', 'none', 'used', 'dried'].includes(pc.paste.state) ? { state: pc.paste.state, amount: num(pc.paste.amount, 0, 0, 100) } : { state: 'none', amount: 0 };
  return {
    uid: pc.uid, name: str(pc.name, 'Machine', 80), owner: str(pc.owner, 'shop', 20), caseUid: pc.caseUid, slots, fanDir, cables, paste,
    dust: num(pc.dust, 0, 0, 100), closed: !!pc.closed, tests: cleanTests(pc.tests),
    evidence: Array.isArray(pc.evidence) ? pc.evidence.filter(isObj).slice(-80).map(e => ({ tag: str(e.tag, '', 40), text: str(e.text, '', 300), level: str(e.level, 'info', 10), day: num(e.day, 1) })) : [],
    created: num(pc.created, 1), job: typeof pc.job === 'string' ? pc.job : undefined, licenseCost: num(pc.licenseCost, 0, 0, 1e5),
    fileLabels: Array.isArray(pc.fileLabels) ? pc.fileLabels.filter(x => typeof x === 'string').slice(0, 10) : [],
  };
}

const JOB_STATUS = ['offered', 'active', 'completed', 'failed', 'cancelled', 'declined', 'expired'];

function cleanJob(j, pcs) {
  if (!isObj(j) || typeof j.id !== 'string' || !JOB_STATUS.includes(j.status)) return null;
  const out = JSON.parse(JSON.stringify(j));
  out.machines = Array.isArray(j.machines) ? j.machines.filter(u => typeof u === 'string') : [];
  out.delivered = Array.isArray(j.delivered) ? j.delivered.filter(u => typeof u === 'string') : [];
  out.tests = Array.isArray(j.tests) ? j.tests.filter(t => typeof t === 'string') : [];
  out.req = isObj(j.req) ? j.req : {};
  out.bonus = Array.isArray(j.bonus) ? j.bonus.filter(isObj) : [];
  for (const k of ['budget', 'fee', 'deadline', 'expires', 'tier', 'offeredDay']) out[k] = num(j[k], k === 'tier' ? 1 : 0);
  if (out.status === 'active' && out.machines.some(u => !pcs[u]) && out.machines.length && !out.delivered.length) {
    // a customer machine went missing: treat it as returned
    out.machines = out.machines.filter(u => pcs[u]);
  }
  return out;
}

export function sanitizeState(raw) {
  if (!isObj(raw) || !isObj(raw.parts) || !isObj(raw.pcs)) return null;
  const s = {};
  s.version = SAVE_VERSION;
  s.seed = num(raw.seed, 1, 0, 2 ** 32);
  s.shopName = str(raw.shopName, 'Silicon Dreams', 40);
  s.owner = str(raw.owner, 'You', 40);
  s.difficulty = DIFFICULTIES[raw.difficulty] ? raw.difficulty : 'standard';
  s.day = Math.round(num(raw.day, 1, 1, 100000));
  s.minute = Math.round(num(raw.minute, DAY_START, DAY_START, DAY_END));
  s.money = Math.round(num(raw.money, 0, -1e7, 1e9));
  s.reputation = num(raw.reputation, 10, 0, 100);
  s.xp = Math.round(num(raw.xp, 0, 0, 1e9));
  s.level = Math.round(num(raw.level, 1, 1, 20));
  s.nextUid = Math.round(num(raw.nextUid, 1, 1, 1e12));
  s.parts = {};
  for (const p of Object.values(raw.parts)) { const c = cleanPart(p); if (c) s.parts[c.uid] = c; }
  s.pcs = {};
  for (const pc of Object.values(raw.pcs)) { const c = cleanPC(pc, s.parts); if (c) s.pcs[c.uid] = c; }
  // a part can only be in one place: inside one machine or on the shelf
  const placed = new Set();
  for (const pc of Object.values(s.pcs)) {
    placed.add(pc.caseUid);
    for (const [z, u] of Object.entries(pc.slots)) { if (placed.has(u)) delete pc.slots[z]; else placed.add(u); }
  }
  s.inventory = (Array.isArray(raw.inventory) ? raw.inventory : []).filter(u => typeof u === 'string' && s.parts[u] && !placed.has(u));
  s.inventory = [...new Set(s.inventory)];
  for (const u of Object.keys(s.parts)) if (!placed.has(u) && !s.inventory.includes(u)) s.inventory.push(u); // orphans go back on the shelf
  const count = 1 + ['bench2', 'bench3'].filter(id => isObj(raw.upgrades) && raw.upgrades[id]).length;
  s.benches = Array.from({ length: count }, (_, i) => (Array.isArray(raw.benches) && typeof raw.benches[i] === 'string' && s.pcs[raw.benches[i]] ? raw.benches[i] : null));
  s.consumables = { paste: 0, air: 0, wipes: 0 };
  if (isObj(raw.consumables)) for (const k of Object.keys(s.consumables)) s.consumables[k] = Math.round(num(raw.consumables[k], 0, 0, 999));
  s.licenses = {};
  if (isObj(raw.licenses)) for (const [k, v] of Object.entries(raw.licenses)) if (PART[k] && PART[k].cat === 'os') s.licenses[k] = Math.round(num(v, 0, 0, 99));
  s.tools = {};
  if (isObj(raw.tools)) for (const k of Object.keys(raw.tools)) if (TOOL[k] && raw.tools[k]) s.tools[k] = true;
  for (const t of Object.values(TOOL)) if (t.start) s.tools[t.id] = true;
  s.upgrades = {};
  if (isObj(raw.upgrades)) for (const k of Object.keys(raw.upgrades)) if (UPGRADE[k] && raw.upgrades[k]) s.upgrades[k] = num(raw.upgrades[k], 1);
  s.subs = {};
  if (isObj(raw.subs)) for (const k of Object.keys(raw.subs)) if (SUBSCRIPTION[k] && raw.subs[k]) s.subs[k] = true;
  s.jobs = {};
  if (isObj(raw.jobs)) for (const j of Object.values(raw.jobs)) { const c = cleanJob(j, s.pcs); if (c) s.jobs[c.id] = c; }
  // machines still waiting on an offered job aren't in the shop yet; everything else must be on a bench or the rack
  const waiting = new Set(Object.values(s.jobs).filter(j => j.status === 'offered').flatMap(j => j.machines));
  s.benches = s.benches.map(u => (u && !waiting.has(u) ? u : null));
  s.intake = (Array.isArray(raw.intake) ? raw.intake : []).filter(u => s.pcs[u] && !s.benches.includes(u) && !waiting.has(u));
  s.intake = [...new Set(s.intake)];
  for (const u of Object.keys(s.pcs)) if (!s.benches.includes(u) && !s.intake.includes(u) && !waiting.has(u)) s.intake.push(u);
  s.orders = (Array.isArray(raw.orders) ? raw.orders : []).filter(o => isObj(o) && Array.isArray(o.items) && o.items.every(id => PART[id])).map(o => ({ id: str(o.id, 'o', 20), items: o.items.slice(0, 50), unit: num(o.unit, 0, 0, 1e5), arrive: num(o.arrive, s.day), express: !!o.express, placed: num(o.placed, s.day) }));
  s.bargains = (Array.isArray(raw.bargains) ? raw.bargains : []).filter(b => isObj(b) && PART[b.id]).map(b => ({ key: str(b.key, 'b', 20), id: b.id, price: num(b.price, 1, 1, 1e5), cond: num(b.cond, 70, 0, 100), fault: typeof b.fault === 'string' ? b.fault : null }));
  s.bargainDay = num(raw.bargainDay, 0);
  s.ledger = (Array.isArray(raw.ledger) ? raw.ledger : []).filter(isObj).slice(-600).map(l => ({ day: num(l.day, 1), kind: str(l.kind, 'job', 20), amount: num(l.amount, 0), label: str(l.label, '', 120), job: typeof l.job === 'string' ? l.job : null }));
  s.totals = {};
  if (isObj(raw.totals)) for (const [k, v] of Object.entries(raw.totals)) if (Number.isFinite(v)) s.totals[k] = v;
  s.stats = { ...emptyStats() };
  if (isObj(raw.stats)) for (const k of Object.keys(s.stats)) {
    if (k === 'recentSat') s.stats.recentSat = Array.isArray(raw.stats.recentSat) ? raw.stats.recentSat.filter(Number.isFinite).slice(-10) : [];
    else s.stats[k] = num(raw.stats[k], 0);
  }
  s.milestones = {};
  if (isObj(raw.milestones)) for (const [k, v] of Object.entries(raw.milestones)) if (Number.isFinite(v)) s.milestones[k] = v;
  s.log = (Array.isArray(raw.log) ? raw.log : []).filter(isObj).slice(-200).map(l => ({ day: num(l.day, 1), t: num(l.t, DAY_START), text: str(l.text, '', 300), level: str(l.level, 'info', 10) }));
  s.tutorial = isObj(raw.tutorial) ? { step: num(raw.tutorial.step, 0, 0, 99), done: !!raw.tutorial.done } : { step: 0, done: false };
  if (s.benches.length !== benchCount(s)) while (s.benches.length < benchCount(s)) s.benches.push(null);
  return s;
}

export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return { ok: true }; } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

export function loadGame(storage) {
  let raw;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { state: null, error: 'storage unavailable' }; }
  if (!raw) return { state: null };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { backup(storage, raw); return { state: null, error: 'The save file was unreadable and has been set aside.' }; }
  const s = sanitizeState(parsed);
  if (!s) { backup(storage, raw); return { state: null, error: 'The save file was damaged and has been set aside.' }; }
  return { state: s };
}

function backup(storage, raw) { try { storage.setItem(`${SAVE_KEY}-backup-${Date.now()}`, raw); } catch { /* full */ } }

export function hasSave(storage) { try { return !!storage.getItem(SAVE_KEY); } catch { return false; } }
export function deleteSave(storage) { try { storage.removeItem(SAVE_KEY); return true; } catch { return false; } }
