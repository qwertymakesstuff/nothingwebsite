// Builds play/public/banners/world-dominion.svg (1260 x 320) from the game's own map data.
//   node tools/world-dominion/build-banner.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, MAP_W } from '../../world-dominion/js/data/world.js';

const W = 1260, H = 320;
const k = 1.15 * W / MAP_W;                       // map scale inside the banner
const ox = -60, oy = -150;                         // crop: northern hemisphere band
const TINTS = ['#2a3833', '#36352c', '#29323d', '#342e37', '#2d3a37', '#38372b'];
const round = (d) => d.replace(/-?\d+\.?\d*/g, (n) => Math.round(+n));
const visible = (c) => { const [x0, y0, x1, y1] = c.box.map((v, i) => v * k + (i % 2 ? oy : ox)); return x1 > 0 && x0 < W && y1 > 0 && y0 < H; };
const paths = COUNTRIES.filter(visible).map((c) => `<path d="${round(c.d)}" fill="${TINTS[c.tint]}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
<defs>
<radialGradient id="sea" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#132233"/><stop offset="1" stop-color="#070c12"/></radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070c12" stop-opacity=".1"/><stop offset=".55" stop-color="#070c12" stop-opacity=".55"/><stop offset="1" stop-color="#070c12" stop-opacity=".9"/></linearGradient>
<filter id="glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sea)"/>
<g transform="translate(${ox} ${oy}) scale(${k.toFixed(5)})" stroke="#070c12" stroke-width="1.2" stroke-linejoin="round">${paths}</g>
<rect width="${W}" height="${H}" fill="url(#fade)"/>
<text x="630" y="178" text-anchor="middle" font-family="'Space Grotesk','Arial Black',sans-serif" font-size="92" font-weight="700" letter-spacing="14" fill="#e9eef4" filter="url(#glow)">WORLD <tspan fill="#e2ad4a">DOMINION</tspan></text>
<text x="630" y="226" text-anchor="middle" font-family="'Inter',Arial,sans-serif" font-size="22" font-weight="500" letter-spacing="7" fill="#9aa7b6">LEAD A NATION · SHAPE THE WORLD</text>
</svg>
`;
const out = fileURLToPath(new URL('../../play/public/banners/world-dominion.svg', import.meta.url));
writeFileSync(out, svg);
console.log(`wrote ${(svg.length / 1024).toFixed(0)} KB -> ${out}`);
