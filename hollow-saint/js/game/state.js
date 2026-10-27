// The run state: everything that belongs to one playthrough and nothing else.

import { START } from './rooms.js';

export function newRunState() {
  return {
    room: START.room,
    spawn: START.spawn,
    pos: null,                 // { x, y, facing } when resuming from a save
    flags: new Set(),
    visited: new Set(),
    counts: {},
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
    chapter: state.chapter,
    playtime: state.playtime,
  };
}
