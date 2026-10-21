// Case battles: set up (cases, rounds, players), then watch a battle that the store has already
// settled play out round by round. Past battles can be reopened from the history.

import { CASES, CASES_BY_ID } from '../cases.js';
import { ITEMS_BY_ID } from '../items.js';
import { RARITY_BY_ID } from '../rarities.js';
import { BATTLE } from '../config.js';
import { battleCost } from '../battles.js';
import { buildStrip } from '../roulette.js';
import { caseArt, itemArt } from '../art.js';
import { coins, itemCard, itemTitle, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, $$, esc, fmt, money, timeAgo, prefersReducedMotion } from '../ui/dom.js';
import { createSpinner } from '../ui/spinner.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const STRIP = 28, WIN_AT = 22, ROUND_MS = 2600, PAUSE_MS = 650;
const setup = { entries: [{ caseId: 'rookie', count: 3 }], players: 2 };
let animateId = null;   // the battle that was just started and should play out
let s = null;

const roundsOf = () => setup.entries.flatMap(e => Array(e.count).fill(e.caseId));
const RULE = 'Winner takes all: the player with the highest total value receives every item unboxed in the battle. On a tie, the tied player with the most valuable single item wins; if that is tied too, a random draw decides. NPC opponents open the same cases with the same odds as you.';

// ---------- setup ----------

function drawSetup() {
  const { root, store } = s.ctx;
  const cases = roundsOf();
  const cost = battleCost(cases);
  const short = cost - store.player.coins;
  $('#entries', root).innerHTML = setup.entries.length
    ? setup.entries.map((e, i) => {
      const c = CASES_BY_ID[e.caseId];
      return `<li><img src="${caseArt(c.id)}" alt=""><span class="en-name">${esc(c.name)}<small>${money(c.price)} each</small></span>
      <span class="stepper"><button class="icon-btn" data-dec="${i}" aria-label="One fewer ${esc(c.name)}">−</button><b>${e.count}</b><button class="icon-btn" data-inc="${i}" aria-label="One more ${esc(c.name)}" ${cases.length >= BATTLE.maxRounds ? 'disabled' : ''}>+</button></span>
      <button class="icon-btn" data-del="${i}" aria-label="Remove ${esc(c.name)}">${ICONS.close}</button></li>`;
    }).join('')
    : '<li class="muted">Add a case below. Each case is one round.</li>';
  $('#bSummary', root).innerHTML = `
<div class="sum-row"><span>Rounds</span><b>${cases.length} / ${BATTLE.maxRounds}</b></div>
<div class="sum-row"><span>Players</span><b>You + ${setup.players - 1} NPC${setup.players > 2 ? 's' : ''}</b></div>
<div class="sum-row"><span>Your entry cost</span><b>${coins(cost)}</b></div>
${short > 0 ? `<p class="warn small">You need ${money(short)} more.</p>` : ''}`;
  $('#startBtn', root).disabled = !cases.length || short > 0 || s.starting;
  for (const b of $$('[data-players]', root)) b.setAttribute('aria-pressed', String(+b.dataset.players === setup.players));
  for (const b of $$('[data-addcase]', root)) b.disabled = cases.length >= BATTLE.maxRounds;
}

function historyHtml(player) {
  const h = player.battles;
  if (!h.length) return '<p class="muted">Your battles will appear here.</p>';
  return `<ol class="history">${h.map(b => {
    const won = b.participants[b.winner].isPlayer;
    const pot = b.participants.reduce((sum, x) => sum + x.total, 0);
    return `<li class="${won ? 'win' : 'loss'}"><span class="h-badge">${won ? 'WON' : 'LOST'}</span>
    <span class="h-items">${b.participants.length} players · ${b.cases.length} round${b.cases.length === 1 ? '' : 's'} · ${esc([...new Set(b.cases)].map(id => CASES_BY_ID[id].name).join(', '))}</span>
    <span class="h-meta">${won ? `+${money(pot)} in items` : `Winner: ${esc(b.participants[b.winner].name)}`} · cost ${money(b.cost)}<br><a class="link" href="#/battles/${b.id}">View</a> · <time>${timeAgo(b.at)}</time></span></li>`;
  }).join('')}</ol>`;
}

function renderSetup(ctx) {
  const { root, store } = ctx;
  root.innerHTML = `
<p class="lede">Open cases side by side against simulated opponents. ${esc(RULE)}</p>
<section class="battle-setup">
  <div>
    <div class="section-head"><h2>Players</h2></div>
    <div class="chips">${[2, 3, 4].map(n => `<button class="chip" data-players="${n}">${Array(n).fill('1').join('v')}</button>`).join('')}</div>
    <div class="section-head" style="margin-top:18px"><h2>Rounds</h2></div>
    <ul class="entries" id="entries"></ul>
  </div>
  <aside class="contract-side">
    <div id="bSummary"></div>
    <button class="btn btn-primary btn-lg" id="startBtn">Start battle</button>
    <p class="muted small">Your entry pays for your own openings. Opponents pay for theirs.</p>
  </aside>
</section>
<section class="section">
  <div class="section-head"><h2>Add cases</h2></div>
  <div class="case-pick">${CASES.map(c => `<button class="case-mini" data-addcase="${c.id}" style="--case-a:${c.theme.from}"><img src="${caseArt(c.id)}" alt=""><span>${esc(c.name)}</span>${coins(c.price)}</button>`).join('')}</div>
</section>
<section class="section"><div class="section-head"><h2>Battle history</h2></div>${historyHtml(store.player)}</section>`;
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const total = roundsOf().length;
    if (b.dataset.players) setup.players = +b.dataset.players;
    else if (b.dataset.addcase) {
      if (total >= BATTLE.maxRounds) return;
      const last = setup.entries.at(-1);
      if (last && last.caseId === b.dataset.addcase) last.count += 1;
      else setup.entries.push({ caseId: b.dataset.addcase, count: 1 });
    } else if (b.dataset.inc != null) { if (total < BATTLE.maxRounds) setup.entries[+b.dataset.inc].count += 1; }
    else if (b.dataset.dec != null) {
      const en = setup.entries[+b.dataset.dec];
      en.count -= 1;
      if (!en.count) setup.entries.splice(+b.dataset.dec, 1);
    } else if (b.dataset.del != null) setup.entries.splice(+b.dataset.del, 1);
    else if (b.id === 'startBtn') return start();
    drawSetup();
  });
  drawSetup();
}

function start() {
  if (s.starting) return;
  s.starting = true; // one battle per click, even if the button is hit twice
  const r = s.ctx.store.battle({ cases: roundsOf(), players: setup.players });
  if (!r.ok) { s.starting = false; toast(r.message, { kind: 'error' }); drawSetup?.(); return; }
  animateId = r.battle.id;
  if (r.levelUp) s.levelUp = r.levelUp;
  location.hash = `#/battles/${r.battle.id}`;
}

// ---------- the battle itself ----------

function rlCard(d) {
  const it = ITEMS_BY_ID[d.itemId];
  const t = itemTitle(d.itemId);
  return `<div class="rl-card r-${it.rarity}" style="--rc:${RARITY_BY_ID[it.rarity].color}"><img src="${itemArt(d.itemId)}" alt=""><span class="rl-f">${esc(t.finish)}</span></div>`;
}

function renderBattle(ctx, battle) {
  const { root } = ctx;
  const n = battle.participants.length;
  root.innerHTML = `
<a class="back-link" href="#/battles">${ICONS.back} Battles</a>
<div class="battle-bar">
  <div><b id="roundLabel"></b><span class="muted small" id="roundCase"></span></div>
  <div class="battle-cases">${battle.cases.map((id, i) => `<img src="${caseArt(id)}" alt="${esc(CASES_BY_ID[id].name)}" title="Round ${i + 1}: ${esc(CASES_BY_ID[id].name)}" data-round="${i}">`).join('')}</div>
  <button class="btn btn-ghost btn-sm" id="bSkip">${ICONS.skip} Skip</button>
</div>
<div class="battle-grid" style="--cols:${n}">
${battle.participants.map((p, i) => `<section class="seat ${p.isPlayer ? 'is-you' : ''}" data-seat="${i}">
  <header><span class="seat-name">${esc(p.name)}</span>${p.isPlayer ? '<span class="tag tag-you">You</span>' : '<span class="tag">NPC</span>'}<b class="seat-total" id="tot${i}">${coins(0)}</b></header>
  <div class="mini-rl"><div class="mini-track" id="trk${i}"></div><div class="mini-marker" aria-hidden="true"></div></div>
  <div class="seat-drops" id="drops${i}"></div>
</section>`).join('')}
</div>
<div id="bResult" aria-live="polite"></div>`;
  const spinners = battle.participants.map((_, i) => createSpinner($('.mini-rl', $(`[data-seat="${i}"]`, root)), $(`#trk${i}`, root), { axis: 'y' }));
  s.spinners = spinners;
  s.battle = battle;
  const totals = Array(n).fill(0);

  const reveal = r => {
    battle.participants.forEach((p, i) => {
      const d = p.drops[r];
      totals[i] += d.value;
      $(`#drops${i}`, root).insertAdjacentHTML('afterbegin', itemCard(d.itemId, d.wear, { value: d.value, classes: 'drop-in' }));
      $(`#tot${i}`, root).innerHTML = coins(totals[i]);
    });
    const best = Math.max(...totals);
    $$('.seat', root).forEach((el, i) => el.classList.toggle('leading', totals[i] === best && best > 0));
    $$('[data-round]', root).forEach(img => img.classList.toggle('done', +img.dataset.round <= r));
  };
  const label = r => {
    $('#roundLabel', root).textContent = `Round ${r + 1} / ${battle.cases.length}`;
    $('#roundCase', root).textContent = ` · ${CASES_BY_ID[battle.cases[r]].name}`;
  };

  const animate = animateId === battle.id && !prefersReducedMotion() && !ctx.store.player.settings.instantOpen;
  animateId = null;
  if (!animate) {
    battle.cases.forEach((_, r) => reveal(r));
    const last = battle.cases.length - 1;
    battle.participants.forEach((p, i) => spinners[i].show(rlCard(p.drops[last]), 0));
    label(last);
    $('#bSkip', root).hidden = true;
    showOutcome(battle);
    return;
  }

  s.playing = true;
  $('#bSkip', root).addEventListener('click', () => { s.skipAll = true; spinners.forEach(sp => sp.skip()); });
  (async () => {
    for (let r = 0; r < battle.cases.length; r++) {
      if (!s || s.battle !== battle) return;
      label(r);
      const c = CASES_BY_ID[battle.cases[r]];
      const fast = !!s.skipAll;
      await Promise.all(battle.participants.map((p, i) => {
        const strip = buildStrip(c, p.drops[r], { length: STRIP, winnerIndex: WIN_AT });
        return spinners[i].spin(strip.map(rlCard).join(''), WIN_AT, { duration: ROUND_MS, instant: fast, ticks: p.isPlayer });
      }));
      if (!s || s.battle !== battle) return;
      reveal(r);
      if (!s.skipAll) sound.reveal(Math.max(...battle.participants.map(p => RARITY_BY_ID[ITEMS_BY_ID[p.drops[r].itemId].rarity].rank)) - 2);
      if (!s.skipAll && r < battle.cases.length - 1) await new Promise(res => { s.pauseTimer = setTimeout(res, PAUSE_MS); });
    }
    if (!s || s.battle !== battle) return;
    s.playing = false;
    $('#bSkip', root).hidden = true;
    showOutcome(battle);
  })();
}

function showOutcome(battle) {
  const { root } = s.ctx;
  const winner = battle.participants[battle.winner];
  const pot = battle.participants.reduce((sum, p) => sum + p.total, 0);
  const items = battle.participants.reduce((sum, p) => sum + p.drops.length, 0);
  const ranking = battle.participants.map((p, i) => ({ ...p, i })).sort((a, b) => b.total - a.total);
  $$('.seat', root).forEach((el, i) => { el.classList.toggle('winner', i === battle.winner); el.classList.remove('leading'); });
  $('#bResult', root).innerHTML = `
<section class="battle-result ${winner.isPlayer ? 'won' : 'lost'}">
  <h2>${winner.isPlayer ? 'You won the battle!' : `${esc(winner.name)} won the battle`}</h2>
  <p>${winner.isPlayer ? `All ${items} items (${money(pot)}) were added to your inventory.` : `${esc(winner.name)} takes all ${items} items (${money(pot)}). You paid ${money(battle.cost)}.`}
  ${battle.tieBreak ? '<br><span class="small">The top totals were tied, so the tie-break rule decided.</span>' : ''}</p>
  <ol class="scoreboard">${ranking.map((p, k) => `<li class="${p.i === battle.winner ? 'win' : ''}"><span>${k + 1}. ${esc(p.name)}${p.isPlayer ? ' (you)' : ''}</span>${coins(p.total)}</li>`).join('')}</ol>
  <div class="ph-actions">
    <button class="btn btn-primary" id="againBtn">Battle again · ${money(battle.cost)}</button>
    <a class="btn btn-ghost" href="#/battles">New battle</a>
    ${winner.isPlayer ? '<a class="btn btn-ghost" href="#/inventory">View inventory</a>' : ''}
  </div>
  <p class="muted small">${esc(RULE)}</p>
</section>`;
  if (s.levelUp) { toast(`Level up! You reached level ${s.levelUp}.`, { kind: 'success' }); s.levelUp = null; }
  if (winner.isPlayer) sound.reveal(6);
  $('#againBtn', root).addEventListener('click', e => {
    e.currentTarget.disabled = true;
    if (s.starting) return;
    s.starting = true;
    const r = s.ctx.store.battle({ cases: battle.cases, players: battle.participants.length });
    if (!r.ok) { s.starting = false; e.currentTarget.disabled = false; toast(r.message, { kind: 'error' }); return; }
    animateId = r.battle.id;
    s.levelUp = r.levelUp;
    location.hash = `#/battles/${r.battle.id}`;
  });
}

function onResize() { s?.spinners?.forEach(sp => sp.recenter()); }

export default {
  title: ctx => (ctx.params[0] ? 'Battle' : 'Case Battles'),
  render(ctx) {
    const keepLevel = s?.levelUp;
    s = { ctx, starting: false, playing: false, skipAll: false, levelUp: keepLevel || null };
    window.addEventListener('resize', onResize);
    const id = ctx.params[0];
    if (!id) return renderSetup(ctx);
    const battle = ctx.store.player.battles.find(b => b.id === id);
    if (!battle) {
      ctx.root.innerHTML = emptyState({ icon: 'battles', title: 'Battle not found', text: 'Only your last 20 battles are kept.', action: '<a class="btn btn-primary" href="#/battles">Battles</a>' });
      return;
    }
    renderBattle(ctx, battle);
  },
  onStore(event, ctx) {
    if (!s) return;
    // The setup page tracks affordability; a battle in progress is never re-rendered.
    if (!ctx.params[0] && $('#entries', ctx.root)) drawSetup();
  },
  destroy() {
    window.removeEventListener('resize', onResize);
    if (!s) return;
    s.spinners?.forEach(sp => sp.cancel());
    clearTimeout(s.pauseTimer);
    if (s.playing) toast('The battle was already settled; see the result in Battle history.', { kind: 'info' });
    const lv = s.levelUp;
    s = { levelUp: lv };
  },
};
