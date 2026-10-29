// A pausable stopwatch for game timers. The clock is injectable so tests can drive it.

export class GameTimer {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.reset();
  }

  reset() { this.base = 0; this.since = null; }
  get running() { return this.since !== null; }
  start() { if (!this.running) this.since = this.now(); }
  pause() { if (this.running) { this.base += this.now() - this.since; this.since = null; } }
  elapsedMs() { return this.base + (this.running ? this.now() - this.since : 0); }
  elapsed() { return Math.floor(this.elapsedMs() / 1000); }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}
