import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeQuery, isSameSite } from '../../worker/index.js';
import { decodeEntities, parseDuration, cleanArtist, normalizeVideos, searchYouTube, YouTubeError } from '../../worker/youtube.js';

const vid = (id, over = {}) => ({
  id,
  snippet: { title: `Song ${id}`, channelTitle: 'Artist - Topic', liveBroadcastContent: 'none', thumbnails: { medium: { url: `https://i.ytimg.com/${id}.jpg` } } },
  contentDetails: { duration: 'PT3M5S' },
  status: { embeddable: true, privacyStatus: 'public' },
  ...over,
});
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function mockFetch({ search = ['a', 'b', 'c'], videos, status = 200, errorBody } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    if (errorBody) return jsonRes(errorBody, status);
    if (String(url).includes('/search')) return jsonRes({ items: search.map((id) => ({ id: { videoId: id } })) });
    return jsonRes({ items: videos ?? search.map((id) => vid(id)) });
  };
  fn.calls = calls;
  return fn;
}

test('decodeEntities / parseDuration / cleanArtist', () => {
  assert.equal(decodeEntities('Rock &amp; Roll &#39;n&#x27; &quot;Hi&quot; &lt;3'), `Rock & Roll 'n' "Hi" <3`);
  assert.equal(decodeEntities('&unknown; &#99999999999;'), '&unknown; &#99999999999;');
  assert.equal(parseDuration('PT3M45S'), 225);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('PT45S'), 45);
  assert.equal(parseDuration('P1DT1H'), 90000);
  assert.equal(parseDuration('P0D'), 0);
  assert.equal(parseDuration('nonsense'), 0);
  assert.equal(parseDuration(undefined), 0);
  assert.equal(cleanArtist('Daft Punk - Topic'), 'Daft Punk');
  assert.equal(cleanArtist('AC&amp;DC'), 'AC&DC');
});

test('normalizeVideos drops unplayable items and keeps search order', () => {
  const items = [
    vid('ok1'),
    vid('private', { status: { embeddable: true, privacyStatus: 'private' } }),
    vid('noembed', { status: { embeddable: false, privacyStatus: 'public' } }),
    vid('live', { snippet: { title: 'Live', channelTitle: 'x', liveBroadcastContent: 'live', thumbnails: {} } }),
    vid('zero', { contentDetails: { duration: 'P0D' } }),
    vid('http', { snippet: { title: 'T', channelTitle: 'c', liveBroadcastContent: 'none', thumbnails: { medium: { url: 'http://insecure/x.jpg' } } } }),
    { id: 'nosnippet' },
    null,
    vid('ok2'),
  ];
  const out = normalizeVideos(items, ['ok2', 'ok1', 'private', 'noembed', 'live', 'zero', 'http', 'nosnippet', 'missing']);
  assert.deepEqual(out.map((t) => t.id), ['ok2', 'ok1', 'http']);
  assert.equal(out[1].artist, 'Artist');
  assert.equal(out[1].duration, 185);
  assert.equal(out[1].videoId, 'ok1');
  assert.equal(out[2].artwork, null); // non-https artwork is rejected
});

test('searchYouTube: builds official API requests and normalises', async () => {
  const f = mockFetch();
  const tracks = await searchYouTube('daft punk', { apiKey: 'KEY', fetchImpl: f });
  assert.equal(tracks.length, 3);
  assert.equal(f.calls.length, 2);
  assert.match(f.calls[0], /googleapis\.com\/youtube\/v3\/search/);
  assert.match(f.calls[0], /videoEmbeddable=true/);
  assert.match(f.calls[0], /q=daft\+punk/);
  assert.match(f.calls[1], /\/videos\?/);
  assert.match(f.calls[1], /id=a%2Cb%2Cc/);
});
test('searchYouTube: no results skips the second call; missing key throws', async () => {
  const f = mockFetch({ search: [] });
  assert.deepEqual(await searchYouTube('zzzz', { apiKey: 'K', fetchImpl: f }), []);
  assert.equal(f.calls.length, 1);
  await assert.rejects(() => searchYouTube('x', { fetchImpl: f }), (e) => e instanceof YouTubeError && e.code === 'not_configured');
});
test('searchYouTube: maps quota, key and network errors', async () => {
  const quota = mockFetch({ status: 403, errorBody: { error: { errors: [{ reason: 'quotaExceeded' }] } } });
  await assert.rejects(() => searchYouTube('x', { apiKey: 'K', fetchImpl: quota }), (e) => e.code === 'quota' && e.status === 429);
  const badKey = mockFetch({ status: 400, errorBody: { error: { errors: [{ reason: 'keyInvalid' }] } } });
  await assert.rejects(() => searchYouTube('x', { apiKey: 'K', fetchImpl: badKey }), (e) => e.code === 'bad_key');
  const down = mockFetch({ status: 500, errorBody: { error: {} } });
  await assert.rejects(() => searchYouTube('x', { apiKey: 'K', fetchImpl: down }), (e) => e.code === 'upstream');
  await assert.rejects(() => searchYouTube('x', { apiKey: 'K', fetchImpl: async () => { throw new TypeError('network'); } }), (e) => e.code === 'upstream');
});
test('the API key never appears in error messages', async () => {
  const quota = mockFetch({ status: 403, errorBody: { error: { errors: [{ reason: 'quotaExceeded' }] } } });
  try { await searchYouTube('x', { apiKey: 'SECRETKEY123', fetchImpl: quota }); } catch (e) { assert.ok(!e.message.includes('SECRETKEY123')); }
});

const ENV = { YOUTUBE_API_KEY: 'KEY', ASSETS: { fetch: async () => new Response('static') } };
const req = (path, init) => new Request(`https://music.missing.website${path}`, init);

test('worker: validation and routing', async () => {
  assert.equal(normalizeQuery('  a   b \n c '), 'a b c');
  let r = await worker.fetch(req('/api/search'), ENV);
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'empty');
  r = await worker.fetch(req('/api/search?q=' + 'x'.repeat(101)), ENV);
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'too_long');
  r = await worker.fetch(req('/api/search?q=hi', { method: 'POST' }), ENV);
  assert.equal(r.status, 405);
  r = await worker.fetch(req('/api/nope'), ENV);
  assert.equal(r.status, 404);
  r = await worker.fetch(req('/index.html'), ENV);
  assert.equal(await r.text(), 'static');
});
test('worker: not configured without a key', async () => {
  const r = await worker.fetch(req('/api/search?q=hello'), { ASSETS: ENV.ASSETS });
  assert.equal(r.status, 503);
  const body = await r.json();
  assert.equal(body.ok, false); assert.equal(body.error, 'not_configured');
});
test('worker: success path returns tracks (mocked YouTube)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = mockFetch();
  try {
    const r = await worker.fetch(req('/api/search?q=hello%20world'), ENV, { waitUntil() {} });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.ok, true); assert.equal(body.query, 'hello world'); assert.equal(body.tracks.length, 3);
    assert.equal(JSON.stringify(body).includes('KEY'), false);
  } finally { globalThis.fetch = realFetch; }
});
test('worker: upstream errors become friendly JSON', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = mockFetch({ status: 403, errorBody: { error: { errors: [{ reason: 'quotaExceeded' }] } } });
  try {
    const r = await worker.fetch(req('/api/search?q=hello'), ENV, { waitUntil() {} });
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error, 'quota');
  } finally { globalThis.fetch = realFetch; }
});
test('worker: blocks cross-site browser requests', async () => {
  const u = new URL('https://music.missing.website/api/search?q=a');
  const mk = (h) => new Request(u, { headers: h });
  assert.equal(isSameSite(mk({ 'sec-fetch-site': 'same-origin' }), u), true);
  assert.equal(isSameSite(mk({ 'sec-fetch-site': 'cross-site' }), u), false);
  assert.equal(isSameSite(mk({ origin: 'https://evil.example' }), u), false);
  assert.equal(isSameSite(mk({ origin: 'https://music.missing.website' }), u), true);
  assert.equal(isSameSite(mk({}), u), true);
  const r = await worker.fetch(new Request(u, { headers: { 'sec-fetch-site': 'cross-site' } }), ENV);
  assert.equal(r.status, 403);
});
