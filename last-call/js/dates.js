// Calendar maths on ISO date strings (YYYY-MM-DD), all in UTC so results never depend on the
// player's time zone. Game clocks are minutes after 18:00, so a shift that crosses midnight is
// still a simple increasing number (22:00 = 240, 01:30 = 450).

const DAY = 86400000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = n => String(n).padStart(2, '0');

export const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const split = s => s.split('-').map(Number);
export const parse = s => { const [y, m, d] = split(s); return Date.UTC(y, m - 1, d); };
export const iso = ms => new Date(ms).toISOString().slice(0, 10);
export const addDays = (s, n) => iso(parse(s) + n * DAY);
export function addYears(s, n) {
  const [y, m, d] = split(s);
  const ny = y + n;
  const dd = m === 2 && d === 29 && !isLeap(ny) ? 28 : d;
  return `${ny}-${pad(m)}-${pad(dd)}`;
}
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
export const isValidIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s;

// Whole years old on `date`.
export function ageOn(dob, date) {
  const [by, bm, bd] = split(dob);
  const [y, m, d] = split(date);
  let a = y - by;
  if (m < bm || (m === bm && d < bd)) a -= 1;
  return a;
}

// A birth date that makes someone exactly `age` on `date`, with their birthday `offset` days away
// (0 = today, positive = still to come, negative = already passed). Never returns 29 February.
export function dobFor(date, age, offset = -100) {
  const target = addDays(date, offset);
  let dob = addYears(target, offset > 0 ? -(age + 1) : -age);
  if (dob.endsWith('-02-29')) dob = addDays(dob, offset > 0 ? -1 : 1);
  return dob;
}

// The latest birth date allowed for someone to be at least `min` on `date`.
export const bornOnOrBefore = (date, min) => addYears(date, -min);

export const isBirthday = (dob, date) => dob.slice(5) === date.slice(5);

export function fmtDoc(s) { const [y, m, d] = split(s); return `${pad(d)} ${MONTHS[m - 1]} ${y}`; }
export function fmtLong(s) {
  const [y, m, d] = split(s);
  return `${DAYS[new Date(parse(s)).getUTCDay()]} ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}
export function fmtShort(s) { const [, m, d] = split(s); return `${d} ${MONTHS_LONG[m - 1].slice(0, 3)}`; }

export function toClock(min) {
  const total = Math.floor(min) + 18 * 60;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}
export function fromClock(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = h < 12 ? h + 24 : h;
  return (hh - 18) * 60 + m;
}
