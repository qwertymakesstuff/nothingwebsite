// The three chapters, and the state a run starts with when one is picked from Chapter Select.
// Meta progress (chapters reached, endings seen) lives apart from the run save, so starting
// over never loses it.

import { newRunState } from './state.js';
import { ENDING_IDS } from './endings.js';

export const CHAPTERS = {
  1: { title: 'The Recording', roman: 'I', line: 'A tape with no return address, and a road with a chain across it.', start: { room: 'forest_path', spawn: 'start' } },
  2: { title: 'The House Below', roman: 'II', line: 'What the town forgets, the door below keeps.', start: { room: 'crypt_stair', spawn: 'from_nave' } },
  3: { title: 'The Last Prayer', roman: 'III', line: 'Something she wore. A light from where she slept. Water left to stand.', start: { room: 'gallery', spawn: 'from_bells' } },
};

const CH1_ROOMS = ['forest_path', 'shrine', 'station_hall', 'store_room', 'woods', 'mill_row', 'ruth_house', 'oran_lane', 'chapel_nave', 'cemetery', 'caretaker_house', 'caretaker_cellar', 'passages'];
const CH1_DONE = {
  items: ['crucifix', 'mara_tape', 'lighter', 'notebook', 'key_ring', 'cemetery_key', 'vestry_key'],
  flags: ['read:notebook', 'got_keyring', 'met_ruth', 'met_cal', 'gate_open', 'lane_open', 'cemetery_open', 'vestry_open', 'got_cemkey',
    'got_vestry', 'nave_seen', 'found:recorder', 'saw_crypt', 'crypt_open', 'ch2', 'cot_warm', 'shrine_lit', 'hint_relic', 'entered:hint_start', 'entered:hint_relic'],
  notes: ['doc:notebook', 'account_notebook', 'clue_below', 'clue_numbers'],
};
const CH2_DONE = {
  items: ['page3', 'reading_letter', 'ribbon', 'votive', 'holy_water'],
  flags: ['found:page3', 'read:register', 'read:page3', 'read:reading_order', 'maze_solved', 'bells_solved', 'ch3', 'found:ribbon', 'got_votive', 'got_water'],
  notes: ['doc:register', 'clue_register', 'clue_ritual', 'doc:page3', 'doc:reading_order'],
};

export function chapterState(n) {
  const s = newRunState();
  const steps = n >= 3 ? [CH1_DONE, CH2_DONE] : n >= 2 ? [CH1_DONE] : [];
  for (const st of steps) {
    for (const i of st.items) if (!s.items.includes(i)) s.items.push(i);
    st.flags.forEach(f => s.flags.add(f));
    for (const k of st.notes) if (!s.notes.includes(k)) s.notes.push(k);
  }
  if (n >= 2) { CH1_ROOMS.forEach(r => s.visited.add(r)); s.equipped = 'crucifix'; }
  if (n >= 3) ['crypt_stair', 'records', 'ossuary', 'bell_chamber'].forEach(r => s.visited.add(r));
  s.chapter = n;
  s.room = CHAPTERS[n].start.room;
  s.spawn = CHAPTERS[n].start.spawn;
  return s;
}

// ---- meta progress --------------------------------------------------------------------------

export function readMeta(store) {
  const m = store.loadMeta();
  return {
    chapters: Array.isArray(m.chapters) ? m.chapters.filter(c => CHAPTERS[c]) : [1],
    endings: Array.isArray(m.endings) ? m.endings.filter(e => ENDING_IDS.includes(e)) : [],
  };
}

export function reachChapter(store, n) {
  const m = readMeta(store);
  if (!m.chapters.includes(n)) { m.chapters.push(n); m.chapters.sort(); store.saveMeta(m); }
  return m;
}

export function recordEnding(store, id) {
  const m = readMeta(store);
  if (!m.endings.includes(id)) { m.endings.push(id); store.saveMeta(m); }
  return m;
}
