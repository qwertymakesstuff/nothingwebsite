// A silent, looping <audio> element that the PAGE owns.
//
// Why: the music itself plays inside YouTube's iframe, which the page cannot control. Browsers attach the
// lock screen / media-key controls and (on phones) the "keep running in the background" privilege to a page
// that is playing its own media. A few seconds of silence, looped, gives us that, so our Media Session
// metadata and buttons apply and the page keeps running while the screen is off. It makes no sound.
// It plays while the player plays and pauses when it pauses. ?anchor=off disables it.

/** A WAV file of silence, built in memory (no big embedded string). 8-bit mono, so ~80 KB for 10 s. */
export function makeSilentWav(seconds = 10, rate = 8000) {
  const n = Math.floor(seconds * rate);
  const bytes = new Uint8Array(44 + n);
  const dv = new DataView(bytes.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  bytes.fill(128, 44); // 8-bit PCM silence is 128
  return bytes;
}

export function createAudioAnchor({ store, doc = globalThis.document, enabled = true, log = () => {}, makeUrl } = {}) {
  if (!enabled || !doc) return { el: null, destroy() {} };

  const audio = doc.createElement('audio');
  audio.className = 'audio-anchor';
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.setAttribute('aria-hidden', 'true');
  audio.hidden = true;
  const url = makeUrl ? makeUrl(makeSilentWav()) : URL.createObjectURL(new Blob([makeSilentWav()], { type: 'audio/wav' }));
  audio.src = url;
  doc.body.append(audio);

  const wanted = () => ['playing', 'loading'].includes(store.getState().status);
  const play = () => {
    const p = audio.play();
    p?.catch?.((e) => log('audio anchor: play blocked:', e?.name || String(e)));
  };

  function sync() {
    if (wanted()) { if (audio.paused) play(); }
    else if (!audio.paused) audio.pause();
  }

  // The first play must happen inside a user gesture. Starting a song is one (status becomes "loading"
  // synchronously), but unlock on the first touch/click/key too, so later scripted plays are allowed.
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach((e) => doc.removeEventListener(e, unlock, true));
    const p = audio.play();
    p?.then?.(() => { log('audio anchor: unlocked'); if (!wanted()) audio.pause(); }).catch?.(() => { unlocked = false; });
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((e) => doc.addEventListener(e, unlock, true));

  const off = store.subscribe((s) => s.status === 'playing' || s.status === 'loading', sync);
  audio.addEventListener('pause', () => log('audio anchor: paused'));
  audio.addEventListener('play', () => log('audio anchor: playing'));

  return {
    el: audio,
    destroy() {
      off();
      ['pointerdown', 'touchend', 'click', 'keydown'].forEach((e) => doc.removeEventListener(e, unlock, true));
      audio.pause(); audio.remove();
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    },
  };
}
