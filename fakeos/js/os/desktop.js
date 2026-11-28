// The desktop: wallpaper, icons on a grid (draggable, arrangeable, selectable) and its context menu.
import { h, clear } from '../lib/dom.js';
import { save, patch } from './state.js';
import { wallpaper } from '../lib/art.js';
import { icon } from './icons.js';
import { launch, openUrl } from './apps.js';
import { showMenu } from './menu.js';
import { confirmBox, promptBox } from './dialog.js';

const CELL = { small: [76, 78], medium: [90, 92], large: [110, 116] };
let root, iconLayer, selected = new Set();

function shortcuts() {
  const base = [
    { id: 'app:browser', label: 'Skylark Browser', icon: 'browser', run: () => launch('browser') },
    { id: 'web:findr', label: 'Findr', icon: 'findr', run: () => openUrl('findr.net'), url: 'findr.net' },
    { id: 'web:vidder', label: 'Vidder', icon: 'vidder', run: () => openUrl('vidder.tv'), url: 'vidder.tv' },
    { id: 'web:threadit', label: 'Threadit', icon: 'threadit', run: () => openUrl('threadit.com'), url: 'threadit.com' },
    { id: 'web:blink', label: 'Blink', icon: 'blink', run: () => openUrl('blink.social'), url: 'blink.social' },
    { id: 'app:notepad', label: 'Notepad', icon: 'notepad', run: () => launch('notepad') },
    { id: 'app:personalize', label: 'Personalize', icon: 'personalize', run: () => launch('personalize') },
    { id: 'app:welcome', label: 'Welcome Center', icon: 'welcome', run: () => launch('welcome') },
  ];
  for (const n of save.get().files.notes) if (n.desktop !== false) base.push({ id: 'note:' + n.id, label: n.name, icon: 'notepad', note: n, run: () => launch('notepad', { noteId: n.id }) });
  return base;
}

export function initDesktop(el) {
  root = el;
  const wp = h('div', { class: 'wallpaper' });
  iconLayer = h('div', { class: 'desk-icons' });
  root.append(wp, iconLayer);
  const paint = () => {
    const s = save.get().settings;
    const name = s.wallpaper;
    wp.style.backgroundImage = name.startsWith('#') ? 'none' : `url("${wallpaper(name, Math.min(1920, innerWidth), Math.min(1200, innerHeight))}")`;
    wp.style.backgroundColor = name.startsWith('#') ? name : '#123';
    document.documentElement.style.setProperty('--accent', s.accent);
    root.dataset.iconsize = s.iconSize;
  };
  let lastWp = '', lastNotes = null, lastPos = null, lastSize = '';
  save.subscribe(s => {
    if (s.settings.wallpaper + s.settings.accent + s.settings.iconSize !== lastWp) { lastWp = s.settings.wallpaper + s.settings.accent + s.settings.iconSize; paint(); }
    if (s.files.notes !== lastNotes || s.desktop.positions !== lastPos || s.settings.iconSize !== lastSize) { lastNotes = s.files.notes; lastPos = s.desktop.positions; lastSize = s.settings.iconSize; renderIcons(); }
  });
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { paint(); renderIcons(); }, 150); });
  paint(); renderIcons();

  root.addEventListener('pointerdown', e => { if (e.target === root || e.target === iconLayer || e.target === wp) { if (e.button === 0) lasso(e); } });
  root.addEventListener('contextmenu', e => {
    if (e.target.closest('.desk-icon')) return;
    e.preventDefault(); select([]);
    const s = save.get().settings;
    showMenu(e.clientX, e.clientY, [
      { label: 'View', sub: [
        { label: 'Large icons', radio: s.iconSize === 'large', onclick: () => setSetting('iconSize', 'large') },
        { label: 'Medium icons', radio: s.iconSize === 'medium', onclick: () => setSetting('iconSize', 'medium') },
        { label: 'Small icons', radio: s.iconSize === 'small', onclick: () => setSetting('iconSize', 'small') },
        '-',
        { label: 'Auto arrange icons', checked: s.autoArrange, onclick: () => { setSetting('autoArrange', !s.autoArrange); if (!s.autoArrange) patch('desktop', () => ({ positions: {} })); } },
      ] },
      { label: 'Sort by', sub: [
        { label: 'Name', onclick: () => sortBy('name') },
        { label: 'Type', onclick: () => sortBy('type') },
      ] },
      { label: 'Refresh', onclick: () => { iconLayer.classList.add('refresh'); setTimeout(() => iconLayer.classList.remove('refresh'), 200); renderIcons(); } },
      '-',
      { label: 'New', sub: [{ label: 'Text Document', onclick: () => newNote(e.clientX, e.clientY) }] },
      '-',
      { label: 'Change wallpaper', onclick: () => launch('personalize', { tab: 'wallpaper' }) },
      { label: 'Personalize', onclick: () => launch('personalize') },
    ]);
  });
  addEventListener('keydown', e => {
    // only keys aimed at the desktop itself (not ones that bubbled out of a window)
    if (!(e.target === document.body || e.target.closest?.('.desktop'))) return;
    if (e.key === 'Enter' && selected.size && !e.target.closest?.('.desk-icon')) for (const id of selected) shortcuts().find(s => s.id === id)?.run();
    if (e.key === 'Delete' && selected.size) for (const id of selected) if (id.startsWith('note:')) deleteNote(id.slice(5));
  });
}
const setSetting = (k, v) => patch('settings', () => ({ [k]: v }));

function grid() {
  const [cw, ch] = CELL[save.get().settings.iconSize] || CELL.medium;
  const rows = Math.max(1, Math.floor((innerHeight - 40 - 8) / ch));
  const cols = Math.max(1, Math.floor((innerWidth - 8) / cw));
  return { cw, ch, rows, cols };
}

function layout(list) {
  const { rows, cols } = grid();
  const pos = save.get().desktop.positions, taken = new Set(), out = new Map();
  const auto = save.get().settings.autoArrange;
  if (!auto) for (const s of list) { const p = pos[s.id]; if (p && p.c < cols && p.r < rows && !taken.has(p.c + ',' + p.r)) { taken.add(p.c + ',' + p.r); out.set(s.id, p); } }
  let i = 0;
  for (const s of list) {
    if (out.has(s.id)) continue;
    while (taken.has(Math.floor(i / rows) + ',' + (i % rows))) i++;
    const p = { c: Math.floor(i / rows), r: i % rows }; taken.add(p.c + ',' + p.r); out.set(s.id, p); i++;
    if (p.c >= cols) break;
  }
  return out;
}

function renderIcons() {
  if (!iconLayer) return;
  const list = shortcuts();
  const { cw, ch } = grid();
  const lay = layout(list);
  clear(iconLayer);
  for (const s of list) {
    const p = lay.get(s.id); if (!p) continue;
    const el = h('div', { class: 'desk-icon' + (selected.has(s.id) ? ' selected' : ''), tabindex: 0, dataset: { id: s.id }, title: s.url ? 'http://' + s.url : s.label, style: { left: 4 + p.c * cw + 'px', top: 4 + p.r * ch + 'px', width: cw - 4 + 'px' } },
      h('div', { class: 'di-img', html: icon(s.icon) }), s.url ? h('span', { class: 'di-arrow' }, '↗') : null, h('span', { class: 'di-label' }, s.label));
    el.addEventListener('dblclick', () => s.run());
    el.addEventListener('keydown', e => { if (e.key === 'Enter') s.run(); });
    el.addEventListener('pointerdown', e => dragIcon(e, s, el));
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation(); if (!selected.has(s.id)) select([s.id]);
      showMenu(e.clientX, e.clientY, [
        { label: 'Open', bold: true, onclick: s.run },
        s.url ? { label: 'Open in new window', onclick: () => openUrl(s.url, { newWindow: true }) } : null,
        s.note ? '-' : null,
        s.note ? { label: 'Rename', onclick: () => renameNote(s.note.id) } : null,
        s.note ? { label: 'Delete', onclick: () => deleteNote(s.note.id) } : null,
      ]);
    });
    iconLayer.append(el);
  }
}

function select(ids) {
  selected = new Set(ids);
  iconLayer.querySelectorAll('.desk-icon').forEach(el => el.classList.toggle('selected', selected.has(el.dataset.id)));
}

function dragIcon(e, s, el) {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (e.ctrlKey) { const n = new Set(selected); n.has(s.id) ? n.delete(s.id) : n.add(s.id); select([...n]); return; }
  if (!selected.has(s.id)) select([s.id]);
  const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
  let moved = false;
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true; el.classList.add('dragging');
    el.style.left = ox + dx + 'px'; el.style.top = oy + dy + 'px';
  };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    if (!moved) return;
    const { cw, ch, cols, rows } = grid();
    const c = Math.max(0, Math.min(cols - 1, Math.round((ox + ev.clientX - sx - 4) / cw)));
    const r = Math.max(0, Math.min(rows - 1, Math.round((oy + ev.clientY - sy - 4) / ch)));
    const lay = layout(shortcuts());
    const positions = {};
    for (const [id, p] of lay) positions[id] = p;
    const other = [...lay].find(([id, p]) => p.c === c && p.r === r && id !== s.id);
    if (other) positions[other[0]] = positions[s.id];
    positions[s.id] = { c, r };
    patch('settings', () => ({ autoArrange: false }));
    patch('desktop', () => ({ positions }));
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

function lasso(e) {
  select([]);
  document.activeElement?.blur?.();
  const sx = e.clientX, sy = e.clientY;
  const box = h('div', { class: 'lasso' }); root.append(box);
  const move = ev => {
    const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY), w = Math.abs(ev.clientX - sx), hh = Math.abs(ev.clientY - sy);
    Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
    const ids = [];
    iconLayer.querySelectorAll('.desk-icon').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > x && r.left < x + w && r.bottom > y && r.top < y + hh) ids.push(el.dataset.id); });
    select(ids);
  };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); box.remove(); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

function sortBy(kind) {
  const list = shortcuts().slice().sort((a, b) => kind === 'name' ? a.label.localeCompare(b.label) : a.id.split(':')[0].localeCompare(b.id.split(':')[0]) || a.label.localeCompare(b.label));
  const { rows } = grid(); const positions = {};
  list.forEach((s, i) => positions[s.id] = { c: Math.floor(i / rows), r: i % rows });
  patch('settings', () => ({ autoArrange: false }));
  patch('desktop', () => ({ positions }));
}

async function newNote(x, y) {
  const names = new Set(save.get().files.notes.map(n => n.name));
  let name = 'New Text Document.txt', i = 2;
  while (names.has(name)) name = `New Text Document (${i++}).txt`;
  const id = 'n' + Date.now().toString(36);
  const { cw, ch } = grid();
  patch('files', f => ({ notes: [...f.notes, { id, name, text: '', modified: Date.now() }] }));
  patch('desktop', d => ({ positions: { ...d.positions, ['note:' + id]: { c: Math.max(0, Math.floor(x / cw)), r: Math.max(0, Math.floor(y / ch)) } } }));
  renameNote(id);
}
export async function renameNote(id) {
  const n = save.get().files.notes.find(x => x.id === id); if (!n) return;
  const name = await promptBox('Type a new name for this document:', n.name, 'Rename');
  if (!name || !name.trim()) return;
  const clean = name.trim().replace(/[\\/:*?"<>|]/g, '');
  patch('files', f => ({ notes: f.notes.map(x => x.id === id ? { ...x, name: /\.\w+$/.test(clean) ? clean : clean + '.txt' } : x) }));
}
export async function deleteNote(id) {
  const n = save.get().files.notes.find(x => x.id === id); if (!n) return;
  if (!await confirmBox(`Are you sure you want to permanently delete "${n.name}"?`, 'Delete File', 'Delete')) return;
  patch('files', f => ({ notes: f.notes.filter(x => x.id !== id) }));
}
