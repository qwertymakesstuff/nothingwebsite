// Shops (buy / sell), chests and the bulletin board.

import { h, clear, icon, gold } from './dom.js';
import { iconURL, portraitURL } from '../render/sprites.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { SHOPS } from '../data/shops.js';
import { NPCS_BY_ID } from '../data/npcs.js';
import { PLAYER } from '../config.js';
import { shopStatus, shopStock, buyProblem, buy, shopBuys, sellToShop } from '../economy.js';
import { add } from '../inventory.js';
import { acceptRequest } from '../quests.js';
import { dayIndex } from '../calendar.js';

export function openShop(ui, shopId) {
  const g = ui.game, s = g.state, shop = SHOPS[shopId];
  const status = shopStatus(s, shopId);
  if (!status.open) { ui.toast(status.why, 'warn'); return; }
  const keeper = NPCS_BY_ID[shop.keeper];
  let tab = 'buy', entry = null;
  const keeperHere = () => { const n = g.npcs[shop.keeper]; return n && !n.hidden && n.map === s.player.map; };
  const wrap = h('div', { style: { width: 'min(720px, 94vw)' } });
  const render = () => {
    clear(wrap);
    wrap.append(h('div.row', { style: { marginBottom: '8px' } }, h('img.pix', { src: portraitURL(keeper.look), style: { width: '56px', height: '56px', borderRadius: '5px', boxShadow: '0 0 0 2px var(--wood)' } }),
      h('div', h('h2', shop.name), h('div.hint', `“${shop.greeting}”`)),
      h('div.col', { style: { marginLeft: 'auto', alignItems: 'flex-end', marginRight: '40px' } }, h('b.gold', gold(s.player.money)),
        keeperHere() ? h('button.btn.small', { on: { click: () => { entry.close(); g.talkTo(shop.keeper); } }, title: `Talk to ${keeper.name}` }, 'Chat') : null)));
    wrap.append(h('div.tabs', h(`button${tab === 'buy' ? '.on' : ''}`, { on: { click: () => { tab = 'buy'; render(); } } }, 'Buy'),
      shop.buys.length ? h(`button${tab === 'sell' ? '.on' : ''}`, { on: { click: () => { tab = 'sell'; render(); } } }, 'Sell') : null));
    const list = h('div.list');
    if (tab === 'buy') {
      for (const e of shopStock(s, shopId)) {
        const id = e.item || null;
        const title = id ? ITEMS_BY_ID[id].name : e.name;
        const desc = id ? ITEMS_BY_ID[id].desc : e.desc;
        const needs = e.needs ? Object.entries(e.needs).map(([k, n]) => `${n} ${ITEMS_BY_ID[k].name}`).join(', ') : '';
        const ic = id ? icon(iconURL(id)) : e.kind === 'tool' ? icon(iconURL(e.tool)) : h('div', { style: { width: '32px', textAlign: 'center', fontSize: '26px' } }, '🔨');
        const btns = h('div.qty');
        const qtys = e.kind === 'item' ? [1, 5, 25] : [1];
        for (const q of qtys) {
          const why = buyProblem(s, e, q);
          btns.append(h('button.btn.green.small', { disabled: !!why, title: why || '', on: { click: () => doBuy(e, q) } }, e.kind === 'item' ? `×${q}` : 'Buy'));
        }
        list.append(h(`div.item${e.kind === 'locked' ? '.locked' : ''}`, ic, h('div.grow', h('b', title), h('div.desc', desc), needs ? h('div.need', `Also needs: ${needs}`) : null, e.kind === 'locked' ? h('div.need.no', e.why) : null), h('b.gold', `${e.price}g`), e.kind === 'locked' ? null : btns));
      }
    } else {
      let any = false;
      s.inventory.slice(0, s.player.backpack).forEach((it, i) => {
        if (!it || !shopBuys(shopId, it.id)) return;
        any = true;
        const d = ITEMS_BY_ID[it.id];
        list.append(h('div.item', icon(iconURL(it.id)), h('div.grow', h('b', `${d.name} ×${it.n}`), h('div.desc', `${d.price}g each`)),
          h('div.qty', h('button.btn.small', { on: { click: () => doSell(i, 1) } }, 'Sell 1'), h('button.btn.small', { on: { click: () => doSell(i, it.n) } }, `All (${d.price * it.n}g)`))));
      });
      if (!any) list.append(h('p.hint', 'Nothing in your bag this shop buys. (Anything can go in the shipping bin on your farm.)'));
    }
    wrap.append(list);
  };
  const doBuy = (e, q) => {
    if (!buy(s, e, q)) return;
    ui.audio?.sfx('coin');
    ui.toast(e.kind === 'item' ? `Bought ${q}× ${ITEMS_BY_ID[e.item].name}` : e.kind === 'tool' ? `Your tool is now: ${e.name}!` : `${e.name}: done!`, 'good');
    if (e.kind === 'tool') g.quest('upgrade', {});
    if (e.kind === 'upgrade') { ui.say(shop.keeper, [e.upgrade === 'northfield' ? 'Done! The old fence is gone. The north field is yours — a little overgrown, mind.' : e.upgrade === 'kitchen' ? 'Your kitchen is fixed up! Use the stove in your farmhouse to cook.' : 'There you go. Room for a whole extra row of stuff.']); }
    g.save();
    render();
  };
  const doSell = (slot, n) => { const id = s.inventory[slot]?.id; const v = sellToShop(s, shopId, slot, n); if (v) { ui.audio?.sfx('coin'); ui.toast(`Sold for ${v}g`); g.quest('ship', { item: id, n }); render(); } };
  render();
  entry = ui.modal(wrap);
}

export function openChest(ui, obj) {
  const g = ui.game, s = g.state;
  const wrap = h('div', { style: { width: 'min(660px, 94vw)' } });
  const render = () => {
    clear(wrap);
    const chestGrid = h('div.grid', obj.items.map((it, i) => ui.slotEl(it, i, { onClick: () => moveStack(obj.items, i, 'toBag') })));
    const bagGrid = h('div.grid', s.inventory.slice(0, s.player.backpack).map((it, i) => ui.slotEl(it, i, { onClick: () => moveStack(s.inventory, i, 'toChest') })));
    wrap.append(h('h2', 'Chest'), h('p.hint', 'Click a stack to move it between the chest and your bag.'), chestGrid, h('h3', { style: { marginTop: '12px' } }, 'Bag'), bagGrid);
  };
  const moveStack = (from, i, dir) => {
    const it = from[i];
    if (!it) return;
    if (dir === 'toBag') {
      const left = add(s, it.id, it.n);
      if (left === it.n) { ui.toast('No room in your bag.', 'warn'); return; }
      if (left) it.n = left; else from[i] = null;
    } else {
      let left = it.n;
      for (const slot of obj.items) if (slot && slot.id === it.id && slot.n < PLAYER.stack && left) { const k = Math.min(PLAYER.stack - slot.n, left); slot.n += k; left -= k; }
      for (let j = 0; j < obj.items.length && left; j++) if (!obj.items[j]) { obj.items[j] = { id: it.id, n: left }; left = 0; }
      if (left === it.n) { ui.toast('The chest is full.', 'warn'); return; }
      if (left) it.n = left; else from[i] = null;
    }
    ui.audio?.sfx('blip');
    render();
  };
  render();
  ui.modal(wrap, { onClose: () => g.save() });
}

export function openBoard(ui) {
  const g = ui.game, s = g.state;
  const wrap = h('div', { style: { width: 'min(520px, 92vw)' } });
  const render = () => {
    clear(wrap);
    wrap.append(h('h2', 'Bulletin Board'));
    const r = s.board.request;
    if (r) {
      const npc = NPCS_BY_ID[r.npc], it = ITEMS_BY_ID[r.item];
      wrap.append(h('div.detail', h('div.row', h('img.pix', { src: portraitURL(npc.look), style: { width: '48px', height: '48px', borderRadius: '4px' } }), h('div', h('b', 'Help wanted!'), h('div', `${npc.name} needs ${r.n}× ${it.name}.`))),
        h('div.row', { style: { marginTop: '8px' } }, icon(iconURL(r.item)), h('span', `Reward: ${r.reward}g + friendship · ${r.due - r.posted} days to deliver`)),
        h('div.row', { style: { marginTop: '8px' } }, h('button.btn.green', { on: { click: () => { acceptRequest(s); ui.audio?.sfx('quest'); ui.toast(`Request accepted: bring ${r.n}× ${it.name} to ${npc.name.split(' ')[0]}.`, 'quest'); render(); } } }, 'Accept'))));
    } else wrap.append(h('p.hint', 'No new requests today. Check back tomorrow morning.'));
    const today = dayIndex(s.date);
    if (s.requests.length) {
      wrap.append(h('h3', { style: { marginTop: '12px' } }, 'Accepted'));
      for (const q of s.requests) wrap.append(h('div', `• ${q.n}× ${ITEMS_BY_ID[q.item].name} for ${NPCS_BY_ID[q.npc].name} (${q.reward}g, ${q.due - today <= 0 ? 'due today' : `${q.due - today} day(s) left`})`));
    }
    wrap.append(h('p.hint', { style: { marginTop: '12px' } }, 'Deliver by talking to the villager while carrying the items.'));
  };
  render();
  ui.modal(wrap);
}

