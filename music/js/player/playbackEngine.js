// Playback engine contract.
//
// The Player talks to ONE engine through this small interface, so the UI and the
// queue never know whether audio comes from YouTube, a test double, or anything else.
//
//   load(track, { autoplay, startAt })   start loading a track
//   play() / pause() / stop()
//   seek(seconds)
//   setVolume(0..1)
//   on(event, handler)  events:
//       'state'  (status: 'loading' | 'playing' | 'paused')
//       'time'   (positionSeconds, durationSeconds)
//       'ended'  ()
//       'error'  (message: string)
//       'blocked' ()   optional: the browser refused to autoplay; the user has to tap the video
//
// Two implementations: YouTubeEngine (real playback via YouTube's official embedded player) and
// SimulatedEngine below (no audio, just a clock), used for UI testing with ?engine=sim.

export class SimulatedEngine {
  constructor() {
    this.handlers = {};
    this.track = null;
    this.position = 0;
    this.duration = 0;
    this.playing = false;
    this.volume = 1;
    this._loadTimer = null;
    this._tick = null;
    this._last = 0;
  }

  on(event, handler) { this.handlers[event] = handler; }
  _emit(event, ...args) { this.handlers[event]?.(...args); }

  load(track, { autoplay = true, startAt = 0 } = {}) {
    this._halt();
    this.track = track;
    this.position = startAt;
    this.duration = track.duration || 0;
    this._wantPlay = autoplay;
    if (autoplay) this._emit('state', 'loading');
    this._loadTimer = setTimeout(() => {
      this._loadTimer = null;
      if (track.unavailable) {
        this._emit('error', 'This track is unavailable');
        return;
      }
      this._emit('time', this.position, this.duration);
      if (this._wantPlay) this._start(); else this._emit('state', 'paused');
    }, 150);
  }

  play() {
    if (!this.track) return;
    this._wantPlay = true;
    if (this._loadTimer) { this._emit('state', 'loading'); return; }
    this._start();
  }

  pause() {
    this._wantPlay = false;
    if (this._loadTimer) { this._emit('state', 'paused'); return; }
    this._stopClock();
    this.playing = false;
    this._emit('state', 'paused');
  }

  stop() { this._halt(); this.track = null; }

  seek(seconds) {
    this.position = Math.max(0, Math.min(seconds, this.duration || seconds));
    this._emit('time', this.position, this.duration);
  }

  setVolume(v) { this.volume = v; }

  _start() {
    this.playing = true;
    this._emit('state', 'playing');
    this._last = performance.now();
    this._stopClock();
    this._tick = setInterval(() => {
      const now = performance.now();
      this.position += (now - this._last) / 1000;
      this._last = now;
      if (this.duration && this.position >= this.duration) {
        this.position = this.duration;
        this._emit('time', this.position, this.duration);
        this._stopClock();
        this.playing = false;
        this._emit('ended');
        return;
      }
      this._emit('time', this.position, this.duration);
    }, 250);
  }

  _stopClock() { if (this._tick) { clearInterval(this._tick); this._tick = null; } }
  _halt() {
    this._stopClock();
    if (this._loadTimer) { clearTimeout(this._loadTimer); this._loadTimer = null; }
    this.playing = false;
  }
}
