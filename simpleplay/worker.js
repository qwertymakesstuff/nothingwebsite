// simpleplay Worker: serves PUMPED's simple view at simple.missing.website.
//
// The game's files (../pumped) are served straight from Workers static assets, so the game page is
// simple.missing.website/ and its css/ and js/ load from there for free. This code only runs for
// paths that aren't a file: /pumped and /simple.pumped (what people type after "simple.")
// redirect to the game, anything else is a 404.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (/^\/(simple\.)?pumped(\/|$)/i.test(url.pathname)) {
      return Response.redirect(`${url.origin}/${url.search}`, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
