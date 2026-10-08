import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';

/** Persists and applies the "show the video instead of the cover" choice. */
export function setVideoVisible(ui, prefs, on) {
  ui.setState({ videoVisible: on });
  prefs.set({ videoVisible: on });
}

/** Segmented "Cover | Video" switch (desktop expanded player). */
export function MediaToggle({ ui, prefs }) {
  const d = disposer();
  const mk = (label, iconName, on) => h('button', {
    class: 'media-toggle__btn', type: 'button', 'aria-pressed': 'false',
    onclick: () => setVideoVisible(ui, prefs, on),
  }, icon(iconName, 18), label);
  const cover = mk('Cover', 'image', false);
  const video = mk('Video', 'video', true);
  const el = h('div', { class: 'media-toggle', role: 'group', 'aria-label': 'Show cover or video' }, cover, video);
  d.add(ui.subscribe((s) => s.videoVisible, (on) => {
    cover.setAttribute('aria-pressed', String(!on));
    video.setAttribute('aria-pressed', String(on));
  }));
  return { el, destroy: d.run };
}

/** Single icon button toggle (mobile player header): shows what you would switch TO. */
export function MediaToggleIcon({ ui, prefs }) {
  const d = disposer();
  const btn = h('button', { class: 'icon-btn media-toggle-icon', type: 'button', onclick: () => setVideoVisible(ui, prefs, !ui.getState().videoVisible) });
  d.add(ui.subscribe((s) => s.videoVisible, (on) => {
    btn.replaceChildren(icon(on ? 'image' : 'video', 24));
    btn.setAttribute('aria-label', on ? 'Show cover' : 'Show video');
    btn.setAttribute('aria-pressed', String(on));
  }));
  return { el: btn, destroy: d.run };
}
