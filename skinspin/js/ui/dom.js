// Small DOM and formatting helpers shared by every view.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmt = n => Math.round(n).toLocaleString('en-US');

export function fmtPct(fraction) {
  const v = fraction * 100;
  if (v >= 1) return `${+v.toFixed(2)}%`;
  return `${+v.toFixed(3)}%`;
}

export function timeAgo(at, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(at).toLocaleDateString();
}

export const dateTime = at => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const prefersReducedMotion = () => document.body.classList.contains('reduce-motion');
