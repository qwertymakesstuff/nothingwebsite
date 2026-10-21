// Pages for features that arrive in later phases. They say so plainly and only offer real actions.

import { ICONS } from '../ui/icons.js';
import { esc } from '../ui/dom.js';

const PAGES = {
  missions: { title: 'Missions', icon: 'missions', text: 'Daily and weekly goals that pay out cash and XP.', planned: ['Daily missions that reset every day', 'Weekly challenges', 'XP rewards that feed your account level'] },
};

export function placeholderView(id) {
  const page = PAGES[id];
  return {
    title: page.title,
    render({ root }) {
      root.innerHTML = `
<section class="placeholder">
  <div class="ph-icon">${ICONS[page.icon]}</div>
  <span class="ph-badge">Not available yet · planned for a later phase</span>
  <h2>${esc(page.title)}</h2>
  <p>${esc(page.text)}</p>
  <h3>What's planned</h3>
  <ul>${page.planned.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <p class="muted small">Nothing on this page works yet, so there are no buttons pretending to.</p>
  <div class="ph-actions"><a class="btn btn-primary" href="#/cases">Open cases</a><a class="btn btn-ghost" href="#/inventory">View inventory</a></div>
</section>`;
    },
  };
}
