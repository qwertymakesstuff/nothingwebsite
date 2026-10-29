// Card and chip rendering shared by every card game. A card shows generated artwork (suit pips,
// court portraits and backs from the ForgeGUI set) when the full set is available, and otherwise
// draws rank and suit itself, so faces stay legible at every size. Face-down cards never contain
// their face in the DOM: hidden information stays hidden.

import { h } from '../ui/dom.js';
import { SUITS, cardName, isRed } from './deck.js';

const SUIT = Object.fromEntries(SUITS.map(s => [s.id, s]));
const TEXT = '︎'; // force text (not emoji) presentation for suit symbols

// Pip positions for number cards: [column 0-2, row 0-1]. Pips below the middle are drawn upside down.
const PIPS = {
  2: [[1, 0], [1, 1]],
  3: [[1, 0], [1, 0.5], [1, 1]],
  4: [[0, 0], [2, 0], [0, 1], [2, 1]],
  5: [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]],
  6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75], [0, 1], [2, 1]],
  9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, 0.5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]],
  10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]],
};
const COURT = { J: 'j', Q: 'q', K: 'k' };

function suitMark(assets, suit, cls) {
  const url = assets?.setUrl('cards.suits', `cards.suit.${suit}`);
  return url ? h('img', { class: `${cls} suit-img`, src: url, alt: '' }) : h('span', { class: cls, 'aria-hidden': 'true' }, SUIT[suit].symbol + TEXT);
}

function front(card, assets) {
  if (card.joker) {
    return h('span', { class: 'card-face card-front is-joker' },
      h('span', { class: 'corner tl' }, h('span', { class: 'rank' }, '★')),
      h('span', { class: 'joker-word' }, 'JOKER'),
      h('span', { class: 'corner br' }, h('span', { class: 'rank' }, '★')));
  }
  const corner = pos => h('span', { class: `corner ${pos}` }, h('span', { class: 'rank' }, card.rank), suitMark(assets, card.suit, 'corner-suit'));
  let middle;
  if (PIPS[card.rank]) {
    middle = h('span', { class: 'pips' }, PIPS[card.rank].map(([c, r]) => {
      const el = suitMark(assets, card.suit, 'pip');
      el.style.left = `${[18, 50, 82][c]}%`;
      el.style.top = `${12 + r * 76}%`;
      if (r > 0.5) el.classList.add('flipped');
      return el;
    }));
  } else if (card.rank === 'A') {
    middle = h('span', { class: 'pips ace' }, suitMark(assets, card.suit, 'pip pip-ace'));
  } else {
    const url = assets?.setUrl('cards.courts', `cards.court.${COURT[card.rank]}`);
    middle = h('span', { class: 'court' },
      url ? h('img', { class: 'court-art', src: url, alt: '' })
        : h('span', { class: 'court-fallback', 'aria-hidden': 'true' }, h('span', { class: 'court-letter' }, card.rank), suitMark(assets, card.suit, 'court-suit')));
  }
  return h('span', { class: `card-face card-front suit-${card.suit} ${isRed(card) ? 'is-red' : 'is-black'}` }, corner('tl'), middle, corner('br'));
}

function back(assets, style) {
  const id = `cards.back.${style}`;
  const url = assets?.url(id);
  return h('span', { class: `card-face card-back back-${style}`, style: url ? { backgroundImage: `url("${url}")` } : null });
}

// A card element. faceUp: show the face. interactive: a focusable button (selection, inspection).
export function cardEl(card, { assets, faceUp = true, interactive = false, backStyle = 'oxblood', size } = {}) {
  const tag = interactive ? 'button' : 'span';
  const known = faceUp && card;
  const el = h(tag, {
    class: `card${known ? ' is-face-up' : ''}`,
    type: interactive ? 'button' : null,
    'aria-label': known ? cardName(card) : 'Face-down card',
    role: interactive ? null : 'img',
    dataset: known ? { card: card.id } : {},
    style: size ? { '--card-w': `${size}px` } : null,
  }, h('span', { class: 'card-inner' }, known ? front(card, assets) : null, back(assets, backStyle)));
  el.cardId = known ? card.id : null;
  return el;
}

// Turn a card over with the 3D flip. Showing a face needs the card's identity.
export function flipCard(el, card, { assets, faceUp }) {
  const inner = el.querySelector('.card-inner');
  if (faceUp && card && !inner.querySelector('.card-front')) inner.prepend(front(card, assets));
  el.classList.toggle('is-face-up', faceUp);
  el.setAttribute('aria-label', faceUp && card ? cardName(card) : 'Face-down card');
  if (faceUp && card) { el.dataset.card = card.id; el.cardId = card.id; }
  if (!faceUp) {
    // Once the flip finishes, drop the face so a face-down card carries no hidden information.
    const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur')) || 0;
    setTimeout(() => { if (!el.classList.contains('is-face-up')) { inner.querySelector('.card-front')?.remove(); delete el.dataset.card; el.cardId = null; } }, dur * 2 + 20);
  }
}

// FLIP-style motion: call before moving an element in the DOM, then call the returned function.
export function measure(el) { return el.getBoundingClientRect(); }
export function flyFrom(el, from, { duration = 260, delay = 0, rotate = 0 } = {}) {
  if (!duration || !el.animate) return null;
  const to = el.getBoundingClientRect();
  const dx = from.left - to.left, dy = from.top - to.top;
  if (!dx && !dy) return null;
  return el.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)` },
    { transform: 'translate(0, 0) rotate(0deg)' },
  ], { duration, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
}

// ---- chips ----

export const CHIP_VALUES = [100, 25, 10, 5, 1];

// Break an amount into chips, largest first.
export function chipBreakdown(amount, max = 12) {
  const out = [];
  let left = Math.max(0, Math.floor(amount));
  for (const v of CHIP_VALUES) while (left >= v && out.length < max) { out.push(v); left -= v; }
  return out;
}

export function chipEl(value, { assets } = {}) {
  const url = assets?.setUrl('chips', `chips.${value}`);
  return h('span', { class: `chip chip-${value}${url ? ' has-art' : ''}`, role: 'img', 'aria-label': `${value} chip`, style: url ? { backgroundImage: `url("${url}")` } : null },
    h('span', { class: 'chip-value' }, String(value)));
}

export function chipStack(amount, { assets } = {}) {
  return h('span', { class: 'chip-stack', role: 'img', 'aria-label': `${amount} in chips` },
    chipBreakdown(amount).reverse().map((v, i) => { const c = chipEl(v, { assets }); c.style.setProperty('--i', i); c.setAttribute('aria-hidden', 'true'); return c; }));
}
