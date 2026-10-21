// Entry point: holds the single game state and routes every player action through dispatch.
import { createGame, dispatch } from './gameState.js';
import { createUI } from './ui.js';

let state = null;

const ui = createUI(action => {
  if (action.type === 'start' || action.type === 'restart') {
    state = createGame(1);
    ui.render(state);
    return;
  }
  if (!state) return;
  const result = dispatch(state, action);
  if (result.error) { console.warn(result.error); return; }
  state = result.state;
  ui.render(state);
});

ui.showIntro();
