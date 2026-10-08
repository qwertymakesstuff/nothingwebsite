import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.js';
import { searchChannels, searchAll, getChannelPage, normalizeChannel, normalizeChannels, isChannelId, YouTubeError } from '../../worker/youtube.js';

const CID = (n) => 'UC' + String(n).padStart(22, 'x');       // valid 24-char channel ids
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status });
const chan = (n, over = {}) => ({
  id: CID(n),
  snippet: { title: `Artist ${n}`, description: 'Hello &amp; welcome', thumbnails: { medium: { url: `https://yt3.ggpht.com/${n}.jpg` } } },
  statistics: { subscriberCount: '1234567' },
  contentDetails: { relatedPlaylists: { uploads: `UU${n}` } },
  ...over,
});
const vid = (id) => ({
  id, snippet: { title: `Song ${id}`, channelTitle: 'Artist 1', liveBroadcastContent: 'none', thumbnails: { medium: { url: `https://i.ytimg.com/${id}.jpg` } } },
  contentDetails: { duration: 'PT3M' }, status: { embeddable: true, privacyStatus: 'public' },
});

/** Routes mocked YouTube endpoints by path + type. */
function yt({ channelHits = [1, 2], channelItems, videoHits = ['v1', 'v2'], playlist = ['v1', 'v2'], playlistStatus = 200, channelSearchFails = false, videoSearchFails = false } = {}) {
  const calls = [];
  const fn = async (u) => {
    const url = new URL(u); calls.push(url.pathname + '?' + url.searchParams.get('type'));
    if (url.pathname.endsWith('/search')) {
      if (url.searchParams.get('type') === 'channel') {
        if (channelSearchFails) return jsonRes({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403);
        return jsonRes({ items: channelHits.map((n) => ({ id: { channelId: CID(n) } })) });
      }
      if (videoSearchFails) return jsonRes({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403);
      return jsonRes({ items: videoHits.map((id) => ({ id: { videoId: id } })) });
    }
    if (url.pathname.endsWith('/channels')) {
      const ids = url.searchParams.get('id').split(',');
      return jsonRes({ items: channelItems ?? ids.map((id) => chan(Number(id.replace(/\D/g, '') || id.replace(/x/g, '').slice(2) || 1)) ).map((c, i) => ({ ...c, id: ids[i] })) });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      if (playlistStatus !== 200) return jsonRes({ error: { errors: [{ reason: 'playlistNotFound' }] } }, playlistStatus);
      return jsonRes({ items: playlist.map((id) => ({ contentDetails: { videoId: id } })) });
    }
    if (url.pathname.endsWith('/videos')) return jsonRes({ items: url.searchParams.get('id').split(',').map(vid) });
    return jsonRes({}, 500);
  };
  fn.calls = calls;
  return fn;
}

test('isChannelId', () => {
  assert.ok(isChannelId(CID(1)));
  for (const bad of ['', 'abc', 'UCshort', CID(1) + 'x', 'XX' + 'x'.repeat(22), null, undefined, 'UC' + '!'.repeat(22)]) assert.equal(isChannelId(bad), false);
});

test('normalizeChannel: title cleanup, https thumb, hidden subscribers, description', () => {
  const c = normalizeChannel(chan(1, { snippet: { title: 'Daft Punk - Topic', description: '  a   &amp; b ' + 'z'.repeat(300), thumbnails: { medium: { url: 'https://x/y.jpg' } } } }));
  assert.equal(c.title, 'Daft Punk');
  assert.equal(c.artwork, 'https://x/y.jpg');
  assert.equal(c.subscribers, 1234567);
  assert.ok(c.description.startsWith('a & b') && c.description.length <= 200 && c.description.endsWith('…'));
  assert.equal(normalizeChannel(chan(1, { statistics: { hiddenSubscriberCount: true, subscriberCount: '5' } })).subscribers, null);
  assert.equal(normalizeChannel(chan(1, { snippet: { title: 'T', thumbnails: { medium: { url: 'http://insecure/x.jpg' } } } })).artwork, null);
  assert.equal(normalizeChannel({ id: 'not-a-channel-id', snippet: { title: 'x' } }), null);
  assert.equal(normalizeChannel(chan(1, { snippet: { title: ' - Topic' } })), null);
  assert.equal(normalizeChannel(null), null);
});

test('normalizeChannels: search order kept, duplicate names dropped', () => {
  const items = [chan(1), chan(2, { snippet: { title: 'artist 1 - Topic', thumbnails: {} } }), chan(3)];
  const out = normalizeChannels(items, [CID(3), CID(1), CID(2)]);
  assert.deepEqual(out.map((c) => c.id), [CID(3), CID(1)]);
});

test('searchChannels: official channel search then details', async () => {
  const f = yt();
  const out = await searchChannels('artist', { apiKey: 'K', fetchImpl: f });
  assert.equal(out.length, 2);
  assert.ok(f.calls.some((c) => c.includes('/search?channel')));
  assert.ok(f.calls.some((c) => c.includes('/channels')));
  assert.deepEqual(await searchChannels('none', { apiKey: 'K', fetchImpl: yt({ channelHits: [] }) }), []);
  await assert.rejects(() => searchChannels('x', { fetchImpl: f }), (e) => e.code === 'not_configured');
});

test('searchAll: returns songs + channels; channel failure only drops channels', async () => {
  const both = await searchAll('artist', { apiKey: 'K', fetchImpl: yt() });
  assert.equal(both.tracks.length, 2); assert.equal(both.channels.length, 2);
  const degraded = await searchAll('artist', { apiKey: 'K', fetchImpl: yt({ channelSearchFails: true }) });
  assert.equal(degraded.tracks.length, 2); assert.deepEqual(degraded.channels, []);
  await assert.rejects(() => searchAll('artist', { apiKey: 'K', fetchImpl: yt({ videoSearchFails: true }) }), (e) => e.code === 'quota');
});

test('getChannelPage: profile + uploads, missing playlist, unknown channel', async () => {
  const page = await getChannelPage(CID(1), { apiKey: 'K', fetchImpl: yt({ channelItems: [chan(1)] }) });
  assert.equal(page.channel.id, CID(1)); assert.equal(page.tracks.length, 2); assert.equal(page.tracks[0].videoId, 'v1');
  const noPlaylist = await getChannelPage(CID(1), { apiKey: 'K', fetchImpl: yt({ channelItems: [chan(1)], playlistStatus: 404 }) });
  assert.deepEqual(noPlaylist.tracks, []);
  const noUploads = await getChannelPage(CID(1), { apiKey: 'K', fetchImpl: yt({ channelItems: [chan(1, { contentDetails: {} })] }) });
  assert.deepEqual(noUploads.tracks, []);
  await assert.rejects(() => getChannelPage(CID(1), { apiKey: 'K', fetchImpl: yt({ channelItems: [] }) }), (e) => e instanceof YouTubeError && e.code === 'not_found');
  await assert.rejects(() => getChannelPage('nope', { apiKey: 'K', fetchImpl: yt() }), (e) => e.code === 'not_found');
});

const ENV = { YOUTUBE_API_KEY: 'SECRETKEY', ASSETS: { fetch: async () => new Response('static') } };
const req = (p, init) => new Request(`https://music.missing.website${p}`, init);
async function withFetch(f, fn) { const real = globalThis.fetch; globalThis.fetch = f; try { return await fn(); } finally { globalThis.fetch = real; } }

test('worker /api/search includes channels', async () => {
  await withFetch(yt(), async () => {
    const r = await worker.fetch(req('/api/search?q=artist'), ENV, { waitUntil() {} });
    const body = await r.json();
    assert.equal(r.status, 200); assert.equal(body.ok, true);
    assert.equal(body.tracks.length, 2); assert.equal(body.channels.length, 2);
    assert.equal(body.channels[0].channelId, CID(1));
    assert.ok(!JSON.stringify(body).includes('SECRETKEY'));
  });
});

test('worker /api/channel: success, bad id, unknown, errors, method, cross-site', async () => {
  await withFetch(yt({ channelItems: [chan(1)] }), async () => {
    let r = await worker.fetch(req(`/api/channel?id=${CID(1)}`), ENV, { waitUntil() {} });
    let body = await r.json();
    assert.equal(r.status, 200); assert.equal(body.channel.title, 'Artist 1'); assert.equal(body.tracks.length, 2);
    assert.ok(!JSON.stringify(body).includes('SECRETKEY'));
    r = await worker.fetch(req('/api/channel?id=bad'), ENV); assert.equal(r.status, 404);
    r = await worker.fetch(req('/api/channel'), ENV); assert.equal(r.status, 404);
    r = await worker.fetch(req(`/api/channel?id=${CID(1)}`, { method: 'POST' }), ENV); assert.equal(r.status, 405);
    r = await worker.fetch(req(`/api/channel?id=${CID(1)}`, { headers: { 'sec-fetch-site': 'cross-site' } }), ENV); assert.equal(r.status, 403);
    r = await worker.fetch(req(`/api/channel?id=${CID(1)}`), { ASSETS: ENV.ASSETS }); assert.equal(r.status, 503);
  });
  await withFetch(yt({ channelItems: [] }), async () => {
    const r = await worker.fetch(req(`/api/channel?id=${CID(2)}`), ENV, { waitUntil() {} });
    assert.equal(r.status, 404); assert.equal((await r.json()).error, 'not_found');
  });
});
