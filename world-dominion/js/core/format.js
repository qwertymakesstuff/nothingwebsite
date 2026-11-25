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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const START = Date.UTC(2026, 0, 1);
export function dateOf(day) { return new Date(START + day * 86400000); }
export function dateLabel(day) { const d = dateOf(day); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
export function monthLabel(day) { const d = dateOf(day); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
