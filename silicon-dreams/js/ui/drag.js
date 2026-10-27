// Pointer-based drag and drop (mouse, pen and touch) with a floating ghost, live drop-target
// highlighting and rotation while dragging (R key, right click or mouse wheel).

let active = null;

export function isDragging() { return !!active; }

export function makeDraggable(el, opts) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || active) return;
    const sx = e.clientX, sy = e.clientY;
    let started = false;
    const move = ev => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) { started = true; begin(ev, el, opts); }
      if (started) drag(ev);
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (started) end(ev, false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}

function begin(e, el, opts) {
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = opts.ghost();
  document.body.append(ghost);
  document.body.classList.add('dragging');
  active = { opts, ghost, rot: opts.rot || 0, target: null, el };
  el.classList.add('drag-source');
  setRot(active.rot);
  window.addEventListener('keydown', key);
  window.addEventListener('contextmenu', ctx, true);
  window.addEventListener('wheel', wheel, { passive: false });
  if (opts.onStart) opts.onStart();
  drag(e);
}

function setRot(r) {
  if (!active) return;
  active.rot = ((r % 360) + 360) % 360;
  const inner = active.ghost.firstElementChild;
  if (inner && active.opts.rotatable) inner.style.transform = `rotate(${active.rot}deg)`;
  if (active.opts.onRotate) active.opts.onRotate(active.rot, active.ghost);
}
const step = () => (active.opts.rotStep || 90);
function key(e) {
  if (!active) return;
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (active.opts.rotatable) setRot(active.rot + step()); }
  if (e.key === 'Escape') { e.preventDefault(); end(null, true); }
}
function ctx(e) { if (!active) return; e.preventDefault(); e.stopPropagation(); if (active.opts.rotatable) setRot(active.rot + step()); }
function wheel(e) { if (!active || !active.opts.rotatable) return; e.preventDefault(); setRot(active.rot + (e.deltaY > 0 ? step() : -step())); }

function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest(active.opts.targets || '[data-zone]') : null;
}

function drag(e) {
  if (!active) return;
  active.ghost.style.left = `${e.clientX}px`;
  active.ghost.style.top = `${e.clientY}px`;
  const t = targetAt(e.clientX, e.clientY);
  if (t !== active.target) {
    if (active.target) active.target.classList.remove('hover');
    active.target = t;
    if (t) t.classList.add('hover');
    if (active.opts.onHover) active.opts.onHover(t, active.ghost, active.rot);
  }
}

function end(e, cancelled) {
  if (!active) return;
  const a = active;
  const t = !cancelled && e ? targetAt(e.clientX, e.clientY) : null;
  active = null;
  window.removeEventListener('keydown', key);
  window.removeEventListener('contextmenu', ctx, true);
  window.removeEventListener('wheel', wheel);
  document.body.classList.remove('dragging');
  a.el.classList.remove('drag-source');
  if (a.target) a.target.classList.remove('hover');
  a.ghost.remove();
  if (a.opts.onEnd) a.opts.onEnd();
  if (t && a.opts.onDrop) a.opts.onDrop(t, a.rot);
}
