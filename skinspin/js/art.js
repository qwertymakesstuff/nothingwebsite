// Original artwork, drawn as SVG: a silhouette per weapon painted with the finish's pattern, and
// a crate per case. Results are cached data URIs so cards can use plain <img> tags.

import { ITEMS_BY_ID } from './items.js';
import { CASES_BY_ID } from './cases.js';
import { seededRandom } from './rng.js';

// Silhouettes in a 256x128 box. `skin` parts take the finish, `dark` parts are bare metal/grip.
const SHAPES = {
  kodiak: {
    skin: ['M8 56 L64 50 L64 66 L14 78 Q6 79 6 72 Z', 'M62 46 H160 V64 H62 Z', 'M160 47 H206 V61 H160 Z'],
    dark: ['M206 51 H246 V56 H206 Z', 'M160 42 H214 V47 H160 Z', 'M236 44 H240 V51 H236 Z', 'M116 64 Q118 88 134 102 L148 95 Q134 82 132 64 Z', 'M84 64 H98 L92 90 H78 Z', 'M98 64 Q100 74 112 74 V70 Q103 70 102 64 Z'],
  },
  lancer: {
    skin: ['M10 50 H50 V66 L14 70 Q8 70 8 64 Z', 'M62 46 H150 V64 H62 Z', 'M150 47 H208 V62 H150 Z'],
    dark: ['M50 54 H64 V60 H50 Z', 'M70 40 H140 V46 H70 Z', 'M208 52 H244 V57 H208 Z', 'M196 38 H202 V47 H196 Z', 'M112 64 H128 L132 98 H116 Z', 'M80 64 H94 L88 90 H74 Z'],
  },
  viper: {
    skin: ['M14 50 Q14 44 22 44 H150 Q158 44 164 52 V62 H14 Z', 'M14 62 H70 V74 Q40 76 14 72 Z'],
    dark: ['M164 52 H238 V58 H164 Z', 'M84 30 H150 V40 H84 Z', 'M98 40 H104 V44 H98 Z', 'M130 40 H136 V44 H130 Z', 'M146 62 H158 L154 90 H142 Z', 'M58 74 H76 L80 100 H62 Z', 'M104 62 H118 L112 88 H98 Z'],
  },
  harrier: {
    skin: ['M20 52 H170 V66 H20 Z', 'M6 54 H22 V74 H6 Z', 'M60 36 H150 V40 H146 V52 H64 V40 H60 Z'],
    dark: ['M170 56 H236 V61 H170 Z', 'M66 66 H82 V96 H66 Z', 'M120 66 H134 L128 92 H114 Z', 'M226 52 H230 V56 H226 Z'],
  },
  warden: {
    skin: ['M56 34 H200 Q206 34 206 40 V54 H56 Z', 'M60 54 H196 V64 H60 Z'],
    dark: ['M66 62 H108 L100 108 H62 Q56 108 58 100 Z', 'M108 64 Q110 84 132 82 V76 Q116 78 116 64 Z', 'M206 42 H212 V50 H206 Z'],
  },
  sentinel: {
    skin: ['M40 38 H160 V56 H40 Z', 'M44 56 H156 V64 H44 Z'],
    dark: ['M160 40 H240 V54 H160 Z', 'M50 62 H88 L82 104 H46 Z', 'M88 64 Q90 82 110 80 V74 Q96 76 96 64 Z'],
  },
  deckard: {
    skin: ['M50 30 H214 V54 H50 Z', 'M54 54 H190 V64 H54 Z'],
    dark: ['M60 62 H104 L94 110 H56 Z', 'M104 64 Q106 86 130 84 V78 Q112 80 112 64 Z', 'M214 36 H222 V50 H214 Z', 'M44 30 H52 V40 H44 Z'],
  },
  pike: {
    skin: ['M58 36 H190 L198 42 V54 H58 Z', 'M62 54 H186 V62 H62 Z'],
    dark: ['M66 60 H106 L100 104 H62 Z', 'M106 62 Q108 80 128 78 V72 Q114 74 114 62 Z', 'M198 44 H204 V50 H198 Z'],
  },
  wasp: {
    skin: ['M56 42 H186 V60 H56 Z'],
    dark: ['M186 47 H226 V54 H186 Z', 'M14 42 H56 V47 H22 V56 H56 V61 H14 Z', 'M118 60 H132 L134 108 H120 Z', 'M90 60 H104 L100 92 H86 Z', 'M160 60 H170 L168 84 H158 Z'],
  },
  rattler: {
    skin: ['M60 40 H170 V62 H60 Z'],
    dark: ['M170 46 H214 V56 H170 Z', 'M94 62 H112 L114 112 H96 Z', 'M20 44 H60 V48 H26 V58 H60 V62 H20 Z'],
  },
  drover: {
    skin: ['M30 46 Q30 38 40 38 H190 Q206 38 210 50 L206 64 H40 Q30 64 30 56 Z', 'M30 50 L14 58 L16 78 L44 80 L46 64 Z'],
    dark: ['M60 32 H180 V38 H60 Z', 'M210 48 H232 V54 H210 Z', 'M120 64 H136 L130 92 H114 Z'],
  },
  longbow: {
    skin: ['M6 52 L70 48 V66 L50 66 L40 80 L8 80 Q4 74 6 66 Z', 'M70 48 H150 V62 H70 Z', 'M150 49 H190 V60 H150 Z'],
    dark: ['M190 52 H250 V57 H190 Z', 'M80 30 H160 V42 H80 Z', 'M74 28 H86 V44 H74 Z', 'M156 28 H168 V44 H156 Z', 'M100 42 H106 V48 H100 Z', 'M134 42 H140 V48 H134 Z', 'M110 62 H126 V78 H110 Z', 'M78 62 H94 L86 84 H72 Z'],
  },
  kite: {
    skin: ['M8 54 L80 50 V62 L20 72 Q8 72 8 64 Z', 'M78 48 H190 V58 H78 Z'],
    dark: ['M190 51 H250 V55 H190 Z', 'M96 34 H162 V43 H96 Z', 'M92 32 H100 V45 H92 Z', 'M158 32 H166 V45 H158 Z', 'M120 58 H132 V72 H120 Z', 'M86 58 H98 L92 78 H80 Z'],
  },
  mauler: {
    skin: ['M8 54 L66 50 V64 L14 76 Q6 76 6 68 Z', 'M64 48 H130 V64 H64 Z', 'M160 56 H206 V67 H160 Z'],
    dark: ['M130 50 H246 V56 H130 Z', 'M130 58 H220 V63 H130 Z', 'M80 64 H94 L90 82 H76 Z'],
  },
  breacher: {
    skin: ['M40 46 H180 V66 H40 Z', 'M10 50 H42 V70 L14 74 Q8 74 8 68 Z'],
    dark: ['M180 52 H236 V60 H180 Z', 'M110 66 H134 V100 H110 Z', 'M70 66 H84 L80 92 H66 Z', 'M60 40 H170 V46 H60 Z'],
  },
  anvil: {
    skin: ['M6 52 H50 V72 L12 76 Q6 76 6 70 Z', 'M48 44 H170 V68 H48 Z', 'M170 48 H214 V62 H170 Z'],
    dark: ['M214 52 H250 V58 H214 Z', 'M100 68 H138 V100 H100 Z', 'M66 68 H80 L76 94 H62 Z', 'M222 58 L214 92 L218 92 L228 58 Z', 'M232 58 L240 92 L244 92 L236 58 Z', 'M110 36 H150 V40 H146 V44 H114 V40 H110 Z'],
  },
  juggernaut: {
    skin: ['M6 50 H52 V70 L12 74 Q6 74 6 68 Z', 'M50 42 H180 V66 H50 Z'],
    dark: ['M180 50 H250 V57 H180 Z', 'M96 78 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 Z', 'M70 66 H84 L80 92 H66 Z', 'M230 57 L222 92 L226 92 L236 57 Z'],
  },
  claw: {
    skin: ['M118 54 Q172 48 216 86 Q208 94 198 90 Q166 70 118 74 Z'],
    dark: ['M40 64 Q40 54 50 54 H120 V74 H50 Q40 74 40 64 Z', 'M18 64 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 Z M25 64 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0 Z'],
  },
  moth: {
    skin: ['M120 52 H210 L236 61 L210 70 H120 Z'],
    dark: ['M30 49 H122 V58 H30 Z', 'M30 66 H122 V75 H30 Z', 'M22 55 H32 V69 H22 Z'],
  },
  spike: {
    skin: ['M120 52 H214 L248 62 L214 72 H120 Z'],
    dark: ['M132 60 H204 V63 H132 Z', 'M110 40 H122 V86 H110 Z', 'M32 54 Q24 54 24 63 Q24 72 32 72 H110 V54 Z'],
  },
  switch: {
    skin: ['M118 54 H206 Q236 56 244 68 H118 Z'],
    dark: ['M32 56 Q24 56 24 65 Q24 74 32 74 H120 V56 Z', 'M118 68 L128 82 L134 68 Z'],
  },
  ranger: {
    skin: ['M118 50 H200 L222 58 Q240 62 248 67 Q222 80 200 80 H118 Z'],
    dark: ['M108 40 H120 V90 H108 Z', 'M32 54 Q22 54 22 66 Q22 77 32 77 H108 V54 Z'],
  },
};

const GLOVE_HAND = [
  'M10 50 Q10 40 20 40 H62 Q72 40 72 50 V84 H10 Z',
  'M12 46 V18 Q12 12 18 12 Q24 12 24 18 V46 Z',
  'M26 44 V8 Q26 2 32 2 Q38 2 38 8 V44 Z',
  'M40 44 V6 Q40 0 46 0 Q52 0 52 6 V44 Z',
  'M54 46 V14 Q54 8 60 8 Q66 8 66 14 V46 Z',
  'M66 64 L82 46 Q88 40 93 46 Q96 51 91 57 L72 82 Z',
];
const GLOVE_CUFF = { racer: 'M6 84 H76 V112 H6 Z', wraps: 'M10 84 H72 V100 H10 Z', driver: 'M8 84 H74 V104 H8 Z', tactical: 'M4 82 H78 V114 H4 Z' };

const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${Math.max(0, Math.min(100, s))}%,${l}%,${a})`;

function patternDefs({ hue: h, pattern, sat: s }, seed) {
  const base = hsl(h, s, 46), dark = hsl(h + 15, s, 24), light = hsl(h - 20, s + 10, 66);
  const rng = seededRandom(seed);
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const pat = (w, ht, body, extra = '') => `<pattern id="p" width="${w}" height="${ht}" patternUnits="userSpaceOnUse" ${extra}>${body}</pattern>`;
  switch (pattern) {
    case 'gradient': return grad('p', [[0, hsl(h - 40, s + 10, 58)], [0.5, base], [1, hsl(h + 60, s, 40)]], 1, 0);
    case 'stripes': return pat(14, 14, `<rect width="14" height="14" fill="${base}"/><rect width="6" height="14" fill="${dark}"/>`, 'patternTransform="rotate(35)"');
    case 'camo': {
      let blobs = '';
      for (let i = 0; i < 9; i++) blobs += `<ellipse cx="${(rng() * 64).toFixed(1)}" cy="${(rng() * 40).toFixed(1)}" rx="${(6 + rng() * 9).toFixed(1)}" ry="${(4 + rng() * 6).toFixed(1)}" fill="${i % 3 ? dark : light}" transform="rotate(${(rng() * 60 - 30).toFixed(0)})"/>`;
      return pat(64, 40, `<rect width="64" height="40" fill="${base}"/>${blobs}`);
    }
    case 'hex': return pat(24, 42, `<rect width="24" height="42" fill="${base}"/><path d="M0 7 L12 0 L24 7 V21 L12 28 L0 21 Z M12 28 V42" fill="none" stroke="${dark}" stroke-width="2.4"/><path d="M12 4 L20 9 V19 L12 24 L4 19 V9 Z" fill="${light}" opacity=".35"/>`);
    case 'waves': return pat(40, 16, `<rect width="40" height="16" fill="${base}"/><path d="M0 8 Q10 0 20 8 T40 8" fill="none" stroke="${light}" stroke-width="3"/><path d="M0 14 Q10 6 20 14 T40 14" fill="none" stroke="${dark}" stroke-width="2.5"/>`);
    case 'digital': {
      let cells = '';
      const cols = [base, dark, light, base];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cells += `<rect x="${x * 6}" y="${y * 6}" width="6" height="6" fill="${cols[Math.floor(rng() * cols.length)]}"/>`;
      return pat(24, 24, cells);
    }
    case 'splatter': {
      let dots = '';
      for (let i = 0; i < 14; i++) dots += `<circle cx="${(rng() * 60).toFixed(1)}" cy="${(rng() * 60).toFixed(1)}" r="${(1 + rng() * 5).toFixed(1)}" fill="${i % 2 ? light : dark}"/>`;
      return pat(60, 60, `<rect width="60" height="60" fill="${base}"/>${dots}`);
    }
    case 'flame':
      return grad('fg', [[0, hsl(h + 35, 95, 62)], [0.55, base], [1, dark]]) +
        pat(30, 60, `<rect width="30" height="60" fill="url(#fg)"/><path d="M0 60 Q8 34 4 14 Q14 32 15 2 Q19 30 26 14 Q24 40 30 60 Z" fill="${hsl(h + 40, 100, 70)}" opacity=".55"/>`);
    case 'marble': return pat(80, 40, `<rect width="80" height="40" fill="${base}"/><path d="M0 10 C20 0 30 30 50 18 S70 4 80 12" fill="none" stroke="${light}" stroke-width="2" opacity=".8"/><path d="M0 30 C18 22 34 40 54 30 S74 22 80 34" fill="none" stroke="${dark}" stroke-width="3" opacity=".8"/>`);
    case 'circuit': return pat(32, 32, `<rect width="32" height="32" fill="${dark}"/><path d="M0 8 H12 V20 H32 M8 32 V26 H22 V0" fill="none" stroke="${light}" stroke-width="1.6"/><circle cx="12" cy="8" r="2.2" fill="${light}"/><circle cx="22" cy="26" r="2.2" fill="${base}"/>`);
    default: return grad('p', [[0, light], [0.45, base], [1, dark]]);
  }
}

const SHEEN = '<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>';
const OUTLINE = 'stroke="rgba(0,0,0,.55)" stroke-width="1.4" stroke-linejoin="round"';
const METAL = '#4a5262';

function paths(list, fill, rule = 'nonzero') {
  return list.map(d => `<path d="${d}" fill="${fill}" fill-rule="${rule}" ${OUTLINE}/>`).join('');
}

function itemSvg(item) {
  let seed = 0;
  for (const ch of item.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const defs = patternDefs(item.art, seed) + SHEEN;
  let body;
  if (item.type === 'gloves') {
    const hand = paths(GLOVE_HAND, 'url(#p)') + paths(GLOVE_HAND, 'url(#sh)');
    const cuff = `<path d="${GLOVE_CUFF[item.weapon]}" fill="${item.weapon === 'wraps' ? 'url(#p)' : METAL}" ${OUTLINE}/>`;
    const one = `${hand}${cuff}`;
    body = `<g transform="translate(34 8) scale(.98)">${one}</g><g transform="translate(222 8) scale(-.98 .98)">${one}</g>`;
  } else {
    const s = SHAPES[item.weapon];
    body = paths(s.dark, METAL, 'evenodd') + paths(s.skin, 'url(#p)') + paths(s.skin, 'url(#sh)');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128"><defs>${defs}</defs>${body}</svg>`;
}

const GLYPHS = {
  star: { d: 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z' },
  gear: { d: 'M12 1 a11 11 0 1 0 0.01 0 Z M12 7 a5 5 0 1 1 -0.01 0 Z', rule: 'evenodd' },
  spray: { d: 'M7 8 H17 V22 H7 Z M9 4 H15 V8 H9 Z M17 4 H20 V6 H17 Z' },
  bolt: { d: 'M13 2 L4 14 H11 L9 22 L20 9 H13 L15 2 Z' },
  snow: { d: 'M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7', stroke: true },
  flame: { d: 'M12 2 C14 7 19 9 19 15 A7 7 0 0 1 5 15 C5 11 8 9 9 6 C10 9 11 10 12 10 C12 7 11 5 12 2 Z' },
  drop: { d: 'M12 2 C16 9 19 12 19 15 A7 7 0 0 1 5 15 C5 12 8 9 12 2 Z' },
  crown: { d: 'M3 18 L5 7 L10 12 L12 5 L14 12 L19 7 L21 18 Z M3 20 H21 V22 H3 Z' },
  claw: { d: 'M6 3 Q3 12 8 21 M12 3 Q9 12 14 21 M18 3 Q15 12 20 21', stroke: true },
  moon: { d: 'M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3 Z' },
  blade: { d: 'M3 21 L5 17 L17 3 L21 3 L21 7 L7 19 Z M3 21 L7 19 L5 17 Z' },
  glove: { d: 'M6 22 V11 L4 7 Q4 5 6 6 L8 9 V3 Q8 2 9 2 Q10 2 10 3 V9 H11 V2 Q11 1 12 1 Q13 1 13 2 V9 H14 V3 Q14 2 15 2 Q16 2 16 3 V10 H17 V5 Q17 4 18 4 Q19 4 19 5 V15 Q19 19 16 22 Z' },
  wave: { d: 'M2 9 Q7 4 12 9 T22 9 M2 15 Q7 10 12 15 T22 15', stroke: true },
  gamepad: { d: 'M6 7 H18 A5 5 0 0 1 18 17 L16 17 L14 15 H10 L8 17 L6 17 A5 5 0 0 1 6 7 Z' },
};

function caseSvg(c) {
  const { from, to, glyph } = c.theme;
  const g = GLYPHS[glyph] || GLYPHS.star;
  const glyphEl = g.stroke
    ? `<path d="${g.d}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="${g.d}" fill="#fff" fill-rule="${g.rule || 'nonzero'}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 170">
<defs>
<radialGradient id="glow" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="${from}" stop-opacity=".55"/><stop offset="1" stop-color="${from}" stop-opacity="0"/></radialGradient>
<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
<linearGradient id="lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="${from}"/></linearGradient>
</defs>
<ellipse cx="110" cy="100" rx="110" ry="70" fill="url(#glow)"/>
<ellipse cx="110" cy="156" rx="84" ry="8" fill="#000" opacity=".45"/>
<path d="M30 70 H190 V150 Q190 154 186 154 H34 Q30 154 30 150 Z" fill="url(#body)" stroke="rgba(0,0,0,.6)" stroke-width="2"/>
<path d="M30 102 H190 V112 H30 Z" fill="#000" opacity=".28"/>
<path d="M22 52 Q22 48 26 48 H194 Q198 48 198 52 V74 H22 Z" fill="url(#lid)" stroke="rgba(0,0,0,.6)" stroke-width="2"/>
<path d="M22 74 H198" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
<path d="M30 70 h14 v84 h-10 q-4 0 -4 -4 Z M190 70 h-14 v84 h10 q4 0 4 -4 Z" fill="#11151c" opacity=".55"/>
<rect x="98" y="66" width="24" height="14" rx="3" fill="#11151c" stroke="${from}" stroke-width="1.5"/>
<circle cx="110" cy="116" r="25" fill="rgba(0,0,0,.4)" stroke="${from}" stroke-width="2.5"/>
<g transform="translate(95 101) scale(1.25)">${glyphEl}</g>
</svg>`;
}

const cache = new Map();
const toUri = svg => `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}`;

export function itemArt(itemId) {
  const key = `i:${itemId}`;
  if (!cache.has(key)) {
    const item = ITEMS_BY_ID[itemId];
    cache.set(key, item ? toUri(itemSvg(item)) : '');
  }
  return cache.get(key);
}

export function caseArt(caseId) {
  const key = `c:${caseId}`;
  if (!cache.has(key)) {
    const c = CASES_BY_ID[caseId];
    cache.set(key, c ? toUri(caseSvg(c)) : '');
  }
  return cache.get(key);
}

export { itemSvg, caseSvg, SHAPES };
