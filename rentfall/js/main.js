// Entry point: owns the current run, profile and settings, turns clicks and keys into state
// actions, saves after every change and redraws. Game rules live in state.js and below; nothing
// here decides an outcome.

import * as S from './state.js';
import { loadRun, saveRun, clearRun, loadProfile, saveProfile, recordRun, resetProgress, memoryStorage, emptyProfile } from './save.js';
import { loadSettings, saveSettings } from './settings.js';
import { createAudio } from './audio.js';
import { randomSeedString } from './rng.js';
import { rentDue, DEADLINES } from './rent.js';
import { removeCost, serviceCost } from './shop.js';
import { SYMBOL_BY_ID } from './symbols.js';
import { RELIC_BY_ID, ITEM_BY_ID, SERVICE_BY_ID } from './relics.js';
import { h, $, money, signed, toast, hideTip } from './ui/dom.js';
import { createMachine } from './ui/machine.js';
import { topbar, calendar, relicsPanel, suppliesPanel, receipt } from './ui/hud.js';
import * as M from './ui/modals.js';
import { shopView } from './ui/shopView.js';
import { titleScreen, endScreen, confetti } from './ui/screens.js';

// ── Storage ───────────────────────────────────────────────────────────────────
function pickStorage() {
  try {
    const ls = globalThis.localStorage;
    ls.setItem('rentfall.test', '1'); ls.removeItem('rentfall.test');
    return ls;
  } catch {
    setTimeout(() => toast('Saving is unavailable in this browser; progress lasts until you close the tab.', 'bad'), 500);
    return memoryStorage();
  }
}
const storage = pickStorage();
let settings = loadSettings(storage);
let profile = loadProfile(storage);
let run = loadRun(storage);
let view = 'title';
let busy = false;
let phaseModal = null;
const audio = createAudio();
const machine = createMachine();

const ended = r => r && ['won', 'lost'].includes(r.phase);
if (ended(run)) { profile = recordRun(profile, run); saveProfile(storage, profile); }

// ── Settings ──────────────────────────────────────────────────────────────────
function applySettings() {
  document.body.classList.toggle('no-anim', !settings.animations);
  document.body.classList.toggle('no-rain', !settings.rain);
  audio.configure({ volume: settings.volume, sound: settings.sound });
}
function changeSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(storage, settings);
  applySettings();
  if (view === 'game' && run?.last && 'explanations' in patch) {
    const old = $('.receipt');
    old?.replaceWith(receipt(run, settings.explanations));
    machine.show(run.last, { explanations: settings.explanations });
  }
}

function makeRain() {
  const box = $('#rain');
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('i');
    d.style.left = `${Math.random() * 110}vw`;
    d.style.animationDuration = `${0.7 + Math.random() * 0.8}s`;
    d.style.animationDelay = `${-Math.random() * 2}s`;
    d.style.opacity = String(0.3 + Math.random() * 0.7);
    box.append(d);
  }
}

// ── Committing changes ────────────────────────────────────────────────────────
function commit(next) {
  run = next;
  if (ended(run)) {
    profile = recordRun(profile, run);
    saveProfile(storage, profile);
    clearRun(storage);
  } else saveRun(storage, run);
}

function act(res, { ok, sound = 'click' } = {}) {
  if (!res.ok) { audio.play('error'); toast(res.error, 'bad'); return false; }
  commit(res.run);
  if (sound) audio.play(sound);
  if (ok) toast(typeof ok === 'function' ? ok(res) : ok, 'good');
  render();
  return true;
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function render() {
  hideTip();
  phaseModal?.close();
  phaseModal = null;
  M.closeAll();
  const app = $('#app');
  if (view === 'title' || !run) { view = 'title'; app.replaceChildren(renderTitle()); return; }
  if (ended(run)) { app.replaceChildren(renderEnd()); return; }
  if (run.phase === 'shop') { app.replaceChildren(renderShopPage()); return; }
  app.replaceChildren(renderGame());
  if (run.phase === 'delivery') openDelivery();
  else if (run.phase === 'rent') openRent();
}

const handlers = () => ({
  onMenu: () => { view = 'title'; render(); },
  onCollection: () => M.collectionModal(run),
  onHelp: () => M.helpModal(),
  onHistory: () => openHistory(),
  onSettings: () => M.settingsModal(settings, changeSettings),
});

function renderTitle() {
  const hasSave = !!run && !ended(run);
  return titleScreen({
    hasSave,
    saveInfo: hasSave ? `Rent ${run.deadline + 1}/${DEADLINES.length} · ${money(run.money)} · seed ${run.seed}` : '',
    profile,
    on: {
      continue: () => { audio.unlock(); view = 'game'; render(); },
      newRun: () => M.newRunModal(randomSeedString(), startRun, hasSave),
      help: () => M.helpModal(),
      almanac: () => M.collectionModal(null),
      history: () => openHistory(),
      settings: () => M.settingsModal(settings, changeSettings),
    },
  });
}

function renderGame() {
  const total = h('div.spin-total#spin-total', run.last ? totalText(run.last.total) : '');
  const action = actionButton();
  const pips = h('div.pips', Array.from({ length: run.spinInDeadline + run.spinsLeft }, (_, k) => h('i', { class: k < run.spinInDeadline ? 'used' : k >= DEADLINES[run.deadline].spins ? 'extra' : '' })));
  machine.show(run.last, { explanations: settings.explanations });
  const stage = h('div.stage',
    machine.el,
    h('div', { style: { display: 'grid', justifyItems: 'center', gap: '6px' } }, action, pips),
    total,
    h('p.hint', run.last ? 'Hover a window to see how it earned. Teal = what affected it, amber = what it affected.' : `Rent ${money(rentDue(run))} is due in ${run.spinsLeft} spins. Press Space or pull the lever.`),
  );
  return h('div.game',
    topbar(run, handlers()),
    h('div.board',
      h('aside.side.left', calendar(run), relicsPanel(run), suppliesPanel(run, useItem)),
      stage,
      h('aside.side', receipt(run, settings.explanations)),
    ),
  );
}

function totalText(n, extra = '') {
  return [n >= 0 ? `+${money(n)}` : signed(n), extra ? h('small', extra) : null].filter(Boolean);
}

function actionButton() {
  if (run.phase === 'rent') return h('button.spin-btn.pay#action', { type: 'button', onclick: openRent }, 'Pay rent', h('small', `${money(rentDue(run))} due`));
  if (run.phase === 'delivery') return h('button.spin-btn#action', { type: 'button', onclick: openDelivery }, 'Mail!', h('small', 'choose a delivery'));
  return h('button.spin-btn#action', { type: 'button', onclick: doSpin, disabled: busy }, 'Spin', h('small', `${run.spinsLeft} until rent${S.isFinalSpin(run) && run.relics.includes('night_shift') ? ' · night shift ×2' : ''}`));
}

function renderShopPage() {
  return h('div.game', topbar(run, handlers()), shopView(run, {
    reroll: () => act(S.rerollShop(run), { sound: 'open' }),
    leave: () => act(S.leaveShop(run), { sound: 'click' }),
    buySymbol: k => act(S.buySymbol(run, k), { sound: 'buy', ok: r => `Bought ${SYMBOL_BY_ID[r.id].name} for ${money(r.price)}` }),
    buyRelic: k => act(S.buyRelic(run, k), { sound: 'buy', ok: r => `${RELIC_BY_ID[r.id].name} is yours` }),
    buyItem: k => act(S.buyItem(run, k), { sound: 'buy', ok: r => `Bought ${ITEM_BY_ID[r.id].name}` }),
    remove: () => M.pickSymbolModal(run, {
      title: 'Remove a symbol', lead: 'Gone for good. Fewer symbols means your best ones show up more often.', price: removeCost(run),
      onPick: inst => act(S.removeSymbol(run, inst.uid), { sound: 'buy', ok: `Removed ${SYMBOL_BY_ID[inst.id].name}` }),
    }),
    service: () => {
      const svc = SERVICE_BY_ID[run.shop.service];
      M.pickSymbolModal(run, {
        title: svc.name, lead: svc.desc, price: inst => serviceCost(run, svc.id, inst.uid),
        filter: inst => !(svc.id === 'laminate' && inst.laminated),
        onPick: inst => act(S.buyService(run, svc.id, inst.uid), { sound: 'buy', ok: `${svc.name}: ${SYMBOL_BY_ID[inst.id].name}` }),
      });
    },
  }));
}

function renderEnd() {
  if (run.phase === 'won') setTimeout(() => { if (settings.animations) confetti(); }, 200);
  return endScreen(run, {
    newRun: () => M.newRunModal(randomSeedString(), startRun, false),
    retry: () => startRun(run.seed),
    collection: () => M.collectionModal(run),
    menu: () => { view = 'title'; render(); },
  });
}

// ── Phase dialogs ─────────────────────────────────────────────────────────────
function openDelivery() {
  if (run.phase !== 'delivery' || busy) return;
  phaseModal?.close();
  phaseModal = M.deliveryModal(run, {
    onPick: k => act(S.chooseDelivery(run, k), { sound: 'pick', ok: r => `${SYMBOL_BY_ID[r.run.collection[r.run.collection.length - 1].id].name} added` }),
    onSkip: async () => {
      if (settings.confirmSkip && !(await M.confirmDialog({ title: 'Skip this delivery?', text: 'You will not get any of these symbols.', yes: 'Skip' }))) return;
      act(S.chooseDelivery(run, null), { sound: 'click', ok: r => (r.bonus ? `Skipped (+${money(r.bonus)})` : null) });
    },
    onReroll: () => act(S.rerollDelivery(run), { sound: 'open' }),
  });
}

function openRent() {
  if (run.phase !== 'rent' || busy) return;
  phaseModal?.close();
  phaseModal = M.rentModal(run, { onPay: payRent });
}

function payRent() {
  const res = S.payRent(run);
  if (!res.ok) { toast(res.error, 'bad'); return; }
  commit(res.run);
  if (res.won) { audio.play('victory'); }
  else if (!res.paid) { audio.play('evicted'); }
  else { audio.play('rent'); toast(`Rent paid: ${money(res.due)}${res.interest ? ` · interest +${money(res.interest)}` : ''}`, 'good'); }
  render();
}

// ── Actions ───────────────────────────────────────────────────────────────────
function startRun(seed) {
  audio.unlock();
  if (run && !ended(run)) {
    // Abandoning an unfinished run counts as an eviction.
    const abandoned = { ...run, phase: 'lost', result: { won: false, deadline: run.deadline, rent: rentDue(run), short: Math.max(0, rentDue(run) - run.money), abandoned: true } };
    profile = recordRun(profile, abandoned);
    saveProfile(storage, profile);
  }
  run = S.newRun(seed);
  commit(run);
  view = 'game';
  audio.play('open');
  render();
}

async function doSpin() {
  if (busy || run?.phase !== 'spin') return;
  audio.unlock();
  const before = run.money;
  const res = S.spin(run);
  if (!res.ok) { audio.play('error'); toast(res.error, 'bad'); return; }
  busy = true;
  commit(res.run); // saved before the animation: reloading mid-spin cannot reroll it
  const btn = $('#action');
  if (btn) btn.disabled = true;
  const totalEl = $('#spin-total');
  try {
    if (settings.animations) {
      if (totalEl) totalEl.replaceChildren();
      await machine.animate(res.result, {
        speed: settings.speed, audio, explanations: settings.explanations,
        pool: run.collection.map(s => s.id),
        onTotal: (v, extra) => { if (totalEl) { totalEl.replaceChildren(...totalText(v, extra)); totalEl.classList.toggle('neg', v < 0); } },
      });
      tweenMoney(before, run.money);
    } else {
      machine.show(res.result, { explanations: settings.explanations });
      audio.play(res.result.total > 0 ? 'total' : 'loss');
    }
  } finally {
    busy = false;
  }
  const notes = [];
  if (res.result.added.length) notes.push(`New: ${res.result.added.map(id => SYMBOL_BY_ID[id].name).join(', ')}`);
  if (res.result.extraSpins) notes.push(`+${res.result.extraSpins} spin before rent`);
  if (res.result.rentUp) notes.push(`Rent +${money(res.result.rentUp)}`);
  for (const n of notes) toast(n);
  render();
}

function tweenMoney(from, to) {
  const el = $('#money-val');
  if (!el || from === to) return;
  const t0 = performance.now(), dur = 450;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = money(from + (to - from) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $('#money')?.classList.add('bump');
}

function useItem(k) {
  const id = run.items[k];
  act(S.useItem(run, k), { sound: 'buy', ok: r => `${ITEM_BY_ID[id].name}: ${r.text}` });
}

function openHistory() {
  M.historyModal(profile, async () => {
    const yes = await M.confirmDialog({ title: 'Reset all progress?', text: 'This deletes your unfinished run, your wins and losses, best run and run history. Settings are kept. This cannot be undone.', yes: 'Delete everything', danger: true });
    if (!yes) return;
    resetProgress(storage);
    profile = emptyProfile();
    run = null;
    view = 'title';
    toast('Progress reset.');
    render();
  });
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const top = M.topModal();
  if (e.key === 'Escape') { if (top?.dismissible) top.close(); return; }
  if (view !== 'game' || !run || ended(run) || busy) return;
  const k = e.key.toLowerCase();
  if (run.phase === 'delivery' && top === phaseModal && phaseModal) {
    if (/^[1-5]$/.test(k) && Number(k) <= run.delivery.options.length) { e.preventDefault(); act(S.chooseDelivery(run, Number(k) - 1), { sound: 'pick' }); }
    else if (k === 's') { e.preventDefault(); phaseModal.modal.querySelector('.actions .btn:last-child')?.click(); }
    else if (k === 'r') { e.preventDefault(); act(S.rerollDelivery(run), { sound: 'open' }); }
    return;
  }
  if (top) return;
  if (k === ' ' || k === 'enter') {
    if (e.target.closest('button') && k === 'enter') return;
    e.preventDefault();
    if (run.phase === 'spin') doSpin();
    else if (run.phase === 'rent') openRent();
    else if (run.phase === 'shop') act(S.leaveShop(run));
  } else if (k === 'r' && run.phase === 'shop') act(S.rerollShop(run), { sound: 'open' });
  else if (k === 'c') M.collectionModal(run);
  else if (k === 'h' || k === '?') M.helpModal();
});

applySettings();
makeRain();
render();
