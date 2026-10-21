// Toast notifications: a small stack in the corner, newest at the bottom. Each one
// dismisses itself after a few seconds or on click. Up to four show at once (two on
// phones); the rest wait their turn, so a burst of unlocks never floods the screen.
const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 820px)') : { matches: false };
const maxVisible = () => (narrow.matches ? 2 : 4);
const SHOW_MS = 4500;

export function createNotifier(container) {
  const queue = [];
  let visible = 0;

  function dismiss(el) {
    if (el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    setTimeout(() => { el.remove(); visible--; pump(); }, 260);
  }

  function pump() {
    while (visible < maxVisible() && queue.length) {
      const { title, body, icon, kind } = queue.shift();
      const el = document.createElement('div');
      el.className = `toast toast-${kind || 'info'}`;
      el.setAttribute('role', 'status');
      el.innerHTML = `${icon ? `<span class="toast-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${icon}</svg></span>` : ''}
        <span class="toast-text"><strong></strong><span></span></span>`;
      el.querySelector('strong').textContent = title;
      el.querySelector('.toast-text span').textContent = body || '';
      el.addEventListener('click', () => dismiss(el));
      container.appendChild(el);
      visible++;
      setTimeout(() => dismiss(el), SHOW_MS);
    }
  }

  return function notify(toast) {
    queue.push(toast);
    pump();
  };
}
