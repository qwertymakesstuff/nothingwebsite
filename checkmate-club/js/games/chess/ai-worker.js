// Runs the computer's search off the main thread so the board stays responsive.

import { Chess } from './engine.js';
import { chooseMove } from './ai.js';

self.onmessage = e => {
  const { id, fen, level } = e.data;
  try {
    const move = chooseMove(new Chess(fen), level);
    self.postMessage({ id, move });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
