// Title screen: continue a saved match, or pick a mode and seat 2-4 players.
import { TOKENS, SEAT_COLORS } from '../board.js';
import { MODES, PERSONALITY_IDS } from '../engine.js';
import { PERSONALITIES } from '../ai.js';
import { esc, money } from './fmt.js';
import { tokenArt } from './icons.js';

const AI_NAMES = { collector: 'Marlo Quay', developer: 'Rosa Brickwell', financier: 'Ines Ledger', opportunist: 'Tobias Finch' };
const HUMAN_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

const MODE_INFO = {
  classic: { blurb: 'The full 40-space city against AI rivals with auctions, development and bankruptcy.', seats: 'You + 1-3 AI' },
  local: { blurb: 'Two to four people share this device. Offers and sealed bids stay private between turns.', seats: '2-4 humans' },
  quick: { blurb: 'The 28-space Harbor Loop: no auctions, 15 rounds, first to $2,500 net worth wins.', seats: 'Humans and/or AI' },
  sandbox: { blurb: 'Big bankroll, jump to any space, add cash at will. Try ideas with no winner.', seats: 'Any mix' },
};

const ROUND_CHOICES = { classic: [20, 30, 40, 60, 0], local: [20, 30, 40, 60, 0], quick: [10, 15, 20], sandbox: [0] };
const CASH_CHOICES = { classic: [1000, 1500, 2000], local: [1000, 1500, 2000], quick: [1000, 1200, 1500], sandbox: [3000, 5000, 10000] };

function defaultSeats(mode, count) {
  return Array.from({ length: count }, (_, i) => {
    const human = mode === 'local' || i === 0;
    const personality = PERSONALITY_IDS[(i + 3) % 4];
    return {
      kind: human ? 'human' : 'ai',
      name: human ? (mode === 'local' ? `Player ${i + 1}` : HUMAN_NAMES[i]) : AI_NAMES[personality],
      personality,
      token: TOKENS[i].id,
    };
  });
}

export function createSetup(root, { onStart, onContinue, onRules, onSettings, onTutorial, getSave }) {
  let mode = 'classic';
  let count = 4;
  let seats = defaultSeats(mode, count);
  let options = { ...MODES[mode].options };

  const kindLocked = () => mode === 'classic' || mode === 'local';

  function render() {
    const save = getSave();
    root.querySelector('#continueSlot').innerHTML = save.state
      ? `<div class="continue-card"><div><b>Match in progress</b><small>${esc(MODES[save.state.mode].name)} · round ${save.state.round} · ${save.state.players.map(p => esc(p.name)).join(', ')}${save.state.finished ? ' · finished' : ''}</small></div><button type="button" class="btn primary" data-setup="continue">Continue</button></div>`
      : save.error ? `<p class="notice warn">${esc(save.error)} A fresh game is ready below.</p>` : '';
    root.querySelector('#modeGrid').innerHTML = Object.keys(MODES).filter(id => !MODES[id].tutorial).map(id => `
      <button type="button" class="mode-card${id === mode ? ' on' : ''}" data-mode="${id}" aria-pressed="${id === mode}">
        <b>${esc(MODES[id].name)}</b><span>${esc(MODE_INFO[id].blurb)}</span><small>${MODE_INFO[id].seats}</small></button>`).join('')
      + '<div class="mode-card disabled" aria-disabled="true"><b>Online Multiplayer</b><span>Playing over the internet is a future feature. Every mode here runs on this one device.</span><small>Not available</small></div>';
    const roundOpts = ROUND_CHOICES[mode];
    const cashOpts = CASH_CHOICES[mode];
    root.querySelector('#seatConfig').innerHTML = `
      <div class="setup-row">
        <label>Players <span class="segs">${[2, 3, 4].map(n => `<label class="seg"><input type="radio" name="count" value="${n}"${n === count ? ' checked' : ''}><span>${n}</span></label>`).join('')}</span></label>
        ${mode !== 'sandbox' ? `<label>Round limit <select name="roundLimit">${roundOpts.map(r => `<option value="${r}"${r === options.roundLimit ? ' selected' : ''}>${r ? `${r} rounds` : 'No limit'}</option>`).join('')}</select></label>` : ''}
        <label>Starting cash <select name="startCash">${cashOpts.map(c => `<option value="${c}"${c === options.startCash ? ' selected' : ''}>${money(c)}</option>`).join('')}</select></label>
      </div>
      <ol class="seats">${seats.map((s, i) => `
        <li class="seat" style="--pc:${SEAT_COLORS[i]}">
          <span class="seat-num">${i + 1}</span>
          <input class="seat-name" type="text" maxlength="18" value="${esc(s.name)}" data-seat="${i}" data-field="name" aria-label="Player ${i + 1} name">
          <span class="segs kind">${['human', 'ai'].map(k => `<label class="seg"><input type="radio" name="kind${i}" value="${k}" data-seat="${i}" data-field="kind"${s.kind === k ? ' checked' : ''}${kindLocked() ? ' disabled' : ''}><span>${k === 'ai' ? 'AI' : 'Human'}</span></label>`).join('')}</span>
          ${s.kind === 'ai' ? `<select data-seat="${i}" data-field="personality" aria-label="AI personality">${PERSONALITY_IDS.map(p => `<option value="${p}"${p === s.personality ? ' selected' : ''}>${esc(PERSONALITIES[p].name)}</option>`).join('')}</select>` : '<span class="seat-spacer"></span>'}
          <span class="token-pick" role="radiogroup" aria-label="Token">${TOKENS.map(t => {
            const taken = seats.some((o, j) => j !== i && o.token === t.id);
            return `<label class="tok${s.token === t.id ? ' on' : ''}${taken ? ' taken' : ''}" title="${esc(t.name)}${taken ? ' (taken)' : ''}"><input type="radio" name="tok${i}" value="${t.id}" data-seat="${i}" data-field="token"${s.token === t.id ? ' checked' : ''}${taken ? ' disabled' : ''}>${tokenArt(t.id)}</label>`;
          }).join('')}</span>
          ${s.kind === 'ai' ? `<small class="seat-blurb">${esc(PERSONALITIES[s.personality].blurb)}</small>` : ''}
        </li>`).join('')}</ol>
      <p class="setup-error" id="setupError" role="alert"></p>`;
  }

  root.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    if (m) {
      mode = m.dataset.mode;
      if (mode === 'local' && count < 2) count = 2;
      seats = defaultSeats(mode, count);
      options = { ...MODES[mode].options };
      render();
      return;
    }
    const s = e.target.closest('[data-setup]');
    if (!s) return;
    if (s.dataset.setup === 'continue') onContinue();
    if (s.dataset.setup === 'start') start();
    if (s.dataset.setup === 'rules') onRules();
    if (s.dataset.setup === 'settings') onSettings();
    if (s.dataset.setup === 'tutorial') onTutorial();
  });

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'count') {
      count = Number(t.value);
      const fresh = defaultSeats(mode, count);
      seats = fresh.map((f, i) => seats[i] || f);
      // keep tokens unique after adding seats
      const used = new Set();
      for (const seat of seats) {
        if (used.has(seat.token)) seat.token = TOKENS.find(x => !used.has(x.id)).id;
        used.add(seat.token);
      }
      render();
      return;
    }
    if (t.name === 'roundLimit') { options.roundLimit = Number(t.value); return; }
    if (t.name === 'startCash') { options.startCash = Number(t.value); return; }
    const i = Number(t.dataset.seat);
    if (Number.isNaN(i)) return;
    const seat = seats[i];
    const field = t.dataset.field;
    if (field === 'kind') {
      seat.kind = t.value;
      seat.name = t.value === 'ai' ? AI_NAMES[seat.personality] : `Player ${i + 1}`;
    } else if (field === 'personality') {
      const wasDefault = Object.values(AI_NAMES).includes(seat.name);
      seat.personality = t.value;
      if (wasDefault) seat.name = AI_NAMES[t.value];
    } else if (field === 'token') seat.token = t.value;
    if (field !== 'name') render();
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.field === 'name') seats[Number(t.dataset.seat)].name = t.value;
  });

  function start() {
    const err = root.querySelector('#setupError');
    const humans = seats.filter(s => s.kind === 'human').length;
    if (mode === 'local' && humans < 2) { err.textContent = 'Pass-and-play needs at least two human players.'; return; }
    const names = seats.map(s => s.name.trim().toLowerCase());
    if (names.some(n => !n)) { err.textContent = 'Every player needs a name.'; return; }
    if (new Set(names).size !== names.length) { err.textContent = 'Give each player a different name.'; return; }
    onStart({ mode, players: seats.map(s => ({ ...s, name: s.name.trim() })), options: { ...options } });
  }

  render();
  return { render };
}
