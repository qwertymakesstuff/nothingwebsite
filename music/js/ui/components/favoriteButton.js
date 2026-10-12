import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';
import { openPlaylistPicker, trackActions } from './trackActions.js';

/** Heart for whatever is playing now. */
export function FavoriteButton({ store, player, library, ui, size = 24 }) {
  const d = disposer();
  const btn = h('button', { class: 'icon-btn fav-btn', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Favorite', title: 'Favorite', disabled: true });
  btn.addEventListener('click', () => {
    const t = selectCurrent(store.getState());
    if (t) trackActions(t, { player, library, ui }).toggleLike();
  });
  const paint = () => {
    const t = selectCurrent(store.getState());
    const on = !!t && library.isFavorite(t.id);
    btn.disabled = !t;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Favorite');
    btn.title = on ? 'Remove from favorites' : 'Favorite';
    btn.replaceChildren(icon(on ? 'heart' : 'heart-outline', size));
  };
  d.add(store.subscribe((s) => selectCurrent(s)?.id ?? null, paint));
  d.add(library.subscribe((s) => s.favorites, paint, { immediate: false }));
  return { el: btn, destroy: d.run };
}

/** "Add the current song to a playlist". */
export function PlaylistAddButton({ store, library, ui, size = 24 }) {
  const d = disposer();
  const btn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Add to playlist', title: 'Add to playlist', disabled: true }, icon('bookmark-add', size));
  btn.addEventListener('click', () => {
    const t = selectCurrent(store.getState());
    if (t) openPlaylistPicker({ library, tracks: [t], ui });
  });
  d.add(store.subscribe((s) => !!selectCurrent(s), (has) => { btn.disabled = !has; }));
  return { el: btn, destroy: d.run };
}
