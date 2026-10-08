// Phase 1 only: fake tracks so the layout, queue and controls can be exercised
// before real search exists. There is no audio - the simulated engine just runs a clock.
// This file and the "Load demo tracks" button are removed once search lands.

function art(h1, h2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 70% 55%)"/><stop offset="1" stop-color="hsl(${h2} 70% 30%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="6"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const demoTracks = [
  { id: 'demo-1', title: 'Midnight Static', artist: 'Demo Artist', duration: 213, artwork: art(260, 320) },
  { id: 'demo-2', title: 'Glass Hours', artist: 'Demo Artist', duration: 187, artwork: art(190, 230) },
  { id: 'demo-3', title: 'A Very Long Track Title That Should Truncate Cleanly On Small Screens', artist: 'An Artist With A Rather Long Name Too', duration: 245, artwork: art(20, 340) },
  { id: 'demo-4', title: 'No Artwork Here', artist: 'Placeholder Test', duration: 95 },
  { id: 'demo-5', title: 'Broken Artwork Link', artist: 'Placeholder Test', duration: 301, artwork: 'https://invalid.invalid/missing.jpg' },
  { id: 'demo-6', title: 'Unavailable Track (error test)', artist: 'Error State', duration: 120, unavailable: true },
  { id: 'demo-7', title: 'Short One', artist: 'Demo Artist', duration: 12, artwork: art(100, 160) },
];
