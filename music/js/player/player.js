// Player facade: the single place that changes playback state.
// UI components call these actions and read from the store; they never touch the engine.

import * as Q from './queueManager.js';
import { clamp } from '../utils/format.js';

export const initialPlayerState = () => ({
  queue: Q.emptyQueue(),
  status: 'idle',      // idle | loading | playing | paused | error
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',       // off | all | one
  error: null,
  adPlaying: false,    // an ad (not the song) seems to be playing: the video is shown so it can be seen/skipped
  needsTap: false,     // the browser refused to autoplay: the user must tap the video itself (common on iPhone)
});

export const selectCurrent = (s) => Q.currentItem(s.queue);

export function createPlayer({ store, engine, notify = () => {} }) {
  let loadedId = null;     // id of the track the engine currently holds
  let errorStreak = 0;     // consecutive failed tracks, stops auto-skip loops
  let skipTimer = null;

  const state = () => store.getState();
  const current = () => Q.currentItem(state().queue);

  engine.on('state', (status) => {
    if (status === 'playing') errorStreak = 0;
    store.setState({ status, ...(status === 'playing' ? { error: null, needsTap: false } : {}) });
  });
  engine.on('ad', (on) => {
    store.setState({ adPlaying: on });
    if (on) notify('An ad is playing. The video is shown so you can skip it.', 'info');
  });
  engine.on('blocked', () => {
    store.setState({ status: 'paused', needsTap: true });
    notify('Tap the video to start playback', 'info');
  });
  engine.on('time', (position, duration) => {
    store.setState({ position, duration: duration > 0 ? duration : state().duration });
  });
  engine.on('ended', handleEnded);
  engine.on('error', handleError);

  function applyVolume() {
    const { muted, volume } = state();
    engine.setVolume(muted ? 0 : volume);
  }

  function loadCurrent(autoplay = true, startAt = 0) {
    clearTimeout(skipTimer);
    const track = current();
    if (!track) {
      engine.stop();
      loadedId = null;
      store.setState({ status: 'idle', position: 0, duration: 0, error: null });
      return;
    }
    loadedId = track.id;
    store.setState({ status: autoplay ? 'loading' : 'paused', position: startAt, duration: track.duration || 0, error: null, needsTap: false, adPlaying: false });
    engine.load(track, { autoplay, startAt });
  }

  function handleError(message) {
    store.setState({ status: 'error', error: message || 'Playback failed' });
    notify(message || 'Playback failed', 'error');
    errorStreak += 1;
    // Skip to the next track, unless everything in the queue has already failed.
    if (errorStreak < state().queue.items.length) {
      skipTimer = setTimeout(() => next({ auto: true }), 1500);
    }
  }

  function handleEnded() {
    if (state().repeat === 'one') {
      engine.seek(0);
      engine.play();
      return;
    }
    next({ auto: true });
  }

  // ---- actions ----

  function playTracks(tracks, startIndex = 0) {
    if (!tracks?.length) return;
    errorStreak = 0;
    store.setState({ queue: Q.setItems(tracks, startIndex, { shuffle: state().shuffle }) });
    loadCurrent(true);
  }

  function play() {
    const s = state();
    const track = current();
    if (!track || s.status === 'playing' || s.status === 'loading') return;
    if (s.status === 'paused' && loadedId === track.id) { engine.play(); return; }
    errorStreak = 0;
    loadCurrent(true, s.status === 'paused' ? s.position : 0);
  }

  function pause() {
    const s = state();
    if (s.status !== 'playing' && s.status !== 'loading') return;
    engine.pause();
    store.setState({ status: 'paused' });
  }

  function togglePlay() {
    const s = state();
    if (s.status === 'playing' || s.status === 'loading') pause(); else play();
  }

  function next({ auto = false } = {}) {
    const s = state();
    const res = Q.next(s.queue, { repeat: s.repeat, shuffle: s.shuffle });
    if (res.moved) {
      store.setState({ queue: res.queue });
      loadCurrent(true);
      return;
    }
    if (auto && s.status !== 'error') loadCurrent(false); // finished the last track: rewind and stop
  }

  function previous() {
    const s = state();
    if (s.position > 3) { seek(0); return; }
    const res = Q.previous(s.queue, { repeat: s.repeat });
    if (res.moved) {
      store.setState({ queue: res.queue });
      loadCurrent(true);
    } else {
      seek(0);
    }
  }

  function seek(seconds) {
    const s = state();
    if (!current()) return;
    const target = clamp(seconds, 0, s.duration || Math.max(0, seconds));
    if (loadedId === current().id) engine.seek(target);
    store.setState({ position: target });
  }

  function setVolume(v) {
    store.setState({ volume: clamp(v, 0, 1), muted: false });
    applyVolume();
  }

  function toggleMute() {
    store.setState({ muted: !state().muted });
    applyVolume();
  }

  function toggleShuffle() {
    const shuffle = !state().shuffle;
    store.setState({ shuffle, queue: Q.rebuildOrder(state().queue, shuffle) });
  }

  function cycleRepeat() {
    const order = ['off', 'all', 'one'];
    store.setState({ repeat: order[(order.indexOf(state().repeat) + 1) % order.length] });
  }

  /** Room left in the queue; tells the user when songs were dropped. */
  function fit(tracks) {
    const room = Q.MAX_QUEUE - state().queue.items.length;
    if (tracks.length <= room) return tracks;
    notify(`The queue holds up to ${Q.MAX_QUEUE} songs.`, 'info');
    return tracks.slice(0, Math.max(0, room));
  }

  function enqueue(tracks) {
    const add = fit(tracks);
    if (!add.length) return;
    const was = state().queue.items.length;
    store.setState({ queue: Q.append(state().queue, add) });
    if (!was) loadCurrent(false);
  }

  function playNext(track) {
    if (!fit([track]).length) return;
    const was = state().queue.items.length;
    store.setState({ queue: Q.playNext(state().queue, track) });
    if (!was) loadCurrent(false);
  }

  function jumpTo(orderPos) {
    store.setState({ queue: Q.jumpTo(state().queue, orderPos) });
    errorStreak = 0;
    loadCurrent(true);
  }

  /** Reorder: the song at list position `from` goes to `to`. Never interrupts playback. */
  function moveInQueue(from, to) {
    store.setState({ queue: Q.move(state().queue, from, to) });
  }

  /** Make a queued song play right after the current one. */
  function moveNext(orderPos) {
    store.setState({ queue: Q.moveToNext(state().queue, orderPos) });
  }

  /**
   * Returns a function that undoes the destructive change that is about to happen, as long as the queue
   * has not been changed again in the meantime (moving to another song does not count as a change).
   * If the song that was playing comes back, it is loaded paused at the position it had.
   */
  function undoer(before) {
    return function undoLast() {
      const now = state().queue;
      if (now.items !== undoLast.after.items || now.order !== undoLast.after.order) return false;
      const cur = Q.currentItem(before.queue);
      store.setState({ queue: before.queue });
      if (!cur) loadCurrent(false);
      else if (cur.id !== loadedId) loadCurrent(false, before.position);
      return true;
    };
  }

  function removeFromQueue(orderPos) {
    const before = { queue: state().queue, position: state().position };
    const res = Q.removeAt(before.queue, orderPos);
    if (res.queue === before.queue) return () => false;
    store.setState({ queue: res.queue });
    if (res.removedCurrent) loadCurrent(state().status === 'playing' || state().status === 'loading');
    const undo = undoer(before);
    undo.after = state().queue;
    return undo;
  }

  function clearQueue() {
    const before = { queue: state().queue, position: state().position };
    if (!before.queue.items.length) return () => false;
    store.setState({ queue: Q.emptyQueue() });
    loadCurrent(false);
    const undo = undoer(before);
    undo.after = state().queue;
    return undo;
  }

  /** Restore a previously saved state without starting playback. */
  function restore(saved) {
    store.setState({
      volume: saved.volume, muted: saved.muted, shuffle: saved.shuffle, repeat: saved.repeat,
      queue: saved.queue,
      position: saved.position,
      duration: Q.currentItem(saved.queue)?.duration || 0,
      status: Q.currentItem(saved.queue) ? 'paused' : 'idle',
      error: null,
      needsTap: false,
      adPlaying: false,
    });
    applyVolume();
  }

  applyVolume();

  return {
    playTracks, play, pause, togglePlay, next, previous, seek,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    enqueue, playNext, moveInQueue, moveNext, jumpTo, removeFromQueue, clearQueue, restore,
  };
}
