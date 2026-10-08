// Client side of YouTube search. It only ever talks to OUR backend (/api/search on the same
// origin); the YouTube API key lives in the Worker and never reaches the browser.
//
// search(query, { signal }) ->
//   { ok: true,  tracks: Track[] }
//   { ok: false, error: code, message }      codes: empty | too_long | not_configured | quota |
//                                            network | timeout | unavailable | upstream | aborted
// Track: { id, videoId, title, artist, artwork|null, duration }

const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 50;

const MESSAGES = {
  empty: 'Type something to search.',
  too_long: 'That search is too long. Try something shorter.',
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

function cleanTrack(t) {
  if (!t || typeof t.id !== 'string' || !t.id || typeof t.title !== 'string') return null;
  return {
    id: t.id,
    videoId: typeof t.videoId === 'string' && t.videoId ? t.videoId : t.id,
    title: t.title,
    artist: typeof t.artist === 'string' ? t.artist : '',
    artwork: typeof t.artwork === 'string' && t.artwork.startsWith('https://') ? t.artwork : null,
    duration: Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 0,
  };
}

export function createYouTubeService({ fetchImpl = (...a) => fetch(...a), endpoint = '/api/search', timeoutMs = 10000, now = Date.now } = {}) {
  const cache = new Map(); // normalized lowercase query -> { tracks, at }

  const fail = (error, message) => ({ ok: false, error, message: message || MESSAGES[error] || MESSAGES.upstream });

  async function search(query, { signal } = {}) {
    const q = normalizeQuery(query);
    if (!q) return fail('empty');
    if (q.length > 100) return fail('too_long');

    if (signal?.aborted) return fail('aborted');

    const key = q.toLowerCase();
    const hit = cache.get(key);
    if (hit && now() - hit.at < CACHE_TTL) return { ok: true, tracks: hit.tracks, cached: true };

    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetchImpl(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      let body = null;
      try { body = await res.json(); } catch { /* not JSON, e.g. 404 page when no backend exists */ }

      if (!body || typeof body !== 'object') return fail(res.status === 404 || res.status === 405 ? 'unavailable' : 'upstream');
      if (!res.ok || body.ok === false) return fail(typeof body.error === 'string' ? body.error : 'upstream', typeof body.message === 'string' ? body.message : undefined);
      if (!Array.isArray(body.tracks)) return fail('upstream');

      const tracks = body.tracks.map(cleanTrack).filter(Boolean);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { tracks, at: now() });
      return { ok: true, tracks };
    } catch (err) {
      if (timedOut) return fail('timeout');
      if (signal?.aborted || err?.name === 'AbortError') return fail('aborted');
      return fail('network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  return { search, clearCache: () => cache.clear() };
}

export const youtubeService = createYouTubeService();
