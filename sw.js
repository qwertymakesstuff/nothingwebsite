// Offline mode for missing.website (used on Chromebooks, where the downloadable launchers can't run).
// Only registered when someone presses "save for offline" on /pages.html, which fills the cache from
// /offline-files.json. Pages always come from the network when it works, so the live site never goes
// stale; the saved copy is only used when the network fails or the site is blocked.
const CACHE = 'missing-offline-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;
  if (url.pathname === '/offline-files.json' || url.pathname === '/sw.js') return;
  e.respondWith(fromNetwork(req, url, fonts).catch(() => fromCache(req, url)));
});

async function fromNetwork(req, url, fonts) {
  const res = await fetch(req);
  // keep the saved copy fresh with whatever was just loaded (full responses only, not ranges)
  if (res.status === 200 || (fonts && res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(fonts ? req : url.pathname, copy)).catch(() => {});
  }
  return res;
}

async function fromCache(req, url) {
  const cache = await caches.open(CACHE);
  const path = url.pathname;
  const tries = [path, path.endsWith('/') ? path + 'index.html' : path + '/'];
  for (const t of tries) {
    const hit = await cache.match(t, { ignoreSearch: true });
    if (hit) return hit;
  }
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') {
    return new Response('<!doctype html><meta charset="utf-8"><title>offline</title><body style="background:#080808;color:#d5cccc;font-family:monospace;padding:2rem">this page isn\'t saved for offline yet. <a style="color:inherit" href="/pages.html">all pages</a></body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return Response.error();
}
