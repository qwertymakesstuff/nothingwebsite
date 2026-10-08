import { createStore } from '../core/store.js';

// UI-only state (not playback). Kept separate so the player never depends on the UI.
export function createUiStore() {
  return createStore({
    nowPlayingOpen: false,   // mobile full-screen player
    queuePanelOpen: true,    // desktop side panel
    toast: null,             // { id, message, kind }
  });
}

let toastTimer = null;
let toastId = 0;

export function showToast(ui, message, kind = 'info') {
  clearTimeout(toastTimer);
  ui.setState({ toast: { id: ++toastId, message, kind } });
  toastTimer = setTimeout(() => ui.setState({ toast: null }), 3500);
}
