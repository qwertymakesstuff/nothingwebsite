// Draws the game state into the page. Reads state only; every change goes back through
// the `act` callback supplied by main.js.
import { SETTING } from '../data/setting.js';
import { dayByNumber, LAST_DAY } from '../data/campaignDays.js';
import { briefingHTML } from './briefing.js';
import { currentVisitor, currentDay, decisionFor, visitorById, isLastDay } from './gameState.js';
import { createDesk, deskToolbarHTML } from './desk.js';
import { renderRulebook, RULEBOOK_TABS } from './rulebook.js';
import { activeRegulations } from '../data/regulations.js';
import { SCORING } from '../data/scoring.js';
import { shiftReport, warningsUsed } from './decisionSystem.js';
import { portraitSVG } from './portrait.js';
import { formatLong, formatDoc } from './dates.js';
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
  let toolbarDate = null;
  let rulebookTab = 'rules', rulebookKey = null;
  const desk = createDesk({ tray: $('tray'), toolbar: $('deskTools'), result: $('compareResult'), examine: $('examine') });

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
      <div><dt>Day</dt><dd>${state.day} / ${LAST_DAY}</dd></div>
      <div><dt>Date</dt><dd>${esc(formatLong(state.date))}</dd></div>
      <div><dt>Entrants</dt><dd>${s.decisions.length} / ${s.queue.length} processed</dd></div>
      <div><dt>Warnings</dt><dd class="${warningsUsed(s.decisions) >= SCORING.warningsPerShift ? 'hud-alert' : ''}">${warningsUsed(s.decisions)} / ${SCORING.warningsPerShift}</dd></div>
      <div><dt>Savings</dt><dd class="hud-money">${money(state.money)}</dd></div>`;
  }

  // redrawn only when the day or tab changes, so compare picks in it survive other renders
  function renderBulletin(state, force = false) {
    const key = `${state.day}:${rulebookTab}`;
    if (key === rulebookKey && !force) return;
    rulebookKey = key;
    $('bulletin').innerHTML = renderRulebook({ tab: rulebookTab, regulations: activeRegulations(state.day), day: currentDay(state), date: state.date });
    desk.refreshComparables();
  }
  let lastState = null;
  $('bulletin').addEventListener('click', e => {
    const t = e.target.closest('[data-rulebook]');
    if (!t || !lastState) return;
    rulebookTab = t.dataset.rulebook;
    renderBulletin(lastState);
    $('bulletin').querySelector(`[data-rulebook="${rulebookTab}"]`).focus();
  });
  $('bulletin').addEventListener('keydown', e => {
    const t = e.target.closest('[data-rulebook]');
    if (!t || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const ids = RULEBOOK_TABS.map(x => x[0]);
    const n = (ids.indexOf(rulebookTab) + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
    rulebookTab = ids[n]; renderBulletin(lastState);
    $('bulletin').querySelector(`[data-rulebook="${rulebookTab}"]`).focus();
  });

  function renderBooth(state, arriving) {
    const v = currentVisitor(state);
    const phase = state.shift.phase;
    $('boothWindow').innerHTML = BACKDROP + (v
      ? `<div class="visitor${arriving ? ' arriving' : ''}${phase === 'departing' ? ' leaving' : ''}">${portraitSVG(v.look, { title: v.name })}</div>`
      : `<p class="booth-empty">${{ shiftEnd: 'The road is empty. The shift is over.', briefing: 'The barrier is still down.' }[phase] || 'The booth is empty.'}</p>`);
    const d = v && decisionFor(state, v.id);
    const line = !v ? '' : d ? v.lines[d.decision === 'accept' ? 'accepted' : 'rejected'] : v.lines.greet;
    $('speech').innerHTML = v ? `<p class="speaker">${esc(v.name)}</p><p>“${esc(line)}”</p>` : '';
    $('speech').hidden = !v;
    document.querySelector('[data-action="callNext"]').disabled = phase !== 'waiting';
  }

  function renderTray(state, arriving) {
    if (toolbarDate !== state.date) {
      $('deskTools').innerHTML = deskToolbarHTML({ value: state.date, display: formatDoc(state.date) });
      toolbarDate = state.date;
    }
    const v = currentVisitor(state);
    const d = v && decisionFor(state, v.id);
    desk.show(v, { stamp: d ? d.decision : null, arriving, date: state.date });
    const inspecting = state.shift.phase === 'inspecting';
    for (const b of document.querySelectorAll('[data-action="decide"]')) b.disabled = !inspecting;
    document.querySelector('[data-action="returnPapers"]').disabled = state.shift.phase !== 'departing';
  }

  function renderStatus(state) {
    const s = state.shift;
    const v = currentVisitor(state);
    const text = {
      briefing: 'Read the morning briefing, then open the checkpoint.',
      waiting: s.next === 0 ? 'Your shift has begun. Call the first entrant when you are ready.' : 'Call the next entrant.',
      inspecting: `Inspecting ${v?.name}. Read and compare the papers, then stamp a decision.`,
      departing: `Papers stamped. Return them to ${v?.name}.`,
      shiftEnd: 'The queue is empty. Shift complete.',
    }[s.phase];
    $('status').textContent = text;
  }

  const ruleNumber = id => activeRegulations(lastState.day).findIndex(r => r.id === id) + 1;
  const citationHTML = c => `
    <p class="notice-level">${c.level === 'warning' ? `Citation · Warning` : `Citation · Fine ${money(c.amount)}`}${c.serious ? ' · Serious breach' : ''}</p>
    <p>${esc(c.reason)}</p>
    ${c.rules.length ? `<ul class="notice-rules">${c.rules.map(r => `<li>Rule ${ruleNumber(r.id)}: ${esc(r.text)}</li>`).join('')}</ul>` : ''}`;

  // the Ministry's verdict on the stamp just made, shown until the papers are returned
  function renderNotice(state) {
    const v = currentVisitor(state);
    const d = v && state.shift.phase === 'departing' ? decisionFor(state, v.id) : null;
    const el = $('notice');
    el.hidden = !d;
    if (!d) { el.innerHTML = ''; return; }
    el.className = `notice ${d.correct ? 'notice-ok' : `notice-${d.citation.level}`}`;
    el.innerHTML = d.correct
      ? `<p class="notice-level">Correct · +${money(d.pay)}</p><p>${d.decision === 'accept' ? 'The papers were in order.' : esc(d.violations[0].message)}${d.notes.length ? ` ${esc(d.notes.join(' '))}` : ''}</p>`
      : citationHTML(d.citation);
  }

  const amountText = d => (d.fine ? `−${money(d.fine)}` : d.pay ? `+${money(d.pay)}` : d.citation?.level === 'warning' ? 'warning' : '—');
  function renderLog(state) {
    const items = state.shift.decisions.map(d =>
      `<li class="log-${esc(d.decision)} ${d.correct ? 'log-correct' : 'log-wrong'}"><span>${esc(visitorById(state, d.visitorId).name)}</span><span>${DECISION_TEXT[d.decision]} <b class="log-mark" aria-label="${d.correct ? 'correct' : 'mistake'}">${d.correct ? '✓' : '✗'}</b></span><span>${amountText(d)}</span></li>`);
    $('log').innerHTML = items.join('') || '<li class="log-empty">No entrants processed yet.</li>';
  }

  function renderSummary(state) {
    const r = shiftReport(state.shift.decisions);
    const mistakes = state.shift.decisions.filter(d => !d.correct);
    const last = isLastDay(state);
    const days = [...state.history.map(h => h.report), r];
    const total = { correct: days.reduce((a, x) => a + x.correct, 0), processed: days.reduce((a, x) => a + x.processed, 0), net: days.reduce((a, x) => a + x.net, 0) };
    const signed = n => `${n < 0 ? '−' : '+'}${money(Math.abs(n))}`;
    $('summaryBody').innerHTML = `
      <p class="kicker">${esc(SETTING.checkpoint.post)} · End of shift · ${esc(formatLong(state.date))}</p>
      <h2 id="summaryTitle">Day ${state.day} report</h2>
      <dl class="summary-stats">
        <div><dt>Entrants processed</dt><dd>${r.processed}</dd></div>
        <div><dt>Correct decisions</dt><dd>${r.correct} (${r.accuracy}%)</dd></div>
        <div><dt>Mistakes</dt><dd>${r.mistakes}</dd></div>
        <div><dt>Warnings issued</dt><dd>${r.warnings} / ${SCORING.warningsPerShift}</dd></div>
        <div><dt>Wages earned</dt><dd>+${money(r.wages)}</dd></div>
        <div><dt>Fines</dt><dd>${r.fines ? `−${money(r.fines)}` : money(0)}</dd></div>
        <div class="summary-total"><dt>Net for the shift</dt><dd>${signed(r.net)}</dd></div>
        <div><dt>Savings</dt><dd>${money(state.money)}</dd></div>
      </dl>
      ${mistakes.length ? `<h3 class="summary-sub">Citations</h3><ol class="summary-mistakes">${mistakes.map(d =>
        `<li><b>${esc(visitorById(state, d.visitorId).name)}</b>: ${d.decision === 'accept' ? 'admitted' : 'refused'}, should have been ${d.verdict === 'accept' ? 'admitted' : 'refused'}. ${esc(d.citation.reason)} <span class="summary-penalty">${d.fine ? `Fined ${money(d.fine)}` : 'Warning'}</span></li>`).join('')}</ol>`
        : '<p class="summary-note">A clean shift. The Ministry has no citations to record.</p>'}
      ${state.history.length ? `<h3 class="summary-sub">So far</h3><p class="summary-note">${state.day} days worked · ${total.correct} of ${total.processed} decisions correct · ${signed(total.net)} net pay.</p>` : ''}
      ${last ? `<p class="summary-note">That was the last day of this posting. Campaign endings come in a later phase, so a new campaign starts again from Day 1.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-action="restart">Start a new campaign</button></div>`
        : `<div class="btn-row"><button type="button" class="btn primary" data-action="nextDay">Go home · begin Day ${state.day + 1}</button></div>`}`;
  }

  // move focus to the control the player needs next, so keyboard play never gets lost
  function focusFor(phase) {
    if (phase === 'inspecting') { desk.firstDocument()?.focus({ preventScroll: true }); return; }
    const sel = { briefing: '#briefing [data-action="openCheckpoint"]', waiting: '[data-action="callNext"]', departing: '[data-action="returnPapers"]', shiftEnd: '#summary .btn.primary' }[phase];
    document.querySelector(sel)?.focus({ preventScroll: phase === 'inspecting' });
  }

  return {
    render(state) {
      lastState = state;
      showScreen('game');
      const v = currentVisitor(state);
      const arriving = Boolean(v) && v.id !== shownVisitor;
      shownVisitor = v ? v.id : null;
      renderHUD(state); renderBulletin(state); renderBooth(state, arriving); renderTray(state, arriving); renderStatus(state); renderNotice(state); renderLog(state);
      const ended = state.shift.phase === 'shiftEnd';
      if (ended) renderSummary(state);
      $('summary').hidden = !ended;
      const briefing = state.shift.phase === 'briefing';
      if (briefing && state.shift.phase !== lastPhase) $('briefingBody').innerHTML = briefingHTML(currentDay(state));
      $('briefing').hidden = !briefing;
      if (state.shift.phase !== lastPhase) focusFor(state.shift.phase);
      lastPhase = state.shift.phase;
    },
    showIntro() { showScreen('intro'); $('summary').hidden = true; $('briefing').hidden = true; lastPhase = null; shownVisitor = null; rulebookKey = null; },
  };
}
