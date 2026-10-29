// Small synthesised interface sounds (no audio files needed, so they work offline). Real game
// sound effects arrive with the games; this covers clicks, dialogs and navigation.

const TONES = {
  click: [[660, 0.04, 'triangle']],
  open: [[440, 0.05, 'sine'], [660, 0.07, 'sine']],
  close: [[520, 0.05, 'sine'], [390, 0.07, 'sine']],
  error: [[180, 0.12, 'square']],
  move: [[300, 0.05, 'triangle'], [210, 0.06, 'sine']],
  capture: [[240, 0.04, 'square'], [150, 0.09, 'triangle']],
  check: [[660, 0.07, 'triangle'], [880, 0.1, 'triangle']],
  win: [[523, 0.1, 'sine'], [659, 0.1, 'sine'], [784, 0.18, 'sine']],
  lose: [[392, 0.12, 'sine'], [330, 0.12, 'sine'], [262, 0.2, 'sine']],
  gameover: [[440, 0.12, 'sine'], [440, 0.16, 'sine']],
  deal: [[1200, 0.025, 'triangle']],
  flip: [[900, 0.03, 'triangle'], [700, 0.03, 'triangle']],
};

export class UiAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
  }

  unlock() {
    if (this.ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (AC) { try { this.ctx = new AC(); } catch { this.ctx = null; } }
  }

  play(name) {
    if (!this.settings.get('sound')) return;
    const vol = this.settings.get('sfxVolume');
    const tones = TONES[name];
    if (!tones || vol <= 0) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    let t = ctx.currentTime;
    for (const [freq, dur, type] of tones) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
      t += dur * 0.8;
    }
  }
}
