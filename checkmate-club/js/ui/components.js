// Reusable interface components shared by every screen and, later, every game: buttons, game
// cards, dialogs, confirmation prompts, score displays, player panels, timers and settings panels.

import { h, FOCUSABLE } from './dom.js';
import { SCHEMA } from '../core/settings.js';
import { formatTime } from '../core/timer.js';
import { isPlayable, statusLabel } from '../core/registry.js';

// ---- Buttons ---------------------------------------------------------------------------------

export function button({ label, icon, variant = 'secondary', size, onClick, title, disabled, type = 'button', attrs = {} }) {
  return h('button', {
    type, class: `btn btn-${variant}${size ? ` btn-${size}` : ''}`, title, disabled,
    onclick: onClick, ...attrs,
  }, icon ? h('span', { class: 'btn-icon', 'aria-hidden': 'true' }, icon) : null, label ? h('span', { class: 'btn-label' }, label) : null);
}

export function badge(text, variant = 'neutral') {
  return h('span', { class: `badge badge-${variant}` }, text);
}

// ---- Game cards ------------------------------------------------------------------------------

export function gameCard(game, { onOpen, onRules, record, art } = {}) {
  const playable = isPlayable(game);
  const open = h('button', {
    type: 'button', class: 'game-card-open', onclick: () => onOpen?.(game),
    'aria-label': `${game.name}. ${statusLabel(game)}. Open table.`,
  },
  h('span', { class: `game-card-art${art ? ' has-art' : ''}`, 'aria-hidden': 'true' }, art ? h('img', { class: 'game-card-img', src: art, alt: '' }) : h('span', { class: 'game-card-glyph' }, game.glyph)),
  h('span', { class: 'game-card-body' },
    h('span', { class: 'game-card-title' }, game.name),
    h('span', { class: 'game-card-tagline' }, game.tagline),
    h('span', { class: 'game-card-meta' }, game.players)));
  return h('article', { class: `game-card${playable ? '' : ' is-pending'}`, style: { '--accent': game.accent }, dataset: { game: game.id } },
    open,
    h('footer', { class: 'game-card-foot' },
      badge(statusLabel(game), playable ? 'ready' : 'pending'),
      record && record.played ? h('span', { class: 'game-card-record' }, `${record.wins}W · ${record.played} played`) : null,
      onRules ? button({ label: 'Rules', variant: 'ghost', size: 'sm', onClick: () => onRules(game), attrs: { 'aria-label': `${game.name} rules` } }) : null));
}

// ---- Dialogs ---------------------------------------------------------------------------------

const stack = [];

export function openDialog({ title, body, actions = [], onClose, dismissible = true, className = '', audio }) {
  const previous = document.activeElement;
  const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  const panel = h('div', { class: `dialog ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('header', { class: 'dialog-head' },
      h('h2', { id: titleId, class: 'dialog-title' }, title),
      dismissible ? h('button', { type: 'button', class: 'dialog-x', 'aria-label': 'Close', onclick: () => close() }, '×') : null),
    h('div', { class: 'dialog-body' }, body),
    actions.length ? h('footer', { class: 'dialog-actions' }, actions) : null);
  const backdrop = h('div', { class: 'dialog-backdrop' }, panel);
  backdrop.addEventListener('mousedown', e => { if (dismissible && e.target === backdrop) close(); });

  let closed = false;
  function close(reason) {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(api), 1);
    backdrop.classList.add('is-leaving');
    const remove = () => backdrop.remove();
    const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur')) || 0;
    if (dur > 0) setTimeout(remove, dur); else remove();
    audio?.play('close');
    if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    onClose?.(reason);
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (dismissible) { e.preventDefault(); close('escape'); } return true; }
    if (e.key === 'Tab') {
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return true; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      return true;
    }
    return false;
  }

  const api = { el: panel, close, onKey, get closed() { return closed; } };
  stack.push(api);
  document.body.append(backdrop);
  audio?.play('open');
  const autofocus = panel.querySelector('[data-autofocus]') || panel.querySelector('.dialog-actions .btn-primary') || panel.querySelector(FOCUSABLE);
  autofocus?.focus({ preventScroll: true });
  return api;
}

export const topDialog = () => stack[stack.length - 1] || null;
export const closeAllDialogs = () => { while (stack.length) stack[stack.length - 1].close('navigate'); };

// ---- Confirmation prompts ----------------------------------------------------------------------

export function confirmPrompt({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, audio }) {
  return new Promise(resolve => {
    let answer = false;
    const dlg = openDialog({
      title, audio, className: 'dialog-confirm',
      body: h('p', { class: 'dialog-message' }, message),
      actions: [
        button({ label: cancelLabel, variant: 'ghost', onClick: () => dlg.close(), attrs: { 'data-autofocus': true } }),
        button({ label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => { answer = true; dlg.close(); } }),
      ],
      onClose: () => resolve(answer),
    });
  });
}

// ---- Score displays ----------------------------------------------------------------------------

export function scoreDisplay({ label, value = '—', hint }) {
  const v = h('span', { class: 'score-value' }, String(value));
  const el = h('div', { class: 'score', title: hint }, h('span', { class: 'score-label' }, label), v);
  el.update = next => {
    const text = String(next);
    if (v.textContent === text) return;
    v.textContent = text;
    el.classList.remove('is-bumped'); void el.offsetWidth; el.classList.add('is-bumped');
  };
  return el;
}

// ---- Player information ------------------------------------------------------------------------

export function playerInfo({ name, role, avatar = '★', detail = '', side = 'left' }) {
  const nameEl = h('span', { class: 'player-name' }, name);
  const detailEl = h('span', { class: 'player-detail' }, detail);
  const el = h('section', { class: `player player-${side}`, 'aria-label': `${role}: ${name}` },
    h('span', { class: 'player-avatar', 'aria-hidden': 'true' }, avatar),
    h('span', { class: 'player-text' }, h('span', { class: 'player-role' }, role), nameEl, detailEl));
  el.setName = n => { nameEl.textContent = n; el.setAttribute('aria-label', `${role}: ${n}`); };
  el.setDetail = d => { detailEl.textContent = d; };
  el.setActive = on => el.classList.toggle('is-active', !!on);
  return el;
}

// ---- Game timers -------------------------------------------------------------------------------

export function gameTimer(timer, { label = 'Time' } = {}) {
  const value = h('span', { class: 'timer-value' }, formatTime(timer.elapsed()));
  const el = h('div', { class: 'timer', role: 'timer', 'aria-label': label }, h('span', { class: 'timer-label' }, label), value);
  let last = -1;
  const tick = () => {
    const s = timer.elapsed();
    if (s !== last) { last = s; value.textContent = formatTime(s); }
    el.classList.toggle('is-paused', !timer.running);
  };
  const id = setInterval(tick, 250);
  el.refresh = tick;
  el.destroy = () => clearInterval(id);
  return el;
}

// ---- Settings panels ---------------------------------------------------------------------------

export function settingsPanel(settings, { sections } = {}) {
  const groups = new Map();
  for (const o of SCHEMA) {
    if (sections && !sections.includes(o.section)) continue;
    if (!groups.has(o.section)) groups.set(o.section, []);
    groups.get(o.section).push(o);
  }
  const inputs = new Map();

  const control = o => {
    const id = `set-${o.key}`;
    const v = settings.get(o.key);
    let input, out = null;
    if (o.type === 'toggle') {
      input = h('input', { id, type: 'checkbox', class: 'switch', role: 'switch', checked: v,
        onchange: e => settings.set(o.key, e.target.checked) });
      input.sync = val => { input.checked = val; };
    } else if (o.type === 'choice') {
      input = h('select', { id, onchange: e => settings.set(o.key, e.target.value) },
        o.options.map(([val, text]) => h('option', { value: val, selected: val === v }, text)));
      input.sync = val => { input.value = val; };
    } else if (o.type === 'range') {
      out = h('output', { for: id, class: 'range-out' }, `${Math.round(v * 100)}%`);
      input = h('input', { id, type: 'range', min: o.min, max: o.max, step: o.step, value: v,
        oninput: e => settings.set(o.key, Number(e.target.value)) });
      input.sync = val => { input.value = val; out.textContent = `${Math.round(val * 100)}%`; };
    } else {
      input = h('input', { id, type: 'text', value: v, maxlength: o.maxLength, autocomplete: 'off', spellcheck: 'false',
        onchange: e => { settings.set(o.key, e.target.value); e.target.value = settings.get(o.key); } });
      input.sync = val => { if (document.activeElement !== input) input.value = val; };
    }
    inputs.set(o.key, input);
    return h('div', { class: `setting setting-${o.type}` },
      h('label', { for: id, class: 'setting-label' }, o.label, o.help ? h('small', {}, o.help) : null),
      h('div', { class: 'setting-control' }, input, out));
  };

  const el = h('div', { class: 'settings-panel' },
    [...groups].map(([name, opts]) => h('fieldset', { class: 'settings-group' }, h('legend', {}, name), opts.map(control))));
  const off = settings.on((key, val, all) => {
    if (key) inputs.get(key)?.sync(val);
    else for (const [k, input] of inputs) input.sync(all[k]);
  });
  el.destroy = off;
  return el;
}

// ---- Screen header ----------------------------------------------------------------------------

export function screenHeader({ title, eyebrow, onBack, backLabel = 'Back', extra }) {
  return h('header', { class: 'screen-head' },
    onBack ? button({ label: backLabel, icon: '←', variant: 'ghost', onClick: onBack, attrs: { 'data-back': true } }) : null,
    h('div', { class: 'screen-titles' }, eyebrow ? h('p', { class: 'eyebrow' }, eyebrow) : null, h('h1', { class: 'screen-title' }, title)),
    extra || null);
}
