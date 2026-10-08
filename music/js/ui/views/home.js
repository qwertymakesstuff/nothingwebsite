import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { demoTracks } from '../../dev/demoTracks.js';

export function HomeView({ player, router, services }) {
  const el = h('section', { class: 'view-section' },
    h('h1', { class: 'page-title' }, 'Home'),
    h('div', { class: 'hero' },
      h('div', { class: 'hero__icon', 'aria-hidden': 'true' }, icon('note', 36)),
      h('h2', null, 'Your music, in one place'),
      h('p', null, 'Search for a song, artist or channel and press play. Everything plays through the official YouTube player.'),
      h('div', { class: 'hero__actions' },
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('search') }, icon('search', 20), 'Go to search'))),
    !services.simulated ? null : h('div', { class: 'card card--dev' },
      h('div', { class: 'card__eyebrow' }, 'UI test mode'),
      h('p', null, 'Simulated engine (?engine=sim): no real audio. Load a few made-up tracks to try the player, queue and controls. The demo includes a track with no artwork, a broken artwork link, and one that fails to load.'),
      h('button', { class: 'btn', type: 'button', onclick: () => player.playTracks(demoTracks, 0) }, 'Load demo tracks')));
  return { el, destroy() {} };
}
