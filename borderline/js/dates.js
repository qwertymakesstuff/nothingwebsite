// Calendar helpers. Dates are stored as ISO strings ('1982-03-12') and compared as text.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parts = iso => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
};

// '12.03.1982', the style printed on documents
export function formatDoc(iso) {
  const p = parts(iso);
  return p ? `${String(p.d).padStart(2, '0')}.${String(p.m).padStart(2, '0')}.${p.y}` : '—';
}

// '12 March 1982', the style used on the desk and in bulletins
export function formatLong(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '—';
}

export const isValidDate = iso => {
  const p = parts(iso);
  if (!p || p.m < 1 || p.m > 12 || p.d < 1) return false;
  return p.d <= new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
};

const toUTC = iso => { const p = parts(iso); return p ? Date.UTC(p.y, p.m - 1, p.d) : NaN; };
const fromUTC = ms => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso, n) => fromUTC(toUTC(iso) + n * 86400000);
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

// whole years from `dob` to `on`
export function ageOn(dob, on) {
  const a = parts(dob), b = parts(on);
  if (!a || !b) return NaN;
  return b.y - a.y - (b.m < a.m || (b.m === a.m && b.d < a.d) ? 1 : 0);
}
