export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Stable hue (0-359) from a string, used to colour placeholder artwork.
export function hueFrom(str) {
  const s = String(str ?? '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash % 360;
}

/** 1234 -> "1.2K", 2500000 -> "2.5M". Used for subscriber counts. */
export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return '';
  const trim = (v) => String(v).replace(/\.0$/, '');
  if (n < 1000) return String(Math.floor(n));
  if (n < 1e4) return `${trim((n / 1e3).toFixed(1))}K`;
  if (n < 1e6) return `${Math.floor(n / 1e3)}K`;
  if (n < 1e7) return `${trim((n / 1e6).toFixed(1))}M`;
  if (n < 1e9) return `${Math.floor(n / 1e6)}M`;
  return `${trim((n / 1e9).toFixed(1))}B`;
}

/** Total length for a list, in words: "42 min" or "2 hr 5 min". */
export function formatDuration(seconds) {
  const mins = Math.max(1, Math.round((Number.isFinite(seconds) ? seconds : 0) / 60));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ''}`;
}
