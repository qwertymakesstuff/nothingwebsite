// Modal dialogs. Each builder fills the one modal root; buttons inside still use data-act /
// data-ui so app.js handles them the same way as panel buttons, and forms report back
// through the callbacks passed in.
import { ASSETS, DISTRICTS, LEVELS, CORNERS, TAXES, MAX_LEVEL, IMPOUND_FEE, CIRCUIT_BONUS, MIN_BID, TRANSIT_RENTS, spaceName } from '../board.js';
import * as R from '../rules.js';
import { MODES, END_REASONS } from '../engine.js';
import { PERSONALITIES, personalityName } from '../ai.js';
import { esc, money, signed } from './fmt.js';
import { icon } from './icons.js';
import { chip, assetSummary } from './panels.js';

const root = () => document.getElementById('modalRoot');
let onCloseCb = null;
let lastFocus = null;

export function openModal({ title, body, className = '', closable = true, onClose = null }) {
  closeModal(true);
  lastFocus = document.activeElement;
  onCloseCb = onClose;
  root().innerHTML = `<div class="modal-backdrop" data-closable="${closable}">
    <div class="modal ${className}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <header class="modal-head"><h2 id="modalTitle">${title}</h2>${closable ? `<button type="button" class="icon-btn" data-ui="close" aria-label="Close">${icon('close')}</button>` : ''}</header>
      <div class="modal-body">${body}</div>
    </div></div>`;
  root().hidden = false;
  const first = root().querySelector('[autofocus], .modal-body button:not([disabled]), .modal-body input, .modal-head button');
  first?.focus();
  return root().querySelector('.modal');
}

export function closeModal(silent = false) {
  const cb = onCloseCb;
  onCloseCb = null;
  if (!root()) return;
  const had = !!root().innerHTML;
  root().innerHTML = '';
  root().hidden = true;
  if (had && !silent) { cb?.(); lastFocus?.focus?.(); }
}

export const modalOpen = () => !!root()?.innerHTML;
export const modalKind = () => root()?.querySelector('.modal')?.dataset.kind || null;

export function initModalRoot() {
  root().addEventListener('click', e => {
    if (e.target.classList.contains('modal-backdrop') && e.target.dataset.closable === 'true') closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOpen() && root().querySelector('.modal-backdrop')?.dataset.closable === 'true') {
      e.stopPropagation();
      closeModal();
    }
    if (e.key === 'Tab' && modalOpen()) trapFocus(e);
  }, true);
}

function trapFocus(e) {
  const f = [...root().querySelectorAll('button:not([disabled]), input, select, [tabindex="0"]')];
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

const btn = (label, attrs, kind = '', disabled = false, title = '') =>
  `<button ${/\btype=/.test(attrs) ? '' : 'type="button" '}class="btn ${kind}" ${attrs}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;

// ---- property / space card ------------------------------------------------------------------

export function showSpace(st, index, ctx) {
  const board = R.boardOf(st);
  const space = board.spaces[index];
  const a = ASSETS[space.id];
  if (!a) {
    let text = '';
    if (space.type === 'corner') text = CORNERS[space.id].text;
    else if (space.type === 'tax') text = `${TAXES[space.id].text}${ctx.viewer ? ` You would pay ${money(R.taxAmount(st, ctx.viewer, space))} right now.` : ''}`;
    else if (space.type === 'bulletin') text = 'Draw a City Bulletin: a public event that can change rents for a few rounds, or pay or charge every owner.';
    else text = 'Draw a Business Opportunity: something happens to you alone, from windfalls to fines to a quick trip across town.';
    const here = st.players.filter(p => p.position === index && !p.bankrupt);
    openModal({
      title: esc(spaceName(space)),
      body: `<div class="space-card plain"><span class="big-ico">${icon(space.type === 'corner' ? CORNERS[space.id].icon : space.type === 'tax' ? space.id : space.type)}</span><p>${esc(text)}</p>
        ${here.length ? `<p class="small">Here now: ${here.map(p => `${chip(p)} ${esc(p.name)}`).join(', ')}</p>` : ''}</div>`,
    });
    return;
  }
  openModal({ title: esc(a.name), body: assetCard(st, a.id, ctx), className: 'card-modal' });
}

export function assetCard(st, id, ctx) {
  const a = ASSETS[id];
  const ps = st.props[id];
  const owner = ps.owner ? R.player(st, ps.owner) : null;
  const d = a.kind === 'property' ? DISTRICTS[a.district] : null;
  const mult = R.effectMultiplier(st, id);
  let table = '';
  if (a.kind === 'property') {
    const ladder = R.rentLadder(st, id);
    table = `<table class="rent-table"><tbody>${ladder.map(r => `<tr class="${r.current ? 'current' : ''}"><th>${r.level === 0 ? 'Rent' : `${r.level}. ${LEVELS[r.level].name}`}</th><td>${money(r.rent)}</td></tr>`).join('')}</tbody></table>
      <p class="small">Base rent doubles while one owner holds all of ${esc(d.name)} (${R.districtProps(st, a.district).length} properties on this board). Each level costs ${money(a.devCost)}; build evenly across the district.</p>`;
  } else if (a.kind === 'transit') {
    table = `<table class="rent-table"><tbody>${TRANSIT_RENTS.slice(0, R.boardOf(st).transits.length).map((r, i) => `<tr><th>${i + 1} station${i ? 's' : ''} owned</th><td>${money(r)}</td></tr>`).join('')}</tbody></table>`;
  } else {
    table = `<table class="rent-table"><tbody><tr><th>1 service owned</th><td>4 × dice</td></tr>${R.boardOf(st).services.length > 1 ? '<tr><th>Both services</th><td>10 × dice</td></tr>' : ''}</tbody></table>`;
  }
  const status = owner
    ? `<p class="owner-line" style="--pc:${owner.color}">${chip(owner)} Owned by <b>${esc(owner.name)}</b>${ps.mortgaged ? ' · <span class="badge warn">Mortgaged</span>' : ''}${ps.level ? ` · ${LEVELS[ps.level].name}` : ''}</p>`
    : '<p class="owner-line">Unowned · for sale when someone lands here</p>';
  let manage = '';
  if (ctx.viewer && owner?.id === ctx.viewer) {
    const can = k => R.canManage(st, ctx.viewer, k);
    const b = R.canBuild(st, ctx.viewer, id), s = R.canSellBuilding(st, ctx.viewer, id), m = R.canMortgage(st, ctx.viewer, id), u = R.canUnmortgage(st, ctx.viewer, id);
    const rows = [];
    if (a.kind === 'property' && ps.level < MAX_LEVEL) {
      rows.push(btn(`Build ${LEVELS[ps.level + 1].name} (${money(a.devCost)})`, `data-act="BUILD" data-asset="${id}"`, 'primary', !can('build') || !b.ok));
      rows.push(`<p class="small preview">${b.ok ? `Rent goes from ${money(R.rentFor(st, id))} to ${money(Math.round(a.rents[ps.level + 1] * mult))}. Cash after: ${money(owner.cash - a.devCost)}.` : esc(b.reason)}</p>`);
    }
    if (ps.level > 0) rows.push(btn(`Sell a level (+${money(Math.floor(a.devCost / 2))})`, `data-act="SELL_BUILDING" data-asset="${id}"`, '', !can('sell') || !s.ok, s.reason));
    if (!ps.mortgaged) rows.push(btn(`Mortgage (+${money(a.mortgage)})`, `data-act="MORTGAGE" data-asset="${id}"`, '', !can('mortgage') || !m.ok, m.reason));
    else rows.push(btn(`Repay loan (${money(R.unmortgageCost(id))})`, `data-act="UNMORTGAGE" data-asset="${id}"`, '', !can('unmortgage') || !u.ok, u.reason));
    manage = `<div class="manage">${rows.join('')}${!can('build') && !can('mortgage') ? '<p class="small muted">You can manage assets during your own turn (or sell and mortgage while settling a debt).</p>' : ''}</div>`;
  }
  return `<div class="space-card" style="--d:${d ? d.color : 'var(--ink-2)'}">
    <div class="card-band"><span class="big-ico">${icon(a.icon)}</span><div><small>${d ? esc(d.name) : a.kind === 'transit' ? 'Transit station' : 'City service'}</small><b>${esc(a.name)}</b></div></div>
    ${d ? `<p class="small muted">${esc(d.blurb)}</p>` : ''}
    ${status}
    ${mult !== 1 ? `<p class="notice ${mult > 1 ? 'good' : 'warn'}">City conditions: rent ×${mult.toFixed(2).replace(/\.?0+$/, '')} here right now.</p>` : ''}
    ${table}
    <dl class="facts"><div><dt>Price</dt><dd>${money(a.price)}</dd></div><div><dt>Mortgage value</dt><dd>${money(a.mortgage)}</dd></div><div><dt>Loan payoff</dt><dd>${money(R.unmortgageCost(id))}</dd></div>${a.devCost ? `<div><dt>Per level</dt><dd>${money(a.devCost)}</dd></div>` : ''}</dl>
    ${manage}</div>`;
}

export function showPlayer(st, pid) {
  const p = R.player(st, pid);
  const w = R.netWorth(st, pid);
  const owned = R.ownedAssets(st, pid);
  openModal({
    title: `${chip(p)} ${esc(p.name)}`,
    body: `<p class="small">${p.kind === 'ai' ? `${esc(personalityName(p.personality))}: ${esc(PERSONALITIES[p.personality].blurb)}` : 'Human player'}${p.bankrupt ? ' · <b>Bankrupt</b>' : ''}</p>
      ${wealthTable(w)}
      <h3 class="sub">Holdings</h3>
      ${owned.length ? `<ul class="holdings">${owned.map(id => {
        const a = ASSETS[id], ps = st.props[id];
        return `<li style="--d:${a.district ? DISTRICTS[a.district].color : 'var(--ink-2)'}"><button type="button" class="linkish" data-ui="property" data-asset="${id}">${esc(a.name)}</button><small>${a.kind === 'property' ? LEVELS[ps.level].name : a.kind}${ps.mortgaged ? ' · mortgaged' : ''}</small></li>`;
      }).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
      ${p.waivers ? `<p class="small">Tow Waivers: ${p.waivers}</p>` : ''}`,
  });
}

function wealthTable(w) {
  return `<table class="wealth"><tbody>
    <tr><th>Cash (spendable)</th><td>${money(w.cash)}</td></tr>
    <tr><th>Property at purchase price</th><td>${money(w.property)}</td></tr>
    <tr><th>Invested in buildings</th><td>${money(w.buildings)}</td></tr>
    <tr><th>Loan payoffs owed</th><td>${w.loans ? `−${money(w.loans)}` : money(0)}</td></tr>
    ${w.debts ? `<tr><th>Unpaid debts</th><td>−${money(w.debts)}</td></tr>` : ''}
    <tr class="total"><th>Net worth</th><td>${money(w.total)}</td></tr></tbody></table>`;
}

// ---- trading --------------------------------------------------------------------------------

const describeSide = (s, st) => {
  const parts = [
    ...s.assets.map(id => `<li style="--d:${ASSETS[id].district ? DISTRICTS[ASSETS[id].district].color : 'var(--ink-2)'}">${esc(ASSETS[id].name)}${st.props[id].mortgaged ? ' <small>(mortgaged: loan comes with it)</small>' : ''}</li>`),
    ...(s.cash ? [`<li class="cash">${money(s.cash)} cash</li>`] : []),
    ...(s.waivers ? [`<li>${s.waivers} Tow Waiver${s.waivers > 1 ? 's' : ''}</li>`] : []),
  ];
  return parts.length ? `<ul class="trade-list">${parts.join('')}</ul>` : '<p class="muted small">Nothing</p>';
};

// build or counter an offer. prefill: an offer from the viewer's perspective
export function tradeBuilder(st, ctx, { partner, prefill, counter = false, onSubmit }) {
  const me = R.player(st, ctx.viewer);
  const others = R.alivePlayers(st).filter(p => p.id !== me.id);
  let target = partner || prefill?.to || others[0]?.id;
  const state = {
    give: new Set(prefill?.give.assets || []), get: new Set(prefill?.get.assets || []),
    giveCash: prefill?.give.cash || 0, getCash: prefill?.get.cash || 0,
    giveW: prefill?.give.waivers || 0, getW: prefill?.get.waivers || 0,
  };
  const tradable = pid => R.ownedAssets(st, pid).filter(id => R.isTradable(st, id));
  const blocked = pid => R.ownedAssets(st, pid).filter(id => !R.isTradable(st, id));

  function column(pid, set, cash, w, which) {
    const p = R.player(st, pid);
    const list = tradable(pid);
    return `<fieldset class="trade-col"><legend>${chip(p)} ${which === 'give' ? 'You give' : `${esc(p.name)} gives`}</legend>
      ${list.length ? list.map(id => {
        const a = ASSETS[id];
        return `<label class="check" style="--d:${a.district ? DISTRICTS[a.district].color : 'var(--ink-2)'}"><input type="checkbox" data-side="${which}" value="${id}"${set.has(id) ? ' checked' : ''}> <span>${esc(a.name)} <small>${money(a.price)}${st.props[id].mortgaged ? ' · mortgaged' : ''}</small></span></label>`;
      }).join('') : '<p class="muted small">No tradable assets.</p>'}
      ${blocked(pid).length ? `<p class="small muted">Not tradable while built up: ${blocked(pid).map(id => esc(ASSETS[id].name)).join(', ')}.</p>` : ''}
      <label class="num">Cash <input type="number" min="0" max="${p.cash}" step="10" data-cash="${which}" value="${cash}" inputmode="numeric"><small>of ${money(p.cash)}</small></label>
      ${p.waivers ? `<label class="num">Tow Waivers <input type="number" min="0" max="${p.waivers}" data-waiver="${which}" value="${w}"></label>` : ''}
    </fieldset>`;
  }

  function offer() {
    return {
      from: me.id, to: target,
      give: { cash: state.giveCash, assets: [...state.give], waivers: state.giveW },
      get: { cash: state.getCash, assets: [...state.get], waivers: state.getW },
    };
  }

  function draw() {
    const t = R.player(st, target);
    const el = openModal({
      title: counter ? `Counteroffer to ${esc(t.name)}` : 'Propose a trade',
      className: 'trade-modal',
      body: `<form class="trade-form" data-kind="trade">
        ${counter ? '' : `<label class="partner">Trade with <select name="partner">${others.map(p => `<option value="${p.id}"${p.id === target ? ' selected' : ''}>${esc(p.name)}${p.kind === 'ai' ? ` (${esc(personalityName(p.personality))})` : ''}</option>`).join('')}</select></label>`}
        <div class="trade-cols">${column(me.id, state.give, state.giveCash, state.giveW, 'give')}${column(target, state.get, state.getCash, state.getW, 'get')}</div>
        <div class="trade-summary" id="tradeSummary"></div>
        <div class="btn-row">${btn(counter ? 'Send counteroffer' : 'Send offer', 'type="submit"', 'primary')}${btn('Cancel', 'data-ui="close"')}</div>
      </form>`,
    });
    el.dataset.kind = 'trade-builder';
    const form = el.querySelector('form');
    const summary = () => {
      const o = offer();
      const err = R.validateOffer(st, o);
      el.querySelector('#tradeSummary').innerHTML = `<div class="summary-cols"><div><h4>You give</h4>${describeSide(o.give, st)}</div><div><h4>You receive</h4>${describeSide(o.get, st)}</div></div>
        <p class="small">Your cash after: <b>${money(me.cash - o.give.cash + o.get.cash)}</b>${err ? ` · <span class="err">${esc(err)}</span>` : ''}</p>`;
      form.querySelector('[type=submit]').disabled = !!err;
    };
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'partner') { target = t.value; state.get.clear(); state.getCash = 0; state.getW = 0; draw(); return; }
      if (t.dataset.side) (t.dataset.side === 'give' ? state.give : state.get)[t.checked ? 'add' : 'delete'](t.value);
      summary();
    });
    form.addEventListener('input', e => {
      const t = e.target;
      const v = Math.max(0, Math.floor(Number(t.value) || 0));
      if (t.dataset.cash) state[t.dataset.cash === 'give' ? 'giveCash' : 'getCash'] = v;
      if (t.dataset.waiver) state[t.dataset.waiver === 'give' ? 'giveW' : 'getW'] = v;
      summary();
    });
    form.addEventListener('submit', e => { e.preventDefault(); onSubmit(offer()); });
    summary();
  }
  if (!target) return;
  draw();
}

export function reviewTrade(st, ctx, { note }) {
  const { offer, counters } = st.trade;
  const from = R.player(st, offer.from);
  const me = R.player(st, ctx.viewer);
  const el = openModal({
    title: `${chip(from)} Offer from ${esc(from.name)}`,
    className: 'trade-modal',
    closable: false,
    body: `${note ? `<p class="notice">${esc(note)}</p>` : ''}
      <div class="summary-cols"><div><h4>You give</h4>${describeSide(offer.get, st)}</div><div><h4>You receive</h4>${describeSide(offer.give, st)}</div></div>
      <p class="small">Your cash after: <b>${money(me.cash - offer.get.cash + offer.give.cash)}</b> (now ${money(me.cash)}).${counters ? ` Round ${counters + 1} of negotiation; up to 3 counteroffers.` : ''}</p>
      <div class="btn-row">${btn('Accept', 'data-act="ACCEPT_TRADE"', 'primary')}${btn('Reject', 'data-act="REJECT_TRADE"', 'danger')}${counters < 3 ? btn('Counter…', 'data-ui="counter"') : ''}</div>`,
  });
  el.dataset.kind = 'trade-review';
}

// ---- menus ----------------------------------------------------------------------------------

export function confirmDialog({ title, text, yes, danger = false, onYes }) {
  const el = openModal({
    title: esc(title),
    body: `<p>${esc(text)}</p><div class="btn-row">${btn(esc(yes), 'data-confirm="yes"', danger ? 'danger' : 'primary')}${btn('Cancel', 'data-ui="close"')}</div>`,
  });
  el.querySelector('[data-confirm]').addEventListener('click', () => { closeModal(true); onYes(); });
}

export function pauseMenu({ onResume, hasMatch }) {
  const el = openModal({
    title: 'Paused',
    className: 'menu-modal',
    onClose: onResume,
    body: `<nav class="menu-list">
      ${btn('Resume', 'data-ui="close"', 'primary')}
      ${btn('Rules', 'data-ui="rules"')}
      ${btn('Settings', 'data-ui="settings"')}
      ${hasMatch ? btn('Restart this match…', 'data-ui="restart"') : ''}
      ${btn('New game…', 'data-ui="newgame"')}
      ${btn('Save &amp; return to title', 'data-ui="title"')}
    </nav><p class="small muted">The game saves automatically after every action.</p>`,
  });
  el.dataset.kind = 'pause';
}

export function settingsDialog(settings, onChange, onClose) {
  const opt = (name, value, label) => `<label class="seg"><input type="radio" name="${name}" value="${value}"${settings[name] === value ? ' checked' : ''}><span>${label}</span></label>`;
  const el = openModal({
    title: 'Settings',
    onClose,
    body: `<form class="settings">
      <fieldset><legend>Sound</legend>
        <label class="switch"><input type="checkbox" name="sound"${settings.sound ? ' checked' : ''}> Sound effects</label>
        <label class="range">Volume <input type="range" name="volume" min="0" max="1" step="0.1" value="${settings.volume}"></label></fieldset>
      <fieldset><legend>Animation</legend><div class="segs">${opt('animation', 'normal', 'Normal')}${opt('animation', 'fast', 'Fast')}${opt('animation', 'off', 'Off')}</div></fieldset>
      <fieldset><legend>Reduced motion</legend><div class="segs">${opt('reducedMotion', 'auto', 'Follow system')}${opt('reducedMotion', 'on', 'On')}${opt('reducedMotion', 'off', 'Off')}</div></fieldset>
      <fieldset><legend>AI speed</legend><div class="segs">${opt('aiSpeed', 'relaxed', 'Relaxed')}${opt('aiSpeed', 'normal', 'Normal')}${opt('aiSpeed', 'fast', 'Fast')}</div></fieldset>
      <fieldset><legend>Display</legend><div class="segs">${opt('theme', 'night', 'Harbor night')}${opt('theme', 'day', 'Daylight')}</div>
        <div class="segs">${opt('textSize', 'normal', 'Normal text')}${opt('textSize', 'large', 'Large text')}</div>
        <label class="switch"><input type="checkbox" name="confirmEndTurn"${settings.confirmEndTurn ? ' checked' : ''}> Ask before ending a turn with money to spend on buildings</label></fieldset>
    </form>`,
  });
  el.querySelector('form').addEventListener('change', e => {
    const t = e.target;
    const v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
    onChange({ [t.name]: v });
  });
}

export function rulesDialog() {
  openModal({
    title: 'How to play',
    className: 'rules-modal',
    body: `<div class="rules">
      <section><h3>Goal</h3><p>Grow the largest fortune in Meridian Bay. A match ends when only one player is solvent, when the round limit is reached, or (Quick Match) when someone's net worth reaches the target. The richest player by <b>net worth</b> wins.</p>
      <p><b>Net worth</b> = cash + every asset at its purchase price + money invested in buildings − loan payoffs on mortgaged assets − unpaid debts. <b>Spendable cash</b> is only the cash in hand.</p></section>
      <section><h3>A turn</h3><ol><li>Roll two dice and move clockwise. Passing or landing on Launch Pier pays ${money(CIRCUIT_BONUS)}.</li><li>Resolve the space: buy it, pay rent or tax, or draw a card.</li><li>Build, mortgage, repay loans and propose trades (up to 3 offers per turn).</li><li>End your turn.</li></ol>
      <p><b>Doubles</b> give you another roll. A third double in the same turn means you are pulled over and sent to the Impound Lot, so no turn can go on forever.</p></section>
      <section><h3>Buying and auctions</h3><p>Land on an unowned property, station or service to buy it at its price. If you decline, a <b>sealed-bid auction</b> starts: every player (including you) bids once without seeing the others (minimum ${money(MIN_BID)}, or pass). The highest bid wins; ties go to whoever bid first. Quick Match has no auctions: declined lots stay with the City.</p></section>
      <section><h3>Rent and districts</h3><p>Owning every property of a district doubles its base rent and unlocks building. Stations charge $25/$50/$100/$200 for 1-4 owned; services charge 4× the dice (10× with both). Mortgaged assets charge no rent.</p></section>
      <section><h3>Development</h3><p>Levels: ${LEVELS.slice(1).map(l => l.name).join(' → ')}. Each level costs the district's build price, and you must build evenly: no property can be more than one level above the least developed property of its district. Mortgaged districts can't be built on. Selling a level refunds half its cost, also evenly.</p></section>
      <section><h3>Mortgages</h3><p>Mortgage an asset (with no buildings in its district) for half its price. Repaying costs the mortgage value plus 10%. Mortgaged assets can be traded; the loan goes with them.</p></section>
      <section><h3>Impound Lot</h3><p>Towed players (Tow Zone, some cards, speeding) may pay ${money(IMPOUND_FEE)}, use a Tow Waiver, or roll for doubles on each turn. Doubles drive you out; after three misses you pay the fee and move.</p></section>
      <section><h3>Cards and taxes</h3><p><b>City Bulletins</b> are public: festivals and expansions raise rents for a few rounds, inspections charge builders, grants reward complete districts. <b>Business Opportunities</b> affect only you. Active effects are listed under City conditions with the round they end. The Harbor Levy costs $100 + $10 per development level you own; the Luxury Assessment costs $100.</p></section>
      <section><h3>Trading</h3><p>On your turn, offer any mix of cash, assets and Tow Waivers. The other player accepts, rejects, or counters (up to 3 counteroffers). Assets in a district with buildings can't be traded. Everything is checked again at the moment of acceptance and either all of it changes hands or none of it does.</p></section>
      <section><h3>Debt and bankruptcy</h3><p>If you owe more than your cash, play pauses until you pay: sell buildings and mortgage assets to raise money. You can only declare bankruptcy when even selling and mortgaging everything wouldn't cover what you owe. A bankrupt player's buildings are sold to the City; their cash and assets go to the player they owed (or back to the City), and they leave the game.</p></section>
      <section><h3>Opponents</h3><ul>${Object.values(PERSONALITIES).map(p => `<li><b>${esc(p.name)}</b>: ${esc(p.blurb)}</li>`).join('')}</ul><p class="small">AI players see only public information, follow the same rules through the same rule checks as you, and never see upcoming dice or cards.</p></section>
      <section><h3>Modes</h3><ul><li><b>Classic Meridian</b>: the full 40-space city against AI opponents.</li><li><b>Local Pass-and-Play</b>: 2-4 people share this device; offers and sealed bids are shown only after the device is handed over.</li><li><b>Quick Match</b>: the 28-space Harbor Loop, shorter limit, net worth target, no auctions.</li><li><b>Sandbox</b>: lots of cash, jump anywhere, add or remove money, no winner.</li></ul><p class="small">Online multiplayer is not available; every mode here is played on this one device.</p></section>
    </div>`,
  });
}

export function grantDialog(st, onGrant) {
  const el = openModal({
    title: 'Sandbox cash',
    body: `<form class="grant"><label>Player <select name="target">${R.alivePlayers(st).map(p => `<option value="${p.id}">${esc(p.name)} (${money(p.cash)})</option>`).join('')}</select></label>
      <label>Amount <input type="number" name="amount" value="500" step="50" min="-10000" max="10000"></label>
      <p class="small muted">Negative amounts take money away.</p>
      <div class="btn-row">${btn('Apply', 'type="submit"', 'primary')}${btn('Close', 'data-ui="close"')}</div></form>`,
  });
  el.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    onGrant(f.get('target'), Math.round(Number(f.get('amount'))));
  });
}

export function resultsDialog(st) {
  const res = st.results;
  const w = R.player(st, res[0].pid);
  const el = openModal({
    title: `${chip(w)} ${esc(w.name)} wins!`,
    className: 'results-modal',
    body: `<p class="lead">${esc(END_REASONS[st.endReason] || '')} Rounds played: ${st.round}.</p>
      <table class="results"><thead><tr><th>#</th><th>Player</th><th>Cash</th><th>Property</th><th>Buildings</th><th>Loans</th><th>Net worth</th></tr></thead>
      <tbody>${res.map(r => {
        const p = R.player(st, r.pid);
        return `<tr class="${r.rank === 1 ? 'winner' : ''}${r.bankrupt ? ' out' : ''}"><td>${r.rank}</td><td>${chip(p)} ${esc(p.name)}${r.bankrupt ? ' <small>bankrupt</small>' : ''}</td><td>${money(r.wealth.cash)}</td><td>${money(r.wealth.property)}</td><td>${money(r.wealth.buildings)}</td><td>${r.wealth.loans ? `−${money(r.wealth.loans)}` : '—'}</td><td><b>${money(r.wealth.total)}</b></td></tr>`;
      }).join('')}</tbody></table>
      <p class="small muted">Net worth = cash + property at purchase price + building investment − loan payoffs − unpaid debts.</p>
      <div class="btn-row">${btn('Rematch', 'data-ui="rematch"', 'primary')}${btn('New game', 'data-ui="newgame-now"')}${btn('View the board', 'data-ui="close"')}</div>`,
  });
  el.dataset.kind = 'results';
}

export { wealthTable };
