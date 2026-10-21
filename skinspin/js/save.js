// Persistence. One JSON object under SAVE_KEY, stamped with SAVE_VERSION. Loading never trusts
// the stored data: every field is checked and anything missing or broken is replaced, and data
// that can't be read at all is copied to a backup key before a fresh save takes its place.

import { SAVE_KEY, SAVE_BACKUP_PREFIX, SAVE_VERSION, STARTING_COINS, ACTIVITY_LIMIT, RECENT_DROPS_LIMIT, MAX_COINS } from './config.js';
import { ITEMS_BY_ID, COLLECTION_BY_ID } from './items.js';
import { CASES_BY_ID } from './cases.js';
import { RARITIES } from './rarities.js';
import { WEAR_BY_ID, wearForFloat } from './wear.js';
import { createPlayer, defaultSettings, emptyStats, emptyMarket } from './playerState.js';
import { UPGRADE, CONTRACT, BATTLE, MARKET } from './config.js';
import { cleanName, updateSettings } from './economy.js';

const ACTIVITY_TYPES = new Set(['open', 'sell', 'refill', 'upgrade', 'contract', 'collection', 'battle', 'market-buy', 'market-sale', 'market-list', 'market-cancel']);
// Where an item came from, besides a case id.
export const SOURCES = new Set(['upgrade', 'contract', 'battle', 'market']);
const validSource = s => (typeof s === 'string' && (CASES_BY_ID[s] || SOURCES.has(s)) ? s : null);

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
const time = (v, fallback) => (Number.isFinite(v) && v > 0 ? v : fallback);

// Earlier save versions are upgraded here, one step at a time. Version 1 is the first.
const MIGRATIONS = {
  // Version 2 (Phase 2) adds collection progress; seed it from everything a v1 save shows was obtained.
  1: data => {
    const seen = [];
    const add = id => { if (typeof id === 'string' && ITEMS_BY_ID[id] && !seen.includes(id)) seen.push(id); };
    for (const i of Array.isArray(data.inventory) ? data.inventory : []) add(i?.itemId);
    for (const d of Array.isArray(data.recentDrops) ? data.recentDrops : []) add(d?.itemId);
    for (const a of Array.isArray(data.activity) ? data.activity : []) if (a?.type === 'open') add(a.itemId);
    add(data.stats?.bestDrop?.itemId);
    return { ...data, collectionLog: seen, version: 2 };
  },
};

export function migrate(data) {
  let d = { ...data };
  let v = Number.isInteger(d.version) ? d.version : 1;
  while (v < SAVE_VERSION && MIGRATIONS[v]) { d = MIGRATIONS[v](d); v += 1; }
  d.version = SAVE_VERSION;
  return d;
}

function cleanWear(item, wear, float) {
  if (!item.hasWear) return { wear: null, float: null, ok: wear == null };
  const tier = WEAR_BY_ID[wear];
  if (tier && Number.isFinite(float) && float >= tier.min && float < tier.max) return { wear, float, ok: true };
  if (Number.isFinite(float) && wearForFloat(float)) return { wear: wearForFloat(float).id, float, ok: false };
  if (tier) return { wear, float: +(((tier.min + tier.max) / 2).toFixed(4)), ok: false };
  return { wear: 'FT', float: 0.25, ok: false };
}

// Returns { player, repaired } where repaired is true if anything had to be fixed or dropped.
export function sanitizePlayer(data, now = Date.now()) {
  const p = createPlayer(now);
  let repaired = false;
  const flag = cond => { if (cond) repaired = true; };
  if (!isObj(data)) return { player: p, repaired: true };

  const name = cleanName(data.name);
  flag(!name); if (name) p.name = name;

  const coins = count(data.coins);
  flag(coins == null); p.coins = coins == null ? STARTING_COINS : Math.min(coins, MAX_COINS);
  const xp = count(data.xp);
  flag(xp == null); p.xp = xp ?? 0;
  p.createdAt = time(data.createdAt, now);

  let maxId = 0;
  const idNum = id => { const n = parseInt(String(id).slice(1), 10); if (Number.isFinite(n)) maxId = Math.max(maxId, n); };

  const seen = new Set();
  const cleanInstance = raw => {
    const item = isObj(raw) && ITEMS_BY_ID[raw.itemId];
    if (!item || typeof raw.uid !== 'string' || !raw.uid || seen.has(raw.uid)) { repaired = true; return null; }
    seen.add(raw.uid);
    idNum(raw.uid);
    const w = cleanWear(item, raw.wear, raw.float);
    flag(!w.ok);
    return {
      uid: raw.uid, itemId: item.id, wear: w.wear, float: w.float,
      acquiredAt: time(raw.acquiredAt, now),
      source: typeof raw.source === 'string' ? raw.source : null,
      locked: raw.locked === true, favorite: raw.favorite === true,
    };
  };
  for (const raw of Array.isArray(data.inventory) ? data.inventory : []) {
    const inst = cleanInstance(raw);
    if (inst) p.inventory.push(inst);
  }
  flag(!Array.isArray(data.inventory));

  for (const raw of Array.isArray(data.recentDrops) ? data.recentDrops : []) {
    const item = isObj(raw) && ITEMS_BY_ID[raw.itemId];
    if (!item) { repaired = true; continue; }
    const w = cleanWear(item, raw.wear, raw.float);
    p.recentDrops.push({ itemId: item.id, wear: w.wear, float: w.float, at: time(raw.at, now), caseId: validSource(raw.caseId) });
    if (p.recentDrops.length >= RECENT_DROPS_LIMIT) break;
  }

  for (const raw of Array.isArray(data.activity) ? data.activity : []) {
    if (!isObj(raw) || !ACTIVITY_TYPES.has(raw.type)) { repaired = true; continue; }
    const e = { ...raw, at: time(raw.at, now), delta: Number.isFinite(raw.delta) ? raw.delta : 0 };
    if (e.itemId != null && !ITEMS_BY_ID[e.itemId]) e.itemId = null;
    if (typeof e.id !== 'string') e.id = `a${0}`; else idNum(e.id);
    p.activity.push(e);
    if (p.activity.length >= ACTIVITY_LIMIT) break;
  }

  if (isObj(data.stats)) {
    const s = emptyStats();
    for (const k of Object.keys(s)) {
      if (k === 'rarityCounts' || k === 'casesById' || k === 'bestDrop') continue;
      const v = count(data.stats[k]); s[k] = v ?? 0;
    }
    for (const r of RARITIES) s.rarityCounts[r.id] = count(data.stats.rarityCounts?.[r.id]) ?? 0;
    if (isObj(data.stats.casesById)) {
      for (const [id, n] of Object.entries(data.stats.casesById)) if (CASES_BY_ID[id] && count(n) != null) s.casesById[id] = count(n);
    }
    const b = data.stats.bestDrop;
    if (isObj(b) && ITEMS_BY_ID[b.itemId] && count(b.value) != null) {
      const w = cleanWear(ITEMS_BY_ID[b.itemId], b.wear, b.float);
      s.bestDrop = { itemId: b.itemId, wear: w.wear, float: w.float, value: count(b.value), at: time(b.at, now), caseId: validSource(b.caseId) };
    }
    p.stats = s;
  } else repaired = true;

  if (isObj(data.settings)) {
    const patch = {};
    for (const [k, v] of Object.entries(data.settings)) if (k in defaultSettings()) patch[k] = v;
    for (const [k, v] of Object.entries(patch)) { if (!updateSettings(p, { [k]: v }).ok) repaired = true; }
  }

  // ---- Phase 2 sections ----
  const drop = raw => {
    const item = isObj(raw) && ITEMS_BY_ID[raw.itemId];
    if (!item) return null;
    const w = cleanWear(item, raw.wear, raw.float);
    return { itemId: item.id, wear: w.wear, float: w.float, value: count(raw.value) ?? 0 };
  };

  for (const id of Array.isArray(data.collectionLog) ? data.collectionLog : []) {
    if (ITEMS_BY_ID[id] && !p.collectionLog.includes(id)) p.collectionLog.push(id);
  }
  if (isObj(data.collectionsClaimed)) {
    for (const [id, at] of Object.entries(data.collectionsClaimed)) if (COLLECTION_BY_ID[id] && Number.isFinite(at)) p.collectionsClaimed[id] = at;
  }

  for (const raw of Array.isArray(data.upgrades) ? data.upgrades.slice(0, UPGRADE.historyLimit) : []) {
    const input = drop(raw?.input), target = drop(raw?.target);
    if (!input || !target || !Number.isFinite(raw.chance) || !Number.isFinite(raw.roll)) { repaired = true; continue; }
    p.upgrades.push({ at: time(raw.at, now), input, target, chance: raw.chance, roll: raw.roll, success: raw.success === true });
  }
  for (const raw of Array.isArray(data.contracts) ? data.contracts.slice(0, CONTRACT.historyLimit) : []) {
    const output = drop(raw?.output);
    const inputs = Array.isArray(raw?.inputs) ? raw.inputs.map(drop).filter(Boolean) : [];
    if (!output || !inputs.length) { repaired = true; continue; }
    p.contracts.push({ at: time(raw.at, now), inputs, output, inputValue: count(raw.inputValue) ?? 0 });
  }
  for (const raw of Array.isArray(data.battles) ? data.battles.slice(0, BATTLE.historyLimit) : []) {
    const cases = Array.isArray(raw?.cases) ? raw.cases : [];
    const parts = Array.isArray(raw?.participants) ? raw.participants : [];
    const okCases = cases.length && cases.every(id => CASES_BY_ID[id]);
    const okParts = parts.length >= 2 && parts.every(x => isObj(x) && typeof x.name === 'string' && Array.isArray(x.drops) && x.drops.length === cases.length && x.drops.every(d => drop(d)));
    if (!okCases || !okParts || typeof raw.id !== 'string' || !Number.isInteger(raw.winner) || !parts[raw.winner]) { repaired = true; continue; }
    idNum(raw.id);
    p.battles.push({
      id: raw.id, at: time(raw.at, now), cases: [...cases], cost: count(raw.cost) ?? 0, tieBreak: raw.tieBreak === true, winner: raw.winner,
      participants: parts.map(x => ({ name: x.name.slice(0, 24), isPlayer: x.isPlayer === true, drops: x.drops.map(drop), total: count(x.total) ?? 0 })),
      awarded: Array.isArray(raw.awarded) ? raw.awarded.filter(u => typeof u === 'string') : [],
    });
  }

  if (isObj(data.market)) {
    const m = emptyMarket();
    const ids = new Set();
    for (const raw of Array.isArray(data.market.npc) ? data.market.npc.slice(0, MARKET.maxNpcListings) : []) {
      const d = drop(raw);
      const price = count(raw?.price);
      if (!d || !price || typeof raw.id !== 'string' || ids.has(raw.id)) { repaired = true; continue; }
      ids.add(raw.id); idNum(raw.id);
      m.npc.push({ id: raw.id, itemId: d.itemId, wear: d.wear, float: d.float, price, seller: String(raw.seller || 'NPC').slice(0, 24), listedAt: time(raw.listedAt, now), featured: raw.featured === true });
    }
    for (const raw of Array.isArray(data.market.mine) ? data.market.mine.slice(0, MARKET.maxPlayerListings) : []) {
      const inst = isObj(raw) ? cleanInstance(raw.item) : null;
      const price = count(raw?.price);
      if (!inst || !price || typeof raw.id !== 'string' || ids.has(raw.id)) {
        // An escrowed item must never vanish: if the listing is broken, hand the item back.
        if (inst) p.inventory.push({ ...inst, locked: false });
        repaired = true; continue;
      }
      ids.add(raw.id); idNum(raw.id);
      m.mine.push({ id: raw.id, price, listedAt: time(raw.listedAt, now), item: { ...inst, locked: false } });
    }
    m.lastTick = Number.isFinite(data.market.lastTick) && data.market.lastTick > 0 ? data.market.lastTick : 0;
    m.lastListing = Number.isFinite(data.market.lastListing) && data.market.lastListing > 0 ? data.market.lastListing : 0;
    p.market = m;
  }

  // Everything held counts as collected.
  for (const inst of [...p.inventory, ...p.market.mine.map(l => l.item)]) if (!p.collectionLog.includes(inst.itemId)) p.collectionLog.push(inst.itemId);

  const nextId = count(data.nextId);
  p.nextId = Math.max(nextId ?? 1, maxId + 1);
  // Activity entries without a usable id get fresh ones.
  for (const e of p.activity) if (e.id === 'a0') { e.id = `a${p.nextId}`; p.nextId += 1; }
  return { player: p, repaired };
}

function backup(storage, raw, now) {
  try { storage.setItem(`${SAVE_BACKUP_PREFIX}${now}`, raw); return `${SAVE_BACKUP_PREFIX}${now}`; } catch { return null; }
}

// status: 'new' | 'loaded' | 'repaired' | 'corrupt' | 'newer' | 'unavailable'
export function loadSave(storage, now = Date.now()) {
  let raw;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { player: createPlayer(now), status: 'unavailable' }; }
  if (raw == null) return { player: createPlayer(now), status: 'new' };

  let data;
  try { data = JSON.parse(raw); } catch { data = undefined; }
  if (!isObj(data)) return { player: createPlayer(now), status: 'corrupt', backupKey: backup(storage, raw, now) };

  if (Number.isInteger(data.version) && data.version > SAVE_VERSION) {
    // Written by a newer SkinSpin: keep the original safe, then load what we understand.
    const backupKey = backup(storage, raw, now);
    return { player: sanitizePlayer(data, now).player, status: 'newer', backupKey };
  }
  const { player, repaired } = sanitizePlayer(migrate(data), now);
  return { player, status: repaired ? 'repaired' : 'loaded' };
}

export function savePlayer(storage, player) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...player, version: SAVE_VERSION }));
    return true;
  } catch {
    return false;
  }
}
