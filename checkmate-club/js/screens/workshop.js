// The workshop: a test card table that exercises the shared card engine (shuffle, deal, draw,
// discard, hidden hands, turn order, rounds) and a gallery of the ForgeGUI asset library showing
// what is generated, downloaded or falling back. Not a game; nothing here is scored.

import { h } from '../ui/dom.js';
import { screenHeader, button, badge } from '../ui/components.js';
import { CardTable, TurnOrder, MatchTracker, cardName, shortName } from '../cards/deck.js';
import { cardEl, flipCard, measure, flyFrom, chipEl, chipStack } from '../cards/view.js';
import { pieceDataUrl } from '../games/chess/pieces.js';

const SEATS = ['you', 'west', 'north', 'east'];
const SEAT_NAMES = { you: 'You', west: 'West', north: 'North', east: 'East' };

function cardTable(app) {
  const assets = app.assets;
  const back = () => app.settings.get('cardBack');
  let jokers = 0;
  let table, turns, match, selected = new Set();

  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const log = h('ol', { class: 'workshop-log' });
  const audit = h('p', { class: 'audit', role: 'status' });
  const seatEls = Object.fromEntries(SEATS.map(s => [s, h('div', { class: `seat seat-${s}`, 'aria-label': SEAT_NAMES[s] })]));
  const handEls = Object.fromEntries(SEATS.map(s => [s, h('div', { class: `hand hand-${s}` })]));
  const deckEl = h('button', { type: 'button', class: 'pile pile-deck', 'aria-label': 'Deck: draw a card' });
  const discardEl = h('div', { class: 'pile pile-discard', 'aria-label': 'Discard pile' });
  const roundEl = h('span', { class: 'round-label' });
  for (const s of SEATS) seatEls[s].append(h('span', { class: 'seat-name' }), handEls[s]);

  function say(text) { live.textContent = text; log.prepend(h('li', {}, text)); while (log.children.length > 8) log.lastChild.remove(); }

  function reset() {
    table = new CardTable({ jokers, players: SEATS });
    turns = new TurnOrder(SEATS, { dealer: 3 });
    match = new MatchTracker(SEATS);
    selected.clear();
    draw();
  }

  // Render everything from the engine's view for "you": other hands arrive as counts only.
  function draw(anim = null) {
    const before = anim ? new Map([...document.querySelectorAll('.workshop-table [data-key]')].map(e => [e.dataset.key, measure(e)])) : null;
    const v = table.view('you');
    for (const s of SEATS) {
      const hv = v.hands[s];
      seatEls[s].querySelector('.seat-name').textContent = `${SEAT_NAMES[s]} · ${hv.size} card${hv.size === 1 ? '' : 's'}${turns.current === s ? ' · to play' : ''}${turns.dealerName === s ? ' · dealer' : ''}`;
      seatEls[s].classList.toggle('is-turn', turns.current === s);
      handEls[s].replaceChildren(...(s === 'you'
        ? hv.cards.map(c => {
          const el = cardEl(c, { assets, interactive: true, backStyle: back() });
          el.dataset.key = c.id;
          el.setAttribute('aria-pressed', String(selected.has(c.id)));
          el.addEventListener('click', () => { selected.has(c.id) ? selected.delete(c.id) : selected.add(c.id); el.setAttribute('aria-pressed', String(selected.has(c.id))); });
          el.addEventListener('dblclick', () => inspect(c));
          el.addEventListener('keydown', e => { if (e.key === 'i' || e.key === 'I') inspect(c); });
          return el;
        })
        : Array.from({ length: hv.size }, (_, i) => { const el = cardEl(null, { assets, faceUp: false, backStyle: back() }); el.dataset.key = `${s}-${i}`; return el; })));
    }
    deckEl.replaceChildren(v.piles.deck.size ? cardEl(null, { assets, faceUp: false, backStyle: back() }) : h('span', { class: 'pile-empty' }, 'Empty'), h('span', { class: 'pile-count' }, String(v.piles.deck.size)));
    const top = v.piles.discard.top;
    discardEl.replaceChildren(top ? Object.assign(cardEl(top, { assets, backStyle: back() }), { }) : h('span', { class: 'pile-empty' }, 'Discard'), h('span', { class: 'pile-count' }, String(v.piles.discard.size)));
    if (top) discardEl.firstChild.dataset.key = top.id;
    roundEl.textContent = `Round ${match.round}`;
    const a = table.audit();
    audit.textContent = a.ok ? `✓ ${a.total} of ${a.expected} cards accounted for, no duplicates` : `✗ Card audit failed: ${JSON.stringify(a)}`;
    audit.classList.toggle('is-bad', !a.ok);
    if (anim && before) {
      const d = app.duration * 1.3;
      let i = 0;
      for (const el of document.querySelectorAll('.workshop-table [data-key]')) {
        const key = el.dataset.key;
        const from = before.get(key) || (anim.from === 'deck' && anim.keys?.includes(key) ? measure(deckEl) : null);
        if (from) flyFrom(el, from, { duration: d, delay: anim.stagger ? (i++) * anim.stagger : 0 });
      }
    }
  }

  function inspect(card) {
    const big = cardEl(card, { assets, backStyle: back(), size: 220 });
    const dlg = app.dialog({ title: cardName(card), className: 'dialog-inspect', body: h('div', { class: 'inspect' }, big),
      actions: [button({ label: 'Close', variant: 'primary', onClick: () => dlg.close() })] });
  }

  const act = {
    shuffle() { if (table.piles.deck.size < 2) return say('Collect the cards before shuffling.'); table.shuffleDeck(); app.audio.play('flip'); say(`Shuffled ${table.piles.deck.size} cards.`); draw(); deckEl.animate?.([{ transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], { duration: 300 }); },
    deal() {
      const order = [...SEATS.slice(SEATS.indexOf(turns.players[(turns.dealer + 1) % 4])), ...SEATS.slice(0, SEATS.indexOf(turns.players[(turns.dealer + 1) % 4]))];
      const before = new Set(table.hands.you.cards.map(c => c.id));
      const ok = table.deal(order, 5);
      app.audio.play('deal');
      const keys = [...table.hands.you.cards.filter(c => !before.has(c.id)).map(c => c.id), ...SEATS.slice(1).flatMap(s => Array.from({ length: table.hands[s].size }, (_, i) => `${s}-${i}`))];
      say(ok ? `Dealt 5 cards to each player, starting with ${SEAT_NAMES[order[0]]}.` : 'The deck ran out while dealing.');
      draw({ from: 'deck', keys, stagger: Math.min(40, app.duration / 5) });
    },
    drawCard() {
      const who = turns.current;
      const got = table.draw(who);
      if (!got.length) return say('No cards left to draw.');
      app.audio.play('deal');
      say(who === 'you' ? `You drew the ${cardName(got[0])}.` : `${SEAT_NAMES[who]} drew a card.`);
      draw({ from: 'deck', keys: who === 'you' ? [got[0].id] : [`${who}-${table.hands[who].size - 1}`] });
    },
    discard() {
      if (turns.current !== 'you') return say(`It’s ${SEAT_NAMES[turns.current]}’s turn: you can only discard on your turn.`);
      if (selected.size !== 1) return say('Select exactly one card in your hand to discard.');
      const [id] = selected; selected.clear();
      const card = table.discard('you', id);
      app.audio.play('flip');
      say(`You discarded the ${cardName(card)}.`);
      draw({});
    },
    next() {
      const who = turns.next();
      if (who !== 'you' && table.hands[who].size) {
        // Opponents play blind to everything but their own hand: draw one, discard one.
        table.draw(who);
        const hand = table.hands[who].cards;
        const card = table.discard(who, hand[Math.floor(Math.random() * hand.length)].id);
        say(`${SEAT_NAMES[who]} drew and discarded the ${shortName(card)}.`);
      } else say(`${SEAT_NAMES[who]} to play.`);
      draw({});
    },
    flipTop() {
      const el = discardEl.querySelector('.card');
      const top = table.piles.discard.top();
      if (!el || !top) return say('The discard pile is empty.');
      flipCard(el, top, { assets, faceUp: !el.classList.contains('is-face-up') });
      app.audio.play('flip');
    },
    sort() { table.hands.you.sort(); say('Sorted your hand by suit.'); draw({}); },
    endRound() {
      const sizes = SEATS.map(s => [s, table.hands[s].size]);
      const fewest = Math.min(...sizes.map(([, n]) => n));
      const winners = sizes.filter(([, n]) => n === fewest).map(([s]) => s);
      match.record({ winner: winners.length === 1 ? winners[0] : null, scores: Object.fromEntries(winners.map(s => [s, 1])) });
      table.collect();
      turns.rotateDealer();
      selected.clear();
      say(`Round ${match.rounds.length} ends (${winners.map(s => SEAT_NAMES[s]).join(', ')} held fewest cards). Cards collected; the deal passes to ${SEAT_NAMES[turns.dealerName]}.`);
      draw();
    },
    jokers() { jokers = jokers ? 0 : 2; reset(); say(jokers ? 'New 54-card deck with two jokers.' : 'New 52-card deck, no jokers.'); },
  };
  deckEl.addEventListener('click', () => act.drawCard());

  const toolbar = h('div', { class: 'workshop-tools' },
    button({ label: 'Shuffle', icon: '⤮', size: 'sm', onClick: act.shuffle }),
    button({ label: 'Deal 5 each', icon: '⇶', size: 'sm', onClick: act.deal }),
    button({ label: 'Draw', icon: '↥', size: 'sm', onClick: act.drawCard }),
    button({ label: 'Discard selected', icon: '↧', size: 'sm', onClick: act.discard }),
    button({ label: 'Next turn', icon: '→', size: 'sm', onClick: act.next }),
    button({ label: 'Flip discard', icon: '⟲', size: 'sm', onClick: act.flipTop }),
    button({ label: 'Sort hand', icon: '⇅', size: 'sm', onClick: act.sort }),
    button({ label: 'End round', icon: '■', size: 'sm', onClick: act.endRound }),
    button({ label: 'Toggle jokers', icon: '★', size: 'sm', onClick: act.jokers }));

  reset();
  act.shuffle();
  const el = h('div', { class: 'workshop-cards' },
    h('p', { class: 'workshop-note' }, 'A test table for the shared card engine. Select a card in your hand to discard it; double-click or press I to inspect it. Opponent hands stay face down: the table never hands their cards to the screen.'),
    toolbar,
    h('div', { class: 'workshop-table felt' },
      seatEls.north,
      h('div', { class: 'workshop-mid' }, seatEls.west, h('div', { class: 'piles' }, deckEl, discardEl, roundEl), seatEls.east),
      seatEls.you),
    audit,
    h('div', { class: 'workshop-chips' }, h('span', { class: 'side-title' }, 'Chips'), [1, 5, 10, 25, 100].map(v => chipEl(v, { assets })), chipStack(186, { assets })),
    h('h2', { class: 'side-title' }, 'Table log'), log, live);
  return { el, act, get table() { return table; } };
}

function fallbackPreview(a) {
  const [kind, ...rest] = a.id.split('.');
  if (kind === 'chess') return h('img', { src: pieceDataUrl(rest[0], rest[1]), alt: '' });
  if (a.id.startsWith('cards.back')) return cardEl(null, { faceUp: false, backStyle: rest[1], size: 70 });
  if (a.id.startsWith('cards.suit')) return h('span', { class: `fallback-glyph ${'hd'.includes(rest[1]) ? 'is-red' : ''}` }, { s: '♠', h: '♥', d: '♦', c: '♣' }[rest[1]] + '︎');
  if (a.id.startsWith('cards.court')) return cardEl({ id: 'x', rank: rest[1].toUpperCase(), suit: 's', value: 0, joker: false }, { size: 70 });
  if (kind === 'chips') return chipEl(+rest[0]);
  return h('span', { class: 'fallback-swatch' }, 'CSS');
}

function gallery(app) {
  const assets = app.assets;
  const m = assets.manifest;
  if (!m) return h('p', {}, 'The asset manifest could not be loaded.');
  const sum = assets.summary();
  const groups = new Map();
  for (const a of m.assets) {
    const g = a.file.split('/')[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(a);
  }
  const label = { chess: 'Chess pieces', textures: 'Textures', ui: 'Interface decoration', cards: 'Cards', chips: 'Poker chips', backgrounds: 'Backgrounds & illustrations', icons: 'Game icons' };
  return h('div', { class: 'gallery' },
    h('p', { class: 'workshop-note' },
      `${sum.total} assets in the library, all requested from ForgeGUI with the “${m.style?.name}” style. `,
      `${sum.generated} generated, ${sum.downloaded} downloaded into the project, ${m.assets.filter(a => a.status === 'outcome_unknown').length} with an unknown outcome. `,
      sum.downloaded < sum.total ? 'Anything not downloaded uses the procedural fallback shown here; run tools/checkmate-assets/fetch.py once the ForgeGUI storage host is reachable.' : ''),
    [...groups].map(([g, items]) => h('section', { class: 'gallery-group' },
      h('h3', {}, label[g] || g),
      h('div', { class: 'gallery-grid' }, items.map(a => {
        const url = assets.url(a.id);
        const state = url ? ['Downloaded', 'ready'] : a.status === 'generated' ? ['Generated · not downloaded', 'pending'] : ['Outcome unknown', 'neutral'];
        return h('figure', { class: 'gallery-item' },
          h('div', { class: 'gallery-preview' }, url ? h('img', { src: url, alt: a.use }) : fallbackPreview(a)),
          h('figcaption', {},
            h('strong', {}, a.file),
            badge(state[0], state[1]),
            h('small', {}, a.use),
            h('small', { class: 'gallery-meta' }, url ? `${a.width}×${a.height} WebP${a.alpha ? ', transparent' : ''}` : url === null && a.status === 'generated' ? `ForgeGUI ${a.source.family} · job ${a.source.job_id.slice(0, 8)}` : (a.note || '')),
            url ? null : h('small', { class: 'gallery-meta' }, 'Fallback in use')));
      })))));
}

export function render(app, param) {
  const tab = param === 'assets' ? 'assets' : 'cards';
  let cards = null;
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Workshop' },
    [['cards', 'Card table'], ['assets', 'Asset gallery']].map(([id, label]) => h('a', {
      class: 'tab', role: 'tab', href: `#/workshop/${id}`, 'aria-selected': String(id === tab),
    }, label)));
  const body = tab === 'assets' ? gallery(app) : (cards = cardTable(app)).el;
  const el = h('main', { class: 'workshop' },
    screenHeader({ title: 'The Workshop', eyebrow: 'Behind the scenes', onBack: () => app.go('library'), backLabel: 'Library' }),
    tabs, body);
  return { el, title: tab === 'assets' ? 'Asset gallery' : 'Test card table', cards };
}
