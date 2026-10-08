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

/** `action` ({ label, onClick }) adds a button to the toast (e.g. Undo) and keeps it up a bit longer. */
export function showToast(ui, message, kind = 'info', action = null) {
  clearTimeout(toastTimer);
  const id = ++toastId;
  ui.setState({ toast: { id, message, kind, action } });
  toastTimer = setTimeout(() => ui.setState({ toast: null }), action ? 7000 : 3500);
}

export function dismissToast(ui) {
  clearTimeout(toastTimer);
  ui.setState({ toast: null });
}
