// simpleplay Worker: serves PUMPED's simple view at simple.missing.website/pumped/.
//
// The game's files (../pumped) are the static assets. This code runs first for "/" and "/pumped*"
// (see run_worker_first in wrangler.jsonc):
//   /                          -> 301 to /pumped/
//   /pumped                    -> 301 to /pumped/
//   /simple.pumped(/...)       -> 301 to /pumped/   (what people type after "simple.")
//   /pumped/<file>             -> the asset <file> (/pumped/ itself is index.html)
//   /__simpleplay              -> a plain-text "simpleplay is running" check
// The page turns on the simple HUD because the hostname starts with "simple.".

const GAME = '/pumped/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/__simpleplay') {
      return new Response(`simpleplay is running on ${url.hostname}. The game is at /pumped/\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (path === '/' || /^\/pumped$/i.test(path) || /^\/simple\.pumped(\/|$)/i.test(path)) {
      return Response.redirect(`${url.origin}${GAME}${url.search}`, 301);
    }
    if (path.startsWith(GAME)) {
      url.pathname = '/' + path.slice(GAME.length);
      if (url.pathname === '/index.html') url.pathname = '/';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return new Response('Not found. The game is at /pumped/', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
