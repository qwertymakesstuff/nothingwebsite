// Dates and the clock. A year is 4 seasons of 28 days; the clock runs in minutes since midnight
// of the current day and can pass 24:00 (up to 26:00, when you pass out).

import { CLOCK } from './config.js';

const DAYS_PER_YEAR = CLOCK.daysPerSeason * 4;

export const dayIndex = d => (d.year - 1) * DAYS_PER_YEAR + d.season * CLOCK.daysPerSeason + (d.day - 1);
export const weekday = d => CLOCK.weekdays[dayIndex(d) % 7];
export const weekdayOf = (season, day) => CLOCK.weekdays[(season * CLOCK.daysPerSeason + day - 1) % 7];
export const absMinutes = d => dayIndex(d) * 1440 + d.minutes;
export const seasonName = s => CLOCK.seasons[s];
export const seasonTitle = s => CLOCK.seasons[s][0].toUpperCase() + CLOCK.seasons[s].slice(1);

export function nextDate(d) {
  let { day, season, year } = d;
  day += 1;
  if (day > CLOCK.daysPerSeason) { day = 1; season += 1; }
  if (season > 3) { season = 0; year += 1; }
  return { day, season, year };
}

export function dateFromIndex(i) {
  const year = Math.floor(i / DAYS_PER_YEAR) + 1;
  const r = i % DAYS_PER_YEAR;
  return { year, season: Math.floor(r / CLOCK.daysPerSeason), day: (r % CLOCK.daysPerSeason) + 1 };
}

// "6:00 am" / "12:40 pm" / "1:10 am", shown in 10-minute steps like a farm clock.
export function formatClock(minutes) {
  const m = Math.floor(minutes / 10) * 10;
  const h24 = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 < 12 ? 'am' : 'pm'}`;
}

export const parseTime = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
export const formatDate = d => `${seasonTitle(d.season)} ${d.day}, Year ${d.year}`;
