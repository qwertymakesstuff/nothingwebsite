// Number formatting for prices, money and percentages.

const nf = (min, max) => new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
const F2 = nf(2, 2), F0 = nf(0, 0);

export function price(p) {
  if (!Number.isFinite(p)) return '—';
  if (p >= 1) return F2.format(p);
  if (p >= 0.01) return p.toFixed(4);
  if (p <= 0) return '0.00';
  return p >= 1e-6 ? p.toPrecision(3) : p.toExponential(2);
}

export function money(x, { sign = false, compact = false } = {}) {
  if (!Number.isFinite(x)) return '—';
  const s = x < 0 ? '-' : sign && x > 0 ? '+' : '';
  const v = Math.abs(x);
  if (compact && v >= 1e6) return `${s}$${compactNum(v)}`;
  if (v >= 1e15) return `${s}$${v.toExponential(2)}`;
  return `${s}$${F2.format(v)}`;
}

export function compactNum(v) {
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [n, u] of units) if (v >= n) return (v / n >= 100 ? F0 : F2).format(v / n) + u;
  return F2.format(v);
}

export function pct(x, digits = 2) {
  if (!Number.isFinite(x)) return '—';
  const s = x > 0 ? '+' : x < 0 ? '−' : '';
  const v = Math.abs(x);
  return `${s}${v >= 10000 ? compactNum(v) : v.toFixed(v >= 1000 ? 0 : digits)}%`;
}

export function qty(q) {
  if (!Number.isFinite(q)) return '—';
  if (q >= 1e6) return compactNum(q);
  if (q >= 100) return F2.format(q);
  if (q >= 1) return q.toFixed(4);
  return q.toPrecision(4);
}

export function clock(ticks) {
  ticks = Math.max(0, Math.round(ticks));
  const m = Math.floor(ticks / 60), s = ticks % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const tone = x => (x > 0 ? 'up' : x < 0 ? 'down' : 'flat');

// "1,000", "$250.50", "2k", "1.5m" → number (NaN if it isn't one)
export function parseAmount(s) {
  s = String(s || '').trim().toLowerCase().replace(/[$,\s]/g, '');
  const m = s.match(/^(\d*\.?\d*)([km]?)$/);
  if (!m || !m[1] || m[1] === '.') return NaN;
  return Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1);
}
