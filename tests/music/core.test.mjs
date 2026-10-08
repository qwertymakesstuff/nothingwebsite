import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, shallowEqual } from '../../music/js/core/store.js';
import * as Q from '../../music/js/player/queueManager.js';
import { createPlayer, initialPlayerState } from '../../music/js/player/player.js';
import { createPersistence, fromSnapshot, toSnapshot } from '../../music/js/storage/persistence.js';
import { formatTime, clamp, hueFrom } from '../../music/js/utils/format.js';

const T = (id, extra = {}) => ({ id, title: 't' + id, artist: 'a', duration: 100, ...extra });
const tracks = (n) => Array.from({ length: n }, (_, i) => T(String(i)));
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('store: notifies only when selected value changes', () => {
  const s = createStore({ a: 1, b: 1 });
  let calls = 0;
  s.subscribe((x) => x.a, () => calls++, { immediate: false });
  s.setState({ b: 2 });
  assert.equal(calls, 0);
  s.setState({ a: 2 });
  assert.equal(calls, 1);
  s.setState({ a: 2 });
  assert.equal(calls, 1);
});
test('store: unsubscribe and shallowEqual', () => {
  const s = createStore({ a: 1 });
  let calls = 0;
  const off = s.subscribe((x) => [x.a], () => calls++, { equals: shallowEqual, immediate: false });
  s.setState({ a: 2 }); off(); s.setState({ a: 3 });
  assert.equal(calls, 1);
  assert.ok(shallowEqual([1, 2], [1, 2]));
  assert.ok(!shallowEqual([1, 2], [1, 3]));
});

test('queue: next/previous and repeat modes', () => {
  let q = Q.setItems(tracks(3), 0);
  assert.equal(Q.currentItem(q).id, '0');
  let r = Q.next(q); assert.ok(r.moved); q = r.queue; r = Q.next(q); q = r.queue;
  assert.equal(Q.currentItem(q).id, '2');
  assert.ok(Q.next(q).ended);
  assert.equal(Q.currentItem(Q.next(q, { repeat: 'all' }).queue).id, '0');
  assert.ok(!Q.previous(Q.setItems(tracks(3), 0)).moved);
  assert.equal(Q.currentItem(Q.previous(Q.setItems(tracks(3), 0), { repeat: 'all' }).queue).id, '2');
});
test('queue: shuffle keeps current first and is a permutation', () => {
  const q = Q.setItems(tracks(6), 3, { shuffle: true, rng: seq([0.1, 0.9, 0.4, 0.7]) });
  assert.equal(Q.currentItem(q).id, '3');
  assert.equal(q.pos, 0);
  assert.deepEqual([...q.order].sort(), [0, 1, 2, 3, 4, 5]);
  const off = Q.rebuildOrder(q, false);
  assert.deepEqual(off.order, [0, 1, 2, 3, 4, 5]);
  assert.equal(Q.currentItem(off).id, '3');
});
test('queue: playNext, append, removeAt', () => {
  let q = Q.setItems(tracks(3), 0);
  q = Q.playNext(q, T('x'));
  assert.deepEqual(Q.playOrderItems(q).map((t) => t.id), ['0', 'x', '1', '2']);
  q = Q.append(q, [T('y')]);
  assert.deepEqual(Q.playOrderItems(q).map((t) => t.id), ['0', 'x', '1', '2', 'y']);
  let res = Q.removeAt(q, 1);
  assert.equal(res.removedCurrent, false);
  assert.deepEqual(Q.playOrderItems(res.queue).map((t) => t.id), ['0', '1', '2', 'y']);
  res = Q.removeAt(Q.jumpTo(res.queue, 3), 3);
  assert.ok(res.removedCurrent);
  assert.equal(Q.currentItem(res.queue).id, '2'); // clamps to the new last item
  assert.equal(Q.removeAt(Q.setItems([T('a')]), 0).queue.items.length, 0);
});
test('queue: playNext works while shuffled', () => {
  let q = Q.setItems(tracks(5), 2, { shuffle: true, rng: seq([0.3, 0.6, 0.2]) });
  q = Q.playNext(q, T('x'));
  assert.equal(Q.playOrderItems(q)[1].id, 'x');
  assert.equal(q.items.length, 6);
  assert.deepEqual([...q.order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

function fakeEngine() {
  const e = { h: {}, calls: [], on(ev, fn) { e.h[ev] = fn; }, emit(ev, ...a) { e.h[ev]?.(...a); } };
  for (const m of ['load', 'play', 'pause', 'stop', 'seek', 'setVolume']) e[m] = (...a) => e.calls.push([m, ...a]);
  return e;
}
const setup = () => {
  const store = createStore(initialPlayerState());
  const engine = fakeEngine();
  const notes = [];
  const player = createPlayer({ store, engine, notify: (m, k) => notes.push([m, k]) });
  return { store, engine, player, notes };
};

test('player: playTracks loads and plays, engine events drive state', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(3), 1);
  assert.equal(store.getState().status, 'loading');
  assert.deepEqual(engine.calls.at(-1).slice(0, 2), ['load', tracks(3)[1]]);
  engine.emit('state', 'playing'); engine.emit('time', 5, 100);
  assert.equal(store.getState().status, 'playing');
  assert.equal(store.getState().position, 5);
});
test('player: toggle, next, previous (restart if >3s), seek clamp', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(3), 0);
  engine.emit('state', 'playing'); engine.emit('time', 10, 100);
  player.togglePlay();
  assert.equal(store.getState().status, 'paused');
  player.togglePlay();
  assert.equal(engine.calls.at(-1)[0], 'play');
  player.previous();
  assert.equal(engine.calls.at(-1)[0], 'seek'); // >3s -> restart, not previous track
  engine.emit('time', 1, 100);
  player.next();
  assert.equal(Q.currentItem(store.getState().queue).id, '1');
  player.seek(9999);
  assert.equal(store.getState().position, 100);
  player.seek(-5);
  assert.equal(store.getState().position, 0);
});
test('player: ended advances; last track rewinds and stops; repeat one replays', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(2), 0);
  engine.emit('ended');
  assert.equal(Q.currentItem(store.getState().queue).id, '1');
  engine.emit('ended');
  assert.equal(store.getState().status, 'paused');
  assert.equal(Q.currentItem(store.getState().queue).id, '1');
  player.cycleRepeat(); player.cycleRepeat();
  assert.equal(store.getState().repeat, 'one');
  engine.calls.length = 0;
  engine.emit('ended');
  assert.deepEqual(engine.calls.map((c) => c[0]), ['seek', 'play']);
});
test('player: error sets state, notifies, auto-skips', async () => {
  const { store, engine, player, notes } = setup();
  player.playTracks(tracks(3), 0);
  engine.emit('error', 'This track is unavailable');
  assert.equal(store.getState().status, 'error');
  assert.equal(notes.length, 1);
  await new Promise((r) => setTimeout(r, 1700));
  assert.equal(Q.currentItem(store.getState().queue).id, '1');
});
test('player: all-error queue does not skip forever', async () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(1), 0);
  engine.emit('error', 'x');
  await new Promise((r) => setTimeout(r, 1700));
  assert.equal(store.getState().status, 'error');
  assert.equal(engine.calls.filter((c) => c[0] === 'load').length, 1);
});
test('player: volume, mute, shuffle keeps current, removing current loads next', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(4), 1);
  player.setVolume(0.3);
  assert.deepEqual(engine.calls.at(-1), ['setVolume', 0.3]);
  player.toggleMute();
  assert.deepEqual(engine.calls.at(-1), ['setVolume', 0]);
  player.setVolume(0.5);
  assert.equal(store.getState().muted, false);
  player.toggleShuffle();
  assert.equal(Q.currentItem(store.getState().queue).id, '1');
  player.toggleShuffle();
  player.removeFromQueue(store.getState().queue.pos);
  assert.notEqual(Q.currentItem(store.getState().queue).id, '1');
  assert.equal(engine.calls.at(-1)[0], 'load');
  player.clearQueue();
  assert.equal(store.getState().status, 'idle');
});
test('player: restore does not start playback and play() loads at saved position', () => {
  const { store, engine, player } = setup();
  const q = Q.setItems(tracks(3), 2);
  player.restore({ volume: 0.4, muted: false, shuffle: false, repeat: 'all', position: 42, queue: q });
  assert.equal(store.getState().status, 'paused');
  assert.ok(!engine.calls.some((c) => c[0] === 'load'));
  player.play();
  assert.deepEqual(engine.calls.at(-1), ['load', q.items[2], { autoplay: true, startAt: 42 }]);
});

test('persistence: round trip and corrupt data', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const p = createPersistence(storage);
  assert.equal(p.load(), null);
  const state = { ...initialPlayerState(), queue: Q.setItems(tracks(3), 1), volume: 0.2, repeat: 'all', position: 30 };
  p.save(state);
  const back = p.load();
  assert.equal(back.volume, 0.2); assert.equal(back.repeat, 'all'); assert.equal(back.position, 30);
  assert.equal(Q.currentItem(back.queue).id, '1');
  storage.setItem('mm:v1:player', '{not json');
  assert.equal(p.load(), null);
  assert.equal(fromSnapshot({ v: 99 }), null);
  const bad = fromSnapshot({ v: 1, volume: 'x', repeat: 'zzz', queue: { items: [{ id: 5 }, T('ok')], order: [9, 9], pos: 7 }, position: -3 });
  assert.equal(bad.volume, 0.8); assert.equal(bad.repeat, 'off'); assert.equal(bad.queue.items.length, 1);
  assert.equal(Q.currentItem(bad.queue).id, 'ok'); assert.equal(bad.position, 0);
  assert.ok(toSnapshot(state).queue);
});
test('persistence: survives throwing storage', () => {
  const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const p = createPersistence(boom);
  p.save(initialPlayerState()); p.clear();
  assert.equal(p.load(), null);
});

test('format helpers', () => {
  assert.equal(formatTime(0), '0:00'); assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3725), '1:02:05'); assert.equal(formatTime(NaN), '0:00'); assert.equal(formatTime(-4), '0:00');
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(hueFrom('a'), hueFrom('a')); assert.ok(hueFrom('zzz') < 360);
});
