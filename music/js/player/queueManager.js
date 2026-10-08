// Pure queue logic. No DOM, no engine, no store - just data in, data out.
//
// A queue is { items, order, pos }:
//   items - the tracks, in the order they were added
//   order - the PLAY order, as indices into items (identity when shuffle is off)
//   pos   - position inside `order` of the current track (-1 when empty)
// Keeping play order separate from items lets shuffle, "play next" and removal
// all work without losing track of what is currently playing.

export const MAX_QUEUE = 500; // also the most the saved queue keeps

export const emptyQueue = () => ({ items: [], order: [], pos: -1 });

const identity = (n) => Array.from({ length: n }, (_, i) => i);

export function shuffleOrder(n, firstIndex, rng = Math.random) {
  const rest = [];
  for (let i = 0; i < n; i++) if (i !== firstIndex) rest.push(i);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return firstIndex >= 0 && firstIndex < n ? [firstIndex, ...rest] : rest;
}

export function currentIndex(q) {
  return q.pos >= 0 && q.pos < q.order.length ? q.order[q.pos] : -1;
}

export function currentItem(q) {
  const i = currentIndex(q);
  return i >= 0 ? q.items[i] : null;
}

/** Tracks in play order. */
export function playOrderItems(q) {
  return q.order.map((i) => q.items[i]);
}

export function setItems(items, startIndex = 0, { shuffle = false, rng } = {}) {
  const n = items.length;
  if (!n) return emptyQueue();
  const start = Math.min(n - 1, Math.max(0, startIndex));
  if (shuffle) return { items: [...items], order: shuffleOrder(n, start, rng), pos: 0 };
  return { items: [...items], order: identity(n), pos: start };
}

/** Rebuild the play order after shuffle is toggled, keeping the current track current. */
export function rebuildOrder(q, shuffle, rng) {
  const n = q.items.length;
  if (!n) return q;
  const cur = currentIndex(q);
  if (shuffle) return { ...q, order: shuffleOrder(n, cur, rng), pos: cur >= 0 ? 0 : -1 };
  return { ...q, order: identity(n), pos: cur };
}

export function next(q, { repeat = 'off', shuffle = false, rng } = {}) {
  if (!q.items.length) return { queue: q, moved: false, ended: true };
  if (q.pos < q.order.length - 1) return { queue: { ...q, pos: q.pos + 1 }, moved: true, ended: false };
  if (repeat === 'all') {
    // Looping a shuffled queue: shuffle again (and never start the new round with the song that just played).
    if (shuffle && q.items.length > 1) {
      const lastIdx = q.order[q.order.length - 1];
      const random = rng ?? Math.random;
      let first = Math.floor(random() * (q.items.length - 1));
      if (first >= lastIdx) first += 1;
      return { queue: { ...q, order: shuffleOrder(q.items.length, first, rng), pos: 0 }, moved: true, ended: false, wrapped: true };
    }
    return { queue: { ...q, pos: 0 }, moved: true, ended: false, wrapped: true };
  }
  return { queue: q, moved: false, ended: true };
}

export function previous(q, { repeat = 'off' } = {}) {
  if (!q.items.length) return { queue: q, moved: false };
  if (q.pos > 0) return { queue: { ...q, pos: q.pos - 1 }, moved: true };
  if (repeat === 'all') return { queue: { ...q, pos: q.order.length - 1 }, moved: true, wrapped: true };
  return { queue: q, moved: false };
}

export function jumpTo(q, orderPos) {
  if (orderPos < 0 || orderPos >= q.order.length) return q;
  return { ...q, pos: orderPos };
}

export function append(q, items) {
  if (!items.length) return q;
  if (!q.items.length) return setItems(items, 0);
  const base = q.items.length;
  return {
    items: [...q.items, ...items],
    order: [...q.order, ...items.map((_, i) => base + i)],
    pos: q.pos,
  };
}

/** Insert a track so it plays right after the current one. */
export function playNext(q, item) {
  if (!q.items.length) return setItems([item], 0);
  const at = currentIndex(q) + 1;
  const items = [...q.items.slice(0, at), item, ...q.items.slice(at)];
  const order = q.order.map((i) => (i >= at ? i + 1 : i));
  order.splice(q.pos + 1, 0, at);
  return { items, order, pos: q.pos };
}

/** Remove the track at a play-order position. */
export function removeAt(q, orderPos) {
  if (orderPos < 0 || orderPos >= q.order.length) return { queue: q, removedCurrent: false };
  const idx = q.order[orderPos];
  const items = q.items.filter((_, i) => i !== idx);
  if (!items.length) return { queue: emptyQueue(), removedCurrent: true };
  const order = q.order.filter((_, p) => p !== orderPos).map((i) => (i > idx ? i - 1 : i));
  const removedCurrent = orderPos === q.pos;
  let pos = q.pos;
  if (orderPos < q.pos) pos -= 1;
  if (pos >= order.length) pos = order.length - 1;
  return { queue: { items, order, pos }, removedCurrent };
}

const isIdentityOrder = (q) => q.order.every((v, i) => v === i);

/** Where the current position ends up after moving the entry at `from` to `to`. */
function posAfterMove(cur, from, to) {
  if (cur === from) return to;
  if (from < cur && to >= cur) return cur - 1;
  if (from > cur && to <= cur) return cur + 1;
  return cur;
}

/**
 * Move the song at play-order position `from` to position `to` (both as the list shows them).
 * The current song stays the current song, wherever it ends up.
 * Unshuffled queue: the song order itself changes. Shuffled queue: only the play order changes, so
 * turning shuffle off still restores the order the songs were added in.
 */
export function move(q, from, to) {
  const n = q.order.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= n || to >= n || from === to) return q;
  const pos = posAfterMove(q.pos, from, to);
  if (isIdentityOrder(q)) {
    const items = [...q.items];
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
    return { items, order: identity(n), pos };
  }
  const order = [...q.order];
  const [v] = order.splice(from, 1);
  order.splice(to, 0, v);
  return { ...q, order, pos };
}

/** Make the song at `from` play right after the current one. */
export function moveToNext(q, from) {
  if (q.pos < 0 || from === q.pos) return q;
  return move(q, from, from < q.pos ? q.pos : q.pos + 1);
}
