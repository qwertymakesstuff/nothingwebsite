// missing-music Worker.
//   /api/search?q=...   secure YouTube search (this file)
//   everything else     static player from ./music (served directly by Workers assets)
//
// The YouTube API key lives in the YOUTUBE_API_KEY Worker secret and is never sent to the browser.

import { searchYouTube, YouTubeError } from './youtube.js';

const MAX_QUERY = 100;
const CACHE_SECONDS = 60 * 60;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

const fail = (error, message, status) => json({ ok: false, error, message }, status);

/** Normalise a query: trim, collapse whitespace. */
export function normalizeQuery(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Stop other websites from spending our quota from their visitors' browsers.
 * Browsers always send Sec-Fetch-Site / Origin on cross-site requests.
 */
export function isSameSite(request, url) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = request.headers.get('origin');
  if (origin) { try { return new URL(origin).host === url.host; } catch { return false; } }
  return true; // non-browser client; cannot be distinguished here (see README: add a rate-limit rule)
}

async function handleSearch(request, env, ctx, url) {
  if (request.method !== 'GET') return fail('method_not_allowed', 'Use GET.', 405);
  if (!isSameSite(request, url)) return fail('forbidden', 'Not allowed.', 403);

  const q = normalizeQuery(url.searchParams.get('q'));
  if (!q) return fail('empty', 'Type something to search.', 400);
  if (q.length > MAX_QUERY) return fail('too_long', `Search is limited to ${MAX_QUERY} characters.`, 400);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/api/search?q=${encodeURIComponent(q.toLowerCase())}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('x-cache', 'HIT');
      return res;
    }
  }

  try {
    const tracks = await searchYouTube(q, { apiKey: env.YOUTUBE_API_KEY });
    const res = json({ ok: true, query: q, tracks }, 200, {
      'cache-control': `private, max-age=300`,
      'x-cache': 'MISS',
    });
    if (cache) {
      const stored = new Response(res.clone().body, res);
      stored.headers.set('cache-control', `public, max-age=${CACHE_SECONDS}`);
      ctx?.waitUntil?.(cache.put(cacheKey, stored));
    }
    return res;
  } catch (err) {
    if (err instanceof YouTubeError) return fail(err.code, err.message, err.status);
    return fail('upstream', 'Search failed. Please try again.', 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/search') return handleSearch(request, env, ctx, url);
    if (url.pathname.startsWith('/api/')) return fail('not_found', 'Unknown API route.', 404);
    return env.ASSETS.fetch(request);
  },
};
