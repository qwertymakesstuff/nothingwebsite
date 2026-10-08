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
  const svc = createYouTubeService({ fetchImpl: async (url) => { calls++; assert.match(url, /^\/api\/search\?q=Daft\+Punk&v=3$/); return res(good); } });
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

const CID = 'UC' + 'x'.repeat(22);
test('service: search returns sanitised channels (circle avatars need valid https art)', async () => {
  const body = { ok: true, tracks: [], channels: [
    { id: CID, title: 'Artist', artwork: 'https://yt3.ggpht.com/a.jpg', description: 'd', subscribers: 5000 },
    { id: CID, title: 'No Art', artwork: 'http://insecure', subscribers: -3 },
    { id: 'bad', title: 'Bad id' }, { id: CID }, null,
  ] };
  const svc = createYouTubeService({ fetchImpl: async () => res(body) });
  const r = await svc.search('artist');
  assert.equal(r.ok, true);
  assert.equal(r.channels.length, 2);
  assert.equal(r.channels[0].subscribers, 5000);
  assert.equal(r.channels[1].artwork, null); assert.equal(r.channels[1].subscribers, null);
  // old servers without `channels` still work
  const old = createYouTubeService({ fetchImpl: async () => res({ ok: true, tracks: [] }) });
  assert.deepEqual((await old.search('x')).channels, []);
});
test('service: channel() validates id, parses and caches', async () => {
  let calls = 0;
  const svc = createYouTubeService({ fetchImpl: async (url) => { calls++; assert.ok(url.startsWith('/api/channel?id=' + CID + '&v=')); return res({ ok: true, channel: { id: CID, title: 'Artist', subscribers: 10 }, tracks: [{ id: 'v', title: 'T', duration: 5 }] }); } });
  assert.equal((await svc.channel('nope')).error, 'not_found');
  assert.equal((await svc.channel(undefined)).error, 'not_found');
  const r = await svc.channel(CID);
  assert.equal(r.ok, true); assert.equal(r.channel.title, 'Artist'); assert.equal(r.tracks.length, 1);
  assert.equal((await svc.channel(CID)).cached, true); assert.equal(calls, 1);
});
test('service: channel() errors and malformed bodies', async () => {
  const mk = (f) => createYouTubeService({ fetchImpl: f });
  assert.equal((await mk(async () => res({ ok: false, error: 'not_found' }, 404)).channel(CID)).error, 'not_found');
  assert.equal((await mk(async () => res({ ok: true, tracks: [] })).channel(CID)).error, 'upstream');
  assert.equal((await mk(async () => res({ ok: true, channel: { id: 'bad' }, tracks: [] })).channel(CID)).error, 'upstream');
  assert.equal((await mk(async () => { throw new TypeError('x'); }).channel(CID)).error, 'network');
  const hang = (u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
  const ctrl = new AbortController(); const p = mk(hang).channel(CID, { signal: ctrl.signal }); ctrl.abort();
  assert.equal((await p).error, 'aborted');
});

test('service: channel() keeps popular songs with view counts', async () => {
  const body = { ok: true, channel: { id: CID, title: 'A' }, popular: [{ id: 'p1', title: 'Hit', duration: 5, views: 1500000000 }, { id: 'p2', title: 'Odd', views: -4 }], tracks: [{ id: 'l1', title: 'New', duration: 5 }] };
  const r = await createYouTubeService({ fetchImpl: async () => res(body) }).channel(CID);
  assert.equal(r.popular.length, 2); assert.equal(r.popular[0].views, 1500000000); assert.equal('views' in r.popular[1], false);
  assert.equal(r.tracks.length, 1);
  const old = await createYouTubeService({ fetchImpl: async () => res({ ok: true, channel: { id: CID, title: 'A' }, tracks: [] }) }).channel(CID);
  assert.deepEqual(old.popular, []);
});
