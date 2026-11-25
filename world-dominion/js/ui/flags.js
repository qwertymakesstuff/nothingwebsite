// Flags: the real flag (flag-icons, MIT, in ../flags/) where one exists; otherwise a generated one.
// Generated flags follow one rule so they look like a family: three stripes in colours picked from a
// flag-like palette by a hash of the country id, horizontal or vertical, with a small disc emblem.
import { h } from './dom.js';
import { hash01 } from '../core/db.js';

const PALETTE = ['#c8102e', '#ffffff', '#002f6c', '#007a3d', '#fcd116', '#111111', '#0072ce', '#e35205'];

export function generatedFlag(id) {
  const pick = (salt) => PALETTE[Math.floor(hash01(id + salt) * PALETTE.length)];
  const cols = [pick('a')];
  for (const salt of ['b', 'c', 'd', 'e', 'f']) { const c = pick(salt); if (c !== cols[cols.length - 1]) cols.push(c); if (cols.length === 3) break; }
  while (cols.length < 3) cols.push(PALETTE[(PALETTE.indexOf(cols[cols.length - 1]) + 3) % PALETTE.length]);
  const vertical = hash01(id + 'v') < 0.4;
  const bands = cols.map((c, i) => vertical ? `<rect x="${i * 20}" width="20" height="45" fill="${c}"/>` : `<rect y="${i * 15}" width="60" height="15" fill="${c}"/>`).join('');
  const emblem = cols.includes('#ffffff') ? '#c8102e' : '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 45">${bands}<circle cx="30" cy="22.5" r="6" fill="${emblem}" stroke="rgba(0,0,0,.25)"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function flagSrc(c) { return c.flag ? `flags/${c.flag}.svg` : generatedFlag(c.id); }

export function flagImg(c) {
  const img = h('img.flag', { src: flagSrc(c), alt: `Flag of ${c.name}`, width: 40, height: 30, decoding: 'async' });
  img.addEventListener('error', () => { img.src = generatedFlag(c.id); }, { once: true });
  return img;
}
