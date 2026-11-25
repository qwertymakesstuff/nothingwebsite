// Tells @cloudflare/workers-types what this Worker's main module exports, so `ctx.exports`
// (and `exports` from "cloudflare:workers" in tests) are typed.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('./index');
    durableNamespaces: 'GameRoom';
  }
}
