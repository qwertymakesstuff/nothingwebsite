// Procedural chess pieces: original Staunton-style silhouettes drawn as SVG, used whenever the
// ForgeGUI piece images are not available. Each piece is returned as a data URL so the board can
// treat generated and procedural pieces identically.

const BASE = '<path d="M20 91h60a4 4 0 0 0 0-8H20a4 4 0 0 0 0 8z"/><path d="M26 84c4-5 44-5 48 0z"/>';
const BODY = '<path d="M37 57c2 10-5 19-9 26h44c-4-7-11-16-9-26z"/>';
const COLLAR = cy => `<ellipse cx="50" cy="${cy}" rx="15" ry="4.5" class="ring"/>`;

const SHAPES = {
  p: `<circle cx="50" cy="29" r="12"/><ellipse cx="50" cy="43" rx="13" ry="4" class="ring"/><path d="M39 46c2 13-6 25-10 37h42c-4-12-12-24-10-37z"/>${BASE}`,
  r: `<path d="M30 40V19h8v7h7v-7h10v7h7v-7h8v21z"/><path d="M36 44h28l3 39H33z"/>${COLLAR(42)}${BASE}`,
  b: `<circle cx="50" cy="13" r="5"/><path d="M50 18c-14 9-17 25-10 35h20c7-10 4-26-10-35z"/><path d="M53 27l-9 13" class="cut"/>${COLLAR(55)}${BODY}${BASE}`,
  q: `<path d="M24 26l7 13 6-19 6 19 7-23 7 23 6-19 6 19 7-13-10 27H34z"/><circle cx="24" cy="25" r="4"/><circle cx="37" cy="19" r="4"/><circle cx="50" cy="14" r="4.5"/><circle cx="63" cy="19" r="4"/><circle cx="76" cy="25" r="4"/>${COLLAR(55)}${BODY}${BASE}`,
  k: `<path d="M47 3h6v7h7v6h-7v8h-6v-8h-7v-6h7z"/><path d="M33 33c0-12 34-12 34 0l-5 19H38z"/>${COLLAR(55)}${BODY}${BASE}`,
  n: `<path d="M71 83H30c0-12 7-20 15-26-6 1-13 2-19-3-4-4-2-10 4-12 6-6 9-11 14-17l-3-11 9 7c10-2 22 5 24 19 2 15-3 28-3 43z"/><circle cx="45" cy="31" r="2.6" class="eye"/><path d="M58 22c5 4 8 10 8 18" class="cut"/>${BASE}`,
};

const PALETTE = {
  w: { top: '#fbf3e3', bottom: '#d6c29b', stroke: '#3a291b', ring: '#c9a45c', cut: '#7a6346' },
  b: { top: '#4a3c33', bottom: '#120d0a', stroke: '#c9a873', ring: '#b8913f', cut: '#c9a873' },
};

export function pieceSvg(color, type) {
  const c = PALETTE[color], id = `g${color}${type}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.bottom}"/></linearGradient></defs><g fill="url(#${id})" stroke="${c.stroke}" stroke-width="2.4" stroke-linejoin="round"><style>.ring{fill:${c.ring}}.cut{fill:none;stroke:${c.cut};stroke-width:3;stroke-linecap:round}.eye{fill:${c.stroke};stroke:none}</style>${SHAPES[type]}</g></svg>`;
}

const cache = new Map();
export function pieceDataUrl(color, type) {
  const key = color + type;
  if (!cache.has(key)) cache.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pieceSvg(color, type))}`);
  return cache.get(key);
}

// Image for a piece: the generated asset when it's available, otherwise the procedural one.
export function pieceImage(assets, color, type) {
  return assets?.setUrl('chess.pieces', `chess.${color}.${type}`) || pieceDataUrl(color, type);
}
