import { h, disposer } from '../../utils/dom.js';
import { formatTime } from '../../utils/format.js';
import { shallowEqual } from '../../core/store.js';

/** Seek slider with elapsed / total times. Dragging previews the time and seeks on release. */
export function SeekBar({ player, store, className = '' }) {
  const d = disposer();
  const cur = h('span', { class: 'time' }, '0:00');
  const tot = h('span', { class: 'time' }, '--:--');
  const input = h('input', { class: 'slider', type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Seek', disabled: true });
  const el = h('div', { class: `seekbar ${className}`.trim() }, cur, input, tot);
  let dragging = false;
  let dur = 0;

  function paint(pos) {
    const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
    input.style.setProperty('--pct', `${pct}%`);
    if (!dragging) input.value = dur > 0 ? Math.round((pos / dur) * 1000) : 0;
    cur.textContent = formatTime(pos);
    tot.textContent = dur > 0 ? formatTime(dur) : '--:--';
    input.disabled = !(dur > 0);
    input.setAttribute('aria-valuetext', `${formatTime(pos)} of ${dur > 0 ? formatTime(dur) : 'unknown'}`);
  }

  input.addEventListener('input', () => {
    dragging = true;
    paint((Number(input.value) / 1000) * dur);
  });
  input.addEventListener('change', () => {
    player.seek((Number(input.value) / 1000) * dur);
    dragging = false;
  });

  d.add(store.subscribe((s) => [s.position, s.duration], ([pos, duration]) => {
    dur = duration;
    if (!dragging) paint(pos);
  }, { equals: shallowEqual }));

  return { el, destroy: d.run };
}
