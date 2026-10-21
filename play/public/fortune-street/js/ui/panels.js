// Side panels: leaderboard, active effects, the current-player panel with its contextual
// actions, and the tabbed portfolio / event feed / ledger. Pure HTML builders: buttons carry
// data-act (an engine action) or data-ui (a UI command) and app.js handles the clicks.
import { ASSETS, DISTRICTS, LEVELS, IMPOUND_FEE, MIN_BID, MAX_LEVEL, spaceName } from '../board.js';
import * as R from '../rules.js';
import { MODES } from '../engine.js';
import { personalityName } from '../ai.js';
import { esc, money, signed } from './fmt.js';
import { tokenArt, icon } from './icons.js';

export const PHASE_LABELS = {
  preRoll: 'Ready to roll', buy: 'Purchase decision', auction: 'Sealed-bid auction',
  debt: 'Debt to settle', postRoll: 'Manage & end turn', gameOver: 'Match over',
};

export const chip = p => `<span class="pchip" style="--pc:${p.color}">${tokenArt(p.token)}</span>`;
const btn = (label, attrs, { kind = '', disabled = false, title = '' } = {}) =>
  `<button ${/\btype=/.test(attrs) ? '' : 'type="button" '}class="btn ${kind}" ${attrs}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;

export function renderHud(st) {
  const board = R.boardOf(st);
  const p = R.player(st, st.turn.player);
  const limit = st.options.roundLimit && !st.sandbox ? ` / ${st.options.roundLimit}` : '';
  return `<span class="hud-mode">${esc(MODES[st.mode].name)}</span>
    <span class="hud-round">Round <b>${st.round}${limit}</b></span>
    <span class="hud-turn">${chip(p)}<b>${esc(p.name)}</b></span>
    <span class="phase-chip phase-${st.turn.phase}">${PHASE_LABELS[st.turn.phase]}</span>
    ${st.options.wealthTarget && !st.sandbox ? `<span class="hud-target">Target ${money(st.options.wealthTarget)}</span>` : ''}
    <span class="sr-only">${esc(board.name)}</span>`;
}

export function renderLeaderboard(st, ctx) {
  const rows = st.players.map(p => ({ p, w: R.netWorth(st, p.id) }))
    .sort((a, b) => Number(a.p.bankrupt) - Number(b.p.bankrupt) || b.w.total - a.w.total);
  return `<h2 class="panel-title">Leaderboard</h2>
    <ol class="leaders">${rows.map(({ p, w }, i) => {
      const assets = R.ownedAssets(st, p.id).length;
      const sets = R.completedDistricts(st, p.id).length;
      const badges = [
        p.id === st.turn.player && !st.finished ? '<span class="badge turn">Turn</span>' : '',
        p.impounded ? '<span class="badge warn">Impounded</span>' : '',
        p.bankrupt ? '<span class="badge bad">Bankrupt</span>' : '',
        p.id === ctx.viewer ? '<span class="badge you">You</span>' : '',
      ].join('');
      return `<li class="leader${p.bankrupt ? ' out' : ''}${p.id === st.turn.player ? ' current' : ''}" style="--pc:${p.color}">
        <button type="button" class="leader-btn" data-ui="player" data-pid="${p.id}">
          <span class="rank">${p.bankrupt ? '—' : i + 1}</span>${chip(p)}
          <span class="leader-name"><b>${esc(p.name)}</b><small>${p.kind === 'ai' ? esc(personalityName(p.personality)) : 'Human'} ${badges}</small></span>
          <span class="leader-nums"><span title="Spendable cash">${money(p.cash)}</span><small title="Net worth">worth ${money(w.total)}</small><small>${assets} asset${assets === 1 ? '' : 's'}${sets ? ` · ${sets} set${sets > 1 ? 's' : ''}` : ''}</small></span>
        </button></li>`;
    }).join('')}</ol>`;
}

export function renderEffects(st) {
  const items = st.effects.map(e => `<li><span class="fx-dot ${e.mult < 1 ? 'down' : 'up'}"></span>${esc(e.label)}<small>until end of round ${e.until}</small></li>`);
  return `<h2 class="panel-title">City conditions</h2>${items.length ? `<ul class="effects">${items.join('')}</ul>` : '<p class="muted small">No special events in effect.</p>'}`;
}

// ---- current-player panel ------------------------------------------------------------------

export function renderTurnPanel(st, ctx) {
  const p = R.player(st, st.turn.player);
  const w = R.netWorth(st, p.id);
  const sets = R.completedDistricts(st, p.id);
  const head = `<div class="cp-head" style="--pc:${p.color}">${chip(p)}
      <div><h2>${esc(p.name)}</h2><small>${p.kind === 'ai' ? esc(personalityName(p.personality)) : 'Human player'} · ${esc(spaceName(R.boardOf(st).spaces[p.position]))}</small></div></div>
    <dl class="cp-stats">
      <div><dt>Spendable cash</dt><dd>${money(p.cash)}</dd></div>
      <div><dt>Net worth</dt><dd>${money(w.total)}</dd></div>
      <div><dt>Assets</dt><dd>${R.ownedAssets(st, p.id).length}</dd></div>
      <div><dt>Districts</dt><dd>${sets.length ? sets.map(d => `<i class="dist-dot" style="--d:${DISTRICTS[d].color}" title="${esc(DISTRICTS[d].name)}"></i>`).join('') : '0'}</dd></div>
    </dl>
    ${p.waivers ? `<p class="small">Holding ${p.waivers} Tow Waiver${p.waivers > 1 ? 's' : ''}.</p>` : ''}`;
  return head + `<div class="actions" aria-live="polite">${renderActions(st, ctx)}</div>`;
}

function renderActions(st, ctx) {
  if (st.finished) return `<p class="lead">The match is over.</p>${btn('See results', 'data-ui="results"', { kind: 'primary' })}`;
  if (ctx.animating) return '<p class="lead thinking">Moving…</p>';
  const actor = R.currentActor(st);
  const a = R.player(st, actor);
  if (a.kind === 'ai') return `<p class="lead thinking">${chip(a)} ${esc(a.name)} is deciding${st.trade ? ' on a trade offer' : ''}…</p>`;
  if (actor !== ctx.viewer) return `<p class="lead">Waiting for ${esc(a.name)}…</p>${btn(`I'm ${esc(a.name)}`, 'data-ui="handoff"', { kind: 'primary' })}`;

  const me = a;
  if (st.trade) {
    return `<p class="lead">${esc(R.playerName(st, st.trade.offer.from))} sent you a trade offer.</p>${btn('Review offer', 'data-ui="review-trade"', { kind: 'primary' })}`;
  }
  if (st.debts.length) {
    const d = st.debts[0];
    const owed = st.debts.filter(x => x.debtor === me.id).reduce((n, x) => n + x.amount, 0);
    const liq = R.liquidationValue(st, me.id);
    return `<div class="notice bad"><b>You owe ${money(d.amount)} to ${esc(R.playerName(st, d.creditor))}</b><br><small>${esc(d.reason)}. You have ${money(me.cash)} in cash; selling and mortgaging everything would raise up to ${money(liq)}.</small></div>
      <div class="btn-row">
        ${btn(`Pay ${money(d.amount)}`, 'data-act="PAY_DEBT"', { kind: 'primary', disabled: me.cash < d.amount })}
        ${btn('Raise funds automatically', 'data-act="LIQUIDATE"', { disabled: me.cash >= d.amount || liq <= me.cash, title: 'Mortgages spare assets first, then sells buildings, until you can pay' })}
        ${btn('Declare bankruptcy', 'data-ui="bankrupt"', { kind: 'danger', disabled: liq >= owed, title: liq >= owed ? 'You can still raise enough to pay' : '' })}
      </div><p class="hint">Or pick what to sell and mortgage yourself in <button type="button" class="linkish" data-ui="tab" data-tab="portfolio">Portfolio</button>.</p>`;
  }
  const t = st.turn;
  if (t.phase === 'buy') {
    const asset = ASSETS[st.pending.asset];
    const short = asset.price - me.cash;
    const complete = asset.kind === 'property' && R.districtProps(st, asset.district).every(id => id === asset.id || st.props[id].owner === me.id);
    return `<div class="offer-card">${assetSummary(st, asset.id)}</div>
      ${complete ? `<p class="notice good">Buying this completes <b>${esc(DISTRICTS[asset.district].name)}</b>: base rents double and you can start building.</p>` : ''}
      ${short > 0 ? `<p class="notice warn">You are ${money(short)} short. Mortgage or sell in Portfolio, or decline.</p>` : ''}
      <div class="btn-row">
        ${btn(`Buy for ${money(asset.price)}`, 'data-act="BUY"', { kind: 'primary', disabled: short > 0 })}
        ${btn(st.options.auctions ? 'Decline → auction' : 'Decline', 'data-act="DECLINE"')}
      </div>
      <p class="hint">${st.options.auctions ? 'If you decline, every player (you included) places one sealed bid; the highest bid buys it.' : 'Quick Match: declined properties stay with the City.'}</p>`;
  }
  if (t.phase === 'auction') {
    const pend = st.pending;
    const asset = ASSETS[pend.asset];
    const placed = pend.idx;
    return `<div class="offer-card">${assetSummary(st, asset.id)}</div>
      <p class="lead">Your sealed bid <small>(${placed} of ${pend.order.length} bids placed; amounts stay hidden until all are in)</small></p>
      <form class="bid-form" data-form="bid">
        <label>Bid ($${MIN_BID}–${me.cash}) <input type="number" name="amount" min="0" max="${me.cash}" step="5" value="${Math.min(me.cash, Math.max(MIN_BID, Math.round(asset.price * 0.6 / 5) * 5))}" inputmode="numeric"></label>
        <div class="btn-row">${btn('Place sealed bid', 'type="submit"', { kind: 'primary' })}${btn('Pass', 'data-act="BID" data-amount="0"')}</div>
      </form>`;
  }
  if (t.phase === 'preRoll') {
    if (me.impounded && !t.rolled) {
      return `<p class="lead">${icon('lock')} You are in the Impound Lot (attempt ${me.impoundTurns + 1} of 3).</p>
        <div class="btn-row">
          ${btn('Roll for doubles', 'data-act="ROLL"', { kind: 'primary' })}
          ${btn(`Pay ${money(IMPOUND_FEE)}`, 'data-act="PAY_IMPOUND"', { disabled: me.cash < IMPOUND_FEE })}
          ${me.waivers ? btn('Use Tow Waiver', 'data-act="USE_WAIVER"') : ''}
        </div>
        <p class="hint">Doubles drive you out (no extra roll). After a third miss you pay ${money(IMPOUND_FEE)} and move.</p>${secondary(st, me)}`;
    }
    return `${t.extraRoll ? '<p class="notice good">Doubles! Roll again.</p>' : ''}
      <div class="btn-row">${btn(`${icon('dice')} Roll dice`, 'data-act="ROLL"', { kind: 'primary big' })}</div>
      ${st.sandbox ? `<form class="sandbox-move" data-form="jump"><label>Sandbox: jump to <select name="space">${R.boardOf(st).spaces.map((s, i) => `<option value="${i}"${i === me.position ? ' disabled' : ''}>${i}. ${esc(spaceName(s))}</option>`).join('')}</select></label>${btn('Jump', 'type="submit"')}</form>` : ''}
      ${secondary(st, me)}`;
  }
  if (t.phase === 'postRoll') {
    return `<div class="btn-row">${btn('End turn', 'data-act="END_TURN"', { kind: 'primary big' })}</div>${secondary(st, me)}`;
  }
  return '';
}

function secondary(st, me) {
  const canTrade = R.canProposeTrade(st, me.id) && R.alivePlayers(st).length > 1;
  const buildable = R.ownedAssets(st, me.id).filter(id => R.canBuild(st, me.id, id).ok).length;
  return `<div class="btn-row secondary">
    ${btn(`${icon('trade')} Trade`, 'data-ui="trade"', { disabled: !canTrade, title: canTrade ? '' : 'You can make up to 3 offers per turn' })}
    ${btn(`Portfolio${buildable ? ` <span class="count">${buildable} to build</span>` : ''}`, 'data-ui="tab" data-tab="portfolio"')}
    ${st.sandbox ? btn('Sandbox cash', 'data-ui="grant"') : ''}
  </div>`;
}

export function assetSummary(st, id) {
  const a = ASSETS[id];
  const d = a.kind === 'property' ? DISTRICTS[a.district] : null;
  const line = a.kind === 'property' ? `Base rent ${money(a.rents[0])} · doubled with the full district`
    : a.kind === 'transit' ? 'Rent $25 / $50 / $100 / $200 for 1-4 stations owned'
      : 'Rent 4x the dice (10x with both services)';
  return `<div class="asset-sum" style="--d:${d ? d.color : 'var(--ink-2)'}"><span class="asset-ico">${icon(a.icon)}</span>
    <div><b>${esc(a.name)}</b><small>${d ? esc(d.name) : a.kind === 'transit' ? 'Transit station' : 'City service'} · ${money(a.price)}</small><small>${line}</small></div></div>`;
}

// ---- tabs -----------------------------------------------------------------------------------

export function renderPortfolio(st, ctx) {
  const pid = ctx.viewer;
  if (!pid) return '<p class="muted">Spectating: no portfolio.</p>';
  const me = R.player(st, pid);
  const owned = R.ownedAssets(st, pid);
  const can = kind => R.canManage(st, pid, kind);
  const w = R.netWorth(st, pid);
  const summary = `<div class="wealth-box">
      <div><span>Spendable cash</span><b>${money(me.cash)}</b></div>
      <div><span>Net worth</span><b>${money(w.total)}</b></div>
      <small>Net worth = cash ${money(w.cash)} + property ${money(w.property)} + buildings ${money(w.buildings)} − loans ${money(w.loans)}${w.debts ? ` − debts ${money(w.debts)}` : ''}. Could raise ${money(R.liquidationValue(st, pid))} by selling and mortgaging everything.</small>
    </div>`;
  if (!owned.length) return `${summary}<p class="muted">You don't own anything yet. Land on an unowned space to buy it.</p>`;
  const groups = {};
  for (const id of owned) {
    const a = ASSETS[id];
    (groups[a.kind === 'property' ? a.district : a.kind] ||= []).push(id);
  }
  const order = [...Object.keys(DISTRICTS), 'transit', 'service'];
  const sections = order.filter(k => groups[k]).map(k => {
    const d = DISTRICTS[k];
    const total = d ? R.districtProps(st, k).length : null;
    const title = d ? `${d.name} <small>${groups[k].length}/${total}${R.ownsDistrict(st, pid, k) ? ' · complete' : ''}</small>` : k === 'transit' ? 'Transit' : 'City services';
    return `<section class="pf-group" style="--d:${d ? d.color : 'var(--ink-2)'}"><h3>${title}</h3>${groups[k].map(id => assetRow(st, pid, id, can)).join('')}</section>`;
  });
  return summary + sections.join('');
}

function assetRow(st, pid, id, can) {
  const a = ASSETS[id];
  const ps = st.props[id];
  const b = R.canBuild(st, pid, id), s = R.canSellBuilding(st, pid, id), m = R.canMortgage(st, pid, id), u = R.canUnmortgage(st, pid, id);
  const rent = R.rentFor(st, id, { dice: 7 });
  const controls = [];
  if (a.kind === 'property') {
    if (ps.level < MAX_LEVEL) controls.push(btn(`Build ${money(a.devCost)}`, `data-act="BUILD" data-asset="${id}"`, { disabled: !can('build') || !b.ok, title: b.ok ? `Next: ${LEVELS[ps.level + 1].name}, rent ${money(a.rents[ps.level + 1])}` : b.reason }));
    if (ps.level > 0) controls.push(btn(`Sell +${money(Math.floor(a.devCost / 2))}`, `data-act="SELL_BUILDING" data-asset="${id}"`, { disabled: !can('sell') || !s.ok, title: s.ok ? '' : s.reason }));
  }
  if (!ps.mortgaged) controls.push(btn(`Mortgage +${money(a.mortgage)}`, `data-act="MORTGAGE" data-asset="${id}"`, { disabled: !can('mortgage') || !m.ok, title: m.ok ? '' : m.reason }));
  else controls.push(btn(`Repay ${money(R.unmortgageCost(id))}`, `data-act="UNMORTGAGE" data-asset="${id}"`, { disabled: !can('unmortgage') || !u.ok, title: u.ok ? '' : u.reason }));
  return `<div class="pf-row${ps.mortgaged ? ' mortgaged' : ''}">
    <button type="button" class="pf-name" data-ui="property" data-asset="${id}">${icon(a.icon)}<span><b>${esc(a.name)}</b><small>${a.kind === 'property' ? LEVELS[ps.level].name : ''}${ps.mortgaged ? ' · mortgaged' : ` · rent ${money(rent)}${a.kind === 'service' ? ' at 7' : ''}`}${a.kind === 'property' && ps.level < MAX_LEVEL && b.ok ? ` → ${money(a.rents[ps.level + 1])}` : ''}</small></span></button>
    <div class="pf-ctrl">${controls.join('')}</div></div>`;
}

export function renderLog(st) {
  return `<ol class="feed">${st.log.slice().reverse().map(l => `<li class="tone-${l.tone}"><span class="feed-round">R${l.round}</span>${esc(l.text)}</li>`).join('')}</ol>`;
}

export function renderLedger(st, ctx, filter) {
  const rows = st.ledger.filter(e => filter !== 'mine' || e.from === ctx.viewer || e.to === ctx.viewer).slice().reverse();
  const who = id => (id === 'bank' ? '<span class="bank">City</span>' : esc(R.playerName(st, id)));
  return `<div class="ledger-filter">
      ${btn('All', 'data-ui="ledger" data-filter="all"', { kind: filter !== 'mine' ? 'on' : '' })}
      ${ctx.viewer ? btn('Mine', 'data-ui="ledger" data-filter="mine"', { kind: filter === 'mine' ? 'on' : '' }) : ''}
    </div>
    ${rows.length ? `<table class="ledger"><thead><tr><th>Rd</th><th>From → To</th><th>Amount</th><th>For</th></tr></thead><tbody>${rows.map(e => {
      const sign = ctx.viewer && filter === 'mine' ? (e.to === ctx.viewer ? 1 : -1) : 0;
      return `<tr><td>${e.round}</td><td>${who(e.from)} → ${who(e.to)}</td><td class="amt ${sign > 0 ? 'in' : sign < 0 ? 'out' : ''}">${sign ? signed(sign * e.amount) : money(e.amount)}</td><td>${esc(e.reason)}</td></tr>`;
    }).join('')}</tbody></table>` : '<p class="muted">No transactions yet.</p>'}`;
}
