// Client side of YouTube search. It only ever talks to OUR backend (/api/* on the same
// origin); the YouTube API key lives in the Worker and never reaches the browser.
//
// search(query, { signal }) ->
//   { ok: true,  tracks: Track[], channels: Channel[] }
// channel(id, { signal }) ->
//   { ok: true,  channel: Channel, tracks: Track[] }
// Failures:  { ok: false, error: code, message }
//   codes: empty | too_long | not_found | not_configured | quota | network | timeout |
//          unavailable | upstream | aborted
//
// Track:   { id, videoId, title, artist, artwork|null, duration }
// Channel: { id, channelId, title, artwork|null, description, subscribers|null }

const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 50;
const CHANNEL_ID = /^UC[\w-]{22}$/;

const MESSAGES = {
  empty: 'Type something to search.',
  too_long: 'That search is too long. Try something shorter.',
  not_found: 'That channel could not be found.',
  not_configured: 'Search is not set up yet.',
  quota: 'The daily search limit has been reached. Try again tomorrow.',
  network: "Can't reach the server. Check your connection and try again.",
  timeout: 'The search took too long. Try again.',
  unavailable: "Search isn't available right now.",
  upstream: 'Search failed. Please try again.',
  forbidden: "Search isn't available right now.",
  bad_key: 'Search is misconfigured on the server.',
};

export const normalizeQuery = (q) => String(q ?? '').replace(/\s+/g, ' ').trim();
const https = (u) => (typeof u === 'string' && u.startsWith('https://') ? u : null);

function cleanTrack(t) {
  if (!t || typeof t.id !== 'string' || !t.id || typeof t.title !== 'string') return null;
  return {
    id: t.id,
    videoId: typeof t.videoId === 'string' && t.videoId ? t.videoId : t.id,
    title: t.title,
    artist: typeof t.artist === 'string' ? t.artist : '',
    artwork: https(t.artwork),
    duration: Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 0,
  };
}

function cleanChannel(c) {
  if (!c || typeof c.id !== 'string' || !CHANNEL_ID.test(c.id) || typeof c.title !== 'string' || !c.title) return null;
  return {
    id: c.id,
    channelId: c.id,
    title: c.title,
    artwork: https(c.artwork),
    description: typeof c.description === 'string' ? c.description : '',
    subscribers: Number.isFinite(c.subscribers) && c.subscribers > 0 ? c.subscribers : null,
  };
}

const cleanTracks = (list) => (Array.isArray(list) ? list.map(cleanTrack).filter(Boolean) : []);
const cleanChannels = (list) => (Array.isArray(list) ? list.map(cleanChannel).filter(Boolean) : []);

export function createYouTubeService({ fetchImpl = (...a) => fetch(...a), base = '/api', timeoutMs = 10000, now = Date.now } = {}) {
  const cache = new Map(); // cache key -> { value, at }

  const fail = (error, message) => ({ ok: false, error, message: message || MESSAGES[error] || MESSAGES.upstream });

  /** One GET to our backend with timeout, caller abort, caching and error mapping. */
  async function call(path, params, key, parse, signal) {
    if (signal?.aborted) return fail('aborted');
    const hit = cache.get(key);
    if (hit && now() - hit.at < CACHE_TTL) return { ok: true, ...hit.value, cached: true };

    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetchImpl(`${base}${path}?${new URLSearchParams(params)}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      let body = null;
      try { body = await res.json(); } catch { /* not JSON, e.g. 404 page when no backend exists */ }

      if (!body || typeof body !== 'object') return fail(res.status === 404 || res.status === 405 ? 'unavailable' : 'upstream');
      if (!res.ok || body.ok === false) return fail(typeof body.error === 'string' ? body.error : 'upstream', typeof body.message === 'string' ? body.message : undefined);

      const value = parse(body);
      if (!value) return fail('upstream');
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { value, at: now() });
      return { ok: true, ...value };
    } catch (err) {
      if (timedOut) return fail('timeout');
      if (signal?.aborted || err?.name === 'AbortError') return fail('aborted');
      return fail('network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  function search(query, { signal } = {}) {
    const q = normalizeQuery(query);
    if (!q) return Promise.resolve(fail('empty'));
    if (q.length > 100) return Promise.resolve(fail('too_long'));
    return call('/search', { q }, `q:${q.toLowerCase()}`, (b) => (Array.isArray(b.tracks)
      ? { tracks: cleanTracks(b.tracks), channels: cleanChannels(b.channels) }
      : null), signal);
  }

  function channel(id, { signal } = {}) {
    if (!CHANNEL_ID.test(String(id ?? ''))) return Promise.resolve(fail('not_found'));
    return call('/channel', { id }, `c:${id}`, (b) => {
      const ch = cleanChannel(b.channel);
      return ch && Array.isArray(b.tracks) ? { channel: ch, tracks: cleanTracks(b.tracks) } : null;
    }, signal);
  }

  return { search, channel, clearCache: () => cache.clear() };
}

export const youtubeService = createYouTubeService();
