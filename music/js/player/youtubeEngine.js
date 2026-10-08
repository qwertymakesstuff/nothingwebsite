// Playback engine backed by YouTube's OFFICIAL embedded player (IFrame Player API).
// Implements the engine contract documented in playbackEngine.js:
//   load / play / pause / stop / seek / setVolume   and events  state / time / ended / error
// plus one extra event, 'blocked', fired when the browser refused to autoplay (the user must tap play).
//
// It never touches the audio or video streams: it only sends commands to YouTube's own player, which
// must stay visible on the page (see videoDock.js).

const API_URL = 'https://www.youtube.com/iframe_api';

// YT.PlayerState values (stable, documented numbers)
const S = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

const ERROR_MESSAGES = {
  2: "This video can't be played.",
  5: 'Playback error. Try again.',
  100: 'This video is unavailable.',
  101: "The owner doesn't allow this video to be played here.",
  150: "The owner doesn't allow this video to be played here.",
};

let apiPromise = null;

/** iPhone / iPad (including iPadOS that reports itself as a Mac). */
export function isIosLike() {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Loads the YouTube IFrame API script once. Rejects if it is blocked or too slow. */
export function loadYouTubeApi({ timeoutMs = 15000 } = {}) {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const fail = (why) => { apiPromise = null; reject(new Error(why)); };
    const timer = setTimeout(() => fail('timeout'), timeoutMs);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      try { previous?.(); } catch { /* another script's problem */ }
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = API_URL;
    script.async = true;
    script.onerror = () => { clearTimeout(timer); fail('blocked'); };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export class YouTubeEngine {
  /**
   * @param {{ container: Element, loadApi?: () => Promise<any>, pollMs?: number, blockedAfterMs?: number,
   *           origin?: string }} opts
   */
  constructor({ container, loadApi = loadYouTubeApi, pollMs = 250, blockedAfterMs = 6000, firstBlockedAfterMs = isIosLike() ? 1500 : 6000, origin } = {}) {
    this.container = container;
    this.loadApi = loadApi;
    this.pollMs = pollMs;
    this.blockedAfterMs = blockedAfterMs;
    this.firstBlockedAfterMs = firstBlockedAfterMs; // iPhone/iPad usually need a tap on the video for the first play: ask sooner
    this.hasPlayed = false;
    this.origin = origin ?? (typeof location !== 'undefined' ? location.origin : undefined);
    this.handlers = {};
    this.player = null;
    this.ready = null;       // Promise<player>
    this.track = null;
    this.volume = 1;
    this.wantPlay = false;
    this._seq = 0;           // bumps on every load/stop so stale async work is ignored
    this._poll = null;
    this._watchdog = null;
    this._lastState = null;
  }

  on(event, handler) { this.handlers[event] = handler; }
  _emit(event, ...args) { try { this.handlers[event]?.(...args); } catch (e) { console.error(e); } }

  /** Start loading the API/player early so the first tap is instant (the tap must stay "fresh"). */
  preload() { return this._ensure().catch(() => {}); }

  _ensure() {
    if (this.ready) return this.ready;
    this.ready = this.loadApi().then((YT) => new Promise((resolve, reject) => {
      let player;
      try {
        player = new YT.Player(this.container, {
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, origin: this.origin },
          events: {
            onReady: () => { this.player = player; player.setVolume?.(Math.round(this.volume * 100)); resolve(player); },
            onStateChange: (e) => this._onState(e.data),
            onError: (e) => this._onError(e.data),
          },
        });
      } catch (err) { reject(err); }
    }));
    this.ready.catch(() => { this.ready = null; }); // allow a retry on the next load()
    return this.ready;
  }

  load(track, { autoplay = true, startAt = 0 } = {}) {
    const seq = ++this._seq;
    this._clearTimers();
    this.track = track;
    this.wantPlay = autoplay;
    this._lastState = null;
    if (!track?.videoId) { this._emit('error', "This track can't be played."); return; }
    if (autoplay) this._emit('state', 'loading');

    this._ensure().then((p) => {
      if (seq !== this._seq) return; // a newer load/stop superseded this one
      const args = { videoId: track.videoId, startSeconds: startAt || 0 };
      if (autoplay) {
        p.loadVideoById(args);
        this._armWatchdog(seq);
      } else {
        p.cueVideoById(args);
        this._emit('time', startAt || 0, track.duration || 0);
      }
    }).catch(() => {
      if (seq !== this._seq) return;
      this._emit('error', "Couldn't load the YouTube player. Check your connection or ad blocker.");
    });
  }

  play() {
    this.wantPlay = true;
    this._ensure().then((p) => { p.playVideo(); this._armWatchdog(this._seq); }).catch(() => {
      this._emit('error', "Couldn't load the YouTube player. Check your connection or ad blocker.");
    });
  }

  pause() {
    this.wantPlay = false;
    clearTimeout(this._watchdog);
    this.player?.pauseVideo();
    this._emit('state', 'paused');
  }

  stop() {
    this._seq++;
    this._clearTimers();
    this.wantPlay = false;
    this.track = null;
    try { this.player?.stopVideo(); } catch { /* player may be mid-load */ }
  }

  seek(seconds) {
    const t = Math.max(0, seconds);
    this.player?.seekTo(t, true);
    this._emit('time', t, this._duration());
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    this.player?.setVolume?.(Math.round(this.volume * 100));
  }

  destroy() {
    this.stop();
    try { this.player?.destroy?.(); } catch { /* ignore */ }
    this.player = null;
    this.ready = null;
  }

  // ---- internals ----

  _duration() {
    const d = Number(this.player?.getDuration?.());
    return Number.isFinite(d) && d > 0 ? d : (this.track?.duration || 0);
  }

  _tick() {
    if (!this.player) return;
    const t = Number(this.player.getCurrentTime?.());
    if (Number.isFinite(t)) this._emit('time', t, this._duration());
  }

  _startPoll() {
    if (this._poll) return;
    this._poll = setInterval(() => this._tick(), this.pollMs);
  }
  _stopPoll() { if (this._poll) { clearInterval(this._poll); this._poll = null; } }
  _clearTimers() { this._stopPoll(); clearTimeout(this._watchdog); this._watchdog = null; }

  /** If we asked to autoplay but nothing started, the browser blocked it: tell the UI to ask for a tap. */
  _armWatchdog(seq) {
    clearTimeout(this._watchdog);
    const delay = this.hasPlayed ? this.blockedAfterMs : this.firstBlockedAfterMs;
    this._watchdog = setTimeout(() => {
      if (seq !== this._seq || !this.wantPlay) return;
      if (this._lastState !== S.PLAYING && this._lastState !== S.BUFFERING) {
        this.wantPlay = false;
        this._emit('state', 'paused');
        this._emit('blocked');
      }
    }, delay);
  }

  _onState(code) {
    this._lastState = code;
    switch (code) {
      case S.PLAYING:
        this.hasPlayed = true;
        clearTimeout(this._watchdog);
        this._startPoll();
        this._emit('state', 'playing');
        this._tick();
        break;
      case S.BUFFERING:
        this._startPoll();
        this._emit('state', 'loading');
        break;
      case S.PAUSED:
        this._stopPoll();
        this._tick();
        this._emit('state', 'paused'); // our own pause, or a system interruption (call, another tab)
        break;
      case S.ENDED:
        this._stopPoll();
        this._emit('ended');
        break;
      case S.CUED:
        this._stopPoll();
        if (!this.wantPlay) this._emit('state', 'paused');
        break;
      default: break; // UNSTARTED: wait for the next state
    }
  }

  _onError(code) {
    this._clearTimers();
    this.wantPlay = false;
    this._emit('error', ERROR_MESSAGES[code] || 'Playback failed.');
  }
}
