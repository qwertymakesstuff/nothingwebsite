import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { formatTime } from '../../utils/format.js';

/**
 * One track in a list (search results, queue, playlists). The row itself plays the track.
 *   actions   [{ icon, label, onClick, secondary }]   extra icon buttons; `secondary` ones are hidden on phones
 *   like      { onToggle }                            adds the heart (favorite) button
 *   menu      () => [{ icon, label, onClick }]        adds a "more" button on phones that opens these actions
 *   grip      { onNudge(-1 | 1) }                     adds a drag handle; Up / Down on it move the song
 *   subtitle  replaces the artist line
 * The parent calls setState() to mark the row current / playing / liked without re-rendering the list.
 */
export function TrackRow({ track, onPlay, actions = [], subtitle, grip = null, like = null, menu = null }) {
  const art = Artwork('row__art');
  art.update(track);
  const eq = h('span', { class: 'eq', 'aria-hidden': 'true', hidden: true }, h('i'), h('i'), h('i'));

  const main = h('button', { class: 'row__main', type: 'button', 'aria-label': `Play ${track.title}`, onclick: onPlay },
    h('div', { class: 'row__art-wrap' }, art.el, eq),
    h('div', { class: 'row__text' },
      h('div', { class: 'row__title' }, track.title),
      h('div', { class: 'row__artist' }, subtitle ?? (track.artist || 'Unknown artist'))),
    h('span', { class: 'row__time' }, track.duration ? formatTime(track.duration) : ''));

  const buttons = actions.map((a) => h('button', {
    class: `icon-btn row__action${a.secondary ? ' row__action--secondary' : ''}`, type: 'button', 'aria-label': `${a.label}: ${track.title}`, title: a.label,
    onclick: (e) => { e.stopPropagation(); a.onClick(); },
  }, icon(a.icon, 20)));

  const likeBtn = like ? h('button', {
    class: 'icon-btn row__action row__like', type: 'button', 'aria-pressed': 'false', 'aria-label': `Favorite: ${track.title}`, title: 'Favorite',
    onclick: (e) => { e.stopPropagation(); like.onToggle(); },
  }, icon('heart-outline', 20)) : null;

  const moreBtn = menu ? h('button', {
    class: 'icon-btn row__action row__more', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `More actions: ${track.title}`, title: 'More',
    onclick: (e) => { e.stopPropagation(); menu(); },
  }, icon('more', 20)) : null;

  const handle = grip ? h('button', {
    class: 'row__grip', type: 'button', 'aria-label': `Reorder ${track.title}. Use the up and down arrow keys.`, title: 'Drag to reorder',
    onkeydown: (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      grip.onNudge(e.key === 'ArrowUp' ? -1 : 1);
    },
  }, icon('grip', 20)) : null;

  const el = h('li', { class: `row${grip ? ' row--sortable' : ''}` }, handle, main, likeBtn, buttons, moreBtn);

  let liked = false;
  function setState({ current = false, playing = false, liked: nextLiked } = {}) {
    el.classList.toggle('is-current', current);
    eq.hidden = !current;
    eq.classList.toggle('is-playing', current && playing);
    if (current) main.setAttribute('aria-current', 'true'); else main.removeAttribute('aria-current');
    if (likeBtn && nextLiked !== undefined && nextLiked !== liked) {
      liked = nextLiked;
      likeBtn.setAttribute('aria-pressed', String(liked));
      likeBtn.setAttribute('aria-label', `${liked ? 'Remove from favorites' : 'Favorite'}: ${track.title}`);
      likeBtn.title = liked ? 'Remove from favorites' : 'Favorite';
      likeBtn.classList.toggle('is-on', liked);
      likeBtn.replaceChildren(icon(liked ? 'heart' : 'heart-outline', 20));
    }
  }

  return { el, setState, grip: handle };
}
