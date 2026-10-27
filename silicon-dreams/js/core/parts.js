// Part instances. A definition (data/catalog.js) is the model in the shop; an instance is one
// physical item with its own condition, hidden fault, owner and (for drives) data and (for
// motherboards) BIOS settings. Every instance lives in state.parts, keyed by uid.

import { PART, CATEGORY } from '../data/catalog.js';
import { clamp } from './util.js';

export const FAULTS = {
  psu: ['dead', 'unstable'],
  ram: ['errors'],
  storage: ['failing', 'dead'],
  gpu: ['artifacts', 'dead'],
  fan: ['dead'],
  cooler: ['dead'],
  motherboard: ['dead'],
  cpu: ['dead'],
  case: [],
  os: [],
};

export const FAULT_LABEL = {
  dead: 'Dead', unstable: 'Unstable output', errors: 'Memory errors', failing: 'Failing (bad sectors)', artifacts: 'Corrupting video (artifacts)',
};

export function defaultBios() {
  return { xmp: false, fan: 'standard', boot: 'auto', volt: 'auto' };
}

export function emptyData() {
  return { os: null, osOk: true, drivers: false, malware: 0, files: [] };
}

export function makePart(state, id, opts = {}) {
  const d = PART[id];
  if (!d) throw new Error(`unknown part ${id}`);
  const uid = `p${state.nextUid++}`;
  const p = { uid, id, cond: opts.cond ?? 100, fault: opts.fault || null, owner: opts.owner || 'shop', cost: opts.cost ?? d.price, used: !!opts.used };
  if (d.cat === 'storage') { p.data = opts.data || emptyData(); p.health = opts.health ?? (p.fault === 'failing' ? 35 : p.fault === 'dead' ? 0 : 100); }
  if (d.cat === 'motherboard') p.bios = { ...defaultBios(), ...(opts.bios || {}) };
  if (d.cat === 'cooler') p.pasteFresh = opts.pasteFresh ?? (!!d.paste && !p.used);
  if (opts.sign) p.sign = true; // a visible clue (scorch mark, bulging capacitor) for visual inspection
  state.parts[uid] = p;
  return p;
}

export const partDef = (state, uid) => (uid && state.parts[uid] ? PART[state.parts[uid].id] : null);
export const part = (state, uid) => (uid ? state.parts[uid] || null : null);

export function partName(state, uid) {
  const p = state.parts[uid];
  return p ? PART[p.id].full : '—';
}

// what the shop would pay you for it
export function resaleValue(state, uid) {
  const p = state.parts[uid];
  if (!p) return 0;
  const d = PART[p.id];
  const base = d.price * CATEGORY[d.cat].resale;
  if (p.fault) return Math.round(base * 0.1);
  return Math.max(1, Math.round(base * clamp(p.cond, 0, 100) / 100));
}

export const shelfSize = id => CATEGORY[PART[id].cat].size;

export function destroyPart(state, uid) {
  delete state.parts[uid];
  state.inventory = state.inventory.filter(u => u !== uid);
}
