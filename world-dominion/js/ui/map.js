// The world map: pre-projected SVG countries with pan, zoom, hover, selection and zoom-aware labels.
// Screen position of a map point (x,y) is (tx + x*s, ty + y*s).
import { COUNTRIES, MAP_W, MAP_H, OUTLINE, GRATICULE } from '../data/world.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const MAX_ZOOM = 16;
const MIN_ZOOM = 0.6; // relative to 'fit': lets the whole world sit beside an open panel
const ease = (t) => 1 - Math.pow(1 - t, 3);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class WorldMap {
  constructor(host, { onSelect = () => {}, onHover = () => {}, onBackground = () => {} } = {}) {
    this.host = host; this.onSelect = onSelect; this.onHover = onHover; this.onBackground = onBackground;
    this.s = 1; this.tx = 0; this.ty = 0; this.fit = 1;
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    this.paths = new Map(); this.labels = new Map();
    this.player = null; this.selected = null; this.anim = null; this.pending = false;
    this.build();
    this.bind();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize(true);
  }

  build() {
    const svg = this.svg = svgEl('svg', { role: 'application', 'aria-label': 'World map. Drag to pan, scroll or pinch to zoom, click a country to inspect it.' });
    const defs = svgEl('defs');
    defs.innerHTML = `<radialGradient id="oceanGrad" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="var(--map-ocean-hi)"/><stop offset="1" stop-color="var(--map-ocean)"/></radialGradient>
      <clipPath id="sphereClip"><path d="${OUTLINE}"/></clipPath>`;
    svg.append(defs);
    const world = this.world = svgEl('g');
    world.append(svgEl('path', { class: 'sphere', d: OUTLINE }));
    world.append(svgEl('path', { class: 'grid', d: GRATICULE, 'clip-path': 'url(#sphereClip)' }));
    const countries = svgEl('g', { class: 'countries' });
    for (const c of COUNTRIES) {
      const p = svgEl('path', { id: 'c-' + c.id, class: `c t${c.tint}`, d: c.d, 'data-id': c.id });
      this.paths.set(c.id, p); countries.append(p);
    }
    world.append(countries);
    // dedicated outline paths (a <use> clone would inherit the country's own fill and stroke)
    this.playerOutline = svgEl('path', { class: 'outline-player' });
    this.selectOutline = svgEl('path', { class: 'outline-select' });
    this.playerOutline.style.display = this.selectOutline.style.display = 'none';
    world.append(this.playerOutline, this.selectOutline);
    const labels = this.labelLayer = svgEl('g', { class: 'labels', 'aria-hidden': 'true' });
    for (const c of COUNTRIES) {
      const t = svgEl('text'); t.textContent = c.name; t.style.display = 'none';
      this.labels.set(c.id, { el: t, c, shown: false }); labels.append(t);
    }
    svg.append(world, labels);
    this.host.append(svg);
  }

  // ——— view ———
  get view() { const r = this.host.getBoundingClientRect(); return { w: r.width, h: r.height }; }
  resize(initial = false) {
    const { w, h } = this.view; if (!w || !h) return;
    const prevFit = this.fit, k = this.s / prevFit;
    this.fit = Math.min(w / MAP_W, h / MAP_H) * 0.98;
    if (initial) { this.home(false); return; }
    // keep the same map point in the middle of the screen
    const cx = (this.lastW / 2 - this.tx) / this.s, cy = (this.lastH / 2 - this.ty) / this.s;
    const s = this.fit * k;
    this.set(s, w / 2 - cx * s, h / 2 - cy * s);
  }
  // Whole world, framed in the part of the screen not covered by panels.
  home(animate = true) {
    const { w, h } = this.view, i = this.insets;
    const aw = Math.max(200, w - i.left - i.right), ah = Math.max(200, h - i.top - i.bottom);
    const s = Math.min(this.fit, Math.min(aw / MAP_W, ah / MAP_H) * 0.98);
    this.go(s, i.left + (aw - MAP_W * s) / 2, i.top + (ah - MAP_H * s) / 2, animate);
  }
  clampView(s, tx, ty) {
    const { w, h } = this.view;
    s = Math.max(this.fit * MIN_ZOOM, Math.min(this.fit * MAX_ZOOM, s));
    const mw = MAP_W * s, mh = MAP_H * s, m = Math.min(w, h) * 0.25;
    // smaller than the screen: keep it wholly visible (but free to sit off-centre, beside a panel)
    tx = mw <= w ? Math.min(w - mw, Math.max(0, tx)) : Math.min(m, Math.max(w - mw - m, tx));
    ty = mh <= h ? Math.min(h - mh, Math.max(0, ty)) : Math.min(m, Math.max(h - mh - m, ty));
    return [s, tx, ty];
  }
  set(s, tx, ty) {
    [this.s, this.tx, this.ty] = this.clampView(s, tx, ty);
    const v = this.view; this.lastW = v.w; this.lastH = v.h;
    this.world.setAttribute('transform', `translate(${this.tx.toFixed(2)} ${this.ty.toFixed(2)}) scale(${this.s.toFixed(5)})`);
    if (!this.pending) { this.pending = true; requestAnimationFrame(() => { this.pending = false; this.layoutLabels(); }); }
  }
  go(s, tx, ty, animate = true) {
    cancelAnimationFrame(this.anim);
    [s, tx, ty] = this.clampView(s, tx, ty);
    if (!animate || reduceMotion()) return this.set(s, tx, ty);
    const from = [this.s, this.tx, this.ty], t0 = performance.now(), dur = 650;
    // interpolate in "screen centre" space so the camera arcs instead of sliding sideways while zooming
    const { w, h } = this.view;
    const c0 = [(w / 2 - from[1]) / from[0], (h / 2 - from[2]) / from[0]], c1 = [(w / 2 - tx) / s, (h / 2 - ty) / s];
    const step = (now) => {
      const t = ease(Math.min(1, (now - t0) / dur));
      const ss = from[0] * Math.pow(s / from[0], t);
      const cx = c0[0] + (c1[0] - c0[0]) * t, cy = c0[1] + (c1[1] - c0[1]) * t;
      this.set(ss, w / 2 - cx * ss, h / 2 - cy * ss);
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }
  zoomAt(factor, px, py, animate = false) {
    const s = Math.max(this.fit * MIN_ZOOM, Math.min(this.fit * MAX_ZOOM, this.s * factor)), r = s / this.s;
    this.go(s, px - (px - this.tx) * r, py - (py - this.ty) * r, animate);
  }
  zoomBy(factor) { const { w, h } = this.view; this.zoomAt(factor, w / 2, h / 2, true); }
  // Frame a country in the part of the screen not covered by panels.
  flyTo(id, { maxZoom = 6 } = {}) {
    const c = COUNTRIES.find((x) => x.id === id); if (!c) return;
    const { w, h } = this.view, i = this.insets;
    const aw = Math.max(120, w - i.left - i.right), ah = Math.max(120, h - i.top - i.bottom);
    const [x0, y0, x1, y1] = c.box, bw = Math.max(x1 - x0, 12), bh = Math.max(y1 - y0, 12);
    const s = Math.min(this.fit * maxZoom, Math.max(this.fit * 1.4, Math.min(aw / bw, ah / bh) * 0.55));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    this.go(s, i.left + aw / 2 - cx * s, i.top + ah / 2 - cy * s);
  }
  setInsets(insets) { Object.assign(this.insets, insets); }

  // ——— state styling ———
  setPlayer(id, territories = []) {
    for (const p of this.paths.values()) p.classList.remove('player', 'player-ter');
    this.player = id;
    if (id) {
      this.paths.get(id)?.classList.add('player');
      for (const t of territories) this.paths.get(t)?.classList.add('player-ter');
      this.playerOutline.setAttribute('d', this.paths.get(id).getAttribute('d')); this.playerOutline.style.display = '';
    } else this.playerOutline.style.display = 'none';
    this.layoutLabels();
  }
  setSelected(id) {
    if (this.selected) for (const n of this.neighborIds(this.selected)) this.paths.get(n)?.classList.remove('neighbor');
    this.selected = id;
    if (id) {
      this.selectOutline.setAttribute('d', this.paths.get(id).getAttribute('d'));
      // restart the outline animation
      this.selectOutline.style.display = 'none'; this.selectOutline.getBoundingClientRect(); this.selectOutline.style.display = '';
    } else this.selectOutline.style.display = 'none';
    this.layoutLabels();
  }
  neighborIds(id) { return COUNTRIES.find((c) => c.id === id)?.neighbors || []; }

  layoutLabels() {
    const s = this.s, { w, h } = this.view;
    for (const [id, L] of this.labels) {
      const { c, el } = L;
      const bw = (c.box[2] - c.box[0]) * s;
      const x = this.tx + c.cx * s, y = this.ty + c.cy * s;
      const important = id === this.player || id === this.selected;
      const big = bw > 300;
      const need = c.name.length * (big ? 10 : 8.2) + 10;
      const show = (bw > need || (important && bw > 18)) && x > -50 && x < w + 50 && y > -20 && y < h + 20;
      if (show !== L.shown) { el.style.display = show ? '' : 'none'; L.shown = show; }
      if (!show) continue;
      el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1));
      el.setAttribute('class', (big ? 'big ' : '') + (id === this.player ? 'player ' : '') + (id === this.selected ? 'sel' : ''));
    }
  }

  // ——— input ———
  bind() {
    const host = this.host, pts = new Map();
    let downAt = null, moved = false, pinch = null;
    host.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      cancelAnimationFrame(this.anim);
      host.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty, target: e.target.closest?.('.c') }; moved = false; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: this.tx, ty: this.ty }; moved = true; }
    });
    host.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') this.hover(e); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = host.getBoundingClientRect();
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const s = Math.max(this.fit * MIN_ZOOM, Math.min(this.fit * MAX_ZOOM, pinch.s * d / pinch.d)), k = s / pinch.s;
        const px = pinch.mx - r.left, py = pinch.my - r.top;
        this.set(s, px - (px - pinch.tx) * k + (mx - pinch.mx), py - (py - pinch.ty) * k + (my - pinch.my));
        return;
      }
      if (!downAt) return;
      const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
      if (!moved && Math.hypot(dx, dy) > 5) { moved = true; host.classList.add('dragging'); this.onHover(null); }
      if (moved) this.set(this.s, downAt.tx + dx, downAt.ty + dy);
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const [p] = [...pts.values()]; downAt = { x: p.x, y: p.y, tx: this.tx, ty: this.ty, target: null }; return; }
      if (pts.size === 0) {
        host.classList.remove('dragging');
        if (!moved && downAt && e.type === 'pointerup') {
          const id = downAt.target?.dataset.id;
          id ? this.onSelect(id) : this.onBackground();
        }
        downAt = null;
      }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pts.size) this.onHover(null); });
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = host.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      this.zoomAt(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    host.addEventListener('dblclick', (e) => { const r = host.getBoundingClientRect(); this.zoomAt(2, e.clientX - r.left, e.clientY - r.top, true); });
  }
  hover(e) {
    const t = e.target.closest?.('.c');
    this.onHover(t ? t.dataset.id : null, e.clientX, e.clientY);
  }
}
