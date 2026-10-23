// Settings: accessibility, sound, behaviour, and save management.

import { h, button } from '../dom.js';
import { confirmBox, toast, modal } from '../overlay.js';
import { deleteSave, sanitizeState } from '../../core/save.js';
import { Game } from '../../core/game.js';
import { play } from '../sound.js';

export function render(app, root, params) {
  const st = app.settings;
  const toggle = (k, label, desc) => h('label.setting', h('input', { type: 'checkbox', checked: st[k], on: { change: e => { app.setSetting(k, e.target.checked); app.render(true); } } }), h('span.set-text', h('strong', label), h('small', desc)));
  const range = (k, label, min, max, stepv, fmt) => {
    const out = h('output', fmt(st[k]));
    return h('label.setting.range', h('span.set-text', h('strong', label), out), h('input', { type: 'range', min, max, step: stepv, value: st[k], on: { input: e => { out.textContent = fmt(+e.target.value); }, change: e => { app.setSetting(k, +e.target.value); app.render(true); } } }));
  };
  const back = params.back && params.back !== 'settings' ? params.back : app.game ? 'workshop' : 'menu';
  root.append(h('div.settings.panel',
    h('div.panel-head', h('h1', 'Settings'), button('Back', () => app.go(back), { cls: 'primary' })),
    h('section', h('h2', 'Accessibility'),
      range('textSize', 'Text size', 80, 150, 10, v => `${v}%`),
      toggle('reducedMotion', 'Reduce motion', 'Stops spinning fans, floating parts and transition animations.'),
      toggle('highContrast', 'High contrast', 'Brighter text, stronger outlines and solid panels.'),
      toggle('colorblind', 'Colour-blind friendly status', 'Status uses shapes and patterns as well as colour; red/green become orange/blue.'),
      toggle('tooltips', 'Tooltips', 'Explanations when hovering over things.')),
    h('section', h('h2', 'Sound'),
      toggle('sound', 'Sound effects', 'Clicks, screws, beeps, fans and the cash register.'),
      range('volume', 'Volume', 0, 100, 5, v => `${v}%`),
      button('Test sound', () => play('good'))),
    h('section', h('h2', 'Behaviour'),
      toggle('confirm', 'Confirm risky actions', 'Ask before formatting drives, cancelling jobs, ending a day with jobs due, and similar.'),
      toggle('autosave', 'Autosave', 'Save after every action. If off, use Save now.')),
    app.game ? h('section', h('h2', 'Save'),
      h('div.row', button('Save now', () => { const r = app.game.save(); toast(r.ok ? 'Saved.' : `Couldn't save: ${r.reason}`, r.ok ? 'good' : 'bad'); }, { cls: 'primary' }),
        button('Export save', () => exportSave(app)),
        button('Import save', () => importSave(app)),
        button('Reset save', async () => {
          if (!(await confirmBox('Delete your save?', 'This permanently deletes your shop, money, parts and progress from this browser. It cannot be undone.', { ok: 'Delete everything', danger: true, force: true }))) return;
          deleteSave(app.storage);
          app.game = null;
          toast('Save deleted.', 'warn');
          app.go('menu');
        }, { cls: 'danger' }))) : null));
}

function exportSave(app) {
  const text = JSON.stringify(app.game.state);
  const blob = new Blob([text], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `silicon-dreams-day${app.game.state.day}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function importSave(app) {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      const st = sanitizeState(JSON.parse(await f.text()));
      if (!st) throw new Error('not a Silicon Dreams save');
      if (!(await confirmBox('Load this save?', `Day ${st.day}, ${st.shopName}. Your current game will be replaced.`, { ok: 'Load', danger: true, force: true }))) return;
      app.start(new Game(st));
      toast('Save imported.', 'good');
    } catch (e) { modal({ title: 'Import failed', body: h('p', String(e.message || e)), actions: [{ label: 'OK' }] }); }
  });
  input.click();
}
