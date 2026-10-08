// Composition root: wires stores, engine, player, persistence and UI together.

import { createStore, shallowEqual } from './core/store.js';
import { createPlayer, initialPlayerState } from './player/player.js';
import { SimulatedEngine } from './player/playbackEngine.js';
import { YouTubeEngine } from './player/youtubeEngine.js';
import { VideoDock } from './ui/components/videoDock.js';
import { createPersistence } from './storage/persistence.js';
import { createUiStore, showToast } from './ui/uiStore.js';
import { mountApp } from './ui/shell.js';
import { registerShortcuts } from './ui/keyboard.js';
import { youtubeService } from './services/youtube.js';
import { createRecentSearches } from './storage/recentSearches.js';

const root = document.getElementById('app');

try {
  const store = createStore(initialPlayerState());
  const ui = createUiStore();
  const persistence = createPersistence();
  // Real playback uses YouTube's official embedded player. ?engine=sim swaps in a silent simulated
  // engine (no network needed) for UI testing.
  const simulated = new URLSearchParams(location.search).get('engine') === 'sim';
  let engine;
  let dock = null;
  if (simulated) {
    engine = new SimulatedEngine();
  } else {
    document.body.classList.add('engine-yt');
    dock = VideoDock({ store, ui });
    document.body.append(dock.el);
    engine = new YouTubeEngine({ container: dock.container });
  }
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

  mountApp(root, { player, store, ui, services: { youtube: youtubeService, recent: createRecentSearches(), simulated } });
  registerShortcuts({ player, store });
  // Warm up YouTube's player in the background so the first tap on a song starts instantly.
  if (!simulated) setTimeout(() => engine.preload(), 1500);
  window.__music = { store, ui, player }; // handy for debugging and tests
} catch (err) {
  console.error(err);
  root.replaceChildren(Object.assign(document.createElement('p'), {
    className: 'fatal',
    textContent: 'Something went wrong starting the player. Try reloading the page.',
  }));
}
