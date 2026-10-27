// The run state: where Donnie is, the date and time, story flags, items and journal entries.
// It converts to and from the plain object the storage layer saves.

import { START_DAY, START_TIME } from './calendar.js';
import { SAVE_VERSION } from '../engine/storage.js';

export const START = { room: 'donnie_room', spawn: 'start' };

export class GameState {
  constructor() {
    this.room = START.room;
    this.x = 0; this.y = 0; this.facing = 'down';
    this.day = START_DAY;
    this.time = START_TIME;
    this.chapter = 1;
    this.flags = new Set();
    this.items = ['house_key'];
    this.notes = [];
    this.visited = new Set();
    this.objective = '';
    this.playtime = 0;
    this.fresh = true; // a new game that hasn't placed the player yet
  }

  has(f) { return this.flags.has(f); }
  set(f) { this.flags.add(f); }
  unset(f) { this.flags.delete(f); }

  hasItem(id) { return this.items.includes(id); }
  give(id) { if (this.hasItem(id)) return false; this.items.push(id); return true; }
  take(id) { const i = this.items.indexOf(id); if (i < 0) return false; this.items.splice(i, 1); return true; }

  hasNote(id) { return this.notes.some(n => n.id === id); }
  addNote(id) {
    if (this.hasNote(id)) return false;
    this.notes.push({ id, day: this.day, time: this.time });
    return true;
  }

  toSave() {
    return {
      v: SAVE_VERSION,
      room: this.room, x: this.x, y: this.y, facing: this.facing,
      day: this.day, time: this.time, chapter: this.chapter,
      flags: [...this.flags], items: this.items.slice(), notes: this.notes.map(n => ({ ...n })),
      visited: [...this.visited], objective: this.objective, playtime: this.playtime,
    };
  }

  static fromSave(d) {
    const s = new GameState();
    Object.assign(s, {
      room: d.room, x: d.x, y: d.y, facing: d.facing, day: d.day, time: d.time, chapter: d.chapter,
      flags: new Set(d.flags), items: d.items.slice(), notes: d.notes.map(n => ({ ...n })),
      visited: new Set(d.visited), objective: d.objective, playtime: d.playtime, fresh: false,
    });
    return s;
  }
}

// story conditions: a flag name, '!flag', an array (all must hold) or a function of the state
export function cond(state, c) {
  if (c === undefined || c === null) return true;
  if (typeof c === 'function') return !!c(state);
  if (Array.isArray(c)) return c.every(x => cond(state, x));
  if (typeof c === 'string') return c.startsWith('!') ? !state.has(c.slice(1)) : state.has(c);
  return !!c;
}
