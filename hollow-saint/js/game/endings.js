// The four endings. What decides them is written out here, in plain conditions on what the
// player did and found, not a hidden score:
//
//   dawn         you run. Always open to you.
//   hollow       you take her place. Always open to you.
//   names        the truth: you have the Register, Mara's second page, Cal's confession, and
//                you know the recordings come from under the chapel.
//   last_prayer  hidden: the truth, plus understanding what the hollow is for (Price's
//                question) and the town's smaller secrets: Mara's grave, the names under the
//                hatch, Haskell's stone, the watcher's footprints, and Ruth's empty chair.

import { conditionHolds } from './script.js';

const TRUTH = { all: ['read:register', 'read:page2', 'cal_truth'], noted: ['clue_below'] };
const HIDDEN = {
  all: [...TRUTH.all, 'understood', 'found:ward_grave', 'found:names', 'found:haskell', 'found:watcher_prints', 'found:ruth_gone'],
  noted: TRUTH.noted,
};

export const ENDINGS = {
  dawn: {
    title: 'Dawn', n: 1, requires: null,
    lines: [
      'You come up out of Halvorsen\'s hatch into grey light.',
      'The car starts on the first try, as though it had only been waiting for you to give up.',
      'In the mirror, Bellwether is just trees.',
      'The tape in the deck plays nothing but hiss. By Ashby you cannot remember what was on it.',
      'By the highway you cannot remember why you went.',
    ],
  },
  hollow: {
    title: 'The Hollow', n: 2, requires: null,
    lines: [
      'Mara climbs out of the saint and you climb in.',
      'She walks up into a Monday. Ruth tells her she has been gone since August. She believes it.',
      'Cal drives her to the Greyhound in Ashby himself.',
      'Somewhere under the town, a voice that is yours says her name a moment before she does.',
    ],
  },
  names: {
    title: 'The Names', n: 3, requires: TRUTH,
    lines: [
      'You read the names until there are no more names.',
      'Mara climbs out of the saint, and nobody stops her, because they are all remembering.',
      'Across Mill Row that morning Ruth calls her son\'s name for the first time in thirty-six years.',
      'The door below is open a crack now. You can feel it in the ground, like a held breath.',
      'On Tuesday, Father Price hears your confession. You are very upset.',
    ],
  },
  last_prayer: {
    title: 'The Last Prayer', n: 4, requires: HIDDEN,
    lines: [
      'The saint empties. Everything it was given comes back up the stair: not as they were, but as they are remembered.',
      'Danny Halvorsen, nine, in church shoes. Margaret Pike, holding her husband\'s hand. Amos Hollis. Mara.',
      'The hollow in the stone closes like a healed wound.',
      'The voice on the tape says thank you, in everyone\'s voice at once, and stops.',
      'For the first time, the tape is only blank.',
    ],
  },
};

export const ENDING_IDS = Object.keys(ENDINGS);

export function endingsAvailable(state) {
  return ENDING_IDS.filter(id => !ENDINGS[id].requires || conditionHolds(ENDINGS[id].requires, state, null));
}
