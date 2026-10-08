// Media Session integration: what the phone lock screen, notification shade, headset / Bluetooth
// buttons and keyboard media keys show and control. It only mirrors the player's state and forwards
// actions to the Player; it never plays anything itself.

import * as Q from './queueManager.js';
import { selectCurrent } from './player.js';
import { shallowEqual } from '../core/store.js';

export function isMediaSessionSupported(nav = globalThis.navigator) {
  return !!nav && 'mediaSession' in nav;
}

const YT_SIZES = { maxresdefault: '1280x720', sddefault: '640x480', hqdefault: '480x360', mqdefault: '320x180', default: '120x90' };

/** Artwork list for MediaMetadata: the track's own image plus YouTube thumbnails that always exist. */
export function buildArtwork(track) {
  const out = [];
  const add = (src) => {
    if (typeof src !== 'string' || !src.startsWith('https://') || out.some((a) => a.src === src)) return;
    const name = /\/([a-z]*default)\.(?:jpg|webp)/i.exec(src)?.[1]?.toLowerCase();
    const ext = /\.(jpg|jpeg|png|webp)(?:$|\?)/i.exec(src)?.[1]?.toLowerCase();
    out.push({
      src,
      ...(name && YT_SIZES[name] ? { sizes: YT_SIZES[name] } : {}),
      ...(ext ? { type: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}` } : {}),
    });
  };
  add(track?.artwork);
  if (track?.videoId) {
    add(`https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`);
    add(`https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`);
  }
  return out;
}

const hasNext = (s) => Q.next(s.queue, { repeat: s.repeat, shuffle: s.shuffle }).moved;

/**
 * @param {{ player: object, store: object, nav?: Navigator, MetadataCtor?: Function,
 *           now?: () => number, log?: (...a: any[]) => void }} deps
 */
export function createMediaSession({ player, store, nav = globalThis.navigator, MetadataCtor = globalThis.MediaMetadata, now = () => performance.now(), log = () => {}, onPlay = () => {} }) {
  if (!isMediaSessionSupported(nav) || typeof MetadataCtor !== 'function') {
    log('media session: not supported in this browser');
    return { supported: false, destroy() {} };
  }
  const ms = nav.mediaSession;
  const subs = [];
  const safe = (what, fn) => { try { fn(); } catch (e) { log(`media session: ${what} failed:`, e?.message || String(e)); } };
  const setHandler = (action, handler) => safe(`handler ${action}`, () => ms.setActionHandler(action, handler));
  const act = (name, fn) => (details) => { log(`media session action: ${name}`, details?.seekTime ?? details?.seekOffset ?? ''); fn(details); };
  const state = () => store.getState();
  let last = null; // last position pushed to the OS; declared before the subscriptions below, which fire immediately

  // ---- actions (lock screen, headset, Bluetooth, media keys) ----
  setHandler('play', act('play', () => { onPlay(); player.play(); })); // onPlay runs inside the lock-screen gesture
  setHandler('pause', act('pause', () => player.pause()));
  setHandler('stop', act('stop', () => player.pause()));
  setHandler('previoustrack', act('previoustrack', () => { onPlay(); player.previous(); }));
  setHandler('seekto', act('seekto', (d) => { if (Number.isFinite(d?.seekTime)) player.seek(d.seekTime); }));
  setHandler('seekbackward', act('seekbackward', (d) => player.seek(state().position - (d?.seekOffset || 10))));
  setHandler('seekforward', act('seekforward', (d) => player.seek(state().position + (d?.seekOffset || 10))));

  // Only offer "next" when there is one, so the lock screen button is greyed out at the end of the queue.
  let nextEnabled = null;
  subs.push(store.subscribe((s) => hasNext(s) && !!selectCurrent(s), (on) => {
    if (on === nextEnabled) return;
    nextEnabled = on;
    setHandler('nexttrack', on ? act('nexttrack', () => { onPlay(); player.next(); }) : null);
  }));

  // ---- what is playing ----
  subs.push(store.subscribe(selectCurrent, (track) => {
    safe('metadata', () => {
      ms.metadata = track
        ? new MetadataCtor({ title: track.title, artist: track.artist || '', album: 'missing music', artwork: buildArtwork(track) })
        : null;
    });
    last = null; // new track: always push a fresh position
    log('media session: now playing', track ? `${track.title} - ${track.artist}` : '(nothing)');
  }));

  // ---- playing / paused ----
  const playbackState = (s) => (!selectCurrent(s) ? 'none' : (s.status === 'playing' || s.status === 'loading') ? 'playing' : 'paused');
  subs.push(store.subscribe(playbackState, (v) => safe('playbackState', () => { ms.playbackState = v; })));

  // ---- position (for the lock-screen scrubber) ----
  // Browsers extrapolate the position between calls, so only push when it drifts, jumps (seek) or the
  // playing state / duration changes.
  function pushPosition() {
    const s = state();
    if (!selectCurrent(s) || !(s.duration > 0) || s.adPlaying) return;
    const playing = s.status === 'playing';
    const pos = Math.min(Math.max(s.position, 0), s.duration);
    const t = now();
    if (last && last.playing === playing && last.duration === s.duration) {
      const predicted = last.pos + (playing ? (t - last.at) / 1000 : 0);
      if (Math.abs(predicted - pos) < 1.5 && t - last.at < 10000) return;
    }
    safe('positionState', () => ms.setPositionState({ duration: s.duration, playbackRate: 1, position: pos }));
    last = { pos, at: t, playing, duration: s.duration };
  }
  subs.push(store.subscribe((s) => [s.position, s.duration, s.status === 'playing', selectCurrent(s)?.id], pushPosition, { equals: shallowEqual }));

  return {
    supported: true,
    destroy() {
      subs.forEach((off) => off());
      for (const a of ['play', 'pause', 'stop', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward']) setHandler(a, null);
      safe('reset', () => { ms.metadata = null; ms.playbackState = 'none'; });
    },
  };
}
