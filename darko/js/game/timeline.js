// The story calendar. The story is a fixed sequence of beats, each pinned to a date and time from
// the film. A beat starts with its `start` script, and the story moves on only when the beat's
// `done` flag is set, so free exploration can never skip or reorder a required event. While the
// player wanders, the clock creeps forward but never past the beat's `until` time.
//
// beat: { id, day, time: 'HH:MM', until?: 'HH:MM', chapter, title, start: scriptId, done: flag,
//         sleep?: roomId (sleeping there finishes the beat), needs?: [flags first], last?: true }
//
// The last beat, the epilogue, goes back to October 2: the only beat that runs backward in time.

export const MIN_PER_DAY = 24 * 60;
export const abs = (day, min) => day * MIN_PER_DAY + min;

// "28 days... 6 hours... 42 minutes... 12 seconds." Frank says it on the seventh hole at 1:30 AM
// on October 2; the deadline is counted from that moment.
export const FRANK_AT = abs(2, 90);
export const COUNTDOWN_SECONDS = ((28 * 24 + 6) * 60 + 42) * 60 + 12;
export const DEADLINE_SECONDS = FRANK_AT * 60 + COUNTDOWN_SECONDS;

export function countdown(day, time) {
  const left = Math.max(0, DEADLINE_SECONDS - Math.round(abs(day, time) * 60));
  return {
    total: left,
    d: Math.floor(left / 86400),
    h: Math.floor(left / 3600) % 24,
    m: Math.floor(left / 60) % 60,
    s: left % 60,
  };
}
export const pad = n => String(n).padStart(2, '0');
export const formatCountdown = c => `${pad(c.d)}:${pad(c.h)}:${pad(c.m)}:${pad(c.s)}`;

export const BEATS = [
  { id: 'oct1', day: 1, time: '17:40', until: '23:30', chapter: 'Prologue', title: 'Where Is Donnie?', start: 'intro', done: 'slept_oct1', sleep: 'donnie_room', needs: ['took_pills'] },
  { id: 'frank', day: 2, time: '00:50', until: '01:30', chapter: 'Chapter 1', title: 'Wake Up, Donnie', start: 'frank_wake', done: 'engine_fell' },
  { id: 'engine', day: 2, time: '10:00', until: '22:30', chapter: 'Chapter 1', title: 'Wake Up, Donnie', start: 'golf_wake', done: 'slept_oct2', sleep: 'hotel' },
  { id: 'oct3', day: 3, time: '07:00', until: '14:50', chapter: 'Chapter 2', title: 'The Destructors', start: 'oct3_morning', done: 'oct3_class' },
  { id: 'oct3_eve', day: 3, time: '18:00', until: '23:30', chapter: 'Chapter 2', title: 'The Destructors', start: 'oct3_drive', done: 'slept_oct3', sleep: 'living', needs: ['thurman1_done'] },
  { id: 'flood', day: 4, time: '02:00', until: '02:59', chapter: 'Chapter 2', title: 'The Destructors', start: 'flood_wake', done: 'flood_done' },
  { id: 'oct4', day: 4, time: '07:45', until: '23:30', chapter: 'Chapter 3', title: 'Going Together', start: 'oct4_morning', done: 'slept_oct4', sleep: 'living', needs: ['gretchen_home'] },
  { id: 'oct5', day: 5, time: '15:40', until: '23:30', chapter: 'Chapter 3', title: 'Going Together', start: 'oct5_morning', done: 'slept_oct5', sleep: 'living' },
  { id: 'oct6', day: 6, time: '17:15', until: '23:30', chapter: 'Chapter 3', title: 'Going Together', start: 'oct6_morning', done: 'slept_oct6', sleep: 'living', needs: ['thurman2_done'] },
  { id: 'oct7', day: 7, time: '07:30', until: '13:55', chapter: 'Chapter 4', title: 'They Made Me Do It', start: 'oct7_morning', done: 'oct7_health' },
  { id: 'oct7_pm', day: 7, time: '16:30', until: '23:30', chapter: 'Chapter 4', title: 'They Made Me Do It', start: 'ruins', done: 'slept_oct7', sleep: 'living', needs: ['mirror1'] },
  { id: 'oct8', day: 8, time: '13:00', until: '23:30', chapter: 'Chapter 4', title: 'They Made Me Do It', start: 'arcade_day', done: 'slept_oct8', sleep: 'living', needs: ['arcade_done'] },
  { id: 'oct13', day: 13, time: '07:50', until: '13:55', chapter: 'Chapter 5', title: 'Fear and Love', start: 'oct13_morning', done: 'oct13_office' },
  { id: 'oct13_eve', day: 13, time: '17:30', until: '23:30', chapter: 'Chapter 5', title: 'Fear and Love', start: 'room_back', done: 'slept_oct13', sleep: 'donnie_room' },
  { id: 'oct14', day: 14, time: '14:25', until: '23:30', chapter: 'Chapter 5', title: 'Fear and Love', start: 'oct14_physics', done: 'slept_oct14', sleep: 'donnie_room', needs: ['dinner14'] },
  { id: 'oct15', day: 15, time: '17:20', until: '23:30', chapter: 'Chapter 5', title: 'Fear and Love', start: 'oct15_evening', done: 'slept_oct15', sleep: 'donnie_room', needs: ['trampoline_done'] },
  { id: 'oct16', day: 16, time: '11:50', until: '23:30', chapter: 'Chapter 6', title: 'The Spears', start: 'oct16_thurman', done: 'slept_oct16', sleep: 'donnie_room', needs: ['gun_found'] },
  { id: 'oct18', day: 18, time: '07:30', until: '23:50', chapter: 'Chapter 6', title: 'The Spears', start: 'oct18_morning', done: 'slept_oct18', sleep: 'donnie_room', needs: ['knife_done'] },
  { id: 'oct20', day: 20, time: '09:50', until: '23:30', chapter: 'Chapter 7', title: 'His Name Was Frank', start: 'assembly', done: 'slept_oct20', sleep: 'donnie_room', needs: ['letter_sent'] },
  { id: 'oct23', day: 23, time: '17:40', until: '23:30', chapter: 'Chapter 7', title: 'His Name Was Frank', start: 'oct23_thurman', done: 'slept_oct23', sleep: 'donnie_room', needs: ['dinner23'] },
  { id: 'oct24', day: 24, time: '11:50', until: '21:00', chapter: 'Chapter 8', title: 'Burn It to the Ground', start: 'oct24_physics', done: 'fire_done' },
  { id: 'oct25', day: 25, time: '05:00', until: '23:30', chapter: 'Chapter 8', title: 'Burn It to the Ground', start: 'ridge_sunrise', done: 'slept_oct25', sleep: 'donnie_room', needs: ['monnitoff_destiny'] },
  { id: 'oct26', day: 26, time: '08:20', until: '23:30', chapter: 'Chapter 9', title: 'Cellar Door', start: 'oct26_english', done: 'slept_oct26', sleep: 'donnie_room', needs: ['rose_talk2'] },
  { id: 'oct27', day: 27, time: '10:00', until: '23:30', chapter: 'Chapter 9', title: 'Cellar Door', start: 'rose_leaves', done: 'slept_oct27', sleep: 'donnie_room', needs: ['cherita_done'] },
  { id: 'oct29', day: 29, time: '13:30', until: '23:59', chapter: 'Chapter 10', title: 'The Last Night', start: 'oct29_thurman', done: 'party_go' },
  { id: 'oct30', day: 30, time: '00:30', until: '08:12', chapter: 'Chapter 10', title: 'The Last Night', start: 'spears_party', done: 'engine_portal' },
  { id: 'tangent', day: 2, time: '01:30', chapter: 'Epilogue', title: 'October 2, 1988', start: 'tangent_end', done: 'never', last: true },
];

export const BEAT_INDEX = Object.fromEntries(BEATS.map((b, i) => [b.id, i]));
export const beatById = id => BEATS[BEAT_INDEX[id]] || BEATS[0];
export const nextBeat = id => BEATS[(BEAT_INDEX[id] ?? 0) + 1] || null;

// sleeping is allowed where the current beat sleeps, once everything that day needs has happened
export function canSleep(state, room) {
  const b = beatById(state.beat);
  return b.sleep === room && (b.needs || []).every(f => state.has(f));
}

// days the calendar page marks, with what the player will have lived through by then
export const CALENDAR_MARKS = {
  1: 'Dinner. Elizabeth tells.',
  2: 'Frank. The engine.',
  3: 'Gretchen. Grandma Death.',
  4: 'The school floods.',
  6: 'Dr. Thurman.',
  7: 'Frank in the mirror.',
  8: 'The arcade.',
  13: 'Suspended.',
  14: 'The book.',
  16: 'The spears. The gun.',
  18: 'The knife.',
  20: '"His name was Frank."',
  23: 'The workers.',
  24: 'Fire.',
  25: 'Cunningham arrested.',
  26: 'The portal.',
  27: 'Mom leaves. Cellar door.',
  29: 'Halloween party.',
};
