const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT = MONTHS.map(m => m.slice(0, 3));
export const toMs = d => typeof d === 'number' ? d : Date.parse(d.length <= 10 ? d + 'T12:00:00Z' : d);
export function ago(date, now) {
  const s = Math.max(0, (now - toMs(date)) / 1000);
  const u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [n, w] of u) if (s >= n) { const v = Math.floor(s / n); return `${v} ${w}${v > 1 ? 's' : ''} ago`; }
  return 'just now';
}
export function longDate(date) { const d = new Date(toMs(date)); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; }
export function shortDate(date) { const d = new Date(toMs(date)); return `${SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; }
export function numDate(date) { const d = new Date(toMs(date)); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`; }
export function clock(ms, h24) {
  const d = new Date(ms); let h = d.getUTCHours(); const m = String(d.getUTCMinutes()).padStart(2, '0');
  if (h24) return `${String(h).padStart(2, '0')}:${m}`;
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ap}`;
}
export const monthName = i => MONTHS[i];
export function dur(sec) { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }
export function parseDur(s) { const p = String(s).split(':').map(Number); return p.reduce((a, b) => a * 60 + b, 0); }
export function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }
export function compact(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(n);
}
