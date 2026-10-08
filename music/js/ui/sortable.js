// Drag-to-reorder for a list of rows. Pointer events, so one code path serves mouse, touch and pen.
// Only the grip (`.row__grip`) starts a drag, so scrolling the list by touch keeps working.
// While dragging, rows are only moved with CSS transforms; the real reorder happens once, on drop,
// through onMove(from, to) (the player), and the list re-renders from the store afterwards.

const EDGE = 56;      // px from the scroll container's edge where auto-scroll starts
const MAX_SPEED = 18; // px per frame

function scrollParent(el) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement || document.documentElement;
}

/** @returns {{ destroy(): void, isDragging(): boolean }} */
export function makeSortable(list, { onMove, onEnd = () => {} }) {
  let drag = null;

  function rows() { return [...list.children]; }

  function start(e) {
    const grip = e.target.closest?.('.row__grip');
    if (!grip || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const row = grip.closest('.row');
    const all = rows();
    const from = all.indexOf(row);
    if (from < 0) return;
    e.preventDefault();
    const scroller = scrollParent(list);
    drag = {
      id: e.pointerId, grip, row, from, to: from, all,
      rects: all.map((r) => r.getBoundingClientRect()),
      startY: e.clientY, lastY: e.clientY,
      scroller, startScroll: scroller.scrollTop, raf: 0,
    };
    try { grip.setPointerCapture(e.pointerId); } catch { /* not capturable: window listeners below still work */ }
    row.classList.add('is-dragging');
    list.classList.add('is-sorting');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onKey, true);
  }

  function layout() {
    const d = drag;
    const dy = (d.lastY - d.startY) + (d.scroller.scrollTop - d.startScroll);
    const r0 = d.rects[d.from];
    const center = r0.top + r0.height / 2 + dy;
    let to = d.from;
    for (let i = d.from + 1; i < d.rects.length; i++) if (center > d.rects[i].top + d.rects[i].height / 2) to = i;
    for (let i = 0; i < d.from; i++) if (center < d.rects[i].top + d.rects[i].height / 2) { to = i; break; }
    d.to = to;
    const h = r0.height;
    d.all.forEach((r, i) => {
      if (i === d.from) { r.style.transform = `translateY(${dy}px)`; return; }
      let shift = 0;
      if (d.from < to && i > d.from && i <= to) shift = -h;
      if (d.from > to && i >= to && i < d.from) shift = h;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }

  function autoScroll() {
    const d = drag;
    if (!d) return;
    const box = d.scroller === document.scrollingElement || d.scroller === document.documentElement
      ? { top: 0, bottom: window.innerHeight }
      : d.scroller.getBoundingClientRect();
    let v = 0;
    if (d.lastY < box.top + EDGE) v = -MAX_SPEED * Math.min(1, (box.top + EDGE - d.lastY) / EDGE);
    else if (d.lastY > box.bottom - EDGE) v = MAX_SPEED * Math.min(1, (d.lastY - (box.bottom - EDGE)) / EDGE);
    if (v) { d.scroller.scrollTop += v; layout(); }
    d.raf = requestAnimationFrame(autoScroll);
  }

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.lastY = e.clientY;
    layout();
    if (!drag.raf) drag.raf = requestAnimationFrame(autoScroll);
  }

  function finish() {
    const d = drag;
    cancelAnimationFrame(d.raf);
    d.all.forEach((r) => { r.style.transform = ''; });
    d.row.classList.remove('is-dragging');
    list.classList.remove('is-sorting');
    try { d.grip.releasePointerCapture(d.id); } catch { /* already released */ }
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', onKey, true);
    drag = null;
    return d;
  }

  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = finish();
    if (d.to !== d.from) onMove(d.from, d.to);
    onEnd();
  }

  function cancel(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    finish();
    onEnd();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel({}); }
  }

  list.addEventListener('pointerdown', start);
  return {
    isDragging: () => !!drag,
    destroy() {
      list.removeEventListener('pointerdown', start);
      if (drag) finish();
    },
  };
}
