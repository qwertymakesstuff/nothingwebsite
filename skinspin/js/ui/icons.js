// Inline SVG icons (24x24, currentColor).

const svg = (body, extra = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`;
const st = d => svg(`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);

export const ICONS = {
  home: st('M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z'),
  cases: st('M3 8 H21 V20 H3 Z M2 4 H22 V8 H2 Z M10 12 H14'),
  upgrade: st('M12 20 V5 M6 11 L12 5 L18 11 M5 21 H19'),
  battles: st('M4 20 L14 10 M10 4 L20 14 M14 4 H20 V10 M4 14 L10 20 M3 21 L6 18 M18 18 L21 21'),
  inventory: st('M4 7 H20 V20 H4 Z M9 7 V4 H15 V7 M4 12 H20'),
  marketplace: st('M3 9 L5 4 H19 L21 9 Z M4 9 V20 H20 V9 M9 20 V14 H15 V20'),
  contracts: st('M6 2 H15 L19 6 V22 H6 Z M14 2 V7 H19 M9 12 H16 M9 16 H16'),
  collections: st('M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z'),
  missions: st('M12 2 L15 8.5 L22 9.3 L17 14 L18.5 21 L12 17.5 L5.5 21 L7 14 L2 9.3 L9 8.5 Z'),
  profile: st('M12 12 A4 4 0 1 0 12 4 A4 4 0 1 0 12 12 Z M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21'),
  settings: st('M12 15 A3 3 0 1 0 12 9 A3 3 0 1 0 12 15 Z M19 12 L21 11 L20 8 L18 8 L17 6 L18 4 L15 3 L14 5 H10 L9 3 L6 4 L7 6 L6 8 L4 8 L3 11 L5 12 L3 13 L4 16 L6 16 L7 18 L6 20 L9 21 L10 19 H14 L15 21 L18 20 L17 18 L18 16 L20 16 L21 13 Z'),
  lock: st('M6 11 H18 V21 H6 Z M8 11 V7 A4 4 0 0 1 16 7 V11'),
  unlock: st('M6 11 H18 V21 H6 Z M8 11 V7 A4 4 0 0 1 15.5 5'),
  heart: svg('<path d="M12 21 C5 16 2 12.5 2 8.5 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8.5 C22 12.5 19 16 12 21 Z" fill="currentColor"/>'),
  heartOutline: st('M12 21 C5 16 2 12.5 2 8.5 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8.5 C22 12.5 19 16 12 21 Z'),
  search: st('M11 18 A7 7 0 1 0 11 4 A7 7 0 1 0 11 18 Z M16 16 L21 21'),
  close: st('M5 5 L19 19 M19 5 L5 19'),
  menu: st('M3 6 H21 M3 12 H21 M3 18 H21'),
  check: st('M4 12 L10 18 L20 6'),
  skip: st('M5 5 L13 12 L5 19 Z M13 5 L21 12 L13 19 Z'),
  back: st('M15 5 L8 12 L15 19'),
  sound: st('M4 9 H8 L13 5 V19 L8 15 H4 Z M16 9 Q18 12 16 15 M18.5 6.5 Q22.5 12 18.5 17.5'),
  sell: st('M12 2 V22 M17 6 H9.5 A3.5 3.5 0 0 0 9.5 13 H14.5 A3.5 3.5 0 0 1 14.5 20 H6'),
  star: svg('<path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="currentColor"/>'),
  coin: svg('<circle cx="12" cy="12" r="10" fill="#f5b829"/><circle cx="12" cy="12" r="7" fill="none" stroke="#b07a0c" stroke-width="1.6"/><path d="M14.5 9.2 A3.2 3.2 0 1 0 14.5 14.8" fill="none" stroke="#7a5306" stroke-width="2" stroke-linecap="round"/>', 'class="icon coin-icon"'),
};

export const LOGO = `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
<defs><linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf4a"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient></defs>
<path d="M20 3 A17 17 0 0 1 37 20" fill="none" stroke="url(#lg-a)" stroke-width="4" stroke-linecap="round"/>
<path d="M20 37 A17 17 0 0 1 3 20" fill="none" stroke="#7c6cff" stroke-width="4" stroke-linecap="round"/>
<path d="M37 20 l-4 -5 M37 20 l4 -5" stroke="url(#lg-a)" stroke-width="3" stroke-linecap="round"/>
<path d="M3 20 l-4 5 M3 20 l4 5" stroke="#7c6cff" stroke-width="3" stroke-linecap="round"/>
<path d="M20 11 L27 20 L20 29 L13 20 Z" fill="url(#lg-a)"/>
</svg>`;
