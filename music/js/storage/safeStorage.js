// localStorage that never throws: private mode, blocked storage or a full quota
// fall back to an in-memory store for the session.
export function safeStorage() {
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
