// New game setup.

import { h, button } from '../dom.js';
import { Game } from '../../core/game.js';
import { DIFFICULTIES } from '../../core/config.js';
import { money } from '../../core/util.js';

export function render(app, root) {
  let diff = 'standard';
  const name = h('input#shopname', { type: 'text', value: 'Silicon Dreams', maxlength: 32, autocomplete: 'off' });
  const owner = h('input#owner', { type: 'text', value: '', placeholder: 'Your name', maxlength: 32, autocomplete: 'off' });
  const diffs = h('div.diffs', { role: 'radiogroup', 'aria-label': 'Difficulty' });
  const draw = () => {
    diffs.replaceChildren(...Object.entries(DIFFICULTIES).map(([id, d]) => h('button.diff', { type: 'button', role: 'radio', 'aria-checked': String(id === diff), class: id === diff ? 'on' : '', on: { click: () => { diff = id; draw(); } } },
      h('strong', d.label), h('span', `${money(d.money)} start · rent ${money(d.rent)}/week`), h('small', d.desc))));
  };
  draw();
  const start = () => app.start(Game.fresh({ shopName: name.value.trim() || 'Silicon Dreams', owner: owner.value.trim() || 'You', difficulty: diff }));
  root.append(h('div.newgame.panel',
    h('h1', 'Open your shop'),
    h('p.muted', 'You\'ve rented a small workshop with one bench, a box of spare parts and a few basic tools. The neighbourhood already has broken computers waiting.'),
    h('label', { for: 'shopname' }, 'Shop name'), name,
    h('label', { for: 'owner' }, 'Your name'), owner,
    h('h3', 'Difficulty'), diffs,
    h('div.row-end', button('Back', () => app.go('menu')), button('Open the shop', start, { cls: 'primary big' }))));
  name.focus();
  name.select();
}
