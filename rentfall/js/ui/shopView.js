// The corner shop between rents. Purely a view: every button calls a handler, and the shop is
// redrawn from the run after each purchase so prices, money and sold markers are always current.

import { h, money } from './dom.js';
import { icon, symbolCard, relicCard, itemCard, serviceCard } from './cards.js';
import { priceOf, rerollCost, removeCost, serviceCost } from '../shop.js';
import { shopDiscount, countOf } from '../collection.js';
import { DEADLINES, NOTICES, rentDue } from '../rent.js';
import { MAX_ITEMS } from '../config.js';
import { SERVICE_BY_ID } from '../relics.js';

export function shopView(run, on) {
  const s = run.shop;
  const disc = shopDiscount(run, s.extraDiscount);
  const next = DEADLINES[run.deadline];
  const notice = NOTICES[next.notice];
  const svc = SERVICE_BY_ID[s.service];
  const cheapestService = run.collection.length ? Math.min(...run.collection.map(i => serviceCost(run, s.service, i.uid))) : 0;

  return h('div.shop',
    h('div.shop-head',
      h('div',
        h('h1', 'The Corner Shop'),
        h('p', `Rent ${run.deadline + 1}/${DEADLINES.length} — ${next.title}: ${money(rentDue(run))} in ${run.spinsLeft} spins.`, notice ? ` ${notice.name}: ${notice.desc}` : ''),
      ),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
        disc > 0 ? h('span.discount-badge', `${Math.round(disc * 100)}% off`) : null,
        h('button.btn.ghost', { type: 'button', onclick: on.reroll, disabled: run.money < rerollCost(run), title: 'Reroll every offer (R)' }, icon('reroll'), rerollCost(run) === 0 ? `Reroll (free, ${run.rerolls} left)` : `Reroll ${money(rerollCost(run))}`),
        h('button.btn.primary', { type: 'button', onclick: on.leave, title: 'Back to the machine (Space)' }, 'Back to work →'),
      ),
    ),
    h('div.shop-cols',
      h('div',
        h('section.shop-section',
          h('h2', 'New symbols', h('small', 'added straight to your collection')),
          h('div.cards', s.symbols.map((o, k) => symbolCard(o.id, { price: priceOf(run, o.base), have: run.money, sold: o.sold, ownedCount: countOf(run, o.id), onClick: () => on.buySymbol(k) }))),
        ),
        h('section.shop-section',
          h('h2', 'Services', h('small', 'permanent changes to one symbol')),
          h('div.service-row',
            serviceCard('remove', { price: removeCost(run), have: run.money, onClick: on.remove, disabled: run.collection.length <= 1 }),
            svc ? serviceCard(s.service, { price: cheapestService, have: run.money, onClick: on.service, title: svc.rarityPrice ? 'Price depends on the symbol' : '' }) : null,
          ),
        ),
      ),
      h('div',
        h('section.shop-section',
          h('h2', 'Relics', h('small', 'rule changes for this run')),
          s.relics.length ? h('div.cards', s.relics.map((o, k) => relicCard(o.id, { price: priceOf(run, o.base), have: run.money, sold: o.sold, onClick: () => on.buyRelic(k) })))
            : h('p', { style: { color: 'var(--muted)' } }, 'You own every relic. Impressive.'),
        ),
        h('section.shop-section',
          h('h2', 'Supplies', h('small', `single use · ${run.items.length}/${MAX_ITEMS} carried`)),
          h('div.cards', s.items.map((o, k) => itemCard(o.id, { price: priceOf(run, o.base), have: run.money, sold: o.sold, disabled: run.items.length >= MAX_ITEMS && !o.sold, onClick: () => on.buyItem(k) }))),
        ),
      ),
    ),
  );
}
