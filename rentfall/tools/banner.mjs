// Writes the 1260 x 320 arcade banner (play/public/banners/rentfall.svg) from the game's own icons.
//   node rentfall/tools/banner.mjs
import fs from 'node:fs';
import { iconSvg } from '../js/icons.js';

const W = 1260, H = 320;
const rain = Array.from({ length: 70 }, (_, k) => {
  const x = (k * 97) % W, y = (k * 53) % H, l = 18 + (k % 5) * 6;
  return `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + l}" stroke="#aabeff" stroke-opacity="${0.12 + (k % 4) * 0.06}" stroke-width="1.5"/>`;
}).join('');
const nest = (name, x, y, s) => iconSvg(name).replace('<svg class="ico "', `<svg x="${x}" y="${y}" width="${s}" height="${s}"`);

// The building: 5 columns of windows, some lit with symbols.
const bx = 760, by = 58, cw = 78, gap = 16;
const ids = ['coin', null, 'cat', 'golden_ticket', null, 'flower', 'worker', null, 'bee', 'safe', null, 'mouse', 'coffee', 'pigeon', 'key'];
let windows = '';
ids.forEach((id, k) => {
  const c = k % 5, r = Math.floor(k / 5);
  const x = bx + 22 + c * (cw + gap), y = by + 40 + r * (cw + gap);
  const fill = id ? 'url(#lit)' : '#20253f';
  windows += `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" rx="6" fill="${fill}" stroke="#2b2135" stroke-width="4"/><rect x="${x + 4}" y="${y + 4}" width="${cw - 8}" height="${cw - 8}" rx="3" fill="none" stroke="#5c3a28" stroke-width="4"/>`;
  if (id) windows += nest(id, x + 9, y + 9, cw - 18);
  else windows += `<path d="M${x + cw / 2} ${y + 6}v${cw - 12}M${x + 6} ${y + cw / 2}h${cw - 12}" stroke="#5c3a28" stroke-width="3"/>`;
  windows += `<rect x="${x - 3}" y="${y + cw + 2}" width="${cw + 6}" height="6" rx="2" fill="#e6d9bd" stroke="#2b2135" stroke-width="2"/>`;
});
const fw = 22 * 2 + 5 * cw + 4 * gap;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2d52"/><stop offset="1" stop-color="#141526"/></linearGradient>
<radialGradient id="lit" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff3c9"/><stop offset=".6" stop-color="#f8d987"/><stop offset="1" stop-color="#e9b85a"/></radialGradient>
<pattern id="brick" width="32" height="16" patternUnits="userSpaceOnUse"><rect width="32" height="16" fill="#b9443a"/><path d="M0 15h32M16 0v8M0 8h32M8 8v8M24 8v8" stroke="#000" stroke-opacity=".18" stroke-width="2"/></pattern>
<filter id="glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${rain}
<rect x="${bx}" y="${by}" width="${fw}" height="${H - by + 10}" fill="url(#brick)" stroke="#2b2135" stroke-width="4"/>
<rect x="${bx - 10}" y="${by - 16}" width="${fw + 20}" height="20" rx="5" fill="#5b2522" stroke="#2b2135" stroke-width="4"/>
${windows}
<text x="60" y="176" font-family="Bungee, 'Arial Black', Impact, sans-serif" font-size="118" font-weight="900" fill="#f6c548" stroke="#7e2c2a" stroke-width="2" letter-spacing="4" filter="url(#glow)">RENTFALL</text>
<text x="64" y="222" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#f3ead8">Spin the windows. Chain the symbols. Pay the rent.</text>
<g transform="translate(64 246) rotate(-3)"><rect width="220" height="48" rx="8" fill="#f3ead8" stroke="#2b2135" stroke-width="3"/><text x="110" y="32" text-anchor="middle" font-family="'Courier New', monospace" font-size="22" font-weight="700" fill="#b9443a">RENT DUE: ¤2,400</text></g>
${nest('landlord', 310, 238, 70)}
${nest('house', 400, 244, 60)}
</svg>
`;
fs.writeFileSync(new URL('../../play/public/banners/rentfall.svg', import.meta.url), svg);
console.log('wrote banner', svg.length, 'bytes');
