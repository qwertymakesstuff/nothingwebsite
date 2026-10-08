// Composition root: wires stores, engine, player, persistence and UI together.

import { createStore, shallowEqual } from './core/store.js';
import { createPlayer, initialPlayerState } from './player/player.js';
import { SimulatedEngine } from './player/playbackEngine.js';
import { createPersistence } from './storage/persistence.js';
import { createUiStore, showToast } from './ui/uiStore.js';
import { mountApp } from './ui/shell.js';
import { registerShortcuts } from './ui/keyboard.js';

const root = document.getElementById('app');

try {
  const store = createStore(initialPlayerState());
  const ui = createUiStore();
  const persistence = createPersistence();
  // Phase 1 uses the simulated engine. A real engine will be swapped in here later.
  const engine = new SimulatedEngine();
  const player = createPlayer({ store, engine, notify: (message, kind) => showToast(ui, message, kind) });

  const saved = persistence.load();
  if (saved) player.restore(saved);

  // Save settings/queue changes right away (debounced) and the playhead less often.
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistence.save(store.getState()), 500);
  };
  store.subscribe((s) => [s.queue, s.volume, s.muted, s.shuffle, s.repeat], scheduleSave, { equals: shallowEqual, immediate: false });
  setInterval(() => { if (store.getState().status === 'playing') persistence.save(store.getState()); }, 5000);
  window.addEventListener('pagehide', () => persistence.save(store.getState()));

  mountApp(root, { player, store, ui });
  registerShortcuts({ player, store });
  window.__music = { store, ui, player }; // handy for debugging and tests
} catch (err) {
  console.error(err);
  root.replaceChildren(Object.assign(document.createElement('p'), {
    className: 'fatal',
    textContent: 'Something went wrong starting the player. Try reloading the page.',
  }));
}
