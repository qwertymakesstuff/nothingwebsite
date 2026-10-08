import { safeStorage } from './safeStorage.js';

const KEY = 'mm:v1:recent-searches';
const MAX = 10;

/** Remembers the last few search terms (free to re-run from cache; saves API quota). */
export function createRecentSearches(storage = safeStorage()) {
  const read = () => {
    try {
      const raw = JSON.parse(storage.getItem(KEY));
      return Array.isArray(raw) ? raw.filter((q) => typeof q === 'string' && q.trim()).slice(0, MAX) : [];
    } catch {
      return [];
    }
  };
  const write = (list) => { try { storage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();

  return {
    list: read,
    add(query) {
      const q = String(query ?? '').replace(/\s+/g, ' ').trim();
      if (!q) return read();
      const list = [q, ...read().filter((x) => !same(x, q))].slice(0, MAX);
      write(list);
      return list;
    },
    remove(query) {
      const list = read().filter((x) => !same(x, query));
      write(list);
      return list;
    },
    clear() { write([]); },
  };
}
