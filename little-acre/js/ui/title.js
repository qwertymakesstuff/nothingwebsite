// The title screen: continue a saved farm or set up a new one (names and appearance).

import { h, clear } from './dom.js';
import { charSprite } from '../render/sprites.js';
import { DEFAULT_LOOK } from '../state.js';
import { formatDate } from '../calendar.js';

const OPTIONS = {
  skin: ['#f8d8b8', '#f0c8a0', '#d8a070', '#a8704a', '#7a4a2a'],
  hair: ['#2a2420', '#5a3a22', '#a8642a', '#e8c860', '#d8662a', '#c8c8d0', '#3a4ac8'],
  hairStyle: ['short', 'long', 'bun', 'curly', 'bald'],
  shirt: ['#c8463a', '#3a7ac8', '#4f9a3a', '#e8b53a', '#8a4ab0', '#f4f0e8'],
  pants: ['#3a4a7a', '#5a4a3a', '#2a2a30', '#6a7a3a'],
};
const LABELS = { skin: 'Skin', hair: 'Hair colour', hairStyle: 'Hair style', shirt: 'Shirt', pants: 'Trousers' };

export function showTitle({ save, onContinue, onNew }) {
  const root = h('div.title');
  document.body.append(root);
  const look = { ...DEFAULT_LOOK };
  const close = () => root.remove();

  const home = () => {
    clear(root).append(h('div.card.panel',
      h('div.logo', 'Little Acre'),
      h('div.tagline', 'A small farm, a small town, and all the time in the world.'),
      h('div.col', { style: { alignItems: 'center' } },
        save ? h('button.btn.green', { style: { fontSize: '25px', minWidth: '240px' }, on: { click: () => { close(); onContinue(); } } }, `Continue`) : null,
        save ? h('div.hint', `${save.player.name} of ${save.player.farm} Farm · ${formatDate(save.date)} · ${save.player.money.toLocaleString('en-US')}g`) : null,
        h('button.btn', { style: { fontSize: '22px', minWidth: '240px' }, on: { click: setup } }, 'New farm')),
      h('p.hint', { style: { marginTop: '16px' } }, 'WASD / arrows to move · Space to use tools · E to interact · Tab for your bag. Touch controls appear on phones and tablets.')));
  };

  const setup = () => {
    const name = h('input', { value: 'Sam', maxlength: 16, 'aria-label': 'Your name' });
    const farm = h('input', { value: 'Little Acre', maxlength: 20, 'aria-label': 'Farm name' });
    const preview = h('canvas.preview', { width: 16, height: 24 });
    const draw = () => { const c = preview.getContext('2d'); c.clearRect(0, 0, 16, 24); c.drawImage(charSprite(look, 'down', 0), 0, 0); };
    const rows = Object.entries(OPTIONS).map(([k, vals]) => {
      const sw = h(`div.swatches${k === 'hairStyle' ? '.words' : ''}`);
      const paint = () => { clear(sw).append(...vals.map(v => h(`button${look[k] === v ? '.on' : ''}`, { style: k === 'hairStyle' ? {} : { background: v }, title: v, on: { click: () => { look[k] = v; paint(); draw(); } } }, k === 'hairStyle' ? v : ''))); };
      paint();
      return h('div.field', LABELS[k], sw);
    });
    const warn = save ? h('p.hint', { style: { color: 'var(--red)' } }, 'Starting a new farm replaces your current save.') : null;
    clear(root).append(h('div.card.panel',
      h('h2', 'A letter arrives...'),
      h('p', { style: { textAlign: 'left' } }, '“Dear one — the old farm at the edge of Bramblewick is yours now. It\'s gone to weeds since my knees went, but the soil is good and the town is kinder. Plant something. — Aunt Hazel”'),
      h('div.row', { style: { alignItems: 'flex-start', gap: '16px', textAlign: 'left' } }, preview, h('div.col', { style: { flex: 1 } }, h('label.field', 'Your name', name), h('label.field', 'Farm name', farm))),
      h('div.col', { style: { marginTop: '10px' } }, rows),
      warn,
      h('div.row', { style: { justifyContent: 'center', marginTop: '14px' } },
        h('button.btn.ghost', { on: { click: home } }, 'Back'),
        h('button.btn.green', { style: { fontSize: '22px' }, on: { click: () => { close(); onNew({ name: name.value.trim() || 'Sam', farm: farm.value.trim() || 'Little Acre', look: { ...look } }); } } }, 'Move to the farm'))));
    draw();
    name.focus();
  };

  home();
}
