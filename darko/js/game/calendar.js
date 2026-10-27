// The story calendar. Every date in the game is a day of October 1988, kept as a day number;
// times are minutes after midnight. The 28-day timeline itself is built on top of this in Stage 2.

export const YEAR = 1988, MONTH = 9; // October (zero-based, as Date expects)
export const START_DAY = 2, START_TIME = 17 * 60 + 40;

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const weekday = day => new Date(YEAR, MONTH, day).getDay();

export const formatDate = day => `${DOW[weekday(day)]} OCT ${day} 1988`;
export const formatLongDate = day => `${DOW_LONG[weekday(day)]}, October ${day}, 1988`;

export function formatTime(min) {
  const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "18:30" -> 1110
export function parseTime(s) {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
}

// broad time of day, which drives lighting and ambience
export function phase(min) {
  if (min < 6 * 60) return 'night';
  if (min < 17 * 60) return 'day';
  if (min < 18 * 60 + 45) return 'dusk';
  return 'night';
}
