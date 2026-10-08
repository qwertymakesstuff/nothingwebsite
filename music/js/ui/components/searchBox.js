import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';

/** Search field. Phase 1: submitting navigates to the search view; real search comes later. */
export function SearchBox({ router, initial = '', autofocus = false, className = '' }) {
  const input = h('input', {
    class: 'searchbox__input', type: 'search', name: 'q', value: initial,
    placeholder: 'Search songs, artists, albums', autocomplete: 'off', enterkeyhint: 'search',
    'aria-label': 'Search',
  });
  const form = h('form', { class: `searchbox ${className}`.trim(), role: 'search' }, icon('search', 20), input);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    router.navigate('search', q ? { q } : undefined);
    input.blur();
  });
  if (autofocus) queueMicrotask(() => input.focus({ preventScroll: true }));
  return { el: form, input, setValue(v) { if (document.activeElement !== input) input.value = v; } };
}
