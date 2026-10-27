// Every script in the game, by id. Later chapters may override the house's default lines for
// their own beats; see house.js. school.js routes the classroom seats and doors by beat.

import { PROLOGUE } from './prologue.js';
import { HOUSE_SCRIPTS } from './house.js';
import { CHAPTER1 } from './chapter1.js';
import { CHAPTER2 } from './chapter2.js';
import { CHAPTER3 } from './chapter3.js';
import { CHAPTER4 } from './chapter4.js';
import { CHAPTER5 } from './chapter5.js';
import { CHAPTER6 } from './chapter6.js';
import { CHAPTER7 } from './chapter7.js';
import { CHAPTER8 } from './chapter8.js';
import { CHAPTER9 } from './chapter9.js';
import { CHAPTER10 } from './chapter10.js';
import { SCHOOL_SCRIPTS } from './school.js';

export const SCRIPTS = {
  ...PROLOGUE, ...HOUSE_SCRIPTS, ...CHAPTER1, ...CHAPTER2, ...CHAPTER3, ...CHAPTER4,
  ...CHAPTER5, ...CHAPTER6, ...CHAPTER7, ...CHAPTER8, ...CHAPTER9, ...CHAPTER10, ...SCHOOL_SCRIPTS,
};
