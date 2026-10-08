// Composition root: wires stores, engine, player, persistence and UI together.

import { createStore, shallowEqual } from './core/store.js';
import { createPlayer, initialPlayerState } from './player/player.js';
import { SimulatedEngine } from './player/playbackEngine.js';
import { YouTubeEngine, isIosLike } from './player/youtubeEngine.js';
import { VideoDock } from './ui/components/videoDock.js';
import { createPersistence } from './storage/persistence.js';
import { createUiStore, showToast } from './ui/uiStore.js';
import { mountApp } from './ui/shell.js';
import { registerShortcuts } from './ui/keyboard.js';
import { youtubeService } from './services/youtube.js';
import { createRecentSearches } from './storage/recentSearches.js';
import { createPrefs } from './storage/prefs.js';
import { createMediaSession } from './player/mediaSession.js';
import { createAudioAnchor } from './player/audioAnchor.js';
import { createDebugLog } from './utils/debugLog.js';
import { DebugPanel } from './ui/debugPanel.js';

const root = document.getElementById('app');

try {
  const store = createStore(initialPlayerState());
  const params = new URLSearchParams(location.search);
  const dbg = createDebugLog({ enabled: params.get('debug') === '1' }); // ?debug=1 shows a log panel (see README)
  const prefs = createPrefs();
  const ui = createUiStore({ videoVisible: prefs.get().videoVisible });
  // iPhone/iPad ignore volume set by a web page, so the volume slider is hidden there.
  if (isIosLike()) document.body.classList.add('ios');
  // Safari diagnostics for the hidden YouTube box: ?vh=a|b|c picks an alternative way of hiding it (see components.css).
  const vh = params.get('vh');
  if (vh) document.body.dataset.vh = vh;
  const persistence = createPersistence();
  // Real playback uses YouTube's official embedded player. ?engine=sim swaps in a silent simulated
  // engine (no network needed) for UI testing.
  const simulated = params.get('engine') === 'sim';
  let engine;
  let dock = null;
  if (simulated) {
    engine = new SimulatedEngine();
  } else {
    document.body.classList.add('engine-yt');
    dock = VideoDock({ store, ui });
    document.body.append(dock.el);
    engine = new YouTubeEngine({ container: dock.container, log: dbg.log });
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

  mountApp(root, { player, store, ui, prefs, services: { youtube: youtubeService, recent: createRecentSearches(), simulated } });
  registerShortcuts({ player, store });

  // Phase 5: lock screen / headset / media-key controls and background behaviour.
  // The silent audio element only helps phones keep playing with the screen off. On desktop it is off by
  // default: in Safari on Mac it overlapped with YouTube starting and blocked the whole tab for over a minute.
  // ?anchor=on / ?anchor=off override either way.
  const anchorParam = params.get('anchor');
  const phoneLike = isIosLike() || /Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches);
  const anchor = createAudioAnchor({ store, enabled: anchorParam ? anchorParam !== 'off' : phoneLike, log: dbg.log });
  const mediaSession = createMediaSession({ player, store, log: dbg.log, onPlay: () => anchor.kick() });
  document.addEventListener('visibilitychange', () => engine.notifyVisibility?.(document.hidden));
  if (dbg.enabled) {
    document.body.append(DebugPanel({ debug: dbg }).el);
    dbg.log('start', { ua: navigator.userAgent, mediaSession: mediaSession.supported, anchor: !!anchor.el, engine: simulated ? 'sim' : 'youtube', visibility: document.visibilityState });
    store.subscribe((s) => `${s.status}${s.needsTap ? ' needsTap' : ''}${s.adPlaying ? ' ad' : ''}`, (v) => dbg.log('player:', v), { immediate: false });
    // Heartbeat: if the page freezes, the last heartbeat in the saved log shows when the main thread stopped.
    setInterval(() => dbg.log('alive', store.getState().status), 2000);
    document.addEventListener('visibilitychange', () => dbg.log('visibility:', document.visibilityState));
    window.addEventListener('pagehide', () => dbg.log('pagehide'));
    window.addEventListener('pageshow', () => dbg.log('pageshow'));
    document.addEventListener('freeze', () => dbg.log('page frozen by the browser'));
    document.addEventListener('resume', () => dbg.log('page resumed'));
  }
  // Warm up YouTube's player in the background so the first tap on a song starts instantly.
  if (!simulated) setTimeout(() => engine.preload(), 1500);
  window.__music = { store, ui, player, debug: dbg }; // handy for debugging and tests
} catch (err) {
  console.error(err);
  root.replaceChildren(Object.assign(document.createElement('p'), {
    className: 'fatal',
    textContent: 'Something went wrong starting the player. Try reloading the page.',
  }));
}
