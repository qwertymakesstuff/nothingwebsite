// localStorage wrapper. Storage can be missing or throw (private mode, blocked site data, quota),
// so every access is guarded and the game keeps running in memory if saving fails.

export const KEYS = {
  progress: 'elemental.progress.v1',
  workspace: 'elemental.workspace.v1',
  settings: 'elemental.settings.v1',
};

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function read(key) {
  try { return store()?.getItem(key) ?? null; } catch { return null; }
}

export function write(key, value) {
  try { const s = store(); if (!s) return false; s.setItem(key, value); return true; } catch { return false; }
}

export function remove(key) {
  try { store()?.removeItem(key); } catch { /* ignore */ }
}
