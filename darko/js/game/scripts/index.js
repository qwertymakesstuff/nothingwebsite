// Every script in the game, by id. Later chapters may override the house's default lines for
// their own beats; see house.js.

import { PROLOGUE } from './prologue.js';
import { HOUSE_SCRIPTS } from './house.js';
import { CHAPTER1 } from './chapter1.js';
import { CHAPTER2 } from './chapter2.js';
import { CHAPTER3 } from './chapter3.js';
import { CHAPTER4 } from './chapter4.js';

export const SCRIPTS = { ...PROLOGUE, ...HOUSE_SCRIPTS, ...CHAPTER1, ...CHAPTER2, ...CHAPTER3, ...CHAPTER4 };
