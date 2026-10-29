// The shared playing-card engine (no DOM): cards, decks, a tested shuffle, piles, hands, a card
// table that moves cards between places without ever duplicating or losing one, turn order and
// round/match tracking. Every card game in the club builds on this.

export const SUITS = [
  { id: 's', name: 'spades', symbol: '♠', color: 'black' },
  { id: 'h', name: 'hearts', symbol: '♥', color: 'red' },
  { id: 'd', name: 'diamonds', symbol: '♦', color: 'red' },
  { id: 'c', name: 'clubs', symbol: '♣', color: 'black' },
];
export const RANKS = [
  { id: 'A', name: 'ace', value: 1 }, { id: '2', name: 'two', value: 2 }, { id: '3', name: 'three', value: 3 },
  { id: '4', name: 'four', value: 4 }, { id: '5', name: 'five', value: 5 }, { id: '6', name: 'six', value: 6 },
  { id: '7', name: 'seven', value: 7 }, { id: '8', name: 'eight', value: 8 }, { id: '9', name: 'nine', value: 9 },
  { id: '10', name: 'ten', value: 10 }, { id: 'J', name: 'jack', value: 11 }, { id: 'Q', name: 'queen', value: 12 },
  { id: 'K', name: 'king', value: 13 },
];
const SUIT = Object.fromEntries(SUITS.map(s => [s.id, s]));
const RANK = Object.fromEntries(RANKS.map(r => [r.id, r]));

export const makeCard = (rank, suit) => Object.freeze({ id: `${rank}${suit}`, rank, suit, value: RANK[rank].value, joker: false });
export const makeJoker = n => Object.freeze({ id: `JK${n}`, rank: 'JK', suit: null, value: 0, joker: true, n });

export const suitOf = card => (card.joker ? null : SUIT[card.suit]);
export const isRed = card => !card.joker && SUIT[card.suit].color === 'red';
export function cardName(card) {
  if (card.joker) return card.n % 2 ? 'Joker' : 'Joker (red)';
  return `${RANK[card.rank].name[0].toUpperCase()}${RANK[card.rank].name.slice(1)} of ${SUIT[card.suit].name}`;
}
export const shortName = card => (card.joker ? 'Joker' : `${card.rank}${SUIT[card.suit].symbol}`);

// A standard 52-card deck (in new-deck order), optionally with jokers and/or several decks.
// Multi-deck shoes give each copy a distinct id ("As#2") so ids stay unique.
export function createDeck({ jokers = 0, decks = 1 } = {}) {
  const out = [];
  for (let d = 1; d <= decks; d++) {
    for (const s of SUITS) for (const r of RANKS) {
      const c = makeCard(r.id, s.id);
      out.push(d === 1 ? c : Object.freeze({ ...c, id: `${c.id}#${d}` }));
    }
  }
  for (let j = 1; j <= jokers; j++) out.push(makeJoker(j));
  return out;
}

// ---- randomness ----

// Uniform [0, 1) from the browser's cryptographic generator, falling back to Math.random.
export function cryptoRandom() {
  const c = globalThis.crypto;
  if (c?.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
  return Math.random();
}

// Deterministic generator for tests and reproducible deals (mulberry32).
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates: every ordering equally likely. Returns a new array; the input is untouched.
export function shuffle(cards, rng = cryptoRandom) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- piles and hands ----

// An ordered stack of cards; the end of the array is the top.
export class Pile {
  constructor(name, cards = [], { faceUp = false } = {}) {
    this.name = name;
    this.cards = cards.slice();
    this.faceUp = faceUp;
  }
  get size() { return this.cards.length; }
  get empty() { return this.cards.length === 0; }
  top() { return this.cards[this.cards.length - 1] || null; }
  has(id) { return this.cards.some(c => c.id === id); }
}

export class Hand extends Pile {
  constructor(owner, cards = []) { super(owner, cards); this.owner = owner; }
  sort(order = 'suit') {
    const si = c => (c.joker ? 9 : SUITS.findIndex(s => s.id === c.suit));
    this.cards.sort(order === 'rank' ? (a, b) => a.value - b.value || si(a) - si(b) : (a, b) => si(a) - si(b) || a.value - b.value);
    return this;
  }
}

// ---- the table ----

// Owns every card in play. Cards only ever move between the table's piles and hands, so the
// total is conserved; audit() proves it.
export class CardTable {
  constructor({ jokers = 0, decks = 1, players = [], rng = cryptoRandom } = {}) {
    this.rng = rng;
    this.all = createDeck({ jokers, decks });
    this.piles = { deck: new Pile('deck', this.all), discard: new Pile('discard', [], { faceUp: true }) };
    this.hands = Object.fromEntries(players.map(p => [p, new Hand(p)]));
    this.log = [];
  }

  place(name) {
    const p = this.piles[name] || this.hands[name];
    if (!p) throw new Error(`no pile or hand called ${name}`);
    return p;
  }

  addPile(name, opts) { if (!this.piles[name]) this.piles[name] = new Pile(name, [], opts); return this.piles[name]; }

  shuffleDeck() { this.piles.deck.cards = shuffle(this.piles.deck.cards, this.rng); this.log.push({ type: 'shuffle' }); }

  // Move one card (by id, or the top card when id is omitted) between places.
  move(from, to, id = null) {
    const src = this.place(from), dst = this.place(to);
    const i = id == null ? src.cards.length - 1 : src.cards.findIndex(c => c.id === id);
    if (i < 0) throw new Error(id == null ? `${from} is empty` : `${id} is not in ${from}`);
    const [card] = src.cards.splice(i, 1);
    dst.cards.push(card);
    this.log.push({ type: 'move', from, to, id: card.id });
    return card;
  }

  // Draw n from the deck into a hand. Reshuffles the discard pile (all but its top card) into the
  // deck when it runs out, if allowed. Returns the cards drawn (fewer if both are exhausted).
  draw(player, n = 1, { reshuffle = true } = {}) {
    const got = [];
    for (let k = 0; k < n; k++) {
      if (this.piles.deck.empty && reshuffle) this.recycleDiscard();
      if (this.piles.deck.empty) break;
      got.push(this.move('deck', player));
    }
    return got;
  }

  discard(player, id) { return this.move(player, 'discard', id); }

  recycleDiscard() {
    const d = this.piles.discard;
    if (d.size <= 1) return 0;
    const keep = d.cards.pop();
    const back = d.cards;
    d.cards = [keep];
    this.piles.deck.cards = shuffle(back, this.rng).concat(this.piles.deck.cards);
    this.log.push({ type: 'recycle', count: back.length });
    return back.length;
  }

  // Deal n cards to each player in turn, starting with the first listed (round-robin, as at a
  // real table).
  deal(players, n) {
    for (let k = 0; k < n; k++) for (const p of players) {
      if (this.piles.deck.empty) return false;
      this.move('deck', p);
    }
    return true;
  }

  // Gather every card back into the deck (new-deck order is not restored; shuffle next).
  collect() {
    const deck = this.piles.deck;
    for (const place of [...Object.values(this.piles), ...Object.values(this.hands)]) {
      if (place === deck) continue;
      deck.cards.push(...place.cards);
      place.cards = [];
    }
    this.log.push({ type: 'collect' });
  }

  // Proves conservation: every card is in exactly one place and nothing extra exists.
  audit() {
    const seen = new Map();
    const places = [...Object.values(this.piles), ...Object.values(this.hands)];
    for (const place of places) for (const c of place.cards) seen.set(c.id, (seen.get(c.id) || 0) + 1);
    const duplicates = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    const missing = this.all.filter(c => !seen.has(c.id)).map(c => c.id);
    const extra = [...seen.keys()].filter(id => !this.all.some(c => c.id === id));
    const total = places.reduce((s, p) => s + p.size, 0);
    return { ok: !duplicates.length && !missing.length && !extra.length && total === this.all.length, total, expected: this.all.length, duplicates, missing, extra };
  }

  // What a given player is allowed to see: their own hand, face-up piles, and only the size of
  // everything else. Opponent cards never leave the engine for another player's view.
  view(viewer) {
    const hands = {};
    for (const [p, hand] of Object.entries(this.hands)) {
      hands[p] = p === viewer ? { size: hand.size, cards: hand.cards.slice() } : { size: hand.size, cards: null };
    }
    const piles = {};
    for (const [name, pile] of Object.entries(this.piles)) {
      piles[name] = { size: pile.size, faceUp: pile.faceUp, top: pile.faceUp ? pile.top() : null, cards: pile.faceUp ? pile.cards.slice() : null };
    }
    return { viewer, hands, piles };
  }
}

// ---- turn order and rounds ----

export class TurnOrder {
  constructor(players, { dealer = 0 } = {}) {
    if (!players.length) throw new Error('need at least one player');
    this.players = players.slice();
    this.dealer = dealer % players.length;
    this.index = (this.dealer + 1) % players.length; // play starts left of the dealer
    this.direction = 1;
    this.out = new Set();
  }
  get current() { return this.players[this.index]; }
  get dealerName() { return this.players[this.dealer]; }
  active() { return this.players.filter(p => !this.out.has(p)); }
  next() {
    if (this.active().length === 0) return null;
    do { this.index = (this.index + this.direction + this.players.length) % this.players.length; } while (this.out.has(this.current));
    return this.current;
  }
  reverse() { this.direction *= -1; }
  eliminate(p) { this.out.add(p); if (this.current === p && this.active().length) this.next(); }
  rotateDealer() {
    do { this.dealer = (this.dealer + 1) % this.players.length; } while (this.out.has(this.players[this.dealer]) && this.active().length);
    this.index = this.dealer;
    this.next();
    return this.dealerName;
  }
}

export class MatchTracker {
  constructor(players, { target = null, maxRounds = null } = {}) {
    this.players = players.slice();
    this.target = target;        // first to this many points wins, if set
    this.maxRounds = maxRounds;  // or the leader after this many rounds
    this.rounds = [];
    this.totals = Object.fromEntries(players.map(p => [p, 0]));
  }
  get round() { return this.rounds.length + 1; }
  record({ winner = null, scores = {} } = {}) {
    for (const [p, s] of Object.entries(scores)) if (p in this.totals) this.totals[p] += s;
    this.rounds.push({ n: this.rounds.length + 1, winner, scores: { ...scores } });
    return this.rounds[this.rounds.length - 1];
  }
  leader() {
    const best = Math.max(...Object.values(this.totals));
    const top = this.players.filter(p => this.totals[p] === best);
    return top.length === 1 ? top[0] : null;
  }
  over() {
    if (this.target != null && this.players.some(p => this.totals[p] >= this.target)) return true;
    return this.maxRounds != null && this.rounds.length >= this.maxRounds;
  }
}
