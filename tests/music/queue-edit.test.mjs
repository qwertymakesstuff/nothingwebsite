import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../music/js/core/store.js';
import * as Q from '../../music/js/player/queueManager.js';
import { createPlayer, initialPlayerState, selectCurrent } from '../../music/js/player/player.js';
import { formatDuration } from '../../music/js/utils/format.js';

const T = (id) => ({ id, title: 't' + id, artist: 'a', duration: 100 });
const tracks = (n) => Array.from({ length: n }, (_, i) => T(String(i)));
const ids = (q) => Q.playOrderItems(q).map((t) => t.id);
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

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

test('queue.move: reorders and keeps the current song current', () => {
  const q = Q.setItems(tracks(5), 2);
  const m = Q.move(q, 4, 0);
  assert.deepEqual(ids(m), ['4', '0', '1', '2', '3']);
  assert.equal(Q.currentItem(m).id, '2');
  const m2 = Q.move(q, 2, 4); // move the current song itself
  assert.deepEqual(ids(m2), ['0', '1', '3', '4', '2']);
  assert.equal(Q.currentItem(m2).id, '2');
});

test('queue.move: ignores bad input', () => {
  const q = Q.setItems(tracks(3), 0);
  for (const [a, b] of [[0, 0], [-1, 1], [1, 9], [1.5, 0], [NaN, 1], ['1', 2]]) assert.equal(Q.move(q, a, b), q);
  assert.equal(Q.move(Q.emptyQueue(), 0, 1).items.length, 0);
});

test('queue.move: random moves keep every song exactly once and the current one current (unshuffled and shuffled)', () => {
  const rng = lcg(7);
  for (const shuffle of [false, true]) {
    let q = Q.setItems(tracks(12), 5, { shuffle, rng });
    const want = [...q.items.map((t) => t.id)].sort();
    for (let k = 0; k < 300; k++) {
      const cur = Q.currentItem(q).id;
      q = Q.move(q, Math.floor(rng() * 12), Math.floor(rng() * 12));
      assert.equal(Q.currentItem(q).id, cur);
      assert.deepEqual([...q.items.map((t) => t.id)].sort(), want);
      assert.deepEqual([...q.order].sort((a, b) => a - b), q.items.map((_, i) => i));
    }
  }
});

test('queue.move: while shuffled, only the play order changes (turning shuffle off restores the added order)', () => {
  const rng = lcg(3);
  let q = Q.setItems(tracks(6), 0, { shuffle: true, rng });
  const added = q.items.map((t) => t.id);
  q = Q.move(q, 4, 1);
  assert.deepEqual(q.items.map((t) => t.id), added);
  const off = Q.rebuildOrder(q, false);
  assert.deepEqual(ids(off), added);
});

test('queue.moveToNext', () => {
  const q = Q.setItems(tracks(6), 1);
  assert.deepEqual(ids(Q.moveToNext(q, 4)), ['0', '1', '4', '2', '3', '5']);
  assert.deepEqual(ids(Q.moveToNext(q, 0)), ['1', '0', '2', '3', '4', '5']); // from before the current song
  assert.equal(Q.currentItem(Q.moveToNext(q, 0)).id, '1');
  assert.equal(Q.moveToNext(q, 1), q);
});

test('queue.next: repeat all + shuffle reshuffles and never repeats the song that just played', () => {
  const rng = lcg(11);
  for (let k = 0; k < 100; k++) {
    let q = Q.setItems(tracks(5), 0, { shuffle: true, rng });
    q = { ...q, pos: q.order.length - 1 };
    const last = Q.currentIndex(q);
    const r = Q.next(q, { repeat: 'all', shuffle: true, rng });
    assert.equal(r.moved, true);
    assert.equal(r.queue.pos, 0);
    assert.notEqual(Q.currentIndex(r.queue), last);
    assert.deepEqual([...r.queue.order].sort(), [0, 1, 2, 3, 4]);
  }
  const one = Q.next({ ...Q.setItems(tracks(1), 0), pos: 0 }, { repeat: 'all', shuffle: true });
  assert.equal(one.moved, true);
});

test('queue.next: repeat all without shuffle wraps in the same order; off ends', () => {
  const q = Q.setItems(tracks(3), 2);
  assert.deepEqual(Q.next(q, { repeat: 'all' }).queue.pos, 0);
  assert.equal(Q.next(q, { repeat: 'off' }).ended, true);
});

test('player: queue is capped at MAX_QUEUE and tells the user', () => {
  const { store, player, notes } = setup();
  player.enqueue(tracks(Q.MAX_QUEUE - 1));
  player.enqueue(tracks(5).map((t) => ({ ...t, id: 'x' + t.id })));
  assert.equal(store.getState().queue.items.length, Q.MAX_QUEUE);
  assert.match(notes.at(-1)[0], /up to 500/);
  const n = notes.length;
  player.playNext(T('late'));
  assert.equal(store.getState().queue.items.length, Q.MAX_QUEUE);
  assert.equal(notes.length, n + 1);
});

test('player: moveInQueue does not interrupt playback; moveNext reorders', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(5), 1);
  engine.emit('state', 'playing');
  const loads = () => engine.calls.filter((c) => c[0] === 'load').length;
  const before = loads();
  player.moveInQueue(4, 0);
  player.moveNext(4);
  assert.equal(loads(), before);
  assert.equal(selectCurrent(store.getState()).id, '1');
  assert.equal(store.getState().status, 'playing');
});

test('player: removeFromQueue returns an undo that restores the queue', () => {
  const { store, player } = setup();
  player.playTracks(tracks(4), 1);
  const undo = player.removeFromQueue(3);
  assert.equal(store.getState().queue.items.length, 3);
  assert.equal(undo(), true);
  assert.deepEqual(ids(store.getState().queue), ['0', '1', '2', '3']);
  assert.equal(selectCurrent(store.getState()).id, '1');
});

test('player: undo after removing the playing song brings it back paused at its old position', () => {
  const { store, engine, player } = setup();
  player.playTracks(tracks(3), 1);
  engine.emit('state', 'playing'); engine.emit('time', 42, 100);
  const undo = player.removeFromQueue(1);
  assert.equal(selectCurrent(store.getState()).id, '2');
  assert.equal(undo(), true);
  assert.equal(selectCurrent(store.getState()).id, '1');
  const load = engine.calls.filter((c) => c[0] === 'load').at(-1);
  assert.equal(load[2].autoplay, false);
  assert.equal(load[2].startAt, 42);
  assert.equal(store.getState().position, 42);
});

test('player: clearQueue undo restores everything; undo is refused once the queue changed again', () => {
  const { store, player } = setup();
  player.playTracks(tracks(3), 2);
  const undo = player.clearQueue();
  assert.equal(store.getState().queue.items.length, 0);
  assert.equal(undo(), true);
  assert.deepEqual(ids(store.getState().queue), ['0', '1', '2']);
  assert.equal(selectCurrent(store.getState()).id, '2');

  const u2 = player.clearQueue();
  player.enqueue([T('new')]);
  assert.equal(u2(), false);
  assert.deepEqual(ids(store.getState().queue), ['new']);

  const u3 = player.removeFromQueue(0);
  assert.equal(u3(), true);
  assert.equal(u3(), false); // already undone
  assert.deepEqual(ids(store.getState().queue), ['new']);
});

test('player: undo functions for no-ops do nothing', () => {
  const { player } = setup();
  assert.equal(player.clearQueue()(), false);
  assert.equal(player.removeFromQueue(3)(), false);
});

test('player: skipping to another song does not block undoing a removal', () => {
  const { store, player } = setup();
  player.playTracks(tracks(4), 0);
  const undo = player.removeFromQueue(3);
  player.next();
  assert.equal(undo(), true);
  assert.equal(store.getState().queue.items.length, 4);
});

test('format: duration in words', () => {
  assert.equal(formatDuration(0), '1 min');
  assert.equal(formatDuration(2520), '42 min');
  assert.equal(formatDuration(7500), '2 hr 5 min');
  assert.equal(formatDuration(7200), '2 hr');
});
