import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibrary, cleanTracks, cleanPlaylists, cleanName, pushRecent, totalSeconds, LIMITS } from '../../music/js/storage/library.js';
import { createStore } from '../../music/js/core/store.js';
import { createPlayer, initialPlayerState } from '../../music/js/player/player.js';

const T = (id, extra = {}) => ({ id: String(id), title: 't' + id, artist: 'a', duration: 100, videoId: 'v' + id, ...extra });
const tracks = (n, from = 0) => Array.from({ length: n }, (_, i) => T(from + i));
const memStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
};
const make = (storage = memStorage(), extra = {}) => {
  let n = 0;
  const notes = [];
  const lib = createLibrary({ storage, uid: () => 'id' + ++n, now: () => 1000 + n, notify: (m, k) => notes.push([m, k]), saveDelayMs: 0, ...extra });
  return { lib, storage, notes };
};
const names = (lib) => lib.getState().playlists.map((p) => p.name);

test('cleanTracks: drops junk, de-duplicates, caps', () => {
  const out = cleanTracks([T(1), null, { id: 5 }, T(1, { title: 'dup' }), 'x', T(2)], 10);
  assert.deepEqual(out.map((t) => t.id), ['1', '2']);
  assert.equal(out[0].title, 't1');
  assert.equal(cleanTracks(tracks(20), 5).length, 5);
  assert.deepEqual(cleanTracks('nope', 5), []);
  assert.ok(!('evil' in cleanTracks([{ ...T(1), evil: '<script>' }], 5)[0]), 'unknown fields are not kept');
});

test('cleanPlaylists: validates ids and names, caps, keeps old-format playlists', () => {
  const out = cleanPlaylists([
    { id: 'a', name: '  Road   trip  ', tracks: tracks(3) },
    { id: 'a', name: 'dup id', tracks: [] },
    { id: '', name: 'no id' }, { id: 'b', name: '   ' }, { id: 'c' }, null, 7,
    { id: 'd', name: 'x'.repeat(500), tracks: 'not a list' },
  ]);
  assert.deepEqual(out.map((p) => p.id), ['a', 'd']);
  assert.equal(out[0].name, 'Road trip');
  assert.equal(out[0].tracks.length, 3);
  assert.equal(out[1].name.length, LIMITS.name);
  assert.deepEqual(out[1].tracks, []);
  assert.equal(cleanPlaylists(Array.from({ length: 300 }, (_, i) => ({ id: 'p' + i, name: 'n' + i }))).length, LIMITS.playlists);
  assert.equal(cleanName(null), '');
});

test('pushRecent: newest first, no duplicates, capped, same song twice in a row is a no-op', () => {
  let l = [];
  for (let i = 0; i < 60; i++) l = pushRecent(l, T(i));
  assert.equal(l.length, LIMITS.recent);
  assert.equal(l[0].id, '59');
  const again = pushRecent(l, T(30));
  assert.equal(again[0].id, '30');
  assert.equal(again.filter((t) => t.id === '30').length, 1);
  assert.equal(pushRecent(again, T(30)), again, 'same object back when nothing changes');
  assert.equal(pushRecent(l, { nope: 1 }), l);
});

test('favorites: toggle on/off, newest first, persisted', () => {
  const { lib, storage } = make();
  assert.equal(lib.toggleFavorite(T(1)), true);
  assert.equal(lib.toggleFavorite(T(2)), true);
  assert.deepEqual(lib.getState().favorites.map((t) => t.id), ['2', '1']);
  assert.equal(lib.isFavorite('1'), true);
  assert.equal(lib.toggleFavorite(T(1)), false);
  assert.equal(lib.isFavorite('1'), false);
  assert.equal(lib.toggleFavorite({ junk: true }), null);
  const again = make(storage).lib;
  assert.deepEqual(again.getState().favorites.map((t) => t.id), ['2'], 'survives a reload');
});

test('favorites: limit', () => {
  const { lib, notes } = make();
  for (let i = 0; i < LIMITS.favorites; i++) lib.toggleFavorite(T(i));
  assert.equal(lib.toggleFavorite(T('extra')), null);
  assert.equal(lib.getState().favorites.length, LIMITS.favorites);
  assert.match(notes.at(-1)[0], /up to 1000/);
});

test('recently played: recorded, de-duplicated, clear is undoable', () => {
  const { lib } = make();
  lib.recordPlayed(T(1)); lib.recordPlayed(T(2)); lib.recordPlayed(T(1));
  assert.deepEqual(lib.getState().recent.map((t) => t.id), ['1', '2']);
  const undo = lib.clearRecent();
  assert.equal(lib.getState().recent.length, 0);
  assert.equal(undo(), true);
  assert.equal(lib.getState().recent.length, 2);
  lib.clearRecent();
  assert.equal(lib.clearRecent()(), false, 'nothing to clear');
});

test('playlists: create, rename, add, de-duplicate, remove, move, delete', () => {
  const { lib } = make();
  assert.equal(lib.createPlaylist('   '), null);
  const p = lib.createPlaylist('  Mix  ', tracks(2));
  assert.equal(p.name, 'Mix');
  assert.equal(p.tracks.length, 2);
  assert.equal(lib.renamePlaylist(p.id, 'Better mix'), true);
  assert.equal(lib.renamePlaylist(p.id, ''), false);
  assert.equal(lib.renamePlaylist('nope', 'x'), false);
  assert.deepEqual(lib.addToPlaylist(p.id, [T(1), T(5), T(6)]), { added: 2, duplicates: 1, skipped: 0 });
  assert.equal(lib.addToPlaylist('nope', [T(9)]), null);
  assert.deepEqual(lib.getPlaylist(p.id).tracks.map((t) => t.id), ['0', '1', '5', '6']);
  assert.equal(lib.moveInPlaylist(p.id, 3, 0), true);
  assert.deepEqual(lib.getPlaylist(p.id).tracks.map((t) => t.id), ['6', '0', '1', '5']);
  assert.equal(lib.moveInPlaylist(p.id, 0, 0), false);
  assert.equal(lib.moveInPlaylist(p.id, 0, 9), false);
  assert.equal(lib.removeFromPlaylist(p.id, 99)(), false);
  const undo = lib.removeFromPlaylist(p.id, 1);
  assert.deepEqual(lib.getPlaylist(p.id).tracks.map((t) => t.id), ['6', '1', '5']);
  assert.equal(undo(), true);
  assert.deepEqual(lib.getPlaylist(p.id).tracks.map((t) => t.id), ['6', '0', '1', '5']);
  assert.equal(undo(), false, 'an undo can only be used once');
});

test('playlists: delete is undoable and returns to the same place; undo refused after another edit', () => {
  const { lib } = make();
  const a = lib.createPlaylist('A'); const b = lib.createPlaylist('B'); lib.createPlaylist('C');
  const undo = lib.deletePlaylist(b.id);
  assert.deepEqual(names(lib), ['A', 'C']);
  assert.equal(undo(), true);
  assert.deepEqual(names(lib), ['A', 'B', 'C']);
  const undo2 = lib.deletePlaylist(a.id);
  lib.createPlaylist('D');
  assert.equal(undo2(), false);
  assert.deepEqual(names(lib), ['B', 'C', 'D']);
  assert.equal(lib.deletePlaylist('nope')(), false);
});

test('playlist size and count limits', () => {
  const { lib, notes } = make();
  const p = lib.createPlaylist('Big', tracks(LIMITS.playlistTracks - 1));
  const r = lib.addToPlaylist(p.id, tracks(5, 1000));
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 4);
  assert.equal(lib.getPlaylist(p.id).tracks.length, LIMITS.playlistTracks);
  assert.match(notes.at(-1)[0], /up to 500/);
  const many = make().lib;
  for (let i = 0; i < LIMITS.playlists; i++) many.createPlaylist('p' + i);
  assert.equal(many.createPlaylist('one too many'), null);
});

test('importPlaylist: creates, then refreshes the same source instead of duplicating', () => {
  const { lib } = make();
  const a = lib.importPlaylist({ id: 'PLabc', title: 'Mix', tracks: tracks(3) });
  assert.equal(a.tracks.length, 3);
  lib.importPlaylist({ id: 'PLabc', title: 'Mix v2', tracks: tracks(4) });
  assert.equal(lib.getState().playlists.length, 1);
  assert.equal(lib.getPlaylist('PLabc').name, 'Mix v2');
  assert.equal(lib.getPlaylist('PLabc').tracks.length, 4);
  assert.equal(lib.importPlaylist({ id: 'PLx', title: 'Empty', tracks: [] }), null);
  assert.equal(lib.importPlaylist({ id: '', title: 'x', tracks: tracks(1) }), null);
});

test('persistence: corrupt or hostile saved data never breaks loading', () => {
  const bad = memStorage({ 'mm:v1:favorites': '{not json', 'mm:v1:recent': '"a string"', 'mm:v1:playlists': JSON.stringify([{ id: 1 }, { id: 'ok', name: 'Fine', tracks: [{ id: 'x', title: 'y' }, 5] }]) });
  const { lib } = make(bad);
  assert.deepEqual(lib.getState().favorites, []);
  assert.deepEqual(lib.getState().recent, []);
  assert.equal(lib.getState().playlists.length, 1);
  assert.equal(lib.getState().playlists[0].tracks.length, 1);
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  const { lib: l2, notes } = make(throwing);
  assert.equal(l2.toggleFavorite(T(1)), true, 'still works in memory');
  l2.toggleFavorite(T(2));
  assert.equal(notes.filter((n) => /Couldn't save/.test(n[0])).length, 1, 'tells the user once');
});

test('persistence: saves are debounced and flush() writes right away', async () => {
  const storage = memStorage();
  const { lib } = make(storage, { saveDelayMs: 30 });
  lib.toggleFavorite(T(1)); lib.toggleFavorite(T(2));
  assert.equal(storage.m.has('mm:v1:favorites'), false);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(JSON.parse(storage.m.get('mm:v1:favorites')).length, 2);
  lib.toggleFavorite(T(3)); lib.flush();
  assert.equal(JSON.parse(storage.m.get('mm:v1:favorites')).length, 3);
});

test('reload(): takes over what another tab saved', () => {
  const storage = memStorage();
  const a = make(storage).lib, b = make(storage).lib;
  a.toggleFavorite(T(1));
  assert.equal(b.getState().favorites.length, 0);
  b.reload();
  assert.equal(b.getState().favorites.length, 1);
});

test('subscribers only hear about the part they selected', () => {
  const { lib } = make();
  let favCalls = 0;
  lib.subscribe((s) => s.favorites, () => { favCalls++; }, { immediate: false });
  lib.createPlaylist('x'); lib.recordPlayed(T(1));
  assert.equal(favCalls, 0);
  lib.toggleFavorite(T(1));
  assert.equal(favCalls, 1);
});

test('totalSeconds', () => { assert.equal(totalSeconds([{ duration: 60 }, { duration: 30 }, {}]), 90); });

test('player.playShuffled: turns shuffle on, plays everything once, current first', () => {
  const store = createStore(initialPlayerState());
  const calls = [];
  const engine = { on() {}, load: (t) => calls.push(t.id), play() {}, pause() {}, stop() {}, seek() {}, setVolume() {} };
  const player = createPlayer({ store, engine });
  player.playShuffled(tracks(8));
  const s = store.getState();
  assert.equal(s.shuffle, true);
  assert.equal(s.queue.items.length, 8);
  assert.equal(s.queue.pos, 0);
  assert.deepEqual([...s.queue.order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(calls.length, 1);
  player.playShuffled([]);
  assert.equal(store.getState().queue.items.length, 8, 'empty list is ignored');
});

import { playlistIdFromInput } from '../../music/js/utils/playlistUrl.js';
test('playlistIdFromInput: links, bare ids, and rejects everything else', () => {
  const id = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
  assert.equal(playlistIdFromInput(`https://www.youtube.com/playlist?list=${id}`), id);
  assert.equal(playlistIdFromInput(`https://music.youtube.com/playlist?list=${id}&si=abc`), id);
  assert.equal(playlistIdFromInput(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${id}&index=2`), id);
  assert.equal(playlistIdFromInput(`  youtube.com/playlist?list=${id}  `), id);
  assert.equal(playlistIdFromInput(id), id);
  assert.equal(playlistIdFromInput('hello-world-thing'), null, 'a random word is not an id');
  assert.equal(playlistIdFromInput(`https://evil.example/playlist?list=${id}`), null);
  assert.equal(playlistIdFromInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(playlistIdFromInput(''), null);
  assert.equal(playlistIdFromInput(null), null);
  assert.equal(playlistIdFromInput('javascript:alert(1)'), null);
});
