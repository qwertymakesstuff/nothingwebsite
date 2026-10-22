// Villagers: picking today's schedule, where they should be at a given minute, friendship,
// conversation lines and gift reactions. Movement along paths lives in the game controller;
// everything here is pure.

import { NPCS, NPCS_BY_ID } from './data/npcs.js';
import { DIALOGUE } from './data/dialogue.js';
import { FESTIVAL_AT } from './data/events.js';
import { FRIENDSHIP } from './config.js';
import { matches, ITEMS_BY_ID } from './data/items.js';
import { dayIndex, weekday, parseTime } from './calendar.js';
import { hearts } from './conditions.js';
import { rngFor, pick } from './rng.js';

const toEntry = ([t, map, x, y, dir = 'down', hidden = false]) => ({ t: parseTime(t), map, x, y, dir, hidden: !!hidden });

// Today's schedule as a list of entries sorted by time.
export function scheduleFor(state, npcId) {
  const def = NPCS_BY_ID[npcId];
  const fest = FESTIVAL_AT(state.date.season, state.date.day);
  const base = (def.schedule[weekday(state.date)] || (state.weather.today === 'rain' && def.schedule.rain) || def.schedule.default).map(toEntry);
  if (fest && fest.spots[npcId] && !state.festivals[festKey(state, fest)]) {
    // gather for the festival, then head home once it is over
    const [x, y] = fest.spots[npcId];
    const home = base[base.length - 1];
    return [...base.filter(e => e.t < fest.from), { t: fest.from, map: fest.map, x, y, dir: 'down', hidden: false }, { ...home, t: fest.to }];
  }
  return base;
}

export const festKey = (state, fest) => `${fest.id}-${state.date.year}`;

export function entryAt(schedule, minutes) {
  let cur = schedule[0];
  for (const e of schedule) if (e.t <= minutes) cur = e;
  return cur;
}

export const entryIndexAt = (schedule, minutes) => {
  let i = 0;
  schedule.forEach((e, k) => { if (e.t <= minutes) i = k; });
  return i;
};

export const friendship = (state, npcId) => state.npcs[npcId];
export { hearts };

export function isBirthday(state, npcId) {
  const b = NPCS_BY_ID[npcId].birthday;
  return b.season === state.date.season && b.day === state.date.day;
}

const fill = (state, text) => text.replace(/\{name\}/g, state.player.name).replace(/\{farm\}/g, state.player.farm).replace(/\{kin\}/g, 'favourite relative');

// Today's line for a villager (stable for the whole day).
export function dailyLine(state, npcId) {
  const d = DIALOGUE[npcId];
  const season = ['spring', 'summer', 'fall', 'winter'][state.date.season];
  const h = hearts(state, npcId);
  let pool = [...(d[season] || [])];
  if (state.weather.today === 'rain') pool = [...pool, ...d.rain, ...d.rain];
  if (h >= 2) pool.push(...d.h2);
  if (h >= 5) pool.push(...d.h5);
  if (h >= 8) pool.push(...d.h8);
  return fill(state, pick(rngFor(state.seed, 'line', npcId, dayIndex(state.date)), pool));
}

// Talk once a day for friendship. Returns { lines: [...], first, gained, gifts: [[id, n]] }.
export function talk(state, npcId) {
  const f = state.npcs[npcId];
  const today = dayIndex(state.date);
  const first = !f.met;
  const lines = [];
  let gained = 0;
  if (first) { f.met = true; lines.push(fill(state, DIALOGUE[npcId].intro)); }
  else lines.push(dailyLine(state, npcId));
  if (f.talked !== today) { f.talked = today; gained = addPoints(state, npcId, FRIENDSHIP.talk); }
  const gifts = first ? [...(NPCS_BY_ID[npcId].introGift || [])] : [];
  for (const g of NPCS_BY_ID[npcId].gifts || []) {
    const id = `${g.item}@${g.hearts}`;
    if (hearts(state, npcId) >= g.hearts && !f.rewards.includes(id)) {
      f.rewards.push(id);
      lines.push(fill(state, g.line));
      gifts.push([g.item, g.n]);
    }
  }
  return { lines, first, gained, gifts };
}

export function addPoints(state, npcId, n) {
  const f = state.npcs[npcId];
  const before = f.points;
  f.points = Math.max(0, Math.min(FRIENDSHIP.perHeart * FRIENDSHIP.maxHearts, f.points + n));
  return f.points - before;
}

export function giftTaste(npcId, itemId) {
  const def = NPCS_BY_ID[npcId];
  const lists = [['loved', def.loves], ['hated', def.hates], ['liked', def.likes], ['disliked', def.dislikes]];
  for (const [k, l] of lists) if (l.includes(itemId)) return k;
  for (const [k, l] of lists) if (l.some(t => t.includes(':') && matches(itemId, t))) return k;
  return 'neutral';
}

export const canGift = (state, npcId, itemId) => {
  const it = ITEMS_BY_ID[itemId];
  return !!it && !it.tool && state.npcs[npcId].gifted !== dayIndex(state.date);
};

// Give a gift (the caller removes the item). Returns { taste, gained, line }.
export function giveGift(state, npcId, itemId) {
  const taste = giftTaste(npcId, itemId);
  const birthday = isBirthday(state, npcId);
  const pts = FRIENDSHIP.gift[taste] * (birthday ? FRIENDSHIP.birthdayMultiplier : 1);
  const f = state.npcs[npcId];
  f.gifted = dayIndex(state.date);
  f.met = true;
  const gained = addPoints(state, npcId, pts);
  const line = fill(state, birthday && pts > 0 ? DIALOGUE[npcId].birthday : DIALOGUE[npcId].gift[taste]);
  return { taste, gained, line };
}

export const ALL_NPCS = NPCS.map(n => n.id);
