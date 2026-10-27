// The backpack: a fixed array of slots ({ id, n } or null). Only the first `player.backpack`
// slots are usable; the first PLAYER.hotbar of those are the hotbar. Every operation either
// fully succeeds or changes nothing.

import { PLAYER } from './config.js';
import { ITEMS_BY_ID, matches } from './data/items.js';

const maxStack = id => (ITEMS_BY_ID[id]?.tool ? 1 : PLAYER.stack);
const size = state => state.player.backpack;

export function count(state, token) {
  let n = 0;
  for (let i = 0; i < size(state); i++) { const s = state.inventory[i]; if (s && matches(s.id, token)) n += s.n; }
  return n;
}
export const has = (state, token, n = 1) => count(state, token) >= n;

// How many of `id` would fit right now.
export function room(state, id) {
  let r = 0;
  const cap = maxStack(id);
  for (let i = 0; i < size(state); i++) {
    const s = state.inventory[i];
    if (!s) r += cap; else if (s.id === id) r += cap - s.n;
  }
  return r;
}

// Adds as many as fit (topping up existing stacks first). Returns how many did NOT fit.
export function add(state, id, n = 1) {
  if (!ITEMS_BY_ID[id] || n <= 0) return n;
  const cap = maxStack(id);
  let left = n;
  for (let i = 0; i < size(state) && left; i++) {
    const s = state.inventory[i];
    if (s && s.id === id && s.n < cap) { const k = Math.min(cap - s.n, left); s.n += k; left -= k; }
  }
  for (let i = 0; i < size(state) && left; i++) {
    if (!state.inventory[i]) { const k = Math.min(cap, left); state.inventory[i] = { id, n: k }; left -= k; }
  }
  return left;
}
export const canAdd = (state, id, n = 1) => room(state, id) >= n;

// Adds a whole batch only if every item fits. `items` = [[id, n], ...].
export function addAll(state, items) {
  const need = {};
  for (const [id, n] of items) need[id] = (need[id] || 0) + n;
  // simulate on a copy so a partial fit changes nothing
  const copy = { player: state.player, inventory: state.inventory.map(s => (s ? { ...s } : null)) };
  for (const [id, n] of Object.entries(need)) if (add(copy, id, n)) return false;
  state.inventory = copy.inventory;
  return true;
}

// Removes `n` items matching `token` (id, tag: or cat:). All or nothing. Takes from the last
// stacks first so the hotbar keeps its items as long as possible.
export function remove(state, token, n = 1) {
  if (count(state, token) < n) return false;
  let left = n;
  for (let i = size(state) - 1; i >= 0 && left; i--) {
    const s = state.inventory[i];
    if (s && matches(s.id, token)) {
      const k = Math.min(s.n, left); s.n -= k; left -= k;
      if (!s.n) state.inventory[i] = null;
    }
  }
  return true;
}

// Removes a whole recipe's worth: { token: n }. All or nothing. Returns the ids actually used.
export function removeAll(state, need) {
  for (const [t, n] of Object.entries(need)) if (count(state, t) < n) return null;
  const used = [];
  for (const [t, n] of Object.entries(need)) {
    let left = n;
    for (let i = size(state) - 1; i >= 0 && left; i--) {
      const s = state.inventory[i];
      if (s && matches(s.id, t)) { const k = Math.min(s.n, left); s.n -= k; left -= k; used.push([s.id, k]); if (!s.n) state.inventory[i] = null; }
    }
  }
  return used;
}

export function removeAt(state, slot, n = 1) {
  const s = state.inventory[slot];
  if (!s || s.n < n) return null;
  s.n -= n;
  const id = s.id;
  if (!s.n) state.inventory[slot] = null;
  return id;
}

// Move / merge / swap two slots (the inventory screen's click-to-move).
export function moveSlot(state, from, to) {
  if (from === to || from >= size(state) || to >= size(state)) return false;
  const a = state.inventory[from], b = state.inventory[to];
  if (!a) return false;
  if (b && b.id === a.id && maxStack(a.id) > 1) {
    const k = Math.min(maxStack(a.id) - b.n, a.n);
    b.n += k; a.n -= k;
    if (!a.n) state.inventory[from] = null;
    return true;
  }
  state.inventory[from] = b; state.inventory[to] = a;
  return true;
}

const ORDER = ['tool', 'seed', 'crop', 'forage', 'fish', 'artisan', 'food', 'ingredient', 'farming', 'fishing', 'resource', 'crafted', 'decor'];
// Sort everything after the hotbar; tools and the hotbar stay where you put them.
export function sortBackpack(state) {
  const start = PLAYER.hotbar;
  const items = state.inventory.slice(start, size(state)).filter(Boolean);
  const merged = [];
  for (const s of items) {
    const m = merged.find(x => x.id === s.id && x.n < maxStack(s.id));
    if (m) { const k = Math.min(maxStack(s.id) - m.n, s.n); m.n += k; if (s.n - k) merged.push({ id: s.id, n: s.n - k }); }
    else merged.push({ ...s });
  }
  merged.sort((a, b) => ORDER.indexOf(ITEMS_BY_ID[a.id].cat) - ORDER.indexOf(ITEMS_BY_ID[b.id].cat) || ITEMS_BY_ID[a.id].name.localeCompare(ITEMS_BY_ID[b.id].name));
  for (let i = start; i < size(state); i++) state.inventory[i] = merged[i - start] || null;
}

export const selected = state => state.inventory[state.player.slot] || null;
