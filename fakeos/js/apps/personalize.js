// Personalize: wallpaper, accent colour, icon size, clock format, sounds, user name, and save reset.
import { h, clear } from '../lib/dom.js';
import { createWindow, allWindows } from '../os/wm.js';
import { save, patch, wipeSave } from '../os/state.js';
import { registerApp } from '../os/apps.js';
import { icon } from '../os/icons.js';
import { wallpaper } from '../lib/art.js';
import { confirmBox } from '../os/dialog.js';

export const WALLPAPERS = [['aurora', 'Aurora'], ['meadow', 'Meadow'], ['dusk', 'Dusk'], ['night', 'Night Sky'], ['bubbles', 'Bubbles'], ['carbon', 'Carbon'], ['petals', 'Petals']];
const COLORS = ['#2f5f8f', '#1e6b52', '#6b2d5c', '#333333', '#8a5a1e', '#0d0d0d', '#5a7d9a'];
const ACCENTS = ['#3b7fd4', '#2fa66a', '#d14f3b', '#8a4fd1', '#d19a2f', '#3bb4c4', '#d14f9a', '#5a6470'];

registerApp({ id: 'personalize', name: 'Personalize', icon: 'personalize', hint: 'Wallpaper, colours and sounds', launch: args => {
  const existing = allWindows().find(w => w.app === 'personalize');
  if (existing) { existing.focus(); return existing; }
  return createWindow({ app: 'personalize', title: 'Personalize', icon: icon('personalize'), width: 640, height: 500, mount: body => body.append(panel(args.tab)) });
} });

function panel(start = 'wallpaper') {
  const root = h('div', { class: 'cp' });
  const nav = h('div', { class: 'cp-nav' });
  const main = h('div', { class: 'cp-main' });
  const tabs = { wallpaper: 'Desktop Background', colors: 'Window Color', desktop: 'Desktop & Clock', sounds: 'Sounds', account: 'User Account' };
  let cur = start;
  const draw = () => {
    clear(nav); clear(main);
    for (const k in tabs) nav.append(h('button', { type: 'button', class: k === cur ? 'on' : '', onclick: () => { cur = k; draw(); } }, tabs[k]));
    const s = save.get().settings;
    const set = (k, v) => { patch('settings', () => ({ [k]: v })); draw(); };
    if (cur === 'wallpaper') {
      main.append(h('h2', null, 'Choose your desktop background'), h('p', { class: 'cp-note' }, 'Click a picture to make it your desktop background.'),
        h('div', { class: 'cp-wps' }, WALLPAPERS.map(([id, name]) => h('button', { type: 'button', class: 'cp-wp' + (s.wallpaper === id ? ' on' : ''), onclick: () => set('wallpaper', id) }, h('img', { src: wallpaper(id, 1280, 800), alt: '' }), h('span', null, name)))),
        h('h3', null, 'Solid colors'), h('div', { class: 'cp-swatches' }, COLORS.map(c => h('button', { type: 'button', class: 'cp-sw' + (s.wallpaper === c ? ' on' : ''), style: { background: c }, title: c, onclick: () => set('wallpaper', c) })),
          h('label', { class: 'cp-custom' }, 'Custom: ', h('input', { type: 'color', value: s.wallpaper.startsWith('#') ? s.wallpaper : '#2f5f8f', onchange: e => set('wallpaper', e.target.value) }))));
    } else if (cur === 'colors') {
      main.append(h('h2', null, 'Change the color of your window borders, Start menu and taskbar'),
        h('div', { class: 'cp-swatches big' }, ACCENTS.map(c => h('button', { type: 'button', class: 'cp-sw' + (s.accent === c ? ' on' : ''), style: { background: c }, title: c, onclick: () => set('accent', c) }))),
        h('label', { class: 'cp-custom' }, 'Custom color: ', h('input', { type: 'color', value: s.accent, onchange: e => set('accent', e.target.value) })));
    } else if (cur === 'desktop') {
      main.append(h('h2', null, 'Desktop icons'),
        h('div', { class: 'cp-radios' }, ['small', 'medium', 'large'].map(z => h('label', null, h('input', { type: 'radio', name: 'iz', checked: s.iconSize === z, onchange: () => set('iconSize', z) }), ' ' + z[0].toUpperCase() + z.slice(1) + ' icons'))),
        h('label', { class: 'cp-check' }, h('input', { type: 'checkbox', checked: s.autoArrange, onchange: e => { set('autoArrange', e.target.checked); if (e.target.checked) patch('desktop', () => ({ positions: {} })); } }), ' Auto arrange icons'),
        h('h2', null, 'Clock'),
        h('label', { class: 'cp-check' }, h('input', { type: 'checkbox', checked: s.clock24, onchange: e => set('clock24', e.target.checked) }), ' Use 24-hour time'));
    } else if (cur === 'sounds') {
      main.append(h('h2', null, 'Sounds'), h('label', { class: 'cp-check' }, h('input', { type: 'checkbox', checked: s.sounds, onchange: e => set('sounds', e.target.checked) }), ' Play sounds for startup, notifications and windows'));
    } else if (cur === 'account') {
      const name = h('input', { class: 'os-input', value: s.userName, maxlength: 24 });
      main.append(h('h2', null, 'User account'), h('p', { class: 'cp-note' }, 'This name appears on the Start menu and the welcome screen.'),
        h('div', { class: 'cp-row' }, name, h('button', { class: 'os-btn', type: 'button', onclick: () => name.value.trim() && set('userName', name.value.trim()) }, 'Change name')),
        h('h2', null, 'Start over'), h('p', { class: 'cp-note' }, 'Erase everything on this computer: documents, bookmarks, history, settings and website accounts. The computer restarts as new.'),
        h('button', { class: 'os-btn danger', type: 'button', onclick: async () => { if (await confirmBox('Erase everything and restart the computer as new? This cannot be undone.', 'Reset this computer', 'Erase everything')) { await wipeSave(); location.reload(); } } }, 'Reset this computer…'));
    }
  };
  draw();
  root.append(nav, main);
  return root;
}
