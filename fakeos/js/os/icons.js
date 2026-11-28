// Interface icons as inline SVG strings (desktop, start menu, taskbar, window title bars).
const wrap = (body, vb = '0 0 32 32') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
export const ICONS = {
  browser: wrap(`<defs><radialGradient id="ib" cx=".35" cy=".3"><stop offset="0" stop-color="#bfe6ff"/><stop offset=".6" stop-color="#2f8fe0"/><stop offset="1" stop-color="#174f9a"/></radialGradient></defs><circle cx="16" cy="16" r="13" fill="url(#ib)" stroke="#123d75"/><path d="M6 13c5-4 13-5 21 0M5 19c7 3 15 3 22-1" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" fill="none"/><path d="M19 4c4 6 4 18-2 25" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none"/><path d="M20 7l6-3-2 6z" fill="#ffd34a" stroke="#a87b00" stroke-width=".7"/>`),
  notepad: wrap(`<rect x="7" y="4" width="19" height="24" rx="2" fill="#fdfcf3" stroke="#8a8a7a"/><path d="M10 10h13M10 14h13M10 18h13M10 22h8" stroke="#7fa3c9" stroke-width="1.3"/><rect x="7" y="4" width="19" height="4" fill="#79a6d8"/>`),
  personalize: wrap(`<rect x="4" y="6" width="24" height="17" rx="2" fill="#2f5f8f" stroke="#183552"/><path d="M6 21l7-8 5 5 3-3 5 6z" fill="#7fd17f"/><circle cx="22" cy="11" r="2.5" fill="#ffe27a"/><rect x="12" y="24" width="8" height="2" fill="#666"/><rect x="9" y="26" width="14" height="2" rx="1" fill="#888"/>`),
  welcome: wrap(`<circle cx="16" cy="16" r="13" fill="#f0b43a" stroke="#a5741a"/><path d="M16 9v1M16 14v9" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`),
  findr: wrap(`<circle cx="13" cy="13" r="8" fill="#fff" stroke="#e8502e" stroke-width="3"/><path d="M19 19l8 8" stroke="#e8502e" stroke-width="4" stroke-linecap="round"/>`),
  vidder: wrap(`<rect x="3" y="7" width="26" height="18" rx="5" fill="#d1252a"/><path d="M13 11l8 5-8 5z" fill="#fff"/>`),
  threadit: wrap(`<rect x="4" y="5" width="24" height="17" rx="3" fill="#2d7d5a"/><path d="M10 22l-2 6 7-6" fill="#2d7d5a"/><path d="M9 11h14M9 15h9" stroke="#fff" stroke-width="2"/>`),
  blink: wrap(`<rect x="3" y="3" width="26" height="26" rx="7" fill="#7a4fd1"/><path d="M8 17c3-6 13-6 16 0-3 6-13 6-16 0z" fill="#fff"/><circle cx="16" cy="17" r="3" fill="#7a4fd1"/>`),
  folder: wrap(`<path d="M3 9h10l3 3h13v14H3z" fill="#f2c94c" stroke="#b58a12"/><path d="M3 13h26v13H3z" fill="#f7d873"/>`),
  file: wrap(`<path d="M8 3h12l6 6v20H8z" fill="#fff" stroke="#888"/><path d="M20 3v6h6" fill="#ddd" stroke="#888"/>`),
  shutdown: wrap(`<circle cx="16" cy="17" r="10" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 4v11" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`),
  logo: wrap(`<path d="M16 2c5 6 5 10 0 14-5-4-5-8 0-14z" fill="#ff7a59"/><path d="M30 16c-6 5-10 5-14 0 4-5 8-5 14 0z" fill="#ffd166"/><path d="M16 30c-5-6-5-10 0-14 5 4 5 8 0 14z" fill="#4fc3f7"/><path d="M2 16c6-5 10-5 14 0-4 5-8 5-14 0z" fill="#81c784"/>`),
  bell: wrap(`<path d="M16 4a7 7 0 0 0-7 7v6l-3 4h20l-3-4v-6a7 7 0 0 0-7-7z" fill="#fff"/><circle cx="16" cy="25" r="3" fill="#fff"/>`),
  volume: wrap(`<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 11c2 3 2 7 0 10M24 8c4 5 4 11 0 16" stroke="#fff" stroke-width="2" fill="none"/>`),
  mute: wrap(`<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 12l7 8M28 12l-7 8" stroke="#ff6b6b" stroke-width="2.4"/>`),
  network: wrap(`<rect x="4" y="20" width="4" height="8" fill="#fff"/><rect x="11" y="15" width="4" height="13" fill="#fff"/><rect x="18" y="10" width="4" height="18" fill="#fff"/><rect x="25" y="5" width="4" height="23" fill="#fff"/>`),
  star: wrap(`<path d="M16 3l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="currentColor"/>`),
  page: wrap(`<rect x="5" y="4" width="22" height="24" rx="2" fill="#e9eef5" stroke="#8796aa"/><path d="M9 10h14M9 14h14M9 18h10" stroke="#8796aa" stroke-width="1.5"/>`),
};
export const icon = n => ICONS[n] || ICONS.file;
