// Persistence. Settings, statistics and each game's progress live under their own localStorage
// key, so a corrupt entry can never take the others with it. Falls back to memory when
// localStorage is unavailable (private windows, blocked site data, tests).

export const KEYS = {
  settings: 'checkmate.settings.v1',
  stats: 'checkmate.stats.v1',
  progress: id => `checkmate.progress.${id}.v1`,
};

export function memoryStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m,
  };
}

export class Store {
  constructor(storage) {
    if (storage === undefined) {
      try {
        storage = globalThis.localStorage;
        const probe = '__checkmate_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
      } catch { storage = null; }
    }
    this.storage = storage || memoryStorage();
    this.persistent = !!storage;
  }

  read(key) {
    try {
      const raw = this.storage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch { return null; }
  }

  write(key, value) {
    try { this.storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  remove(key) {
    try { this.storage.removeItem(key); } catch { /* ignore */ }
  }
}
