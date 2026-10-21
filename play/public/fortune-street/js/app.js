// Entry point and controller. Holds the one authoritative game state, sends every player
// decision (clicks and AI choices alike) through engine.dispatch, saves after each accepted
// action, plays the animation cues the engine reports, and drives AI turns.
import { createGame, dispatch, publicView, MODES } from './engine.js';
import { decide, explainTrade } from './ai.js';
import * as R from './rules.js';
import { ASSETS } from './board.js';
import { saveGame, loadGame, clearSave, quarantineSave, loadSettings, saveSettings } from './save.js';
import { createBoardView } from './ui/boardView.js';
import * as panels from './ui/panels.js';
import * as dialogs from './ui/dialogs.js';
import { createSetup } from './ui/setup.js';
import { play, configureAudio } from './ui/audio.js';
import { esc } from './ui/fmt.js';
import { chip } from './ui/panels.js';
import { createCoach } from './ui/coach.js';
import { STEPS, TUTORIAL_GAME, TUTORIAL_KEY, settleStep, actionAllowed } from './tutorial.js';

const $ = sel => document.querySelector(sel);

const app = {
  state: null,
  settings: loadSettings(),
  viewer: null, // the human currently holding the device
  animating: false,
  paused: false,
  aiTimer: null,
  tab: 'portfolio',
  ledgerFilter: 'all',
  resultsShownFor: null,
  pendingNote: null, // message to show with the next trade review
  tutorial: loadTutorial(), // { seen, active, step }
  save: {},
};

// ---- settings ---------------------------------------------------------------------------------

const prefersReduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function reducedMotion() {
  const s = app.settings.reducedMotion;
  return s === 'on' || (s === 'auto' && prefersReduced());
}
function timings() {
  const anim = reducedMotion() ? 'off' : app.settings.animation;
  // the roll total is information, not motion: reduced motion still shows it (without the
  // pop-in); only switching animation off in Settings skips it
  const total = { normal: 900, fast: 450, off: 0 }[app.settings.animation] ?? 900;
  return {
    step: { normal: 210, fast: 100, off: 0 }[anim],
    dice: { normal: 900, fast: 450, off: 0 }[anim],
    total, // how long the roll result shows before moving
    ai: { relaxed: 1400, normal: 850, fast: 300 }[app.settings.aiSpeed] ?? 850,
  };
}
function applySettings() {
  const html = document.documentElement;
  html.dataset.theme = app.settings.theme;
  html.dataset.text = app.settings.textSize;
  html.classList.toggle('reduce-motion', reducedMotion());
  configureAudio(app.settings);
}
function changeSettings(patch) {
  Object.assign(app.settings, patch);
  saveSettings(app.settings);
  applySettings();
}

// ---- tutorial progress (kept apart from the game save) ----------------------------------------

function loadTutorial() {
  try {
    const t = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || 'null');
    if (t && typeof t === 'object') return { seen: !!t.seen, active: !!t.active, step: Number.isInteger(t.step) ? t.step : 0 };
  } catch { /* storage blocked or junk */ }
  return { seen: false, active: false, step: 0 };
}
function saveTutorial() {
  try { localStorage.setItem(TUTORIAL_KEY, JSON.stringify(app.tutorial)); } catch { /* storage blocked */ }
}
const coaching = () => app.state?.mode === 'tutorial' && app.tutorial.active;

function startTutorial() {
  const begin = () => {
    app.tutorial = { seen: true, active: true, step: 0 };
    saveTutorial();
    app.tab = 'log';
    startGame(TUTORIAL_GAME);
  };
  const save = loadGame().state;
  if (save && !save.finished && save.mode !== 'tutorial') {
    dialogs.confirmDialog({ title: 'Start the tutorial?', text: 'The tutorial replaces your saved match.', yes: 'Start the tutorial', onYes: begin });
  } else begin();
}

function endTutorial(toTitle) {
  app.tutorial = { ...app.tutorial, seen: true, active: false };
  saveTutorial();
  coach.hide();
  if (toTitle) { clearSave(); app.state = null; showTitle(); } else { render(); schedule(); }
}

const coach = createCoach($('#coach'), {
  onNext: () => { app.tutorial.step++; saveTutorial(); render(); schedule(); },
  onSkip: () => dialogs.confirmDialog({
    title: 'Skip the tutorial?', text: 'You can keep playing this match on your own, or start it again any time from the title screen or the menu.',
    yes: 'Skip tutorial', onYes: () => endTutorial(false),
  }),
  onKeepPlaying: () => endTutorial(false),
  onRealGame: () => endTutorial(true),
});

function updateCoach() {
  if (!coaching()) { coach.hide(); return; }
  const before = app.tutorial.step;
  const i = settleStep(app.state, before);
  if (i !== before) { app.tutorial.step = i; saveTutorial(); }
  const step = STEPS[i];
  if (step.tab && app.tab !== step.tab) { app.tab = step.tab; renderTab(); }
  coach.show(step, i, STEPS.length, { waiting: app.animating || R.currentActor(app.state) !== 'p1' });
}

function firstVisitPrompt() {
  const mark = () => { app.tutorial.seen = true; saveTutorial(); };
  const el = dialogs.openModal({
    title: 'Welcome to Fortune Street',
    className: 'welcome-modal',
    onClose: mark,
    body: `<p class="lead">New to the game? A short guided match teaches everything you need: buying, rent, districts, building, auctions, cards, trading and how to win.</p>
      <p class="small muted">About five minutes. You can also find it later on the title screen and in the menu.</p>
      <div class="btn-row"><button type="button" class="btn primary big" data-welcome="yes">Play the tutorial</button><button type="button" class="btn" data-welcome="no">No thanks, I know how to play</button></div>`,
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-welcome]');
    if (!b) return;
    mark();
    dialogs.closeModal(true);
    if (b.dataset.welcome === 'yes') startTutorial();
  });
}

// ---- screens ------------------------------------------------------------------------------------

const board = createBoardView($('#board'), { onSpace: i => app.state && dialogs.showSpace(app.state, i, ctx()) });

const setup = createSetup($('#title'), {
  onStart: cfg => startGame(cfg),
  onContinue: () => resume(),
  onRules: () => dialogs.rulesDialog(),
  onSettings: () => dialogs.settingsDialog(app.settings, changeSettings),
  onTutorial: () => startTutorial(),
  getSave: () => app.save,
});

function showTitle() {
  clearTimeout(app.aiTimer);
  app.save = loadGame();
  $('#game').hidden = true;
  $('#title').hidden = false;
  hideHandoff();
  coach.hide();
  dialogs.closeModal(true);
  setup.render();
  document.title = 'Fortune Street · Meridian Bay';
}

function showGame() {
  $('#title').hidden = true;
  $('#game').hidden = false;
  app.paused = false;
  app.resultsShownFor = null;
  // one human: they always hold the device. Pass-and-play: whoever acts next confirms first.
  const humans = app.state.players.filter(p => p.kind === 'human');
  app.viewer = humans.length === 1 ? humans[0].id : null;
  board.build(app.state);
  render();
  schedule();
}

function startGame(cfg) {
  try {
    app.state = createGame(cfg);
  } catch (e) {
    toast(e.message, 'bad');
    return;
  }
  saveGame(app.state);
  play('turn');
  showGame();
}

function resume() {
  const s = loadGame();
  if (!s.state) { app.save = s; setup.render(); return; }
  app.state = s.state;
  showGame();
  toast('Match restored. It saves after every action.');
}

// a fresh match with the same table
function configFromState(st) {
  return {
    mode: st.mode,
    players: st.players.map(p => ({ name: p.name, kind: p.kind, personality: p.personality, token: p.token })),
    options: { ...st.options },
  };
}

// ---- rendering --------------------------------------------------------------------------------------

const humanCount = () => app.state.players.filter(p => p.kind === 'human' && !p.bankrupt).length;

function ctx() {
  return { viewer: app.viewer, animating: app.animating, settings: app.settings };
}

function render() {
  const st = app.state;
  if (!st) return;
  const c = ctx();
  $('#hud').innerHTML = panels.renderHud(st);
  $('#leaderboard').innerHTML = panels.renderLeaderboard(st, c);
  $('#effects').innerHTML = panels.renderEffects(st);
  $('#turnPanel').innerHTML = panels.renderTurnPanel(st, c);
  renderTab();
  board.update(st);
  board.setMessage(centerMessage(st));
  const p = R.player(st, st.turn.player);
  document.title = st.finished ? 'Fortune Street · Match over' : `${p.name}'s turn · Fortune Street`;
  if (st.finished && app.resultsShownFor !== st.seq && !app.animating) {
    app.resultsShownFor = st.seq;
    setTimeout(() => dialogs.resultsDialog(st), 400);
  }
  updateCoach();
}

function renderTab() {
  const st = app.state;
  document.querySelectorAll('[data-tab]').forEach(b => {
    if (b.closest('.tabbar')) b.setAttribute('aria-selected', String(b.dataset.tab === app.tab));
  });
  const body = $('#tabBody');
  if (app.tab === 'portfolio') body.innerHTML = panels.renderPortfolio(st, ctx());
  else if (app.tab === 'ledger') body.innerHTML = panels.renderLedger(st, ctx(), app.ledgerFilter);
  else body.innerHTML = panels.renderLog(st);
}

function centerMessage(st) {
  if (st.finished) return `<b>${esc(R.player(st, st.results[0].pid).name)}</b> wins the match.`;
  const actor = R.player(st, R.currentActor(st));
  const phase = st.turn.phase;
  if (st.trade) return `${esc(actor.name)} is considering a trade.`;
  if (phase === 'debt') return `${esc(actor.name)} must settle a debt.`;
  if (phase === 'auction') return `Sealed-bid auction: <b>${esc(ASSETS[st.pending.asset].name)}</b>`;
  if (phase === 'buy') return `${esc(actor.name)} may buy <b>${esc(ASSETS[st.pending.asset].name)}</b>.`;
  if (phase === 'preRoll') return `${esc(actor.name)} to roll${st.turn.extraRoll ? ' again' : ''}.`;
  return `${esc(actor.name)} is managing their city.`;
}

// ---- actions ---------------------------------------------------------------------------------------

async function act(action, { quiet = false } = {}) {
  if (!app.state || app.animating) return false;
  const prev = app.state;
  if (coaching() && R.player(prev, action.player)?.kind === 'human' && !actionAllowed(STEPS[app.tutorial.step], action)) {
    const step = STEPS[app.tutorial.step];
    if (!quiet) toast(step.next ? 'Read the tutorial card, then press Next.' : `Tutorial: ${step.title}. Follow the highlighted step, or skip the tutorial.`);
    return false;
  }
  const r = dispatch(prev, action);
  if (!r.ok) {
    if (!quiet) { toast(r.error, 'bad'); play('error'); }
    return false;
  }
  app.state = r.state;
  saveGame(app.state); // saved before animating: a reload mid-animation resumes after this action
  await present(prev, app.state);
  render();
  schedule();
  return true;
}

async function present(prev, st) {
  const fx = st.fx;
  const t = timings();
  if (fx.dice || fx.moves.length) {
    app.animating = true;
    $('#turnPanel .actions') && ($('#turnPanel .actions').innerHTML = '<p class="lead thinking">Moving…</p>');
    if (prev.turn.player !== st.turn.player || fx.dice) board.showCard(null);
    if (fx.dice) {
      play('dice');
      await board.rollDice(fx.dice, t.dice);
      if (t.total > 0) await board.showRollTotal(fx.dice, t.total);
    }
    await board.animateMoves(fx.moves, { stepMs: t.step, onStep: () => play('step') });
    await board.hideRollTotal(t.total > 0 ? 250 : 0);
    app.animating = false;
  }
  board.syncPositions(st);
  if (fx.cards.length) { board.showCard(fx.cards[fx.cards.length - 1]); play('card'); }
  else if (prev.turn.player !== st.turn.player) board.showCard(null);
  for (const s of new Set(fx.sounds)) if (s !== 'dice') play(s);
  if (prev.turn.player !== st.turn.player && !st.finished) play('turn');
  if (st.round !== prev.round) toast(`Round ${st.round} begins.`);
}

// ---- AI and turn hand-off ------------------------------------------------------------------------------

function schedule() {
  clearTimeout(app.aiTimer);
  const st = app.state;
  if (!st || st.finished || app.paused || app.animating || $('#game').hidden) return;
  const actor = R.currentActor(st);
  const p = R.player(st, actor);
  if (p.kind === 'ai') {
    hideHandoff();
    app.aiTimer = setTimeout(aiStep, timings().ai);
    return;
  }
  if (actor !== app.viewer) {
    if (humanCount() > 1 || !app.viewer) { showHandoff(actor); return; }
    app.viewer = actor;
  }
  hideHandoff();
  if (st.trade && st.trade.offer.to === app.viewer && dialogs.modalKind() !== 'trade-review') {
    const note = app.pendingNote;
    app.pendingNote = null;
    dialogs.reviewTrade(st, ctx(), { note });
  }
}

async function aiStep() {
  const st = app.state;
  if (!st || st.finished || app.paused || app.animating) return;
  const pid = R.currentActor(st);
  const p = R.player(st, pid);
  if (p.kind !== 'ai') return;
  const view = publicView(st, pid);
  let action = decide(view, pid);
  // the tutorial keeps Wren from interrupting with trade offers
  if (st.mode === 'tutorial' && action?.type === 'PROPOSE_TRADE') action = { type: 'END_TURN', player: pid };
  // a hard stop against any loop: after many actions in one turn the AI only moves play along
  if (st.turn.actions > 60 && action && ['BUILD', 'MORTGAGE', 'UNMORTGAGE', 'PROPOSE_TRADE', 'SELL_BUILDING'].includes(action.type)) {
    action = { type: st.turn.phase === 'preRoll' ? 'ROLL' : 'END_TURN', player: pid };
  }
  const trade = st.trade;
  const toHuman = trade && trade.offer.to === pid && R.player(st, trade.offer.from).kind === 'human';
  const note = toHuman ? explainTrade(view, pid, trade.offer) : null;
  // the note must be in place before act(), which opens the human's review dialog
  if (action?.type === 'PROPOSE_TRADE') app.pendingNote = `${p.name} proposes a deal.`;
  if (toHuman && action?.type === 'COUNTER_TRADE') app.pendingNote = `${p.name} counters your offer: “Close, but I need a little more.”`;
  let ok = action ? await act(action, { quiet: true }) : false;
  if (!ok) ok = await fallback(pid);
  if (!ok) { toast(`${p.name} has no legal move; please report this.`, 'bad'); return; }
  if (toHuman && (action.type === 'ACCEPT_TRADE' || action.type === 'REJECT_TRADE')) {
    toast(`${p.name} ${action.type === 'ACCEPT_TRADE' ? 'accepts' : 'rejects'} your offer: “${note}”`, action.type === 'ACCEPT_TRADE' ? 'good' : '');
  }
}

// if an AI choice is ever rejected, fall back to the safest legal move
async function fallback(pid) {
  const tries = [
    { type: 'REJECT_TRADE' }, { type: 'PAY_DEBT' }, { type: 'LIQUIDATE' }, { type: 'DECLARE_BANKRUPTCY' },
    { type: 'BID', amount: 0 }, { type: 'DECLINE' }, { type: 'ROLL' }, { type: 'END_TURN' },
  ];
  for (const t of tries) {
    if (dispatch(app.state, { ...t, player: pid }).ok) return act({ ...t, player: pid }, { quiet: true });
  }
  return false;
}

function handoffReason(st, pid) {
  if (st.trade) return `${esc(R.playerName(st, st.trade.offer.from))} has a private trade offer for you.`;
  if (st.debts.length) return 'You have a debt to settle.';
  if (st.pending?.kind === 'auction') return `Place your sealed bid for ${esc(ASSETS[st.pending.asset].name)}. Other bids stay hidden.`;
  if (st.pending?.kind === 'buy') return `Decide whether to buy ${esc(ASSETS[st.pending.asset].name)}.`;
  return "It's your turn.";
}

function showHandoff(pid) {
  const st = app.state;
  const p = R.player(st, pid);
  const el = $('#handoff');
  el.innerHTML = `<div class="handoff-card" style="--pc:${p.color}">${chip(p)}
    <p class="kicker">Pass the device to</p><h2>${esc(p.name)}</h2><p>${handoffReason(st, pid)}</p>
    <button type="button" class="btn primary big" data-ui="handoff">I'm ${esc(p.name)}: continue</button></div>`;
  el.hidden = false;
  el.querySelector('button').focus();
}
function hideHandoff() { $('#handoff').hidden = true; }

// ---- input --------------------------------------------------------------------------------------------

async function onClick(e) {
  const actEl = e.target.closest('[data-act]');
  if (actEl && !actEl.disabled) {
    const type = actEl.dataset.act;
    const action = { type, player: app.viewer };
    if (actEl.dataset.asset) action.asset = actEl.dataset.asset;
    if (actEl.dataset.amount != null) action.amount = Number(actEl.dataset.amount);
    if (type.endsWith('_TRADE') && type !== 'PROPOSE_TRADE') dialogs.closeModal(true);
    if (type === 'END_TURN' && app.settings.confirmEndTurn && R.ownedAssets(app.state, app.viewer).some(id => R.canBuild(app.state, app.viewer, id).ok)) {
      dialogs.confirmDialog({ title: 'End turn?', text: 'You could still build on a complete district this turn.', yes: 'End turn', onYes: () => act(action) });
      return;
    }
    const ok = await act(action);
    // keep an open property card in sync after building or mortgaging from it
    if (ok && action.asset && dialogs.modalOpen() && $('.card-modal')) dialogs.showSpace(app.state, R.boardOf(app.state).indexOf[action.asset], ctx());
    return;
  }
  const ui = e.target.closest('[data-ui]');
  if (!ui || ui.disabled) return;
  const st = app.state;
  switch (ui.dataset.ui) {
    case 'close': dialogs.closeModal(); break;
    case 'tab': app.tab = ui.dataset.tab; if (st) renderTab(); $('#tabBody')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); break;
    case 'ledger': app.ledgerFilter = ui.dataset.filter; renderTab(); break;
    case 'property': dialogs.showSpace(st, R.boardOf(st).indexOf[ui.dataset.asset], ctx()); break;
    case 'player': dialogs.showPlayer(st, ui.dataset.pid); break;
    case 'trade': dialogs.tradeBuilder(st, ctx(), { onSubmit: offer => submitTrade(offer) }); break;
    case 'review-trade': schedule(); if (st.trade) dialogs.reviewTrade(st, ctx(), {}); break;
    case 'counter': {
      const o = st.trade.offer;
      const prefill = { from: app.viewer, to: o.from, give: o.get, get: o.give };
      dialogs.tradeBuilder(st, ctx(), { prefill, counter: true, onSubmit: offer => counterTrade(offer) });
      break;
    }
    case 'bankrupt':
      dialogs.confirmDialog({ title: 'Declare bankruptcy?', text: 'You leave the match. Your remaining cash and assets go to whoever you owe.', yes: 'Declare bankruptcy', danger: true, onYes: () => act({ type: 'DECLARE_BANKRUPTCY', player: app.viewer }) });
      break;
    case 'handoff': app.viewer = R.currentActor(st); hideHandoff(); render(); schedule(); break;
    case 'grant': dialogs.grantDialog(st, (target, amount) => act({ type: 'SANDBOX_GRANT', player: app.viewer, target, amount }).then(ok => ok && dialogs.closeModal(true))); break;
    case 'results': dialogs.resultsDialog(st); break;
    case 'menu': openPause(); break;
    case 'rules': dialogs.rulesDialog(); break;
    case 'tutorial': dialogs.closeModal(true); startTutorial(); break;
    case 'settings': dialogs.settingsDialog(app.settings, changeSettings, () => { if (app.paused) openPause(); }); break;
    case 'restart':
      dialogs.confirmDialog({ title: 'Restart this match?', text: 'The current match will be lost and the same players start over with fresh dice.', yes: 'Restart', danger: true, onYes: () => startGame(configFromState(st)) });
      break;
    case 'rematch': dialogs.closeModal(true); startGame(configFromState(st)); break;
    case 'newgame':
      dialogs.confirmDialog({ title: 'Start a new game?', text: 'The current match will be deleted.', yes: 'Delete and set up a new game', danger: true, onYes: () => { clearSave(); app.state = null; showTitle(); } });
      break;
    case 'newgame-now': clearSave(); app.state = null; showTitle(); break;
    case 'title': dialogs.closeModal(true); showTitle(); break;
  }
}

async function submitTrade(offer) {
  const ok = await act({ type: 'PROPOSE_TRADE', player: app.viewer, offer });
  if (ok) dialogs.closeModal(true);
}
async function counterTrade(offer) {
  const ok = await act({ type: 'COUNTER_TRADE', player: app.viewer, offer });
  if (ok) dialogs.closeModal(true);
}

function onSubmit(e) {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const f = new FormData(form);
  if (form.dataset.form === 'bid') act({ type: 'BID', player: app.viewer, amount: Math.floor(Number(f.get('amount')) || 0) });
  if (form.dataset.form === 'jump') act({ type: 'SANDBOX_MOVE', player: app.viewer, space: Number(f.get('space')) });
}

function openPause() {
  app.paused = true;
  clearTimeout(app.aiTimer);
  dialogs.pauseMenu({ hasMatch: !!app.state, onResume: () => { app.paused = false; schedule(); } });
}

function onKey(e) {
  if ($('#game').hidden || !app.state) return;
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'Escape' && !dialogs.modalOpen()) { openPause(); return; }
  if (dialogs.modalOpen() || app.animating) return;
  const viewerActs = R.currentActor(app.state) === app.viewer;
  if (!viewerActs) return;
  if (e.key === 'r' || e.key === 'R') act({ type: 'ROLL', player: app.viewer }, { quiet: true });
  if (e.key === 'e' || e.key === 'E') $('[data-act="END_TURN"]')?.click();
}

function toast(text, tone = '') {
  // the same message twice in a row (repeated clicks) shows once
  if ([...$('#toasts').children].some(t => t.textContent === text && !t.classList.contains('out'))) return;
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4300);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}

// The game moved from missing.website/fortune-street to the play arcade; the old address
// redirects here with its saved data in the URL fragment. Only known keys are taken, never
// over data already saved here, and the save is still validated by loadGame() as usual.
function importMovedData() {
  const m = location.hash.match(/^#import=(.*)$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const data = JSON.parse(decodeURIComponent(m[1]));
    for (const key of ['fortune-street:save', 'fortune-street:settings', 'fortune-street:tutorial']) {
      if (typeof data[key] === 'string' && localStorage.getItem(key) == null) localStorage.setItem(key, data[key]);
    }
    app.settings = loadSettings();
    app.tutorial = loadTutorial();
    applySettings();
  } catch { /* a damaged hand-over just means starting fresh */ }
}

// ---- boot -------------------------------------------------------------------------------------------------

dialogs.initModalRoot();
document.addEventListener('click', onClick);
document.addEventListener('submit', onSubmit);
document.addEventListener('keydown', onKey);
globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', applySettings);
applySettings();

importMovedData();
const boot = loadGame();
if (boot.error) quarantineSave(); // set the unreadable save aside, then say so on the title screen
showTitle();
if (!app.tutorial.seen && !boot.state) firstVisitPrompt();
if (boot.error) { app.save = boot; setup.render(); }
if (new URLSearchParams(location.search).has('continue') && app.save.state) resume();

// handle for debugging and automated checks from the console
globalThis.fortuneStreet = { app, dispatch, act, MODES };
