// The run state: everything that belongs to one playthrough and nothing else.

import { START } from './rooms/index.js';

export const MAX_HP = 3;
export const START_ITEMS = ['crucifix', 'mara_tape', 'lighter'];

export function newRunState() {
  return {
    room: START.room,
    spawn: START.spawn,
    pos: null,                 // { x, y, facing } when resuming from a save
    flags: new Set(),
    visited: new Set(),
    counts: {},
    items: START_ITEMS.slice(),
    equipped: null,
    hp: MAX_HP,
    notes: [],                 // journal entry ids, in the order they were found
    remains: {},               // where defeated things fell: id -> { room, x, y }
    chapter: 1,
    playtime: 0,               // ticks
  };
}

export function stateFromSave(save) {
  const s = newRunState();
  s.room = save.room;
  s.spawn = null;
  s.pos = { x: save.x, y: save.y, facing: save.facing };
  s.flags = new Set(save.flags);
  s.visited = new Set(save.visited);
  s.counts = { ...(save.counts || {}) };
  if (save.items) s.items = save.items.slice();
  s.equipped = save.equipped && s.items.includes(save.equipped) ? save.equipped : null;
  s.hp = MAX_HP;             // you always wake up whole
  s.notes = (save.notes || []).slice();
  s.remains = { ...(save.remains || {}) };
  s.chapter = save.chapter;
  s.playtime = save.playtime;
  return s;
}

export function saveFromState(state, player) {
  return {
    room: state.room,
    x: player.x, y: player.y, facing: player.facing,
    flags: [...state.flags],
    visited: [...state.visited],
    counts: { ...state.counts },
    items: state.items.slice(),
    equipped: state.equipped,
    notes: state.notes.slice(),
    remains: { ...state.remains },
    chapter: state.chapter,
    playtime: state.playtime,
  };
}

export const hasItem = (state, id) => state.items.includes(id);

export function giveItem(state, id) {
  if (state.items.includes(id)) return false;
  state.items.push(id);
  return true;
}

export function takeItem(state, id) {
  const i = state.items.indexOf(id);
  if (i < 0) return false;
  state.items.splice(i, 1);
  if (state.equipped === id) state.equipped = null;
  return true;
}

export function addNote(state, id) {
  if (state.notes.includes(id)) return false;
  state.notes.push(id);
  return true;
}
