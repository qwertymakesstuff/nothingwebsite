import test from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubeService } from '../../music/js/services/youtube.js';
import { createRecentSearches } from '../../music/js/storage/recentSearches.js';
import { fromSnapshot } from '../../music/js/storage/persistence.js';
import * as Q from '../../music/js/player/queueManager.js';

const res = (body, status = 200) => new Response(JSON.stringify(body), { status });
const good = { ok: true, tracks: [
  { id: 'a', videoId: 'a', title: 'A', artist: 'X', artwork: 'https://i.ytimg.com/a.jpg', duration: 100 },
  { id: 'b', title: 'B', artist: 5, artwork: 'http://bad/b.jpg', duration: -1 },
  { nope: true }, null,
] };

test('service: success sanitises tracks and caches by normalised query', async () => {
  let calls = 0;
  const svc = createYouTubeService({ fetchImpl: async (url) => { calls++; assert.match(url, /^\/api\/search\?q=Daft%20Punk$/); return res(good); } });
  const r = await svc.search('  Daft   Punk ');
  assert.equal(r.ok, true);
  assert.equal(r.tracks.length, 2);
  assert.equal(r.tracks[1].videoId, 'b'); assert.equal(r.tracks[1].artwork, null); assert.equal(r.tracks[1].artist, ''); assert.equal(r.tracks[1].duration, 0);
  const again = await svc.search('daft punk');
  assert.equal(again.cached, true); assert.equal(calls, 1);
});
test('service: cache expires', async () => {
  let t = 0, calls = 0;
  const svc = createYouTubeService({ now: () => t, fetchImpl: async () => { calls++; return res(good); } });
  await svc.search('x'); t = 11 * 60 * 1000; await svc.search('x');
  assert.equal(calls, 2);
});
test('service: input validation never hits the network', async () => {
  const svc = createYouTubeService({ fetchImpl: async () => { throw new Error('should not fetch'); } });
  assert.equal((await svc.search('   ')).error, 'empty');
  assert.equal((await svc.search('x'.repeat(101))).error, 'too_long');
});
test('service: maps server errors, missing backend and network failure', async () => {
  const mk = (f) => createYouTubeService({ fetchImpl: f });
  let r = await mk(async () => res({ ok: false, error: 'quota', message: 'limit' }, 429)).search('x');
  assert.deepEqual([r.ok, r.error, r.message], [false, 'quota', 'limit']);
  r = await mk(async () => res({ ok: false, error: 'not_configured' }, 503)).search('x');
  assert.equal(r.error, 'not_configured'); assert.match(r.message, /not set up/);
  r = await mk(async () => new Response('<html>404</html>', { status: 404 })).search('x');
  assert.equal(r.error, 'unavailable');
  r = await mk(async () => new Response('oops', { status: 500 })).search('x');
  assert.equal(r.error, 'upstream');
  r = await mk(async () => res({ ok: true })).search('x');
  assert.equal(r.error, 'upstream');
  r = await mk(async () => { throw new TypeError('Failed to fetch'); }).search('x');
  assert.equal(r.error, 'network');
});
test('service: caller abort and timeout', async () => {
  const hang = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const ctrl = new AbortController();
  const svc = createYouTubeService({ fetchImpl: hang, timeoutMs: 5000 });
  const p = svc.search('x', { signal: ctrl.signal });
  ctrl.abort();
  assert.equal((await p).error, 'aborted');
  const slow = createYouTubeService({ fetchImpl: hang, timeoutMs: 30 });
  assert.equal((await slow.search('y')).error, 'timeout');
  const pre = new AbortController(); pre.abort();
  assert.equal((await svc.search('z', { signal: pre.signal })).error, 'aborted');
});
test('service: failures are not cached', async () => {
  let n = 0;
  const svc = createYouTubeService({ fetchImpl: async () => (++n === 1 ? res({ ok: false, error: 'upstream' }, 502) : res(good)) });
  assert.equal((await svc.search('q')).ok, false);
  assert.equal((await svc.search('q')).ok, true);
});

test('recent searches: dedupe, order, cap, remove, corrupt data', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const r = createRecentSearches(storage);
  assert.deepEqual(r.list(), []);
  r.add('Daft Punk'); r.add('  radiohead '); r.add('daft   punk');
  assert.deepEqual(r.list(), ['daft punk', 'radiohead']);
  r.add(''); r.add('   ');
  assert.equal(r.list().length, 2);
  for (let i = 0; i < 15; i++) r.add('q' + i);
  assert.equal(r.list().length, 10); assert.equal(r.list()[0], 'q14');
  assert.ok(!r.remove('Q14').includes('q14'));
  r.clear(); assert.deepEqual(r.list(), []);
  storage.setItem('mm:v1:recent-searches', '{bad'); assert.deepEqual(r.list(), []);
  storage.setItem('mm:v1:recent-searches', JSON.stringify([1, '', 'ok'])); assert.deepEqual(r.list(), ['ok']);
});
test('persistence keeps videoId for later playback', () => {
  const q = Q.setItems([{ id: 'a', videoId: 'vA', title: 'T', artist: 'x', duration: 5 }, { id: 'b', title: 'U', duration: 5 }], 0);
  const back = fromSnapshot({ v: 1, queue: q, position: 0 });
  assert.equal(back.queue.items[0].videoId, 'vA');
  assert.equal('videoId' in back.queue.items[1], false);
});
