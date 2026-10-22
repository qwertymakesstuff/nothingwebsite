// The board where elements are placed and combined. Positions are fractions (0..1) of the board's
// width and height so a layout survives resizing. Every change is undoable; discoveries are not
// part of this state, so undo never takes a discovery away.

export const UNDO_LIMIT = 60;

export function createWorkspace() {
  return { items: [], nextUid: 1, history: [] };
}

const clamp01 = v => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
const snapshot = ws => ({ items: ws.items.map(i => ({ ...i })), nextUid: ws.nextUid });

function record(ws) {
  ws.history.push(snapshot(ws));
  if (ws.history.length > UNDO_LIMIT) ws.history.shift();
}

export function addItem(ws, id, x, y) {
  record(ws);
  const item = { uid: ws.nextUid++, id, x: clamp01(x), y: clamp01(y) };
  ws.items.push(item);
  return item;
}

export function moveItem(ws, uid, x, y) {
  const item = ws.items.find(i => i.uid === uid);
  if (!item) return null;
  record(ws);
  item.x = clamp01(x); item.y = clamp01(y);
  ws.items.push(ws.items.splice(ws.items.indexOf(item), 1)[0]); // moved item draws on top
  return item;
}

export function removeItem(ws, uid) {
  if (!ws.items.some(i => i.uid === uid)) return false;
  record(ws);
  ws.items = ws.items.filter(i => i.uid !== uid);
  return true;
}

// Replace the target (and the dragged item, when it was already on the board) with the result,
// at the target's position. `draggedUid` is null when the element came from the inventory.
export function combineItems(ws, draggedUid, targetUid, resultId) {
  const target = ws.items.find(i => i.uid === targetUid);
  if (!target) return null;
  record(ws);
  ws.items = ws.items.filter(i => i.uid !== targetUid && i.uid !== draggedUid);
  const item = { uid: ws.nextUid++, id: resultId, x: target.x, y: target.y };
  ws.items.push(item);
  return item;
}

export function clearWorkspace(ws) {
  if (!ws.items.length) return false;
  record(ws);
  ws.items = [];
  return true;
}

export function undo(ws) {
  const prev = ws.history.pop();
  if (!prev) return false;
  ws.items = prev.items;
  ws.nextUid = Math.max(ws.nextUid, prev.nextUid);
  return true;
}

export const canUndo = ws => ws.history.length > 0;

// Only the board itself is saved; undo history starts fresh on each visit.
export const serializeWorkspace = ws => JSON.stringify({ items: ws.items });

export function parseWorkspace(text, isKnown) {
  const ws = createWorkspace();
  try {
    const raw = JSON.parse(text);
    for (const it of Array.isArray(raw?.items) ? raw.items : []) {
      if (it && typeof it.id === 'string' && isKnown(it.id)) ws.items.push({ uid: ws.nextUid++, id: it.id, x: clamp01(it.x), y: clamp01(it.y) });
    }
  } catch { /* corrupt or missing: start with an empty board */ }
  return ws;
}
