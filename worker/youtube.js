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
    byId.set(id, {
      id,
      videoId: id,
      title: decodeEntities(sn.title).trim() || 'Untitled',
      artist: cleanArtist(sn.channelTitle),
      artwork: thumb && thumb.startsWith('https://') ? thumb : null,
      duration,
    });
  }
  // Keep YouTube's relevance order from the search call.
  return (order || [...byId.keys()]).map((id) => byId.get(id)).filter(Boolean);
}

async function getJson(fetchImpl, url) {
  let res;
  try {
    res = await fetchImpl(url.toString(), { headers: { accept: 'application/json' } });
  } catch {
    throw new YouTubeError('upstream', 'Could not reach YouTube.', 502);
  }
  let body = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (res.ok && body) return body;

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
    part: 'snippet,contentDetails,status',
    id: ids.join(','),
    key: apiKey,
  }).toString();
  const details = await getJson(fetchImpl, v);
  return normalizeVideos(details.items, ids);
}
