// A reusable strip spinner (used by battles). Lays out `strip` in `track`, then scrolls along
// `axis` until card `index` sits under the viewport's centre line, using the same time-based
// plan as the main case roulette.

import { planSpin, offsetAt, centerOffset, indexAtOffset } from '../roulette.js';
import { sound } from './sound.js';

export function createSpinner(viewport, track, { axis = 'y' } = {}) {
  let raf = 0, done = null, plan = null, index = 0;
  const size = el => (axis === 'y' ? el.getBoundingClientRect().height : el.getBoundingClientRect().width);
  const geometry = () => {
    const st = getComputedStyle(track);
    return { cardWidth: size(track.firstElementChild), gap: parseFloat(axis === 'y' ? st.rowGap : st.columnGap) || 0, viewportWidth: axis === 'y' ? viewport.clientHeight : viewport.clientWidth };
  };
  const place = off => { track.style.transform = axis === 'y' ? `translate3d(0,${-off}px,0)` : `translate3d(${-off}px,0,0)`; };
  const land = () => { place(centerOffset(index, geometry())); track.children[index]?.classList.add('rl-win'); };
  const finish = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    land();
    const d = done; done = null; d?.();
  };
  return {
    // Shows the strip and resolves once it has stopped on `winnerIndex`.
    spin(html, winnerIndex, { duration, settle = 250, instant = false, ticks = false } = {}) {
      track.innerHTML = html;
      index = winnerIndex;
      place(0);
      if (instant) { land(); return Promise.resolve(); }
      const g = geometry();
      plan = planSpin(winnerIndex, g, { duration, settle });
      let start = null, last = -1;
      return new Promise(resolve => {
        done = resolve;
        const frame = now => {
          start ??= now;
          const el = now - start;
          const off = offsetAt(el, plan);
          place(off);
          if (ticks) { const i = indexAtOffset(off, g); if (i !== last && el < plan.duration) { last = i; sound.tick(); } }
          if (el >= plan.total) finish();
          else raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });
    },
    skip() { if (done) finish(); },
    show(html, winnerIndex) { track.innerHTML = html; index = winnerIndex; land(); },
    recenter() { if (!done && track.children.length) land(); },
    cancel() { cancelAnimationFrame(raf); raf = 0; done = null; },
  };
}
