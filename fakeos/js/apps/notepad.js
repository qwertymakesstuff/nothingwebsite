// Notepad: plain-text documents stored in the save file. New, Open, Save, Save As, word wrap.
import { h, clear } from '../lib/dom.js';
import { createWindow } from '../os/wm.js';
import { save, patch } from '../os/state.js';
import { registerApp } from '../os/apps.js';
import { icon } from '../os/icons.js';
import { showMenu } from '../os/menu.js';
import { ask, promptBox } from '../os/dialog.js';
import { shortDate } from '../lib/time.js';

registerApp({ id: 'notepad', name: 'Notepad', icon: 'notepad', hint: 'Write and save text documents', launch: args => openNotepad(args) });

function openNotepad({ noteId, open } = {}) {
  let note = noteId ? save.get().files.notes.find(n => n.id === noteId) : null;
  let dirty = false, wrap = true;
  const ta = h('textarea', { class: 'np-text', spellcheck: false, 'aria-label': 'Document text' });
  const statusEl = h('div', { class: 'np-status' });
  const title = () => (dirty ? '*' : '') + (note ? note.name : 'Untitled') + ' - Notepad';
  const sync = () => { win.setTitle(title()); const lines = ta.value.slice(0, ta.selectionStart).split('\n'); statusEl.textContent = `Ln ${lines.length}, Col ${lines.at(-1).length + 1}`; };
  const load = n => { note = n; ta.value = n ? n.text : ''; dirty = false; sync(); ta.focus(); };
  const doSave = async (as) => {
    if (!note || as) {
      const name = await promptBox('File name:', note ? note.name : 'Untitled.txt', 'Save As');
      if (!name || !name.trim()) return false;
      const clean = name.trim().replace(/[\\/:*?"<>|]/g, '');
      const fname = /\.\w+$/.test(clean) ? clean : clean + '.txt';
      const id = 'n' + Date.now().toString(36);
      note = { id, name: fname, text: ta.value, modified: Date.now() };
      patch('files', f => ({ notes: [...f.notes, note] }));
    } else {
      note = { ...note, text: ta.value, modified: Date.now() };
      patch('files', f => ({ notes: f.notes.some(x => x.id === note.id) ? f.notes.map(x => x.id === note.id ? note : x) : [...f.notes, note] }));
    }
    dirty = false; sync(); return true;
  };
  const guard = async () => {
    if (!dirty) return true;
    const r = await ask({ title: 'Notepad', message: `Do you want to save changes to ${note ? note.name : 'Untitled'}?`, okLabel: 'Save', cancelLabel: "Don't Save", kind: 'warn' });
    if (r === null) return false;
    if (r) return doSave();
    return true;
  };
  const openDialog = () => {
    const notes = save.get().files.notes.slice().sort((a, b) => b.modified - a.modified);
    const d = createWindow({ app: 'dialog', title: 'Open', icon: icon('notepad'), width: 420, height: 330, mount: body => {
      const list = h('div', { class: 'open-list' });
      if (!notes.length) list.append(h('p', { class: 'sk-empty' }, 'No documents yet.'));
      for (const n of notes) list.append(h('button', { class: 'open-row', type: 'button', ondblclick: async () => { d.close(); if (await guard()) load(n); }, onclick: e => { list.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); e.currentTarget.classList.add('sel'); } }, h('span', { html: icon('notepad') }), h('b', null, n.name), h('small', null, shortDate(n.modified))));
      body.append(h('div', { class: 'open-dlg' }, h('p', { class: 'open-path' }, 'Documents'), list, h('div', { class: 'dialog-btns' },
        h('button', { class: 'os-btn primary', type: 'button', onclick: async () => { const i = [...list.children].findIndex(c => c.classList.contains('sel')); if (i < 0) return; d.close(); if (await guard()) load(notes[i]); } }, 'Open'),
        h('button', { class: 'os-btn', type: 'button', onclick: () => d.close() }, 'Cancel'))));
    } });
  };
  const menus = {
    File: () => [
      { label: 'New', shortcut: 'Ctrl+N', onclick: async () => { if (await guard()) load(null); } },
      { label: 'New Window', onclick: () => openNotepad() },
      { label: 'Open…', shortcut: 'Ctrl+O', onclick: openDialog },
      { label: 'Save', shortcut: 'Ctrl+S', onclick: () => doSave() },
      { label: 'Save As…', onclick: () => doSave(true) },
      '-',
      { label: 'Exit', onclick: () => win.close() },
    ],
    Edit: () => [
      { label: 'Select All', shortcut: 'Ctrl+A', onclick: () => { ta.focus(); ta.select(); } },
      { label: 'Time/Date', shortcut: 'F5', onclick: insertDate },
    ],
    Format: () => [{ label: 'Word Wrap', checked: wrap, onclick: () => { wrap = !wrap; ta.classList.toggle('nowrap', !wrap); } }],
  };
  function insertDate() { const d = new Date(); const s = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' ' + d.toLocaleDateString(); ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end'); dirty = true; sync(); }
  const bar = h('div', { class: 'menubar' }, Object.keys(menus).map(m => h('button', { type: 'button', onclick: e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(r.left, r.bottom, menus[m]()); } }, m)));
  const win = createWindow({
    app: 'notepad', title: 'Untitled - Notepad', icon: icon('notepad'), width: 560, height: 420,
    mount: body => body.append(h('div', { class: 'notepad' }, bar, ta, statusEl)),
    beforeClose: () => { if (!dirty) return true; guard().then(ok => ok && win.close(true)); return false; },
  });
  ta.addEventListener('input', () => { dirty = true; sync(); });
  ta.addEventListener('keyup', sync); ta.addEventListener('click', sync);
  ta.addEventListener('keydown', e => {
    const c = e.ctrlKey || e.metaKey;
    if (c && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
    if (c && e.key.toLowerCase() === 'o') { e.preventDefault(); openDialog(); }
    if (c && e.key.toLowerCase() === 'n') { e.preventDefault(); guard().then(ok => ok && load(null)); }
    if (e.key === 'F5') { e.preventDefault(); insertDate(); }
    if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('\t', ta.selectionStart, ta.selectionEnd, 'end'); }
  });
  load(note);
  if (open) openDialog();
  return win;
}
