// Small modal dialogs (message, confirm, text prompt) built as real windows.
import { h } from '../lib/dom.js';
import { createWindow } from './wm.js';
import { icon } from './icons.js';
import { sound } from './sound.js';

export function ask({ title = 'FakeOS', message, input, okLabel = 'OK', cancelLabel = 'Cancel', kind = 'info', alertOnly = false }) {
  return new Promise(resolve => {
    let done = false, field = null;
    const finish = v => { if (done) return; done = true; win.close(true); resolve(v); };
    const win = createWindow({
      app: 'dialog', title, icon: icon('welcome'), width: 380, height: input != null ? 190 : 170, resizable: false, className: 'dialog-win',
      onClose: () => finish(alertOnly ? true : null),
      mount(body) {
        field = input != null ? h('input', { class: 'os-input', value: input, onkeydown: e => { if (e.key === 'Enter') finish(field.value); if (e.key === 'Escape') finish(null); } }) : null;
        body.append(h('div', { class: 'dialog' },
          h('div', { class: 'dialog-main' }, h('div', { class: 'dialog-glyph ' + kind }, kind === 'warn' ? '!' : kind === 'error' ? '×' : 'i'), h('p', null, message)),
          field,
          h('div', { class: 'dialog-btns' },
            h('button', { class: 'os-btn primary', type: 'button', onclick: () => finish(input != null ? field.value : true) }, okLabel),
            alertOnly ? null : h('button', { class: 'os-btn', type: 'button', onclick: () => finish(input != null ? null : false) }, cancelLabel))));
        setTimeout(() => (field ? (field.focus(), field.select()) : body.querySelector('.primary')?.focus()), 30);
      },
    });
    if (kind === 'warn' || kind === 'error') sound('error');
  });
}
export const alertBox = (message, title, kind) => ask({ message, title, kind, alertOnly: true });
export const confirmBox = (message, title, okLabel = 'OK') => ask({ message, title, okLabel, kind: 'warn' });
export const promptBox = (message, value = '', title) => ask({ message, title, input: value });
