// YouTube integration - NOT IMPLEMENTED IN PHASE 1.
//
// This file only reserves the seam so the rest of the app has a place to plug in.
// Later phases will call a small backend (a Cloudflare Worker that holds the API key
// as a secret) and play through YouTube's official embedded player. Nothing here
// scrapes YouTube or extracts audio.
//
// Contract the UI will rely on:
//   search(query, { signal }) -> Promise<{ ok: true, tracks: Track[] } | { ok: false, error: string }>
//
// Track: { id, title, artist, artwork?, duration?, videoId? }

export const youtubeService = {
  implemented: false,
  async search() {
    return { ok: false, error: 'Search is not connected yet.' };
  },
};
