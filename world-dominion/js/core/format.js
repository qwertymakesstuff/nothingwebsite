// Number formatting. Money is stored in US$ billions.
export function money(bn, { sign = false } = {}) {
  const s = sign && bn > 0 ? '+' : bn < 0 ? '−' : '';
  const a = Math.abs(bn);
  let v;
  if (a >= 1000) v = (a / 1000).toFixed(a >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + 'T';
  else if (a >= 1) v = (a >= 100 ? Math.round(a) : a.toFixed(1).replace(/\.0$/, '')) + 'B';
  else v = Math.round(a * 1000) + 'M';
  return s + '$' + v;
}
export function people(millions) {
  if (millions >= 1000) return (millions / 1000).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (millions >= 1) return (millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')) + 'M';
  return Math.round(millions * 1000) + 'K';
}
export function troops(thousands) {
  if (thousands >= 1000) return (thousands / 1000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (thousands >= 1) return Math.round(thousands) + 'K';
  return thousands > 0 ? Math.round(thousands * 1000).toString() : 'None';
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const START_YEAR = 2026;
// The calendar counts whole months: month 0 is January 2026.
export const yearOf = (m) => START_YEAR + Math.floor(m / 12);
export const monthOf = (m) => ((m % 12) + 12) % 12;
export function monthLabel(m) { return `${MONTHS[monthOf(m)]} ${yearOf(m)}`; }           // "March 2026"
export function monthShort(m) { return `${MONTHS[monthOf(m)].slice(0, 3)} ${yearOf(m)}`; } // "Mar 2026"
export function pct(x, { sign = false, digits = 1 } = {}) {                               // 0.021 -> "+2.1%"
  const v = (x * 100).toFixed(digits).replace(/\.0+$/, '');
  return (sign && x > 0 ? '+' : x < 0 ? '−' : '') + v.replace('-', '') + '%';
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
