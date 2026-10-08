// Touch / pointer swipe handling. The decision logic (axis lock, velocity, direction) is pure so it
// can be unit tested; trackSwipe() wires it to real pointer events (touch, pen and mouse).

export const THRESHOLDS = { lock: 8, distance: 70, speed: 0.45, minFlick: 20 };

/** Which way is the gesture going? null until the finger has moved far enough to tell. */
export function lockAxis(dx, dy, lock = THRESHOLDS.lock) {
  if (Math.hypot(dx, dy) < lock) return null;
  return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
}

/** Velocity (px/ms) over the last `windowMs` of [{t, x, y}] samples. */
export function velocityOf(samples, windowMs = 100) {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 1; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** 'left' | 'right' | 'up' | 'down' | null. A long drag or a quick flick both count. */
export function swipeDirection({ axis, dx, dy, vx, vy }, { distance, speed, minFlick } = THRESHOLDS) {
  const d = axis === 'x' ? dx : dy;
  const v = axis === 'x' ? vx : vy;
  if (axis !== 'x' && axis !== 'y') return null;
  if (Math.abs(d) >= distance || (Math.abs(v) >= speed && Math.abs(d) >= minFlick)) {
    if (axis === 'x') return d < 0 ? 'left' : 'right';
    return d < 0 ? 'up' : 'down';
  }
  return null;
}

/**
 * Adds swipe tracking to an element.
 *   axes     'x', 'y' or 'xy': directions this element reacts to. A gesture in another direction
 *            is ignored so the browser can use it (for example, scrolling).
 *   ignore   (target) => true to skip gestures that start on e.g. sliders or buttons
 *   onStart({ axis }), onMove({ axis, dx, dy }), onEnd({ axis, dx, dy, vx, vy, dir, cancelled })
 * A plain tap never reaches these callbacks, so normal clicks keep working. After a swipe the
 * click that would follow is swallowed.
 */
export function trackSwipe(el, { axes = 'xy', ignore, onStart, onMove, onEnd, thresholds = THRESHOLDS } = {}) {
  let st = null;
  let swallowUntil = 0;

  const point = (e) => ({ t: e.timeStamp, x: e.clientX, y: e.clientY });

  function down(e) {
    if (st || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (ignore?.(e.target)) return;
    st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: null, ignored: false, samples: [point(e)] };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function move(e) {
    if (!st || e.pointerId !== st.id || st.ignored) return;
    const dx = e.clientX - st.x0;
    const dy = e.clientY - st.y0;
    st.samples.push(point(e));
    if (st.samples.length > 10) st.samples.shift();
    if (!st.axis) {
      const axis = lockAxis(dx, dy, thresholds.lock);
      if (!axis) return;
      if (!axes.includes(axis)) { st.ignored = true; return; }
      st.axis = axis;
      onStart?.({ axis });
    }
    onMove?.({ axis: st.axis, dx, dy });
  }

  function finish(e, cancelled) {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    if (!s.axis) return;
    swallowUntil = performance.now() + 350;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    const { vx, vy } = velocityOf(s.samples);
    const dir = cancelled ? null : swipeDirection({ axis: s.axis, dx, dy, vx, vy }, thresholds);
    onEnd?.({ axis: s.axis, dx, dy, vx, vy, dir, cancelled });
  }
  const up = (e) => finish(e, false);
  const cancel = (e) => finish(e, true);

  const swallowClick = (e) => {
    if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('click', swallowClick, true);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('click', swallowClick, true);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
  };
}
