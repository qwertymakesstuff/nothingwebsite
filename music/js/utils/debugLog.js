// Tiny ring-buffer log used by ?debug=1 so behaviour on a real phone (lock screen, backgrounding,
// media keys) can be inspected and copied without dev tools. Does nothing when disabled.

const KEEP = 120;          // entries kept across a page reload
const KEY = 'mm:debug:last';

export function createDebugLog({ enabled = false, max = 300, now = () => Date.now(), storage = globalThis.localStorage } = {}) {
  const entries = [];
  // The log is also written to storage on every entry, synchronously, so if the tab freezes and has to be
  // restarted, the next load can still show what happened right before the freeze.
  let previous = '';
  if (enabled) { try { previous = storage?.getItem(KEY) || ''; } catch { /* storage unavailable */ } }
  const persist = () => {
    try { storage?.setItem(KEY, entries.slice(-KEEP).map((e) => `${e.t}s ${e.text}`).join('\n')); } catch { /* full or blocked */ }
  };
  const subs = new Set();
  const t0 = now();

  function log(...parts) {
    if (!enabled) return;
    const text = parts.map((p) => (typeof p === 'string' ? p : safeJson(p))).join(' ');
    const entry = { t: ((now() - t0) / 1000).toFixed(1), text };
    entries.push(entry);
    if (entries.length > max) entries.shift();
    try { console.debug('[mm]', entry.t, text); } catch { /* ignore */ }
    persist();
    subs.forEach((fn) => fn(entry));
  }

  return {
    enabled,
    log,
    entries: () => entries.slice(),
    previous: () => previous,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    dump: () => (previous ? `--- previous page load (last entries) ---\n${previous}\n--- this page load ---\n` : '') + entries.map((e) => `${e.t}s ${e.text}`).join('\n'),
  };
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}
