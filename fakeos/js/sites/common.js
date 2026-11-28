// Shared helpers for website renderers. Sites share these underneath, but each one draws its own layout.
import { h } from '../lib/dom.js';
import { avatar } from '../lib/art.js';
import { personRecord } from '../content/index.js';
import { worldNow, save } from '../os/state.js';
import { ago } from '../lib/time.js';

export function avatarImg(id, size = 40, cls = '') {
  const u = personRecord(id);
  return h('img', { class: 'av ' + cls, src: avatar(id, u.av || {}), width: size, height: size, alt: '', loading: 'lazy' });
}
export const when = d => ago(d, worldNow());
export const now = () => worldNow();
export function pager(total, page, per, makeUrl, cls = 'pager') {
  const pages = Math.ceil(total / per);
  if (pages <= 1) return null;
  const items = [];
  if (page > 1) items.push(h('a', { href: makeUrl(page - 1), class: 'pg-prev' }, '‹ Previous'));
  for (let i = 1; i <= pages; i++) items.push(i === page ? h('b', { class: 'pg-cur' }, i) : h('a', { href: makeUrl(i) }, i));
  if (page < pages) items.push(h('a', { href: makeUrl(page + 1), class: 'pg-next' }, 'Next ›'));
  return h('div', { class: cls }, items);
}
export const q = encodeURIComponent;
export function highlight(text, terms, max = 220) {
  text = String(text || '').replace(/\s+/g, ' ');
  const low = text.toLowerCase();
  let start = 0;
  for (const t of terms) { const i = low.indexOf(t); if (i > 40) { start = Math.max(0, i - 60); break; } }
  let s = text.slice(start, start + max);
  if (start > 0) s = '… ' + s;
  if (start + max < text.length) s += ' …';
  if (!terms.length) return [s];
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return s.split(re).map((part, i) => i % 2 ? h('b', null, part) : part);
}
export const userName = id => personRecord(id).name;
export const mine = () => save.get();
