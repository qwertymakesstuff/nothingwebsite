import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../music/js/core/store.js';
import { createPlayer, initialPlayerState } from '../../music/js/player/player.js';
import * as Q from '../../music/js/player/queueManager.js';
import { createMediaSession, buildArtwork, isMediaSessionSupported } from '../../music/js/player/mediaSession.js';
import { createAudioAnchor, makeSilentWav } from '../../music/js/player/audioAnchor.js';
import { createDebugLog } from '../../music/js/utils/debugLog.js';

const T = (id, extra = {}) => ({ id, videoId: 'V' + id, title: 'Title ' + id, artist: 'Artist ' + id, artwork: `https://i.ytimg.com/vi/V${id}/maxresdefault.jpg`, duration: 200, ...extra });
const tracks = (n) => Array.from({ length: n }, (_, i) => T(String(i)));

class FakeMetadata { constructor(init) { Object.assign(this, init); } }
function fakeNav({ throwOn = [] } = {}) {
  const handlers = {};
  const calls = { position: [], setHandler: [] };
  const ms = {
    metadata: null, playbackState: 'none',
    setActionHandler(a, h) { calls.setHandler.push([a, !!h]); if (throwOn.includes(a)) throw new TypeError('unsupported'); if (h) handlers[a] = h; else delete handlers[a]; },
    setPositionState(p) { if (throwOn.includes('position')) throw new TypeError('bad'); calls.position.push(p); },
  };
  return { nav: { mediaSession: ms }, ms, handlers, calls };
}
function fakeEngine() {
  const e = { h: {}, calls: [], on(ev, fn) { e.h[ev] = fn; }, emit(ev, ...a) { e.h[ev]?.(...a); } };
  for (const m of ['load', 'play', 'pause', 'stop', 'seek', 'setVolume']) e[m] = (...a) => e.calls.push([m, ...a]);
  return e;
}
function setup({ nav: navOpts, now } = {}) {
  const store = createStore(initialPlayerState());
  const engine = fakeEngine();
  const player = createPlayer({ store, engine });
  const n = fakeNav(navOpts);
  const logs = [];
  const clock = { t: 0 };
  const session = createMediaSession({ player, store, nav: n.nav, MetadataCtor: FakeMetadata, now: now ?? (() => clock.t), log: (...a) => logs.push(a.join(' ')) });
  return { store, engine, player, ...n, session, logs, clock };
}

test('support detection and graceful no-op', () => {
  assert.equal(isMediaSessionSupported({}), false);
  assert.equal(isMediaSessionSupported({ mediaSession: {} }), true);
  const store = createStore(initialPlayerState());
  const none = createMediaSession({ player: {}, store, nav: {}, MetadataCtor: FakeMetadata });
  assert.equal(none.supported, false); none.destroy();
  assert.equal(createMediaSession({ player: {}, store, nav: { mediaSession: {} }, MetadataCtor: undefined }).supported, false);
});

test('metadata: title, artist, artwork with sizes; cleared when nothing plays', () => {
  const { store, player, ms } = setup();
  assert.equal(ms.metadata, null); assert.equal(ms.playbackState, 'none');
  player.playTracks(tracks(2), 0);
  assert.equal(ms.metadata.title, 'Title 0'); assert.equal(ms.metadata.artist, 'Artist 0');
  const art = ms.metadata.artwork;
  assert.equal(art[0].src, 'https://i.ytimg.com/vi/V0/maxresdefault.jpg'); assert.equal(art[0].sizes, '1280x720'); assert.equal(art[0].type, 'image/jpeg');
  assert.ok(art.some((a) => a.sizes === '480x360') && art.some((a) => a.sizes === '320x180'));
  player.next();
  assert.equal(ms.metadata.title, 'Title 1');
  player.clearQueue();
  assert.equal(ms.metadata, null); assert.equal(ms.playbackState, 'none');
});

test('buildArtwork: https only, no duplicates, tolerant of missing data', () => {
  assert.deepEqual(buildArtwork(null), []);
  assert.deepEqual(buildArtwork({ id: 'x', artwork: 'http://insecure/a.jpg' }), []);
  const a = buildArtwork({ videoId: 'abc', artwork: 'https://i.ytimg.com/vi/abc/hqdefault.jpg' });
  assert.equal(a.length, 2, 'hqdefault is not listed twice');
  assert.deepEqual(a.map((x) => x.sizes), ['480x360', '320x180']);
  const other = buildArtwork({ artwork: 'https://example.com/cover.png' });
  assert.deepEqual(other, [{ src: 'https://example.com/cover.png', type: 'image/png' }]);
  assert.deepEqual(buildArtwork({ artwork: 'https://example.com/cover' }), [{ src: 'https://example.com/cover' }]);
});

test('playbackState follows playing / paused / loading / error', () => {
  const { engine, player, ms } = setup();
  player.playTracks(tracks(2), 0);
  assert.equal(ms.playbackState, 'playing', 'loading counts as playing so the lock screen shows a pause button');
  engine.emit('state', 'playing'); assert.equal(ms.playbackState, 'playing');
  engine.emit('state', 'paused'); assert.equal(ms.playbackState, 'paused');
  engine.emit('error', 'x'); assert.equal(ms.playbackState, 'paused');
});

test('lock screen / headset / media-key actions drive the player', () => {
  const { engine, player, handlers, store } = setup();
  player.playTracks(tracks(3), 0);
  engine.emit('state', 'playing'); engine.emit('time', 50, 200);
  handlers.pause(); assert.equal(engine.calls.at(-1)[0], 'pause'); assert.equal(store.getState().status, 'paused');
  handlers.play(); assert.equal(engine.calls.at(-1)[0], 'play');
  handlers.nexttrack(); assert.equal(Q.currentItem(store.getState().queue).id, '1');
  engine.emit('state', 'playing'); engine.emit('time', 1, 200);
  handlers.previoustrack(); assert.equal(Q.currentItem(store.getState().queue).id, '0');
  engine.emit('state', 'playing'); engine.emit('time', 60, 200);
  handlers.seekto({ seekTime: 120 }); assert.equal(store.getState().position, 120);
  handlers.seekto({ seekTime: NaN }); assert.equal(store.getState().position, 120, 'ignores a missing seek time');
  handlers.seekbackward({ seekOffset: 15 }); assert.equal(store.getState().position, 105);
  handlers.seekforward({}); assert.equal(store.getState().position, 115, 'default 10s step');
  handlers.stop(); assert.equal(store.getState().status, 'paused');
});

test('"next" is only offered when there is a next track', () => {
  const { engine, player, handlers, calls } = setup();
  assert.equal('nexttrack' in handlers, false, 'nothing queued');
  player.playTracks(tracks(2), 0);
  assert.equal(typeof handlers.nexttrack, 'function');
  player.next(); engine.emit('state', 'playing');
  assert.equal('nexttrack' in handlers, false, 'last track, repeat off');
  player.cycleRepeat();           // repeat: all
  assert.equal(typeof handlers.nexttrack, 'function', 'repeat all always has a next');
  assert.ok(calls.setHandler.some(([a, on]) => a === 'nexttrack' && on === false));
});

test('position state: pushed on start, on seek/jump and on play-state changes, not every tick', () => {
  const { engine, player, calls, clock } = setup();
  player.playTracks(tracks(1), 0);
  engine.emit('time', 0, 200);
  const first = calls.position.length;
  assert.ok(first >= 1); assert.deepEqual(calls.position.at(-1), { duration: 200, playbackRate: 1, position: 0 });
  engine.emit('state', 'playing');
  const afterPlay = calls.position.length; assert.ok(afterPlay > first, 'play state change');
  for (let i = 1; i <= 8; i++) { clock.t += 250; engine.emit('time', i * 0.25, 200); }   // 2s of normal ticking
  assert.equal(calls.position.length, afterPlay, 'smooth playback does not spam the OS');
  clock.t += 250; engine.emit('time', 90, 200);                                          // seek
  assert.equal(calls.position.at(-1).position, 90);
  const n = calls.position.length; clock.t += 12000; engine.emit('time', 102, 200);       // periodic re-sync after 10s
  assert.ok(calls.position.length > n);
});

test('position state: clamped, skipped without duration, skipped during ads, errors swallowed', () => {
  const a = setup();
  a.player.playTracks(tracks(1), 0);
  a.engine.emit('time', 500, 200);
  assert.equal(a.calls.position.at(-1).position, 200, 'never beyond the duration');
  const before = a.calls.position.length;
  a.engine.emit('ad', true); a.clock.t += 20000; a.engine.emit('time', 10, 200);
  assert.equal(a.calls.position.length, before, 'not pushed during an ad');
  const b = setup();
  b.player.playTracks([T('0', { duration: 0 })], 0);
  assert.equal(b.calls.position.length, 0, 'unknown duration: nothing to push');
  const c = setup({ nav: { throwOn: ['position', 'seekto', 'seekbackward', 'stop'] } });
  c.player.playTracks(tracks(1), 0); c.engine.emit('time', 5, 200); c.engine.emit('state', 'playing');
  assert.ok(c.logs.some((l) => /positionState failed/.test(l)) && c.logs.some((l) => /handler seekto failed/.test(l)), 'unsupported actions/state are logged, not thrown');
  assert.equal(typeof c.handlers.play, 'function', 'other actions still registered');
});

test('destroy removes handlers and metadata', () => {
  const { player, session, handlers, ms, store } = setup();
  player.playTracks(tracks(2), 0);
  session.destroy();
  assert.deepEqual(Object.keys(handlers), []); assert.equal(ms.metadata, null); assert.equal(ms.playbackState, 'none');
  player.next(); assert.equal(ms.metadata, null, 'no longer follows the player');
  assert.ok(store.getState());
});

// ---------------- audio anchor ----------------
function fakeDoc() {
  const listeners = {}; const els = [];
  const doc = {
    body: { append: (e) => els.push(e) },
    createElement: () => {
      const a = { paused: true, attrs: {}, listeners: {}, loop: false, hidden: false, plays: 0, pauses: 0, removed: false,
        setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(e, f) { this.listeners[e] = f; },
        play() { this.plays++; if (this.rejectPlay) return Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); this.paused = false; this.listeners.play?.(); return Promise.resolve(); },
        pause() { this.pauses++; this.paused = true; this.listeners.pause?.(); }, remove() { this.removed = true; } };
      return a;
    },
    addEventListener: (e, f) => { (listeners[e] ||= []).push(f); },
    removeEventListener: (e, f) => { listeners[e] = (listeners[e] || []).filter((x) => x !== f); },
  };
  return { doc, listeners, els };
}

test('silent wav is a valid 10 second PCM file of silence', () => {
  const w = makeSilentWav(10, 8000);
  assert.equal(w.length, 44 + 80000);
  assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF'); assert.equal(String.fromCharCode(...w.slice(8, 12)), 'WAVE');
  const dv = new DataView(w.buffer);
  assert.equal(dv.getUint32(24, true), 8000); assert.equal(dv.getUint16(34, true), 8); assert.equal(dv.getUint32(40, true), 80000);
  assert.ok(w.slice(44).every((b) => b === 128), 'every sample is silence');
});

test('anchor: disabled does nothing; enabled plays with the player and pauses with it', () => {
  const store = createStore(initialPlayerState());
  assert.equal(createAudioAnchor({ store, doc: fakeDoc().doc, enabled: false }).el, null);
  const { doc, els } = fakeDoc();
  const anchor = createAudioAnchor({ store, doc, makeUrl: () => 'blob:x' });
  const a = anchor.el;
  assert.equal(els.length, 1); assert.equal(a.loop, true); assert.equal(a.src, 'blob:x'); assert.equal(a.attrs.playsinline, ''); assert.equal(a.hidden, true);
  assert.equal(a.paused, true);
  store.setState({ status: 'loading' }); assert.equal(a.paused, false, 'starts synchronously when a song starts loading (inside the tap)');
  store.setState({ status: 'playing' }); assert.equal(a.plays, 1, 'does not restart while playing');
  store.setState({ status: 'paused' }); assert.equal(a.paused, true);
  store.setState({ status: 'idle' }); assert.equal(a.pauses, 1);
  store.setState({ status: 'playing' }); assert.equal(a.paused, false);
  anchor.destroy(); assert.equal(a.removed, true);
});

test('anchor: unlocks on the first gesture and logs a blocked play instead of throwing', async () => {
  const store = createStore(initialPlayerState());
  const { doc, listeners } = fakeDoc(); const logs = [];
  const anchor = createAudioAnchor({ store, doc, makeUrl: () => 'blob:x', log: (...a) => logs.push(a.join(' ')) });
  assert.ok(listeners.pointerdown?.length && listeners.keydown?.length);
  listeners.pointerdown[0]();                      // first tap
  await Promise.resolve(); await Promise.resolve();
  assert.ok(logs.some((l) => /unlocked/.test(l)));
  assert.equal(anchor.el.paused, true, 'unlocking while nothing plays leaves it paused (silent)');
  assert.equal(listeners.pointerdown.length, 0, 'unlock listeners removed after use');
  anchor.el.rejectPlay = true;
  store.setState({ status: 'playing' }); await Promise.resolve(); await Promise.resolve();
  assert.ok(logs.some((l) => /play blocked: NotAllowedError/.test(l)));
});

test('debug log: off by default, ring buffer, dump', () => {
  const off = createDebugLog(); off.log('x'); assert.equal(off.entries().length, 0);
  let t = 1000; const d = createDebugLog({ enabled: true, max: 3, now: () => t });
  const seen = []; d.subscribe((e) => seen.push(e.text));
  for (let i = 0; i < 5; i++) { t += 500; d.log('event', i, { a: 1 }); }
  assert.equal(d.entries().length, 3); assert.equal(seen.length, 5);
  assert.match(d.dump(), /^1\.5s event 2 \{"a":1\}\n2\.0s event 3/);
  const circular = {}; circular.self = circular; d.log(circular);
  assert.equal(d.entries().length, 3);
});
