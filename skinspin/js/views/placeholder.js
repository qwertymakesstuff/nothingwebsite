// Pages for features that arrive in later phases. They say so plainly and only offer real actions.

import { ICONS } from '../ui/icons.js';
import { esc } from '../ui/dom.js';

const PAGES = {
  upgrade: { title: 'Upgrade', icon: 'upgrade', text: 'Trade items from your inventory for a chance at a more valuable one. You will choose the target item and see the exact success chance before you commit.', planned: ['Pick one or more of your items as the stake', 'Choose a target item and see the success chance', 'Locked items can never be staked'] },
  battles: { title: 'Case Battles', icon: 'battles', text: 'Open the same cases side by side against simulated opponents. The highest total value wins everything that was unboxed.', planned: ['1v1, 1v1v1 and 2v2 battles', 'Choose several cases per battle', 'Shared roulettes, round by round'] },
  marketplace: { title: 'Marketplace', icon: 'marketplace', text: 'Buy specific skins directly with your balance instead of leaving it to chance.', planned: ['Browse every item in the database', 'Filters by rarity, weapon and price', 'Buy and sell using the same item values as everywhere else'] },
  contracts: { title: 'Contracts', icon: 'contracts', text: 'Trade in ten items of one rarity for one item of the next rarity up.', planned: ['Pick ten items of the same tier', 'See the possible outcomes and their odds', 'Locked items are never used'] },
  collections: { title: 'Collections', icon: 'collections', text: 'Track how much of each collection you have unboxed and earn rewards for completing them.', planned: ['Progress for all 13 collections', 'Completion rewards', 'See which case drops each missing item'] },
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
