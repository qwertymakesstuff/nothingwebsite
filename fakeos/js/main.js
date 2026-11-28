// FakeOS boot: load the save, show the startup and logon screens, then build the desktop.
import { h } from './lib/dom.js';
import { loadSave, save, patch, flush } from './os/state.js';
import { initWM, allWindows } from './os/wm.js';
import { initDesktop } from './os/desktop.js';
import { initTaskbar } from './os/taskbar.js';
import { initNotify, notify } from './os/notify.js';
import { launch, openUrl } from './os/apps.js';
import { sound } from './os/sound.js';
import { ICONS } from './os/icons.js';
import './apps/browser.js';
import './apps/notepad.js';
import './apps/personalize.js';
import './apps/welcome.js';
import './sites/index.js';
import { loadMedia, mediaVideo, videoIds } from './lib/media.js';
import { VIDEO } from './content/index.js';
import { dur } from './lib/time.js';

const app = document.getElementById('os');
const screen = document.getElementById('screen');

async function boot() {
  const [firstTime] = await Promise.all([loadSave(), loadMedia().then(applyVideoMedia)]);
  await bootScreen();
  await logon(firstTime);
  startDesktop(firstTime);
}

// A generated clip that is the whole video replaces its runtime and captions with the clip's own.
function applyVideoMedia() {
  for (const id of videoIds()) {
    const v = VIDEO[id], m = mediaVideo(id);
    if (!v || m.mode !== 'full' || !m.duration) continue;
    v.seconds = m.duration; v.dur = dur(m.duration);
    if (m.caps?.length) v.caps = m.caps;
  }
}

function bootScreen() {
  return new Promise(resolve => {
    const el = h('div', { class: 'boot' }, h('div', { class: 'boot-logo', html: ICONS.logo }), h('div', { class: 'boot-name' }, 'FakeOS'), h('div', { class: 'boot-bar' }, h('span'), h('span'), h('span')), h('div', { class: 'boot-copy' }, '© Tidewater Software'));
    screen.append(el);
    const done = () => { el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 400); removeEventListener('keydown', done); };
    el.addEventListener('click', done); addEventListener('keydown', done);
    setTimeout(done, 2200);
  });
}

function logon(firstTime) {
  return new Promise(resolve => {
    const s = save.get().settings;
    const name = h('input', { class: 'logon-input', value: firstTime ? '' : s.userName, placeholder: 'Your name', maxlength: 24, 'aria-label': 'Your name' });
    const go = () => {
      if (firstTime) patch('settings', () => ({ userName: name.value.trim() || 'User' }));
      el.querySelector('.logon-status').textContent = 'Welcome';
      el.classList.add('welcome');
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 450); }, 900);
    };
    const el = h('div', { class: 'logon' },
      h('div', { class: 'logon-card' },
        h('div', { class: 'logon-pic', html: ICONS.logo }),
        firstTime ? [h('h1', null, 'Set up your computer'), h('p', null, 'Type a name for your user account.'), name] : h('h1', null, s.userName),
        h('button', { class: 'logon-go', type: 'button', onclick: go, 'aria-label': 'Log on' }, '➜'),
        h('div', { class: 'logon-status' })),
      h('div', { class: 'logon-brand' }, h('span', { html: ICONS.logo }), 'FakeOS'));
    name.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    screen.append(el);
    setTimeout(() => (firstTime ? name.focus() : el.querySelector('.logon-go').focus()), 50);
  });
}

function startDesktop(firstTime) {
  app.hidden = false;
  const desk = h('div', { class: 'desktop' });
  const winLayer = h('div', { class: 'win-layer' });
  app.append(desk, winLayer);
  initWM(winLayer);
  initDesktop(desk);
  initNotify(app);
  initTaskbar(app, { onShutdown: () => shutdown(false), onRestart: () => shutdown(true) });
  sound('startup');
  if (firstTime) setTimeout(() => launch('welcome'), 600);
  setTimeout(() => notify({ title: 'Connected to the Internet', body: 'Network HOME-7F2A · Click to open Skylark', icon: ICONS.network, onclick: () => launch('browser'), quiet: true }), 2200);
}

function shutdown(restart) {
  flush();
  sound('shutdown');
  const el = h('div', { class: 'shutdown' }, h('div', { class: 'boot-logo', html: ICONS.logo }), h('p', null, restart ? 'Restarting…' : 'Shutting down…'));
  screen.append(el);
  setTimeout(() => {
    allWindows().forEach(w => w.close(true));
    if (restart) return location.reload();
    el.innerHTML = '';
    el.classList.add('off');
    el.append(h('button', { class: 'power-btn', type: 'button', 'aria-label': 'Turn the computer on', onclick: () => location.reload(), html: ICONS.shutdown }), h('p', null, 'Press the power button to turn the computer on.'));
  }, 1800);
}

boot();
