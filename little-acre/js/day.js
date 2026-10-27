// The night between two days: sell what was shipped, grow crops, respawn the wild, roll the
// weather, post a new bulletin request and wake up at 6:00. Returns a summary for the
// end-of-day screen.

import { CLOCK, PLAYER, RAIN_CHANCE, CAN_CAPACITY } from './config.js';
import { MAPS } from './data/maps.js';
import { dayIndex, nextDate } from './calendar.js';
import { settleShipping } from './economy.js';
import { growNight } from './farming.js';
import { creepFarm, spawnDailyStuff } from './spawns.js';
import { postRequest, expireRequests } from './quests.js';
import { centerOf } from './world.js';
import { rngFor } from './rng.js';

export const SAPLING_DAYS = 7;

export function rollWeather(state, date) {
  const rng = rngFor(state.seed, 'weather', dayIndex(date));
  if (date.day === 1 && date.season === 0 && date.year === 1) return 'sun';
  return rng() < RAIN_CHANCE[date.season] ? (date.season === 3 ? 'snow' : 'rain') : 'sun';
}

export function endDay(state, { passedOut = false } = {}) {
  const summary = { date: { ...state.date }, shipped: [], total: 0, penalty: 0, grew: 0, withered: 0, eaten: [], newSeason: false, expired: [] };

  summary.shipped = settleShipping(state);
  summary.total = summary.shipped.reduce((t, r) => t + r.value, 0);
  state.stats.biggestDay = Math.max(state.stats.biggestDay, summary.total);

  if (passedOut) {
    summary.penalty = Math.min(PLAYER.passOutPenaltyCap, Math.floor(state.player.money * PLAYER.passOutPenalty));
    state.player.money -= summary.penalty;
  }

  // the calendar turns over
  const next = nextDate(state.date);
  summary.newSeason = next.season !== state.date.season;
  const idx = dayIndex({ ...next });
  state.weather.today = state.weather.tomorrow;
  state.weather.tomorrow = rollWeather(state, nextDate(next));
  const rng = rngFor(state.seed, 'night', idx);

  for (const id of Object.keys(MAPS)) {
    if (!Object.keys(state.maps[id].soil).length) continue;
    const r = growNight(state, id, next.season, state.weather.today === 'rain', rng);
    summary.grew += r.grew; summary.withered += r.withered; summary.eaten.push(...r.eaten);
  }

  // saplings grow into trees
  for (const m of Object.values(state.maps)) for (const [k, o] of Object.entries(m.objects)) {
    if (o.t === 'sapling' && ++o.age >= SAPLING_DAYS) m.objects[k] = { t: 'tree', hp: null };
  }

  state.date = { ...next, minutes: CLOCK.dayStart };
  creepFarm(state, rng);
  spawnDailyStuff(state, rng);
  summary.expired = expireRequests(state);
  postRequest(state);

  state.stats.days += 1;
  state.player.energy = passedOut ? Math.ceil(state.player.maxEnergy / 2) : state.player.maxEnergy;
  state.player.water = CAN_CAPACITY[state.tools.can || 0];
  // wake up next to the bed
  const [px, py] = centerOf(3, 3);
  Object.assign(state.player, { map: 'house', x: px, y: py, dir: 'down' });
  return summary;
}

