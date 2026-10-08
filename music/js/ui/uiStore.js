import { createStore } from '../core/store.js';

// UI-only state (not playback). Kept separate so the player never depends on the UI.
export function createUiStore({ videoVisible = false } = {}) {
  return createStore({
    nowPlayingOpen: false,   // mobile full-screen player
    expandedOpen: false,     // desktop expanded player (big cover / video)
    videoVisible,            // user's choice: show the YouTube video instead of the cover (default: cover)
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
