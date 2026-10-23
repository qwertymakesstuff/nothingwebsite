export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const round = (v, d = 0) => { const m = 10 ** d; return Math.round(v * m) / m; };
export const money = v => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
export const clock = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const gbLabel = gb => (gb >= 1000 ? `${round(gb / 1000, 1)} TB` : `${gb} GB`);
