// Taskbar: start button + start menu, a button per open window, the notification area and the clock.
import { h, clear } from '../lib/dom.js';
import { save, patch, worldNow } from './state.js';
import { onWM, allWindows } from './wm.js';
import { icon, ICONS } from './icons.js';
import { listApps, launch, openUrl } from './apps.js';
import { showMenu, closeMenu } from './menu.js';
import { clock, monthName } from '../lib/time.js';
import { notifications, onNotify, markAllRead, timeOf } from './notify.js';
import { sound } from './sound.js';

let bar, tasks, startMenu, panel = null;
export function initTaskbar(root, { onShutdown, onRestart }) {
  const startBtn = h('button', { class: 'start-btn', type: 'button', 'aria-label': 'Start', title: 'Start', html: `<span class="orb">${ICONS.logo}</span>` });
  tasks = h('div', { class: 'tasks', role: 'toolbar', 'aria-label': 'Open windows' });
  const clockEl = h('button', { class: 'tray-clock', type: 'button' });
  const bellCount = h('span', { class: 'bell-count' });
  const bell = h('button', { class: 'tray-btn', type: 'button', title: 'Notifications', html: ICONS.bell }, bellCount);
  const vol = h('button', { class: 'tray-btn', type: 'button', title: 'Sounds' });
  const net = h('button', { class: 'tray-btn', type: 'button', title: 'Connected to the Internet\nNetwork: HOME-7F2A', html: ICONS.network });
  const tray = h('div', { class: 'tray' }, net, vol, bell, clockEl, h('button', { class: 'show-desktop', type: 'button', title: 'Show desktop', onclick: () => allWindows().forEach(w => w.minimize()) }));
  bar = h('div', { class: 'taskbar' }, startBtn, tasks, tray);
  root.append(bar);

  startBtn.addEventListener('click', () => toggleStart(onShutdown, onRestart));
  addEventListener('keydown', e => { if (e.key === 'Meta' || (e.ctrlKey && e.key === 'Escape')) { e.preventDefault(); toggleStart(onShutdown, onRestart); } });
  const paintVol = () => { vol.innerHTML = save.get().settings.sounds ? ICONS.volume : ICONS.mute; vol.title = save.get().settings.sounds ? 'Sounds: on (click to mute)' : 'Sounds: muted (click to unmute)'; };
  vol.addEventListener('click', () => { patch('settings', s => ({ sounds: !s.sounds })); paintVol(); sound('click'); });
  paintVol();
  net.addEventListener('click', () => openPanel(net, h('div', { class: 'tray-panel net-panel' }, h('strong', null, 'Currently connected to:'), h('div', { class: 'net-row' }, h('span', { html: ICONS.network }), h('div', null, h('b', null, 'HOME-7F2A'), h('small', null, 'Internet access'))), h('div', { class: 'net-row dim' }, h('span', { html: ICONS.network }), h('div', null, h('b', null, 'BTHomeHub-55C1'), h('small', null, 'Secured'))), h('div', { class: 'net-row dim' }, h('span', { html: ICONS.network }), h('div', null, h('b', null, 'FREE_WIFI_DO_NOT_USE'), h('small', null, 'Open'))))));
  const paintBell = () => { const n = notifications().filter(x => !x.read).length; bellCount.textContent = n || ''; bell.classList.toggle('has', n > 0); };
  onNotify(paintBell); paintBell();
  bell.addEventListener('click', () => {
    const list = notifications();
    const p = h('div', { class: 'tray-panel notif-panel' }, h('div', { class: 'np-head' }, 'Notifications'),
      list.length ? list.map(n => h('div', { class: 'np-item' + (n.read ? '' : ' unread'), onclick: () => { closePanel(); n.onclick?.(); } }, n.icon ? h('span', { class: 'np-icon', html: n.icon }) : null, h('div', null, h('b', null, n.title), h('small', null, n.body || ''), h('em', null, timeOf(n, save.get().settings.clock24))))) : h('p', { class: 'np-empty' }, 'No new notifications.'));
    openPanel(bell, p); markAllRead();
  });
  const tick = () => {
    const now = worldNow(), d = new Date(now);
    clockEl.innerHTML = '';
    clockEl.append(h('span', null, clock(now, save.get().settings.clock24)), h('span', null, `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`));
    clockEl.title = d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };
  tick(); setInterval(tick, 1000 * 5);
  clockEl.addEventListener('click', () => openPanel(clockEl, calendar()));

  onWM(() => renderTasks());
  addEventListener('pointerdown', e => {
    if (startMenu && !e.target.closest('.start-menu') && !e.target.closest('.start-btn')) closeStart();
    if (panel && !e.target.closest('.tray-panel') && !e.target.closest('.tray')) closePanel();
  }, true);
}

function renderTasks() {
  clear(tasks);
  for (const w of allWindows()) {
    if (w.app === 'dialog' && false) continue;
    const b = h('button', { class: 'task' + (w.focused ? ' active' : '') + (w.state === 'min' ? ' min' : ''), type: 'button', title: w.title },
      h('span', { class: 'task-icon', html: w.icon || '' }), h('span', { class: 'task-label' }, w.title));
    b.addEventListener('click', () => { if (w.focused && w.state !== 'min') w.minimize(); else w.focus(); });
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      showMenu(e.clientX, e.clientY - 100, [
        { label: w.state === 'min' ? 'Restore' : 'Minimize', onclick: () => (w.state === 'min' ? w.focus() : w.minimize()) },
        { label: w.state === 'max' ? 'Restore down' : 'Maximize', onclick: () => { w.focus(); w.toggleMax(); } },
        '-',
        { label: 'Close window', onclick: () => w.close() },
      ]);
    });
    b.addEventListener('auxclick', e => { if (e.button === 1) w.close(); });
    tasks.append(b);
  }
}

function toggleStart(onShutdown, onRestart) {
  if (startMenu) return closeStart();
  closePanel(); closeMenu();
  const s = save.get().settings;
  const search = h('input', { class: 'sm-search', placeholder: 'Search programs and files', 'aria-label': 'Search programs and files' });
  const list = h('div', { class: 'sm-list' });
  const items = () => [
    ...listApps().map(a => ({ label: a.name, icon: a.icon, run: () => launch(a.id), hint: a.hint })),
    { label: 'Findr', icon: 'findr', run: () => openUrl('findr.net'), hint: 'findr.net' },
    { label: 'Vidder', icon: 'vidder', run: () => openUrl('vidder.tv'), hint: 'vidder.tv' },
    { label: 'Threadit', icon: 'threadit', run: () => openUrl('threadit.com'), hint: 'threadit.com' },
    { label: 'Blink', icon: 'blink', run: () => openUrl('blink.social'), hint: 'blink.social' },
  ];
  const fill = () => {
    const q = search.value.trim().toLowerCase();
    clear(list);
    let shown = items();
    if (q) {
      shown = shown.filter(i => i.label.toLowerCase().includes(q));
      const notes = save.get().files.notes.filter(n => n.name.toLowerCase().includes(q) || n.text.toLowerCase().includes(q));
      shown.push(...notes.map(n => ({ label: n.name, icon: 'notepad', run: () => launch('notepad', { noteId: n.id }), hint: 'Document' })));
      if (/\.\w{2,}/.test(q)) shown.push({ label: 'Go to ' + q, icon: 'browser', run: () => openUrl(q) });
      shown.push({ label: `Search Findr for "${search.value.trim()}"`, icon: 'findr', run: () => openUrl('findr.net/search?q=' + encodeURIComponent(search.value.trim())) });
    }
    for (const i of shown) list.append(h('button', { class: 'sm-item', type: 'button', onclick: () => { closeStart(); i.run(); } }, h('span', { class: 'sm-icon', html: icon(i.icon) }), h('span', null, h('b', null, i.label), i.hint ? h('small', null, i.hint) : null)));
    if (!shown.length) list.append(h('p', { class: 'sm-empty' }, 'No items match your search.'));
  };
  search.addEventListener('input', fill);
  search.addEventListener('keydown', e => { if (e.key === 'Enter') list.querySelector('.sm-item')?.click(); if (e.key === 'Escape') closeStart(); });
  fill();
  const side = (label, fn) => h('button', { class: 'sm-side', type: 'button', onclick: () => { closeStart(); fn(); } }, label);
  startMenu = h('div', { class: 'start-menu', role: 'menu' },
    h('div', { class: 'sm-left' }, list, search),
    h('div', { class: 'sm-right' },
      h('div', { class: 'sm-user' }, h('span', { class: 'sm-userpic', html: ICONS.logo }), h('b', null, s.userName)),
      side('Documents', () => launch('notepad', { open: true })),
      side('Internet', () => launch('browser')),
      side('Bookmarks', () => openUrl('skylark://bookmarks')),
      side('History', () => openUrl('skylark://history')),
      side('Personalize', () => launch('personalize')),
      side('Welcome Center', () => launch('welcome')),
      h('div', { class: 'sm-power' },
        h('button', { class: 'sm-shutdown', type: 'button', onclick: () => { closeStart(); onShutdown(); } }, h('span', { html: ICONS.shutdown }), 'Shut down'),
        h('button', { class: 'sm-more', type: 'button', 'aria-label': 'More power options', onclick: e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(r.left, r.top - 60, [{ label: 'Restart', onclick: () => { closeStart(); onRestart(); } }, { label: 'Shut down', onclick: () => { closeStart(); onShutdown(); } }]); } }, '▸'))));
  bar.parentElement.append(startMenu);
  sound('click');
  setTimeout(() => search.focus(), 20);
}
function closeStart() { startMenu?.remove(); startMenu = null; }
function openPanel(anchor, el) {
  const was = panel?.dataset.anchor === anchor.title;
  closePanel(); if (was) return;
  el.dataset.anchor = anchor.title;
  bar.parentElement.append(el);
  const r = anchor.getBoundingClientRect();
  el.style.right = Math.max(4, innerWidth - r.right - 30) + 'px';
  panel = el;
}
function closePanel() { panel?.remove(); panel = null; }

function calendar() {
  const now = new Date(worldNow());
  let y = now.getUTCFullYear(), m = now.getUTCMonth();
  const el = h('div', { class: 'tray-panel cal-panel' });
  const draw = () => {
    clear(el);
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const grid = h('div', { class: 'cal-grid' }, ...['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => h('b', null, d)));
    for (let i = 0; i < first; i++) grid.append(h('span'));
    for (let d = 1; d <= days; d++) grid.append(h('span', { class: d === now.getUTCDate() && m === now.getUTCMonth() && y === now.getUTCFullYear() ? 'today' : '' }, d));
    el.append(
      h('div', { class: 'cal-big' }, clock(worldNow(), save.get().settings.clock24)),
      h('div', { class: 'cal-date' }, now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })),
      h('div', { class: 'cal-head' }, h('button', { type: 'button', onclick: () => { m--; if (m < 0) { m = 11; y--; } draw(); } }, '◂'), h('span', null, `${monthName(m)} ${y}`), h('button', { type: 'button', onclick: () => { m++; if (m > 11) { m = 0; y++; } draw(); } }, '▸')),
      grid);
  };
  draw();
  return el;
}
