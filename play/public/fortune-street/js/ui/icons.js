// Line-art icons drawn for Fortune Street: one per property and special space, plus the six
// player tokens. All use a 24x24 view box and currentColor so they follow the theme.

const S = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  wharf: S('<path d="M2 15h20M4 15v5M10 15v5M16 15v5M20 15v5"/><path d="M6 15l2-6h6l2 6"/><path d="M11 9V4l4 3-4 1"/>'),
  warehouse: S('<path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-6h10v6M7 17h10"/>'),
  shop: S('<path d="M4 10h16v10H4z"/><path d="M3 10l2-5h14l2 5"/><path d="M10 20v-5h4v5"/><circle cx="17" cy="7.5" r=".6" fill="currentColor"/>'),
  awning: S('<path d="M4 9h16M4 9l1-4h14l1 4M4 9c0 1.5 2 1.5 2.7 0 .6 1.5 2.6 1.5 3.3 0 .6 1.5 2.6 1.5 3.3 0 .6 1.5 2.6 1.5 3.3 0 .7 1.5 2.7 1.5 2.7 0"/><path d="M5 11v9h14v-9M9 20v-5h6v5"/>'),
  cup: S('<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/><path d="M4 21h14"/>'),
  lantern: S('<path d="M12 2v3M9 5h6M8 8h8l-1 10H9z"/><path d="M8 8l1-3h6l1 3M10 21h4M12 18v3"/><path d="M12 11v4"/>'),
  arch: S('<path d="M3 21V9a9 6 0 0 1 18 0v12"/><path d="M8 21v-7a4 4 0 0 1 8 0v7M3 21h18"/>'),
  theater: S('<path d="M3 4h18v3H3z"/><path d="M4 7c0 6 3 9 5 10M20 7c0 6-3 9-5 10"/><path d="M7 21h10M12 13v8"/>'),
  frame: S('<rect x="4" y="5" width="16" height="13" rx="1"/><path d="M4 15l5-4 4 3 3-2 4 3"/><circle cx="15.5" cy="9" r="1.3"/><path d="M12 2l-3 3M12 2l3 3"/>'),
  mask: S('<path d="M4 6c4 1 12 1 16 0 0 7-3 13-8 13S4 13 4 6z"/><path d="M8 10.5c1-.8 2-.8 3 0M13 10.5c1-.8 2-.8 3 0M9 15c2 1.5 4 1.5 6 0"/>'),
  brush: S('<path d="M19 3l-8 9 2 2 9-8z" /><path d="M11 12c-3 0-5 2-5 4 0 1.5-1 3-3 3 4 1 9 0 10-5"/>'),
  columns: S('<path d="M3 9l9-5 9 5zM4 20h16M5 9v11M9.5 9v11M14.5 9v11M19 9v11"/>'),
  clock: S('<path d="M7 21V8l5-5 5 5v13zM5 21h14"/><circle cx="12" cy="11" r="3"/><path d="M12 9.5V11l1 .8"/>'),
  apartment: S('<path d="M5 21V4h14v17M3 21h18"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-3h2v3"/>'),
  chart: S('<path d="M4 20V4M4 20h17"/><path d="M7 16l4-5 3 3 5-7"/><path d="M16 7h3v3"/>'),
  atom: S('<circle cx="12" cy="12" r="1.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>'),
  chip: S('<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'),
  helix: S('<path d="M8 3c0 6 8 6 8 12s-8 3-8 6M16 3c0 6-8 6-8 12"/><path d="M9 6h6M9.5 12h5M9 18h6"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  gem: S('<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16M9 4L7.5 9M15 4l1.5 5"/>'),
  spire: S('<path d="M12 2v3M10 21V9l2-4 2 4v12M7 21v-7h3M14 14h3v7M5 21h14"/>'),
  tower: S('<path d="M12 2v2M9 21V7l3-3 3 3v14M6 21V12h3M15 10h3v11M4 21h16"/><path d="M11 10h2M11 14h2M11 18h2"/>'),
  ferry: S('<path d="M3 15l2 4h14l2-4z"/><path d="M6 15V10h12v5M9 10V7h6v3"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>'),
  train: S('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/><circle cx="8.5" cy="13.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="13.5" r=".8" fill="currentColor"/>'),
  tram: S('<path d="M3 4l18-2M12 3v3"/><rect x="5" y="6" width="14" height="11" rx="2"/><path d="M5 11h14M9 21l1-4M15 21l-1-4"/>'),
  plane: S('<path d="M21 4c-1-1-3 0-4 1l-4 4-8-2-2 2 6 4-3 3H3l-1 2 4 1 1 4 2-1v-3l3-3 4 6 2-2-2-8 4-4c1-1 2-3 1-4z"/>'),
  bolt: S('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  signal: S('<path d="M12 20v-6"/><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>'),
  pier: S('<path d="M2 13h20M5 13v8M12 13v8M19 13v8"/><path d="M14 13V4l6 4-6 2"/>'),
  lock: S('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
  lighthouse: S('<path d="M9 21l1-12h4l1 12M8 21h8M10 9V6h4v3M11 6l1-3 1 3"/><path d="M3 5l5 2M21 5l-5 2"/><path d="M10.5 13h3M10.2 17h3.6"/>'),
  tow: S('<path d="M2 17h4l1-5h6v5h3"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M13 12l6-7 2 1-5 7M19 5v4"/>'),
  bulletin: S('<path d="M4 4h16v16H4z"/><path d="M7 8h10M7 12h10M7 16h6"/><path d="M12 1v3"/>'),
  opportunity: S('<path d="M4 8h16v12H4z"/><path d="M9 8V5h6v3M4 13h16M11 12h2v2h-2z"/>'),
  levy: S('<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.5-1-1.6-1.5-3-1.5-2 0-3 1-3 2.2 0 3 6 1.5 6 4.6 0 1.3-1.2 2.2-3 2.2-1.6 0-2.7-.6-3.2-1.7M12 5v2M12 17v2"/>'),
  luxury: S('<path d="M4 18L3 8l5 4 4-7 4 7 5-4-1 10z"/><path d="M4 21h16"/>'),
  dice: S('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  trade: S('<path d="M4 8h14l-3-3M20 16H6l3 3"/>'),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  book: S('<path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a2 2 0 0 0-2 1 2 2 0 0 0-2-1H4z"/><path d="M12 5v15"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: S('<path d="M5 12l5 5 9-10"/>'),
};

// tokens: filled silhouettes so they read at small sizes
const T = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
export const TOKEN_ART = {
  sailboat: T('<path d="M12 3v13H5z" fill="currentColor"/><path d="M13 5c3 3 5 7 5 11h-5z" fill="currentColor" opacity=".75"/><path d="M3 17h18l-3 4H6z" fill="currentColor"/>'),
  tram: T('<path d="M4 3l16-1v1.5L4 4.5z" fill="currentColor"/><rect x="11" y="4" width="2" height="3" fill="currentColor"/><rect x="5" y="7" width="14" height="11" rx="2.5" fill="currentColor"/><rect x="7" y="9" width="4" height="4" rx=".8" fill="#fff" opacity=".85"/><rect x="13" y="9" width="4" height="4" rx=".8" fill="#fff" opacity=".85"/><circle cx="8" cy="20" r="1.8" fill="currentColor"/><circle cx="16" cy="20" r="1.8" fill="currentColor"/>'),
  gull: T('<path d="M2 11c3-3 6-3 10 1 4-4 7-4 10-1-3 0-6 1-8 4h-4c-2-3-5-4-8-4z" fill="currentColor"/><path d="M11 15h2l-1 4z" fill="currentColor"/>'),
  lighthouse: T('<path d="M9 21l1.2-12h3.6L15 21z" fill="currentColor"/><path d="M9.5 6h5v3h-5z" fill="currentColor"/><path d="M12 2l2.5 4h-5z" fill="currentColor"/><path d="M10.6 13h2.8M10.3 17h3.4" stroke="#fff" stroke-width="1.4" opacity=".8"/>'),
  key: T('<circle cx="7.5" cy="12" r="5" fill="currentColor"/><circle cx="7.5" cy="12" r="2" fill="#fff" opacity=".85"/><path d="M12 10.5h10v3h-2v3h-3v-3h-5z" fill="currentColor"/>'),
  teacup: T('<path d="M3 9h14v4a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z" fill="currentColor"/><path d="M17 10h1.5a3 3 0 0 1 0 6H16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 21h18" stroke="currentColor" stroke-width="2"/><path d="M8 3c0 2 1.5 2 1.5 4M12 3c0 2 1.5 2 1.5 4" stroke="currentColor" stroke-width="1.4" fill="none"/>'),
};

export const icon = name => ICONS[name] || ICONS.dice;
export const tokenArt = id => TOKEN_ART[id] || TOKEN_ART.sailboat;

// dice faces as pip layouts
const PIPS = {
  1: [[12, 12]], 2: [[7, 7], [17, 17]], 3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]], 5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6.5], [17, 6.5], [7, 12], [17, 12], [7, 17.5], [17, 17.5]],
};
export function dieFace(n) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="5" class="die-body"/>${(PIPS[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" class="die-pip"/>`).join('')}</svg>`;
}
