// FLOOR 13 — entry point.
import { Game } from './engine.js';
import { UI } from './ui.js';

const game = new Game(globalThis.localStorage);
const ui = new UI(game);
// handy for debugging from the console; nothing depends on it
globalThis.floor13 = { game, ui };
