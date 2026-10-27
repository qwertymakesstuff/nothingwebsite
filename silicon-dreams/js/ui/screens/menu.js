// Main menu.

import { h, button, svgEl } from '../dom.js';
import { modal, confirmBox } from '../overlay.js';
import { partIcon } from '../art.js';
import { PART } from '../../data/catalog.js';

export function render(app, root) {
  const has = app.hasSave();
  const hero = h('div.hero-art', { 'aria-hidden': 'true' },
    ...['gpu-cf-7900', 'cpu-vx-h9-7950x', 'ram-qs-16-6000', 'cool-gl-hydro360', 'fan-zp-storm120', 'mb-pinewood-x67'].map((id, i) => h(`div.float.f${i}`, svgEl(partIcon(PART[id], { spin: id.startsWith('fan') })))));
  root.append(h('div.menu',
    hero,
    h('div.menu-card',
      h('div.title-chip', { 'aria-hidden': 'true' }),
      h('h1.title', 'Silicon Dreams'),
      h('p.tagline', 'PC building, repair & shop management'),
      h('div.menu-buttons',
        has ? button('Continue', () => app.continueGame() || app.go('newgame'), { cls: 'primary big' }) : null,
        button('New game', async () => {
          if (has && !(await confirmBox('Start a new game?', 'Your current shop will be replaced when the new game starts.', { ok: 'Start new game', danger: true }))) return;
          app.go('newgame');
        }, { cls: has ? 'big' : 'primary big' }),
        button('How to play', () => howTo(), { cls: 'big' }),
        button('Settings', () => app.go('settings', { back: 'menu' }), { cls: 'big' })),
      h('p.fine', 'All hardware brands, products and customers are fictional. Progress saves in this browser.'))));
}

export function howTo() {
  modal({
    title: 'How to play', wide: true,
    body: h('div.howto',
      h('h3', 'The loop'),
      h('ol',
        h('li', 'Take jobs from the ', h('strong', 'Jobs'), ' board: repairs, custom builds, upgrades, data recovery and more.'),
        h('li', 'Repairs arrive on the intake rack. Put the machine on a bench in the ', h('strong', 'Workshop'), '.'),
        h('li', 'Gather evidence before replacing anything: power it on, inspect it, test the PSU, run memory tests, read temperatures and the event log. Customers describe symptoms, not causes.'),
        h('li', 'Fix it on the ', h('strong', 'Assembly'), ' bench: drag parts in and out, reseat cables, clean dust, redo thermal paste. Buy replacements in the ', h('strong', 'Store'), '.'),
        h('li', 'Run the tests the job requires on the ', h('strong', 'Testing'), ' screen. Results only count for the exact setup they ran on.'),
        h('li', 'Deliver from the Jobs screen. Set a fair invoice. Customers judge quality, price and speed — and come back angry if a fault is still there.')),
      h('h3', 'Building a PC'),
      h('p', 'Place an empty case on a bench, then: motherboard → CPU (line up the gold triangle) → thermal paste → cooler → memory → storage → power supply → graphics card → fans. Switch to ', h('strong', 'Cables'), ' mode and connect power, data, fans and the front panel. Close the case and press the power button. Install an OS and drivers on the Testing screen.'),
      h('h3', 'Controls'),
      h('ul',
        h('li', 'Drag parts from the tray onto highlighted zones (green = fits, red = hover to see why not). Or click a part, then click a zone.'),
        h('li', 'While dragging, press ', h('kbd', 'R'), ', right-click or scroll to rotate (CPUs, memory) or flip a fan between intake and exhaust.'),
        h('li', 'Click an installed part to inspect or remove it.'),
        h('li', 'Keys ', h('kbd', '1'), '–', h('kbd', '6'), ' switch screens. ', h('kbd', 'Esc'), ' closes dialogs and cancels a drag.')),
      h('h3', 'Time and money'),
      h('p', 'Every action takes workshop minutes. The shop closes at 19:00 — end the day to continue. Rent is due weekly. Grow your reputation and level to unlock better customers, tools and upgrades.')),
    actions: [{ label: 'Got it', cls: 'primary' }],
  });
}
