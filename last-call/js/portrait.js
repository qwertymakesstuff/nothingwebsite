// Procedural portraits as SVG strings: a flat, thick-outlined "sticker" style. The same traits
// draw the person at the door, their ID photo and the banned-list mugshots, so comparing them is a
// real visual task. Moods change brows and mouth; intoxication adds heavy lids and flushed cheeks.

import { SKIN, EYE_HEX, HAIR_COLORS, OUTFIT } from './appearance.js';

const INK = '#1a1220';
const SW = 3;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

const HEAD = {
  oval: 'M100 44 C130 44 146 70 146 102 C146 136 126 158 100 158 C74 158 54 136 54 102 C54 70 70 44 100 44 Z',
  round: 'M100 48 C132 48 152 72 152 104 C152 136 130 156 100 156 C70 156 48 136 48 104 C48 72 68 48 100 48 Z',
  square: 'M64 48 L136 48 Q148 48 148 62 L148 132 Q148 156 124 158 L76 158 Q52 156 52 132 L52 62 Q52 48 64 48 Z',
  long: 'M100 38 C128 38 142 64 142 100 C142 140 124 164 100 164 C76 164 58 140 58 100 C58 64 72 38 100 38 Z',
  heart: 'M100 46 C134 44 150 70 148 98 C146 128 122 150 100 160 C78 150 54 128 52 98 C50 70 66 44 100 46 Z',
};
const HEAD_W = { oval: 46, round: 52, square: 48, long: 42, heart: 48 };
const HEAD_TOP = { oval: 44, round: 48, square: 48, long: 38, heart: 46 };
const CHIN = { oval: 158, round: 156, square: 158, long: 164, heart: 160 };

function hairBack(f, col) {
  const w = HEAD_W[f.faceShape];
  const t = HEAD_TOP[f.faceShape];
  const s = `fill="${col}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"`;
  switch (f.hair) {
    case 'long': return `<path d="M${100 - w - 8} ${t + 40} Q${100 - w - 14} ${t + 150} ${100 - w + 6} ${t + 162} L${100 + w - 6} ${t + 162} Q${100 + w + 14} ${t + 150} ${100 + w + 8} ${t + 40} Q100 ${t - 26} ${100 - w - 8} ${t + 40} Z" ${s}/>`;
    case 'bob': return `<path d="M${100 - w - 10} ${t + 40} Q${100 - w - 14} ${t + 104} ${100 - w + 2} ${t + 108} L${100 + w - 2} ${t + 108} Q${100 + w + 14} ${t + 104} ${100 + w + 10} ${t + 40} Q100 ${t - 24} ${100 - w - 10} ${t + 40} Z" ${s}/>`;
    case 'braids': return `<path d="M${100 - w - 6} ${t + 30} L${100 - w - 10} ${t + 170} L${100 - w + 10} ${t + 170} L${100 - w + 8} ${t + 60} Z M${100 + w + 6} ${t + 30} L${100 + w + 10} ${t + 170} L${100 + w - 10} ${t + 170} L${100 + w - 8} ${t + 60} Z" ${s}/>`;
    case 'afro': return `<circle cx="100" cy="${t + 40}" r="${w + 24}" ${s}/>`;
    case 'curly': return `<g ${s}>${[-1, 1].map(d => `<circle cx="${100 + d * (w + 4)}" cy="${t + 50}" r="16"/><circle cx="${100 + d * (w + 2)}" cy="${t + 74}" r="13"/>`).join('')}</g>`;
    case 'ponytail': return `<path d="M${100 + w - 4} ${t + 30} Q${100 + w + 34} ${t + 50} ${100 + w + 18} ${t + 120} Q${100 + w + 6} ${t + 80} ${100 + w - 10} ${t + 60} Z" ${s}/>`;
    case 'bun': return `<circle cx="100" cy="${t - 12}" r="20" ${s}/>`;
    default: return '';
  }
}

function hairFront(f, col) {
  const w = HEAD_W[f.faceShape];
  const t = HEAD_TOP[f.faceShape];
  const s = `fill="${col}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"`;
  const cap = (depth, extra = '') => `<path d="M${100 - w - 3} ${t + depth} Q${100 - w} ${t - 10} 100 ${t - 8} Q${100 + w} ${t - 10} ${100 + w + 3} ${t + depth} ${extra} Q100 ${t + 12} ${100 - w - 3} ${t + depth} Z" ${s}/>`;
  switch (f.hair) {
    case 'bald': return `<path d="M${100 - 18} ${t + 12} Q100 ${t + 4} ${100 + 14} ${t + 10}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
    case 'buzz': return `<path d="M${100 - w} ${t + 30} Q${100 - w} ${t - 2} 100 ${t - 2} Q${100 + w} ${t - 2} ${100 + w} ${t + 30} Q100 ${t + 14} ${100 - w} ${t + 30} Z" fill="${col}" fill-opacity=".85" stroke="${INK}" stroke-width="2"/>`;
    case 'mohawk': return `<path d="M88 ${t + 18} L92 ${t - 34} L100 ${t - 40} L108 ${t - 34} L112 ${t + 18} Z" ${s}/><path d="M${100 - w + 4} ${t + 26} Q100 ${t + 4} ${100 + w - 4} ${t + 26}" fill="none" stroke="${col}" stroke-opacity=".5" stroke-width="5"/>`;
    case 'sidepart': return `<path d="M${100 - w - 3} ${t + 44} Q${100 - w - 4} ${t - 10} 100 ${t - 8} Q${100 + w + 6} ${t - 8} ${100 + w + 3} ${t + 40} Q${100 + w - 6} ${t + 8} ${100 - 14} ${t + 16} Q${100 - w + 6} ${t + 20} ${100 - w - 3} ${t + 44} Z" ${s}/>`;
    case 'curly': return `<g ${s}>${[-36, -18, 0, 18, 36].map((x, i) => `<circle cx="${100 + x * w / 46}" cy="${t + (i % 2 ? 4 : 10)}" r="15"/>`).join('')}</g>`;
    case 'afro': return `<path d="M${100 - w} ${t + 36} Q${100 - w + 6} ${t + 8} 100 ${t + 10} Q${100 + w - 6} ${t + 8} ${100 + w} ${t + 36}" fill="${col}" stroke="none"/>`;
    case 'bun': case 'ponytail': return cap(26);
    case 'braids': return cap(30);
    case 'long': case 'bob': return `<path d="M${100 - w - 4} ${t + 60} Q${100 - w - 6} ${t - 8} 100 ${t - 8} Q${100 + w + 6} ${t - 8} ${100 + w + 4} ${t + 60} Q${100 + w - 4} ${t + 16} ${100 + 8} ${t + 18} Q${100 - 10} ${t + 30} ${100 - w + 4} ${t + 36} Q${100 - w + 2} ${t + 46} ${100 - w - 4} ${t + 60} Z" ${s}/>`;
    default: return cap(28); // short
  }
}

function brows(f, mood) {
  const width = { thin: 2.6, thick: 6, arched: 3.6, straight: 4.2 }[f.brows];
  const col = f.hairColor === 'white' || f.hairColor === 'grey' ? '#7a7a7a' : HAIR_COLORS[f.hairColor] ?? '#2a1d18';
  const tilt = { angry: 5, stern: 4, sad: -5, nervous: -4, happy: -2, surprised: -6, smirk: 0, neutral: 0, sigh: -3, smile: -1 }[mood] ?? 0;
  const arch = f.brows === 'arched' ? -5 : f.brows === 'straight' ? 0 : -2;
  const one = (x, dir) => {
    const inner = x + dir * 9; const outer = x - dir * 9;
    const raise = mood === 'smirk' && dir === -1 ? -4 : 0;
    return `<path d="M${outer} ${86 + raise} Q${x} ${80 + arch + raise} ${inner} ${86 + tilt + raise}" fill="none" stroke="${col}" stroke-width="${width}" stroke-linecap="round"/>`;
  };
  return one(82, 1) + one(118, -1);
}

function eyes(f, drunk, mood, skin) {
  const iris = EYE_HEX[f.eyes];
  const open = mood === 'surprised' ? 7 : 5.5;
  const one = x => `<ellipse cx="${x}" cy="100" rx="8.5" ry="${open}" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${x + (mood === 'nervous' ? 2 : 0)}" cy="100.5" r="4.4" fill="${iris}"/><circle cx="${x + (mood === 'nervous' ? 2 : 0)}" cy="100.5" r="1.9" fill="${INK}"/><circle cx="${x + 1.6}" cy="98.8" r="1.1" fill="#fff"/>`
    + (drunk ? `<path d="M${x - 9} 100 Q${x} ${94} ${x + 9} 100 L${x + 9} 93 L${x - 9} 93 Z" fill="${skin}" stroke="${INK}" stroke-width="2"/>` : '')
    + (mood === 'happy' || mood === 'smile' ? `<path d="M${x - 8} 105 Q${x} 101 ${x + 8} 105" fill="none" stroke="${INK}" stroke-width="1.5" opacity=".5"/>` : '');
  return one(82) + one(118);
}

function nose(f, skin) {
  const d = shade(skin, -0.18);
  switch (f.nose) {
    case 'button': return `<path d="M96 116 Q100 121 104 116" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;
    case 'broad': return `<path d="M100 104 L100 114 M91 118 Q94 122 100 120 Q106 122 109 118" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;
    case 'hooked': return `<path d="M99 100 Q108 110 103 119 Q99 121 96 118" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;
    default: return `<path d="M100 102 L102 116 Q100 119 96 117" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`;
  }
}

function mouth(mood) {
  const s = `fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"`;
  switch (mood) {
    case 'happy': return `<path d="M86 130 Q100 144 114 130 Z" fill="#7a2030" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M90 132 L110 132" stroke="#fff" stroke-width="3"/>`;
    case 'smile': return `<path d="M88 131 Q100 140 112 131" ${s}/>`;
    case 'smirk': return `<path d="M88 134 Q102 136 112 127" ${s}/>`;
    case 'angry': return `<path d="M88 136 Q100 128 112 136" ${s}/>`;
    case 'stern': return `<path d="M89 133 L111 133" ${s}/>`;
    case 'sad': case 'sigh': return `<path d="M89 137 Q100 129 111 137" ${s}/>`;
    case 'nervous': return `<path d="M88 134 Q92 130 96 134 Q100 138 104 134 Q108 130 112 134" ${s}/>`;
    case 'surprised': return `<ellipse cx="100" cy="134" rx="6" ry="8" fill="#5a1a26" stroke="${INK}" stroke-width="2.5"/>`;
    default: return `<path d="M90 132 Q100 136 110 132" ${s}/>`;
  }
}

function facialHair(f) {
  const col = HAIR_COLORS[f.hairColor] ?? '#2a1d18';
  const chin = CHIN[f.faceShape];
  const w = HEAD_W[f.faceShape];
  if (f.facial === 'beard') return `<path d="M${100 - w + 4} 112 Q${100 - w + 6} ${chin + 4} 100 ${chin + 8} Q${100 + w - 6} ${chin + 4} ${100 + w - 4} 112 Q${100 + w - 14} 128 112 126 Q100 122 88 126 Q${100 - w + 14} 128 ${100 - w + 4} 112 Z M90 136 Q100 142 110 136 Q100 132 90 136 Z" fill="${col}" fill-rule="evenodd" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (f.facial === 'mustache') return `<path d="M86 127 Q93 120 100 124 Q107 120 114 127 Q107 128 100 127 Q93 128 86 127 Z" fill="${col}" stroke="${INK}" stroke-width="2"/>`;
  if (f.facial === 'stubble') return `<path d="M${100 - w + 6} 116 Q${100 - w + 8} ${chin} 100 ${chin + 2} Q${100 + w - 8} ${chin} ${100 + w - 6} 116 Q100 126 ${100 - w + 6} 116 Z" fill="${col}" opacity=".22"/>`;
  return '';
}

function hat(item) {
  const s = `stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"`;
  if (item === 'cap') return `<path d="M54 74 Q56 30 100 30 Q144 30 146 74 Z" fill="#c8323c" ${s}/><path d="M54 74 Q100 64 168 80 Q150 90 54 80 Z" fill="#a8242e" ${s}/><circle cx="100" cy="31" r="4" fill="#a8242e" ${s}/>`;
  if (item === 'beanie') return `<path d="M52 76 Q52 22 100 22 Q148 22 148 76 Z" fill="#3a6a8a" ${s}/><rect x="48" y="64" width="104" height="18" rx="6" fill="#2c5470" ${s}/><circle cx="100" cy="20" r="9" fill="#e0e0e0" ${s}/>`;
  if (item === 'fedora') return `<path d="M24 72 Q100 52 176 72 Q100 88 24 72 Z" fill="#3a2e28" ${s}/><path d="M60 68 Q62 26 100 28 Q138 26 140 68 Q100 60 60 68 Z" fill="#4a3a32" ${s}/><path d="M61 62 Q100 54 139 62" fill="none" stroke="#c49a4a" stroke-width="5"/>`;
  return '';
}

function torso(top, skin) {
  const o = OUTFIT[top] ?? { draw: 'tee', color: '#666' };
  const c = o.color;
  const d = shade(c, -0.15);
  const s = `stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"`;
  const body = `<path d="M14 244 Q18 190 66 176 L134 176 Q182 190 186 244 Z" fill="${c}" ${s}/>`;
  const skinBody = `<path d="M14 244 Q18 190 66 176 L134 176 Q182 190 186 244 Z" fill="${skin}" ${s}/>`;
  switch (o.draw) {
    case 'tee': return body + `<path d="M80 177 Q100 194 120 177" fill="none" ${s}/>` + (top === 'tshirt-band' ? `<rect x="80" y="206" width="40" height="24" rx="3" fill="#e8e0d0" stroke="${INK}" stroke-width="2"/><path d="M86 224 L94 210 L100 220 L106 212 L114 224" fill="none" stroke="#b02a3a" stroke-width="2.5"/>` : top === 'tshirt-graphic' ? `<circle cx="100" cy="214" r="13" fill="#ffd34a" stroke="${INK}" stroke-width="2"/>` : '');
    case 'hoodie': return body + `<path d="M64 178 Q100 214 136 178 Q132 168 100 170 Q68 168 64 178 Z" fill="${d}" ${s}/><path d="M92 196 L90 222 M108 196 L110 222" stroke="#eee" stroke-width="3" stroke-linecap="round"/><path d="M100 202 L100 244" stroke="${INK}" stroke-width="2"/>`;
    case 'jersey': return body + `<path d="M84 177 L100 198 L116 177" fill="none" stroke="#fff" stroke-width="5"/><text x="100" y="232" font-family="Arial Black,Arial" font-weight="900" font-size="28" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="1.5">10</text>`;
    case 'track': return body + `<path d="M100 178 L100 244" stroke="#ddd" stroke-width="3"/><path d="M40 196 L22 244 M160 196 L178 244" stroke="#fff" stroke-width="6"/><path d="M86 176 L100 188 L114 176" fill="${d}" ${s}/>`;
    case 'tank': return skinBody + `<path d="M58 244 L66 196 Q72 182 78 178 L84 178 Q86 200 100 202 Q114 200 116 178 L122 178 Q128 182 134 196 L142 244 Z" fill="${c}" ${s}/>`;
    case 'blazer': return body + `<path d="M84 177 L100 216 L116 177 Z" fill="#f2f2f2" ${s}/><path d="M68 178 L100 236 L86 244 M132 178 L100 236 L114 244" fill="none" stroke="${d}" stroke-width="4"/><path d="M84 177 L76 204 L92 200 Z M116 177 L124 204 L108 200 Z" fill="${d}" ${s}/>`;
    case 'suit': return body + `<path d="M84 177 L100 222 L116 177 Z" fill="#f4f4f4" ${s}/><path d="M96 182 L104 182 L106 214 L100 224 L94 214 Z" fill="#8a1f2e" ${s}/><path d="M84 177 L76 208 L94 204 Z M116 177 L124 208 L106 204 Z" fill="${d}" ${s}/>`;
    case 'dress': return skinBody + `<path d="M40 244 Q46 206 60 196 Q80 206 100 206 Q120 206 140 196 Q154 206 160 244 Z" fill="${c}" ${s}/><path d="M66 198 L72 180 M134 198 L128 180" stroke="${c}" stroke-width="4"/>` + (top === 'dress-sequin' ? Array.from({ length: 14 }, (_, i) => `<circle cx="${56 + (i * 37) % 90}" cy="${214 + (i * 13) % 26}" r="2" fill="#fff6c8"/>`).join('') : '');
    case 'leather': return body + `<path d="M100 178 L100 244" stroke="#888" stroke-width="2.5"/><path d="M70 178 L92 210 L100 182 L108 210 L130 178 Z" fill="${d}" ${s}/><circle cx="76" cy="226" r="2.5" fill="#bbb"/><circle cx="124" cy="226" r="2.5" fill="#bbb"/>`;
    case 'sweater': return body + `<path d="M78 177 Q100 196 122 177" fill="none" stroke="${d}" stroke-width="8"/><path d="M40 214 L160 214 M34 228 L166 228" stroke="${d}" stroke-width="2" opacity=".6"/>`;
    case 'shirt': return body + `<path d="M82 176 L100 194 L92 204 L76 184 Z M118 176 L100 194 L108 204 L124 184 Z" fill="${shade(c, 0.05)}" ${s}/><path d="M100 196 L100 244" stroke="${d}" stroke-width="2"/><circle cx="100" cy="214" r="1.8" fill="${INK}"/><circle cx="100" cy="230" r="1.8" fill="${INK}"/>`;
    case 'turtle': return body + `<rect x="80" y="160" width="40" height="24" rx="6" fill="${d}" ${s}/>`;
    default: return body;
  }
}

// face: traits; opts: { top, hatItem, mood, drunk, bg, photo, title }
export function portraitSvg(face, opts = {}) {
  const skin = SKIN[face.skin] ?? SKIN.s3;
  const hairCol = HAIR_COLORS[face.hairColor] ?? '#2a1d18';
  const mood = opts.mood ?? 'neutral';
  const drunk = !!opts.drunk;
  const bg = opts.bg ?? '#2a2238';
  const w = HEAD_W[face.faceShape];
  const parts = [];
  parts.push(`<rect width="200" height="240" fill="${bg}"/>`);
  if (!opts.photo) parts.push(`<circle cx="100" cy="96" r="92" fill="#fff" opacity=".06"/>`);
  parts.push(hairBack(face, hairCol));
  parts.push(`<rect x="84" y="140" width="32" height="44" fill="${shade(skin, -0.08)}" stroke="${INK}" stroke-width="${SW}"/>`);
  parts.push(torso(opts.top ?? 'tshirt-plain', skin));
  if (face.tattoo) parts.push(`<path d="M106 160 l4 8 l8 1 l-6 6 l2 8 l-8 -4 l-7 4 l2 -8 l-6 -6 l8 -1 z" fill="none" stroke="#2a4a6a" stroke-width="2"/>`);
  parts.push(`<circle cx="${100 - w - 2}" cy="106" r="10" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/><circle cx="${100 + w + 2}" cy="106" r="10" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>`);
  if (face.earrings) parts.push(`<circle cx="${100 - w - 2}" cy="119" r="3.5" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/><circle cx="${100 + w + 2}" cy="119" r="3.5" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/>`);
  parts.push(`<path d="${HEAD[face.faceShape]}" fill="${skin}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>`);
  if (face.freckles) parts.push(`<g fill="${shade(skin, -0.25)}">${[[76, 114], [82, 117], [88, 113], [112, 113], [118, 117], [124, 114]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`);
  if (drunk || mood === 'happy') parts.push(`<ellipse cx="76" cy="118" rx="9" ry="5" fill="#e0505a" opacity="${drunk ? 0.55 : 0.22}"/><ellipse cx="124" cy="118" rx="9" ry="5" fill="#e0505a" opacity="${drunk ? 0.55 : 0.22}"/>`);
  parts.push(facialHair(face));
  parts.push(eyes(face, drunk, mood, skin));
  parts.push(brows(face, mood));
  parts.push(nose(face, skin));
  parts.push(mouth(drunk && mood === 'neutral' ? 'smirk' : mood));
  if (mood === 'nervous') parts.push(`<path d="M140 78 Q146 88 140 92 Q134 88 140 78 Z" fill="#9ad8ff" stroke="${INK}" stroke-width="1.5"/>`);
  parts.push(hairFront(face, hairCol));
  if (face.glasses) parts.push(`<g fill="#ffffff22" stroke="${INK}" stroke-width="3"><rect x="68" y="90" width="26" height="20" rx="7"/><rect x="106" y="90" width="26" height="20" rx="7"/><path d="M94 98 Q100 94 106 98" fill="none"/></g>`);
  if (opts.hatItem && !opts.photo) parts.push(hat(opts.hatItem));
  const title = opts.title ? `<title>${opts.title}</title>` : '';
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img"${opts.title ? ` aria-label="${opts.title}"` : ' aria-hidden="true"'}>${title}${parts.join('')}</svg>`;
}

export function customerPortrait(c, mood = 'neutral', bg) {
  const top = c.outfit.find(i => OUTFIT[i]?.slot === 'top') ?? 'tshirt-plain';
  const hatItem = c.outfit.find(i => OUTFIT[i]?.slot === 'head') ?? null;
  return portraitSvg(c.face, { top, hatItem, mood, drunk: c.intoxicated, bg });
}

export const photoSvg = photo => portraitSvg(photo, { top: 'collared-shirt', photo: true, bg: '#c9dbe6' });
export const mugshotSvg = face => portraitSvg(face, { top: 'tshirt-plain', photo: true, bg: '#d8d0c4', mood: 'stern' });

// Moods a customer shows for each moment, by personality.
export function moodFor(c, moment) {
  const p = c.personality;
  if (moment === 'greet') return c.intoxicated ? 'happy' : ({ nervous: 'nervous', shy: 'nervous', grumpy: 'stern', arrogant: 'smirk', cheerful: 'smile', chatty: 'smile', confused: 'surprised', impatient: 'stern', rowdy: 'happy' })[p] ?? 'neutral';
  if (moment === 'admit') return ({ grumpy: 'neutral', arrogant: 'smirk', shy: 'smile' })[p] ?? 'happy';
  if (moment === 'reject') return ({ grumpy: 'angry', arrogant: 'angry', impatient: 'angry', rowdy: 'angry', confused: 'sad', nervous: 'sad', shy: 'sad', cheerful: 'sad', calm: 'stern' })[p] ?? 'sad';
  return 'neutral';
}
