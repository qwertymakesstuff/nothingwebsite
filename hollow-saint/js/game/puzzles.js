// Puzzles that need more than a flag. Each takes the run state and an argument and returns a
// script variant (see script.js) describing what happens, so scripts can call them with
// `puzzle: [name, arg]` and every outcome can be tested on its own.
//
//   bells   ring the eight bells in the order Mara counts on the tape: four, one, seven, three.
//           A wrong bell starts the count over and wakes something in the dark.
//   maze    the bone arches beneath the records room. Mara's third page: left, right, right.
//           A wrong arch brings you out where you went in.

export const BELL_ORDER = [4, 1, 7, 3];
export const MAZE_PATH = ['L', 'R', 'R'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export const roman = n => ROMAN[n] || String(n);

export function bells(state, n) {
  const c = state.counts;
  if (state.flags.has('bells_solved')) return { say: [`Bell ${roman(n)} hums when you touch it. It has done its work.`], sfx: 'bell', bell: n };
  const at = c.bells_at || 0;
  if (n === BELL_ORDER[at]) {
    c.bells_at = at + 1;
    if (c.bells_at < BELL_ORDER.length) return { say: [`You pull the rope. Bell ${roman(n)} speaks, and keeps speaking under the floor long after it should have stopped.`], sfx: 'bell', bell: n };
    c.bells_at = 0;
    return {
      say: [`Bell ${roman(n)}. The four notes hang together in the air, the way they did on the tape.`, 'Under your feet, stone grinds against stone. The middle of the floor folds down into a stair.', 'Far below, a congregation stands up.'],
      set: ['bells_solved'], sfx: 'bell', bell: n, shake: true, chapter: 3,
    };
  }
  c.bells_at = 0;
  c.bells_wrong = (c.bells_wrong || 0) + 1;
  return {
    say: [`Bell ${roman(n)} clangs against the others. The sound comes back wrong, from every direction at once.`, 'Something in the dark answers it.'],
    sfx: 'bell_wrong', bell: n, glitch: 20, shake: true,
    // a wrong peal calls something up, one at a time
    spawn: [{ id: `bell_hollow_${c.bells_wrong}`, type: 'hollow', x: 3 + (c.bells_wrong % 2) * 10, y: 11.5 }],
  };
}

export function maze(state, dir) {
  const c = state.counts;
  if (state.flags.has('maze_solved')) return { say: ['The arches lead back the way you came.'] };
  const at = c.maze_at || 0;
  if (dir === MAZE_PATH[at]) {
    c.maze_at = at + 1;
    if (c.maze_at === MAZE_PATH.length) {
      return { say: ['The bones here are cleaner. Newer. In the floor between the arches, steps go down.'], set: ['maze_solved'], sfx: 'door', go: { to: 'ossuary', spawn: 'arrive' } };
    }
    const deeper = ['The passage turns and turns and opens on another room of bones, just like the last. Not quite like the last.', 'Another room of bones. The skulls in this one are smaller.'];
    return { say: [deeper[at] || deeper[0]], sfx: 'step', go: { to: 'ossuary', spawn: 'arrive' } };
  }
  c.maze_at = 0;
  return {
    say: ['The passage bends back on itself. You come out where you went in.', 'The bones have been rearranged while you were gone.'],
    glitch: 12, sfx: 'whisper', go: { to: 'ossuary', spawn: 'arrive' },
  };
}

// the stone table before the saint: says what is still missing, in the letter's words
export const RITUAL = [
  ['ribbon', 'something she wore'],
  ['votive', 'a light from where she slept'],
  ['holy_water', 'water blessed and left to stand'],
];

export function ritual(state) {
  const missing = RITUAL.filter(([id]) => !state.items.includes(id)).map(([, words]) => words);
  const known = state.flags.has('read:reading_order');
  if (!known) return { say: ['A stone table worn into three shallow hollows, as if for three things.', 'You do not know what goes in them. Somebody must have written it down.'] };
  return { say: ['Three hollows in the stone table. The letter said to bring:', ...missing.map(m => `[ Still missing: ${m}. ]`)] };
}

export const PUZZLES = { bells, maze, ritual };

export function solvePuzzle(state, [name, arg]) {
  const fn = PUZZLES[name];
  if (!fn) throw new Error(`no puzzle "${name}"`);
  return fn(state, arg);
}
