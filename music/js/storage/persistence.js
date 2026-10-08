// Saves and restores player state. Never throws: private mode, full quota or
// corrupt data all fall back to a clean default.

import * as Q from '../player/queueManager.js';

const KEY = 'mm:v1:player';
const VERSION = 1;
const MAX_ITEMS = 500;

function safeStorage() {
  try {
    const s = window.localStorage;
    const probe = '__mm_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); },
    };
  }
}

function cleanTrack(t) {
  if (!t || typeof t.id !== 'string' || !t.id || typeof t.title !== 'string') return null;
  return {
    id: t.id,
    title: t.title,
    artist: typeof t.artist === 'string' ? t.artist : '',
    artwork: typeof t.artwork === 'string' ? t.artwork : null,
    duration: Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 0,
    ...(t.unavailable ? { unavailable: true } : {}),
  };
}

export function toSnapshot(s) {
  return {
    v: VERSION,
    volume: s.volume, muted: s.muted, shuffle: s.shuffle, repeat: s.repeat,
    position: s.position,
    queue: s.queue,
  };
}

/** Validate untrusted saved data. Returns a safe snapshot, or null if unusable. */
export function fromSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== VERSION) return null;
  const items = Array.isArray(raw.queue?.items)
    ? raw.queue.items.slice(0, MAX_ITEMS).map(cleanTrack).filter(Boolean)
    : [];
  const n = items.length;
  const shuffle = raw.shuffle === true;

  let queue = Q.emptyQueue();
  if (n) {
    const order = raw.queue.order;
    const validOrder = Array.isArray(order) && order.length === n
      && [...order].sort((a, b) => a - b).every((v, i) => v === i);
    const pos = Number.isInteger(raw.queue.pos) ? raw.queue.pos : 0;
    queue = validOrder && pos >= 0 && pos < n
      ? { items, order: [...order], pos }
      : Q.setItems(items, 0, { shuffle });
  }
  const current = Q.currentItem(queue);

  return {
    volume: Number.isFinite(raw.volume) ? Math.min(1, Math.max(0, raw.volume)) : 0.8,
    muted: raw.muted === true,
    shuffle,
    repeat: ['off', 'all', 'one'].includes(raw.repeat) ? raw.repeat : 'off',
    position: current && Number.isFinite(raw.position) && raw.position >= 0
      ? Math.min(raw.position, current.duration || raw.position) : 0,
    queue,
  };
}

export function createPersistence(storage = safeStorage()) {
  return {
    save(state) {
      try { storage.setItem(KEY, JSON.stringify(toSnapshot(state))); } catch { /* quota / unavailable */ }
    },
    load() {
      try {
        const raw = storage.getItem(KEY);
        return raw ? fromSnapshot(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    clear() {
      try { storage.removeItem(KEY); } catch { /* ignore */ }
    },
  };
}
