// Settings screen: the shared settings panel plus a reset.

import { h } from '../ui/dom.js';
import { screenHeader, settingsPanel, button } from '../ui/components.js';

export function render(app) {
  const panel = settingsPanel(app.settings);
  const el = h('main', { class: 'settings' },
    screenHeader({ title: 'Settings', eyebrow: 'Make yourself at home', onBack: () => app.go('menu'), backLabel: 'Menu' }),
    panel,
    h('div', { class: 'settings-foot' },
      h('p', {}, app.store.persistent ? 'Changes are saved automatically.' : 'This browser is not saving settings, so changes last until you close the tab.'),
      button({ label: 'Reset to defaults', variant: 'ghost', onClick: async () => {
        if (await app.confirm({ title: 'Reset settings?', message: 'Every setting goes back to its default. Statistics are not affected.', confirmLabel: 'Reset', danger: true })) app.settings.reset();
      } })));
  return { el, title: 'Settings', destroy: () => panel.destroy() };
}
