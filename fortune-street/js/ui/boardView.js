// The board: a square ring of spaces on a CSS grid, a center stage for dice and cards, and a
// layer of player tokens that walk from space to space. It only displays what it is given.
import { ASSETS, DISTRICTS, CORNERS, TAXES, LEVELS, spaceName } from '../board.js';
import * as R from '../rules.js';
import { icon, tokenArt, dieFace } from './icons.js';
import { esc, money } from './fmt.js';
import { CARDS, DECK_NAMES } from '../cards.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// space index -> grid cell; index 0 is the bottom-left corner and play runs clockwise
export function cellOf(i, side) {
  if (i <= side) return { row: side - i, col: 0, edge: 'l' };
  if (i <= 2 * side) return { row: 0, col: i - side, edge: 't' };
  if (i <= 3 * side) return { row: i - 2 * side, col: side, edge: 'r' };
  return { row: side, col: side - (i - 3 * side), edge: 'b' };
}

function spaceIcon(space) {
  if (space.type === 'corner') return icon(CORNERS[space.id].icon);
  if (space.type === 'tax') return icon(space.id);
  if (space.type === 'bulletin' || space.type === 'opportunity') return icon(space.type);
  return icon(ASSETS[space.id].icon);
}

const shortName = name => name.replace(/^(The )/, '').split(' ').slice(0, 2).join(' ');

export function createBoardView(root, { onSpace }) {
  let board = null;
  let spaceEls = [];
  const tokenEls = {};
  let positions = {}; // what the tokens currently show (may lag the state during animation)
  let lastState = null;

  root.addEventListener('click', e => {
    const el = e.target.closest('.space');
    if (el) onSpace(Number(el.dataset.index));
  });

  function build(st) {
    board = R.boardOf(st);
    const side = board.side;
    const track = `1.6fr repeat(${side - 1}, 1fr) 1.6fr`;
    root.style.gridTemplateColumns = track;
    root.style.gridTemplateRows = track;
    root.className = `board board-${board.id}`;
    root.innerHTML = '';
    spaceEls = board.spaces.map((space, i) => {
      const { row, col, edge } = cellOf(i, side);
      const corner = i % side === 0;
      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.index = i;
      el.className = `space sp-${space.type} edge-${edge}${corner ? ' corner' : ''}`;
      el.style.gridRow = row + 1;
      el.style.gridColumn = col + 1;
      const a = ASSETS[space.id];
      if (a?.kind === 'property') el.style.setProperty('--district', DISTRICTS[a.district].color);
      const name = spaceName(space);
      el.setAttribute('aria-label', name);
      el.innerHTML = `${a?.kind === 'property' ? '<i class="band"></i>' : ''}
        <span class="sp-ico">${spaceIcon(space)}</span>
        <span class="sp-name" data-short="${esc(shortName(name))}"><span>${esc(name)}</span></span>
        <span class="sp-price">${a ? money(a.price) : space.type === 'tax' ? money(TAXES[space.id].base) : ''}</span>
        <span class="sp-dev"></span><span class="sp-flag"></span>`;
      root.appendChild(el);
      return el;
    });
    const center = document.createElement('div');
    center.className = 'center';
    center.style.gridArea = `2 / 2 / ${side + 1} / ${side + 1}`;
    center.innerHTML = `
      <div class="center-brand"><span class="brand-kicker">Meridian Bay</span><span class="brand-title">Fortune<br>Street</span></div>
      <div class="dice" aria-live="polite"><div class="die" data-die="0">${dieFace(5)}</div><div class="die" data-die="1">${dieFace(2)}</div></div>
      <p class="center-msg" id="centerMsg"></p>
      <div class="roll-total" id="rollTotal" aria-live="assertive" hidden></div>
      <div class="card-slot" id="cardSlot"></div>`;
    root.appendChild(center);
    const layer = document.createElement('div');
    layer.className = 'token-layer';
    root.appendChild(layer);
    for (const k of Object.keys(tokenEls)) delete tokenEls[k];
    for (const p of st.players) {
      const t = document.createElement('div');
      t.className = 'token';
      t.style.setProperty('--pc', p.color);
      t.innerHTML = tokenArt(p.token);
      t.title = p.name;
      layer.appendChild(t);
      tokenEls[p.id] = t;
    }
    positions = Object.fromEntries(st.players.map(p => [p.id, p.position]));
    if (st.turn.dice) setDice(st.turn.dice);
  }

  function update(st) {
    lastState = st;
    board.spaces.forEach((space, i) => {
      const el = spaceEls[i];
      const ps = st.props[space.id];
      if (!ps) return;
      const owner = ps.owner ? R.player(st, ps.owner) : null;
      el.classList.toggle('owned', !!owner);
      el.classList.toggle('mortgaged', !!ps.mortgaged);
      el.style.setProperty('--owner', owner ? owner.color : 'transparent');
      el.querySelector('.sp-flag').textContent = ps.mortgaged ? 'M' : '';
      const price = el.querySelector('.sp-price');
      price.textContent = owner && !ps.mortgaged ? `${money(R.rentFor(st, space.id, { dice: 7 }))}${ASSETS[space.id].kind === 'service' ? '*' : ''}` : money(ASSETS[space.id].price);
      price.classList.toggle('is-rent', !!owner && !ps.mortgaged);
      const dev = el.querySelector('.sp-dev');
      dev.innerHTML = ps.level === 4 ? '<b class="pip tower" title="Landmark Tower"></b>' : '<b class="pip"></b>'.repeat(ps.level);
      el.dataset.level = ps.level;
      el.setAttribute('aria-label', `${spaceName(space)}${owner ? `, owned by ${owner.name}` : ', unowned'}${ps.level ? `, ${LEVELS[ps.level].name}` : ''}${ps.mortgaged ? ', mortgaged' : ''}`);
      const boosted = R.effectMultiplier(st, space.id);
      el.classList.toggle('boosted', boosted > 1);
      el.classList.toggle('dampened', boosted < 1);
    });
    for (const p of st.players) {
      tokenEls[p.id]?.classList.toggle('gone', p.bankrupt);
      tokenEls[p.id]?.classList.toggle('active', p.id === st.turn.player && !st.finished);
    }
    layoutTokens();
  }

  function syncPositions(st) {
    positions = Object.fromEntries(st.players.map(p => [p.id, p.position]));
    layoutTokens();
  }

  function layoutTokens() {
    if (!board) return;
    const byspace = {};
    for (const [pid, idx] of Object.entries(positions)) (byspace[idx] ||= []).push(pid);
    const unit = spaceEls[1] ? Math.min(spaceEls[1].offsetWidth, spaceEls[1].offsetHeight) : 40;
    const size = Math.max(16, Math.min(34, unit * 0.52));
    root.style.setProperty('--token', `${size}px`);
    for (const [idx, pids] of Object.entries(byspace)) {
      const el = spaceEls[idx];
      if (!el) continue;
      const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      pids.forEach((pid, k) => {
        const spread = pids.length > 1 ? size * 0.42 : 0;
        const ox = pids.length > 1 ? (k % 2 ? spread : -spread) : 0;
        const oy = pids.length > 2 ? (k < 2 ? -spread : spread) : 0;
        const t = tokenEls[pid];
        if (t) t.style.transform = `translate(${cx + ox - size / 2}px, ${cy + oy - size / 2}px)`;
      });
    }
  }

  async function animateMoves(moves, { stepMs, onStep }) {
    for (const m of moves) {
      const t = tokenEls[m.player];
      if (m.jump || stepMs <= 0) {
        t?.classList.add('jump');
        positions[m.player] = m.path[m.path.length - 1];
        layoutTokens();
        if (stepMs > 0) await sleep(stepMs * 3);
        t?.classList.remove('jump');
        continue;
      }
      root.style.setProperty('--step', `${Math.round(stepMs * 0.9)}ms`);
      for (const idx of m.path) {
        positions[m.player] = idx;
        layoutTokens();
        onStep?.(idx);
        await sleep(stepMs);
      }
    }
  }

  function setDice(d, rolling = false) {
    root.querySelectorAll('.die').forEach((el, i) => {
      el.innerHTML = dieFace(d?.[i] ?? 1);
      el.classList.toggle('rolling', rolling);
    });
  }

  async function rollDice(final, ms) {
    if (ms <= 0) { setDice(final); return; }
    const end = performance.now() + ms;
    while (performance.now() < end) {
      // cosmetic tumbling only; the real result was already rolled by the engine
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)], true);
      await sleep(70);
    }
    setDice(final);
  }

  // the big roll result in the middle of the board, shown between the dice and the move
  async function showRollTotal(d, holdMs) {
    const el = root.querySelector('#rollTotal');
    if (!el) return;
    el.innerHTML = `<b>${d[0] + d[1]}</b><span>${d[0]} + ${d[1]}</span>${d[0] === d[1] ? '<em>Doubles!</em>' : ''}`;
    el.classList.remove('out');
    el.hidden = false;
    await sleep(holdMs);
  }
  async function hideRollTotal(fadeMs = 250) {
    const el = root.querySelector('#rollTotal');
    if (!el || el.hidden) return;
    el.classList.add('out');
    await sleep(fadeMs);
    el.hidden = true;
  }

  function showCard(card) {
    const slot = root.querySelector('#cardSlot');
    if (!slot) return;
    if (!card) { slot.innerHTML = ''; return; }
    const c = CARDS[card.id];
    const who = lastState ? R.playerName(lastState, card.player) : '';
    slot.innerHTML = `<article class="event-card deck-${card.deck}">
      <header><span class="deck-ico">${icon(card.deck)}</span>${esc(DECK_NAMES[card.deck])}</header>
      <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
      <footer>drawn by ${esc(who)}</footer></article>`;
  }

  function setMessage(html) {
    const el = root.querySelector('#centerMsg');
    if (el) el.innerHTML = html;
  }

  function highlight(idx) {
    spaceEls.forEach((el, i) => el.classList.toggle('focus', i === idx));
  }

  new ResizeObserver(() => {
    const w = root.offsetWidth;
    root.classList.toggle('dense', w < 640);
    root.classList.toggle('tiny', w < 430);
    layoutTokens();
  }).observe(root);

  return { build, update, syncPositions, layoutTokens, animateMoves, rollDice, showRollTotal, hideRollTotal, setDice, showCard, setMessage, highlight };
}
