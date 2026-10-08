// YouTube Data API (official) search + normalisation. Runs inside the Worker only,
// so the API key never reaches the browser. No scraping and no audio extraction:
// we only read public metadata (title, channel, thumbnail, duration, video id).
//
// Quota note: search.list costs 100 units per call (10,000/day on the free tier),
// videos.list costs 1. That is why results are cached and search is submit-only.

const API = 'https://www.googleapis.com/youtube/v3';

export class YouTubeError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'YouTubeError';
    this.code = code;     // not_configured | quota | upstream | bad_key
    this.status = status;
  }
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(str) {
  return String(str ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** ISO-8601 duration ("PT3M45S", "PT1H2M", "P1DT2H") -> seconds. 0 if unparseable. */
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso ?? ''));
  if (!m) return 0;
  const [, d = 0, h = 0, min = 0, s = 0] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s);
}

export function cleanArtist(channelTitle) {
  return decodeEntities(channelTitle).replace(/\s*-\s*Topic$/i, '').trim();
}

function pickThumbnail(thumbs = {}) {
  // maxres/standard are 16:9 without letterbox bars when present; medium always is.
  return (thumbs.maxres || thumbs.medium || thumbs.high || thumbs.default || {}).url || null;
}

/** Turn videos.list items into Track objects, dropping anything we could not play. */
export function normalizeVideos(items, order) {
  const byId = new Map();
  for (const v of items || []) {
    const id = v?.id;
    const sn = v?.snippet;
    if (typeof id !== 'string' || !sn) continue;
    if (v.status && (v.status.embeddable === false || (v.status.privacyStatus && v.status.privacyStatus !== 'public'))) continue;
    if (sn.liveBroadcastContent && sn.liveBroadcastContent !== 'none') continue;
    const duration = parseDuration(v.contentDetails?.duration);
    if (!duration) continue;
    const thumb = pickThumbnail(sn.thumbnails);
    const views = Number(v.statistics?.viewCount);
    byId.set(id, {
      id,
      videoId: id,
      title: decodeEntities(sn.title).trim() || 'Untitled',
      artist: cleanArtist(sn.channelTitle),
      artwork: thumb && thumb.startsWith('https://') ? thumb : null,
      duration,
      ...(Number.isFinite(views) && views > 0 ? { views } : {}),
    });
  }
  // Keep YouTube's relevance order from the search call.
  return (order || [...byId.keys()]).map((id) => byId.get(id)).filter(Boolean);
}

async function getJson(fetchImpl, url, { allow404 = false } = {}) {
  let res;
  try {
    res = await fetchImpl(url.toString(), { headers: { accept: 'application/json' } });
  } catch {
    throw new YouTubeError('upstream', 'Could not reach YouTube.', 502);
  }
  let body = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (res.ok && body) return body;
  if (allow404 && res.status === 404) return null;

  const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || '';
  if (/quota|dailyLimit|rateLimit/i.test(reason)) throw new YouTubeError('quota', 'The daily search limit has been reached. Try again tomorrow.', 429);
  if (/keyInvalid|API_KEY|ipRefererBlocked|accessNotConfigured|forbidden/i.test(reason) || res.status === 400 || res.status === 403) {
    throw new YouTubeError('bad_key', 'Search is misconfigured on the server.', 500);
  }
  throw new YouTubeError('upstream', 'YouTube returned an error.', 502);
}

/**
 * @returns {Promise<Array<{id:string, videoId:string, title:string, artist:string, artwork:string|null, duration:number}>>}
 */
export async function searchYouTube(query, { apiKey, fetchImpl = fetch, maxResults = 20 } = {}) {
  if (!apiKey) throw new YouTubeError('not_configured', 'Search is not set up yet.', 503);

  const s = new URL(`${API}/search`);
  s.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: String(maxResults),
    videoCategoryId: '10',      // Music
    videoEmbeddable: 'true',    // only videos the official embedded player may play
    videoSyndicated: 'true',
    key: apiKey,
  }).toString();
  const found = await getJson(fetchImpl, s);
  const ids = (found.items || []).map((i) => i?.id?.videoId).filter((x) => typeof x === 'string');
  if (!ids.length) return [];

  const v = new URL(`${API}/videos`);
  v.search = new URLSearchParams({
    part: 'snippet,contentDetails,status,statistics',
    id: ids.join(','),
    key: apiKey,
  }).toString();
  const details = await getJson(fetchImpl, v);
  return normalizeVideos(details.items, ids);
}

// ---------------------------------------------------------------------------
// Channels / artists
// ---------------------------------------------------------------------------

const CHANNEL_ID = /^UC[\w-]{22}$/;
export const isChannelId = (id) => CHANNEL_ID.test(String(id ?? ''));

function shorten(text, max = 200) {
  const t = decodeEntities(text).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** channels.list item -> Channel. */
export function normalizeChannel(item) {
  const id = item?.id;
  const sn = item?.snippet;
  if (typeof id !== 'string' || !isChannelId(id) || !sn) return null;
  const title = cleanArtist(sn.title);
  if (!title) return null;
  const thumb = (sn.thumbnails?.medium || sn.thumbnails?.high || sn.thumbnails?.default || {}).url || null;
  const hidden = item.statistics?.hiddenSubscriberCount === true;
  const subs = Number(item.statistics?.subscriberCount);
  return {
    id,
    channelId: id,
    title,
    artwork: thumb && thumb.startsWith('https://') ? thumb : null,
    description: shorten(sn.description),
    subscribers: !hidden && Number.isFinite(subs) && subs > 0 ? subs : null,
  };
}

/** Normalise + keep search order + drop duplicates (e.g. "Artist" and "Artist - Topic"). */
export function normalizeChannels(items, order) {
  const byId = new Map();
  for (const it of items || []) {
    const c = normalizeChannel(it);
    if (c) byId.set(c.id, c);
  }
  const seen = new Set();
  const out = [];
  for (const id of order || [...byId.keys()]) {
    const c = byId.get(id);
    if (!c) continue;
    const key = c.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Find channels / artists by name (search.list type=channel + channels.list for details). */
export async function searchChannels(query, { apiKey, fetchImpl = fetch, maxResults = 3 } = {}) {
  if (!apiKey) throw new YouTubeError('not_configured', 'Search is not set up yet.', 503);
  const s = new URL(`${API}/search`);
  s.search = new URLSearchParams({ part: 'snippet', type: 'channel', q: query, maxResults: String(maxResults), key: apiKey }).toString();
  const found = await getJson(fetchImpl, s);
  const ids = (found.items || []).map((i) => i?.id?.channelId).filter(isChannelId);
  if (!ids.length) return [];
  const c = new URL(`${API}/channels`);
  c.search = new URLSearchParams({ part: 'snippet,statistics', id: ids.join(','), key: apiKey }).toString();
  const details = await getJson(fetchImpl, c);
  return normalizeChannels(details.items, ids);
}

/**
 * Songs + channels for one query. Songs are required; if only the channel half fails
 * (for example quota) we still return the songs.
 */
export async function searchAll(query, opts = {}) {
  const [songs, channels] = await Promise.allSettled([searchYouTube(query, opts), searchChannels(query, opts)]);
  if (songs.status === 'rejected') throw songs.reason;
  return { tracks: songs.value, channels: channels.status === 'fulfilled' ? channels.value : [] };
}

async function loadVideos(ids, { apiKey, fetchImpl }) {
  if (!ids.length) return [];
  const v = new URL(`${API}/videos`);
  v.search = new URLSearchParams({ part: 'snippet,contentDetails,status,statistics', id: ids.join(','), key: apiKey }).toString();
  const vids = await getJson(fetchImpl, v);
  return normalizeVideos(vids.items, ids);
}

/** The channel's most viewed videos (search.list order=viewCount: 100 units). */
async function popularVideos(channelId, ctx, maxResults) {
  const s = new URL(`${API}/search`);
  s.search = new URLSearchParams({
    part: 'snippet', type: 'video', channelId, order: 'viewCount',
    maxResults: String(maxResults), videoEmbeddable: 'true', key: ctx.apiKey,
  }).toString();
  const found = await getJson(ctx.fetchImpl, s);
  const ids = (found.items || []).map((i) => i?.id?.videoId).filter((x) => typeof x === 'string');
  return loadVideos(ids, ctx);
}

/** The channel's newest uploads (playlistItems: 1 unit). */
async function recentUploads(uploadsPlaylist, ctx, maxItems) {
  if (!uploadsPlaylist) return [];
  const pl = new URL(`${API}/playlistItems`);
  pl.search = new URLSearchParams({ part: 'contentDetails', playlistId: uploadsPlaylist, maxResults: String(maxItems), key: ctx.apiKey }).toString();
  const list = await getJson(ctx.fetchImpl, pl, { allow404: true });
  const ids = (list?.items || []).map((i) => i?.contentDetails?.videoId).filter((x) => typeof x === 'string');
  return loadVideos(ids, ctx);
}

/**
 * A channel's profile, its most popular songs and its latest uploads.
 * `popular` and `tracks` (latest) are independent: if one lookup fails (e.g. quota) the other
 * is still returned; only when both fail do we report an error.
 */
export async function getChannelPage(channelId, { apiKey, fetchImpl = fetch, maxItems = 30, maxPopular = 10 } = {}) {
  if (!apiKey) throw new YouTubeError('not_configured', 'Search is not set up yet.', 503);
  if (!isChannelId(channelId)) throw new YouTubeError('not_found', 'Channel not found.', 404);

  const c = new URL(`${API}/channels`);
  c.search = new URLSearchParams({ part: 'snippet,statistics,contentDetails', id: channelId, key: apiKey }).toString();
  const details = await getJson(fetchImpl, c);
  const item = details.items?.[0];
  const channel = normalizeChannel(item);
  if (!channel) throw new YouTubeError('not_found', 'Channel not found.', 404);

  const ctx = { apiKey, fetchImpl };
  const [pop, rec] = await Promise.allSettled([
    popularVideos(channelId, ctx, maxPopular),
    recentUploads(item.contentDetails?.relatedPlaylists?.uploads, ctx, maxItems),
  ]);
  if (pop.status === 'rejected' && rec.status === 'rejected') throw pop.reason;

  const popular = pop.status === 'fulfilled' ? pop.value : [];
  const seen = new Set(popular.map((t) => t.id));
  const tracks = (rec.status === 'fulfilled' ? rec.value : []).filter((t) => !seen.has(t.id));
  return { channel, popular, tracks };
}
