import { safeStorage } from './safeStorage.js';

const KEY = 'mm:v1:prefs';

/** Small user preferences (currently: show the YouTube video instead of the cover art). */
export function createPrefs(storage = safeStorage()) {
  const read = () => {
    try {
      const raw = JSON.parse(storage.getItem(KEY));
      return { videoVisible: raw?.videoVisible === true };
    } catch {
      return { videoVisible: false };
    }
  };
  return {
    get: read,
    set(patch) {
      const next = { ...read(), ...patch };
      try { storage.setItem(KEY, JSON.stringify({ videoVisible: next.videoVisible === true })); } catch { /* ignore */ }
      return { videoVisible: next.videoVisible === true };
    },
  };
}
