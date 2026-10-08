// Small visual helpers for swipe feedback. Pure DOM + CSS transitions.

/** Follow the finger horizontally, fading slightly. */
export function dragX(el, dx, { fade = 220, resist = 1 } = {}) {
  el.style.transition = 'none';
  el.style.transform = `translateX(${dx * resist}px)`;
  el.style.opacity = String(1 - Math.min(0.6, Math.abs(dx) / fade));
}

/** Spring back to rest. */
export function settle(el) {
  el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s';
  el.style.transform = '';
  el.style.opacity = '';
}

/** After the content changed, slide the new content in from the side the swipe came from. */
export function slideIn(el, dir) {
  const from = dir === 'left' ? 48 : -48; // swiped left -> new content enters from the right
  el.style.transition = 'none';
  el.style.transform = `translateX(${from}px)`;
  el.style.opacity = '0';
  void el.offsetWidth; // commit the start position
  settle(el);
}
