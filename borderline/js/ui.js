// Draws the game state into the page. Reads state only; every change goes back through
// the `act` callback supplied by main.js.
import { SETTING } from '../data/setting.js';
import { VISITORS } from '../data/visitors.js';
import { dayByNumber } from '../data/campaignDays.js';
import { currentVisitor, currentDay, decisionFor } from './gameState.js';
import { renderDocument } from './documentRenderer.js';
import { portraitSVG } from './portrait.js';
import { formatLong } from './dates.js';
import { esc } from './html.js';

const $ = id => document.getElementById(id);
const money = n => `${SETTING.currency.symbol}${n}`;
const DECISION_TEXT = { accept: 'Granted', reject: 'Denied' };

const BACKDROP = `<svg class="backdrop" viewBox="0 0 320 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path d="M0 120l50-46 40 30 60-62 50 44 40-24 80 58v80H0z" class="bd-mount"/>
  <path d="M0 150l70-28 60 18 70-30 60 22 60-16v84H0z" class="bd-hill"/>
  <path d="M0 176h320v24H0z" class="bd-road"/>
  <path d="M12 176V120h6v56M18 124h118" class="bd-gate"/>
</svg>`;

export function createUI(act) {
  let shownVisitor = null;
  let lastPhase = null;

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    act(btn.dataset.action === 'decide' ? { type: 'decide', decision: btn.dataset.decision } : { type: btn.dataset.action });
  });

  $('introText').textContent =
    `${formatLong(dayByNumber(1).date)}. You have been posted to ${SETTING.checkpoint.post} at ${SETTING.checkpoint.name}, ` +
    `${SETTING.checkpoint.description}. Your family has moved with you to the frontier town below the pass. ` +
    `Inspect every entrant's papers and decide who crosses into ${SETTING.country.name}.`;

  function showScreen(id) {
    for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id;
  }

  function renderHUD(state) {
    const s = state.shift;
    $('hud').innerHTML = `
      <div><dt>Day</dt><dd>${state.day}</dd></div>
      <div><dt>Date</dt><dd>${esc(formatLong(state.date))}</dd></div>
      <div><dt>Entrants</dt><dd>${s.decisions.length} / ${s.queue.length} processed</dd></div>
      <div><dt>Savings</dt><dd class="hud-money">${money(state.money)}</dd></div>`;
  }

  function renderBulletin(state) {
    const b = currentDay(state).bulletin;
    $('bulletin').innerHTML = `<h2>${esc(b.title)}</h2><p class="bulletin-date">${esc(formatLong(state.date))}</p>
      <ul>${b.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
  }

  function renderBooth(state, arriving) {
    const v = currentVisitor(state);
    const phase = state.shift.phase;
    $('boothWindow').innerHTML = BACKDROP + (v
      ? `<div class="visitor${arriving ? ' arriving' : ''}${phase === 'departing' ? ' leaving' : ''}">${portraitSVG(v.look, { title: v.name })}</div>`
      : `<p class="booth-empty">${phase === 'shiftEnd' ? 'The road is empty. The shift is over.' : 'The booth is empty.'}</p>`);
    const d = v && decisionFor(state, v.id);
    const line = !v ? '' : d ? v.lines[d.decision === 'accept' ? 'accepted' : 'rejected'] : v.lines.greet;
    $('speech').innerHTML = v ? `<p class="speaker">${esc(v.name)}</p><p>“${esc(line)}”</p>` : '';
    $('speech').hidden = !v;
    document.querySelector('[data-action="callNext"]').disabled = phase !== 'waiting';
  }

  function renderTray(state, arriving) {
    const v = currentVisitor(state);
    const d = v && decisionFor(state, v.id);
    $('tray').innerHTML = v
      ? v.documents.map(doc => renderDocument(doc, v, { stamp: doc.type === 'passport' && d ? d.decision : null })).join('')
      : `<p class="tray-empty">No documents on the desk.</p>`;
    $('tray').classList.toggle('fresh', Boolean(arriving));
    const inspecting = state.shift.phase === 'inspecting';
    for (const b of document.querySelectorAll('[data-action="decide"]')) b.disabled = !inspecting;
    document.querySelector('[data-action="returnPapers"]').disabled = state.shift.phase !== 'departing';
  }

  function renderStatus(state) {
    const s = state.shift;
    const v = currentVisitor(state);
    const text = {
      waiting: s.next === 0 ? 'Your shift has begun. Call the first entrant when you are ready.' : 'Call the next entrant.',
      inspecting: `Inspecting ${v?.name}. Read the papers, then stamp a decision.`,
      departing: `Passport stamped. Return the papers to ${v?.name}.`,
      shiftEnd: 'The queue is empty. Shift complete.',
    }[s.phase];
    $('status').textContent = text;
  }

  function renderLog(state) {
    const items = state.shift.decisions.map(d =>
      `<li class="log-${esc(d.decision)}"><span>${esc(VISITORS[d.visitorId].name)}</span><span>${DECISION_TEXT[d.decision]}</span><span>+${money(d.pay)}</span></li>`);
    $('log').innerHTML = items.join('') || '<li class="log-empty">No entrants processed yet.</li>';
  }

  function renderSummary(state) {
    const s = state.shift;
    const granted = s.decisions.filter(d => d.decision === 'accept').length;
    $('summaryBody').innerHTML = `
      <p class="kicker">${esc(SETTING.checkpoint.post)} · End of shift</p>
      <h2 id="summaryTitle">Day ${state.day} complete</h2>
      <dl class="summary-stats">
        <div><dt>Entrants processed</dt><dd>${s.decisions.length}</dd></div>
        <div><dt>Granted entry</dt><dd>${granted}</dd></div>
        <div><dt>Denied entry</dt><dd>${s.decisions.length - granted}</dd></div>
        <div><dt>Wages earned</dt><dd>${money(s.earned)}</dd></div>
        <div><dt>Savings</dt><dd>${money(state.money)}</dd></div>
      </dl>
      <p class="summary-note">The training shift is paid at a flat rate. The Ministry has not yet reviewed your decisions.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-action="restart">Work the training shift again</button></div>`;
  }

  // move focus to the control the player needs next, so keyboard play never gets lost
  function focusFor(phase) {
    const sel = { waiting: '[data-action="callNext"]', inspecting: '.stamp-btn.stamp-accept', departing: '[data-action="returnPapers"]', shiftEnd: '#summary [data-action="restart"]' }[phase];
    document.querySelector(sel)?.focus({ preventScroll: phase === 'inspecting' });
  }

  return {
    render(state) {
      showScreen('game');
      const v = currentVisitor(state);
      const arriving = Boolean(v) && v.id !== shownVisitor;
      shownVisitor = v ? v.id : null;
      renderHUD(state); renderBulletin(state); renderBooth(state, arriving); renderTray(state, arriving); renderStatus(state); renderLog(state);
      const ended = state.shift.phase === 'shiftEnd';
      if (ended) renderSummary(state);
      $('summary').hidden = !ended;
      if (state.shift.phase !== lastPhase) focusFor(state.shift.phase);
      lastPhase = state.shift.phase;
    },
    showIntro() { showScreen('intro'); $('summary').hidden = true; lastPhase = null; shownVisitor = null; },
  };
}
