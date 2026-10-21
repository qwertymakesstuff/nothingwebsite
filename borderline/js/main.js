// Entry point: holds the single game state and routes every player action through dispatch.
import { createGame, dispatch } from './gameState.js';
import { createUI } from './ui.js';

let state = null;

// ?seed=123 replays the same entrants, useful for reproducing a reported shift
const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
const seed = () => (Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : undefined);

const ui = createUI(action => {
  if (action.type === 'start' || action.type === 'restart') {
    state = createGame(1, seed());
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
