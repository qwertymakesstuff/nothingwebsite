// Tiny ring-buffer log used by ?debug=1 so behaviour on a real phone (lock screen, backgrounding,
// media keys) can be inspected and copied without dev tools. Does nothing when disabled.

export function createDebugLog({ enabled = false, max = 300, now = () => Date.now() } = {}) {
  const entries = [];
  const subs = new Set();
  const t0 = now();

  function log(...parts) {
    if (!enabled) return;
    const text = parts.map((p) => (typeof p === 'string' ? p : safeJson(p))).join(' ');
    const entry = { t: ((now() - t0) / 1000).toFixed(1), text };
    entries.push(entry);
    if (entries.length > max) entries.shift();
    try { console.debug('[mm]', entry.t, text); } catch { /* ignore */ }
    subs.forEach((fn) => fn(entry));
  }

  return {
    enabled,
    log,
    entries: () => entries.slice(),
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    dump: () => entries.map((e) => `${e.t}s ${e.text}`).join('\n'),
  };
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}
