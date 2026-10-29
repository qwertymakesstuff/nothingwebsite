// Screen effects: flying numbers, coin bursts, screen-edge flashes, banners and the count-up on
// the net worth. Everything checks `enabled` (Effects setting) and `reduced` (reduced motion).

export class Fx {
  constructor(layer) { this.layer = layer; this.enabled = true; this.reduced = false; this.count = null; }

  get on() { return this.enabled && !this.reduced; }

  fly(text, x, y, kind = 'up', big = false) {
    if (!this.on) return;
    const el = document.createElement('div');
    el.className = `fly ${kind}${big ? ' big' : ''}`;
    el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    this.layer.append(el);
    setTimeout(() => el.remove(), 1500);
  }

  flyFrom(el, text, kind, big) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.fly(text, r.left + r.width / 2, r.top, kind, big);
  }

  // a shower of green numbers drifting up the screen (big wins, pumps you're riding)
  rain(n = 10, kind = 'up', texts = ['+$', '📈', '+%']) {
    if (!this.on) return;
    for (let i = 0; i < n; i++) {
      setTimeout(() => this.fly(texts[i % texts.length], innerWidth * (0.1 + Math.random() * 0.8), innerHeight * (0.45 + Math.random() * 0.45), kind), i * 70);
    }
  }

  coins(x, y, n = 14) {
    if (!this.on) return;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'coin';
      el.textContent = ['💰', '💵', '🪙', '💸'][i % 4];
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
      el.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      el.style.setProperty('--dy', `${Math.sin(ang) * dist - 60}px`);
      el.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
      this.layer.append(el);
      setTimeout(() => el.remove(), 1700);
    }
  }

  flash(kind) {
    if (!this.enabled) return;
    const el = document.createElement('div');
    el.className = kind === 'up' ? 'flash-green' : 'flash-red';
    document.body.append(el);
    setTimeout(() => el.remove(), 1250);
  }

  banner(text, sub = '', kind = 'good') {
    if (!this.enabled) return;
    document.querySelectorAll('.banner').forEach(b => b.remove());
    const el = document.createElement('div');
    el.className = `banner ${kind}`;
    el.textContent = text;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    document.body.append(el);
    setTimeout(() => el.remove(), this.reduced ? 1800 : 2500);
  }

  // Animate a number in `el` from its last value to `to`, formatted with `fmt`.
  countTo(el, to, fmt) {
    const from = this.count && this.count.el === el ? this.count.value : to;
    if (this.count) cancelAnimationFrame(this.count.raf);
    const big = Math.abs(to - from) > Math.max(1, Math.abs(from) * 0.01);
    if (!this.on || !big) { el.textContent = fmt(to); this.count = { el, value: to }; return; }
    const t0 = performance.now(), dur = 600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      el.textContent = fmt(v);
      this.count = { el, value: v, raf: k < 1 ? requestAnimationFrame(step) : 0 };
    };
    this.count = { el, value: from, raf: requestAnimationFrame(step) };
  }
}
