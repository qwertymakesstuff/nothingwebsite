// Welcome Center: shown on first boot. Explains the computer in-world, like a new PC's getting-started screen.
import { h } from '../lib/dom.js';
import { createWindow, allWindows } from '../os/wm.js';
import { registerApp, launch, openUrl } from '../os/apps.js';
import { icon, ICONS } from '../os/icons.js';
import { save } from '../os/state.js';

registerApp({ id: 'welcome', name: 'Welcome Center', icon: 'welcome', hint: 'Getting started with your computer', launch: () => {
  const existing = allWindows().find(w => w.app === 'welcome');
  if (existing) { existing.focus(); return existing; }
  const card = (ic, title, text, fn) => h('button', { class: 'wc-card', type: 'button', onclick: fn }, h('span', { html: icon(ic) }), h('b', null, title), h('small', null, text));
  return createWindow({ app: 'welcome', title: 'Welcome Center', icon: icon('welcome'), width: 620, height: 530, mount: body => body.append(h('div', { class: 'welcome' },
    h('div', { class: 'wc-head' }, h('span', { html: ICONS.logo }), h('div', null, h('h1', null, `Welcome, ${save.get().settings.userName}`), h('p', null, 'Your new computer is set up and connected to the Internet.'))),
    h('div', { class: 'wc-grid' },
      card('browser', 'Go online', 'Open Skylark and start browsing.', () => launch('browser')),
      card('findr', 'Search the web', 'Findr finds pages, videos, forums and people.', () => openUrl('findr.net')),
      card('vidder', 'Watch videos', 'See what everyone is watching on Vidder.', () => openUrl('vidder.tv')),
      card('threadit', 'Join a discussion', 'Threadit has a community for everything.', () => openUrl('threadit.com')),
      card('blink', 'Keep up with people', 'Make a Blink profile and follow friends.', () => openUrl('blink.social')),
      card('personalize', 'Make it yours', 'Change the wallpaper and colours.', () => launch('personalize'))),
    h('div', { class: 'wc-tips' }, h('b', null, 'Tips: '), 'Drag windows by their title bar, and drag one to the top or side of the screen to fill it. Double-click a title bar to maximize. Right-click the desktop for more options. Your work is saved automatically.'))) });
} });
