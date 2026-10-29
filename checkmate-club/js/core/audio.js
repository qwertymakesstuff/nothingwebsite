// Small synthesised interface sounds (no audio files needed, so they work offline). Real game
// sound effects arrive with the games; this covers clicks, dialogs and navigation.

const TONES = {
  click: [[660, 0.04, 'triangle']],
  open: [[440, 0.05, 'sine'], [660, 0.07, 'sine']],
  close: [[520, 0.05, 'sine'], [390, 0.07, 'sine']],
  error: [[180, 0.12, 'square']],
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
