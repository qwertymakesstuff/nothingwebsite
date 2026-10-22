// The end-of-day summary: what sold, what happened overnight.

import { h, icon, gold } from './dom.js';
import { iconURL } from '../render/sprites.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { CROPS_BY_ID } from '../data/crops.js';
import { formatDate, seasonTitle } from '../calendar.js';

export function dayEndView(ui, sum, cont) {
  const s = ui.game.state;
  const rows = sum.shipped.length
    ? h('div.list.summary-list', sum.shipped.map(r => h('div.item', icon(iconURL(r.id)), h('div.grow', `${ITEMS_BY_ID[r.id].name} ×${r.n}`), h('b.gold', gold(r.value)))))
    : h('p.hint', 'Nothing was shipped today.');
  const notes = [];
  if (sum.penalty) notes.push(`You passed out. Someone carried you home... and charged ${sum.penalty}g for the trouble.`);
  if (sum.grew) notes.push(`${sum.grew} crop${sum.grew === 1 ? '' : 's'} grew overnight.`);
  if (sum.withered) notes.push(`${sum.withered} crop${sum.withered === 1 ? '' : 's'} withered with the change of season.`);
  for (const c of sum.eaten) notes.push(`Crows ate one of your ${CROPS_BY_ID[c].name.toLowerCase()} plants! A scarecrow would have stopped them.`);
  for (const r of sum.expired) notes.push(`The request for ${ITEMS_BY_ID[r.item].name} expired.`);
  if (sum.newSeason) notes.push(`${seasonTitle(s.date.season)} has arrived! New seeds are in at Pip's.`);
  let entry;
  const go = () => { entry.close(); cont(); };
  const content = h('div', { style: { width: 'min(480px, 90vw)' } },
    h('h2', `End of ${formatDate(sum.date)}`),
    rows,
    h('div.row.spread', { style: { margin: '10px 0' } }, h('b', 'Total earned'), h('b.gold', gold(sum.total))),
    notes.map(n => h('p.hint', { style: { margin: '4px 0' } }, n)),
    h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, h('button.btn.green', { on: { click: go } }, `Start ${seasonTitle(s.date.season)} ${s.date.day} →`)));
  entry = ui.modal(content, { closable: false });
  entry.keys = e => { if (['Enter', 'Space', 'KeyE'].includes(e.code)) { go(); return true; } return true; };
  ui.audio?.sfx('day');
}
