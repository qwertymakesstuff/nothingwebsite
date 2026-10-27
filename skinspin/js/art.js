// Item and case artwork. Cases and the Mill Street items use the painted images in assets/
// (from the asset archive). Every other item is drawn as SVG: a silhouette per weapon painted with
// the finish's pattern, cached as a data URI. Either way callers get a URL for a plain <img>.

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

// Drawn shapes for the Mill Street items that have no painted image.
SHAPES.charm = { // a loose hex bolt on a key ring
  skin: ['M96 44 L120 30 L144 44 V72 L120 86 L96 72 Z'],
  dark: ['M116 86 H124 V118 H116 Z', 'M110 92 H130 V96 H110 Z M110 100 H130 V104 H110 Z M110 108 H130 V112 H110 Z', 'M108 18 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0 Z M113 18 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z'],
};
SHAPES.collectible = { // a mug
  skin: ['M86 26 H158 V100 Q158 112 146 112 H98 Q86 112 86 100 Z'],
  dark: ['M158 42 Q184 42 184 66 Q184 90 158 90 V80 Q174 80 174 66 Q174 52 158 52 Z', 'M80 112 H164 V118 H80 Z'],
};
// Mill Street weapons fall back to the closest drawn silhouette if their image is missing.
const STAND_IN = { ar7: 'kodiak', vex: 'wasp', p9: 'warden', magnum: 'deckard', longshot: 'longbow', karambit: 'claw', butterfly: 'moth', boxcutter: 'switch', sticker: 'charm' };

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
    const cuff = `<path d="${GLOVE_CUFF[item.weapon] || GLOVE_CUFF.tactical}" fill="${item.weapon === 'wraps' ? 'url(#p)' : METAL}" ${OUTLINE}/>`;
    const one = `${hand}${cuff}`;
    body = `<g transform="translate(34 8) scale(.98)">${one}</g><g transform="translate(222 8) scale(-.98 .98)">${one}</g>`;
  } else {
    const s = SHAPES[item.weapon] || SHAPES[STAND_IN[item.weapon]];
    body = paths(s.dark, METAL, 'evenodd') + paths(s.skin, 'url(#p)') + paths(s.skin, 'url(#sh)');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128"><defs>${defs}</defs>${body}</svg>`;
}

const cache = new Map();
const toUri = svg => `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}`;

export function itemArt(itemId) {
  const key = `i:${itemId}`;
  if (!cache.has(key)) {
    const item = ITEMS_BY_ID[itemId];
    cache.set(key, !item ? '' : item.image ? `assets/items/${item.image}.webp` : toUri(itemSvg(item)));
  }
  return cache.get(key);
}

export function caseArt(caseId) {
  return CASES_BY_ID[caseId] ? `assets/cases/${caseId}.webp` : '';
}

export { itemSvg, SHAPES };
