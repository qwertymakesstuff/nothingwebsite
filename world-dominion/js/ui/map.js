// The world map: pre-projected SVG countries with pan, zoom, hover, selection, recolouring, zoom-aware labels,
// dots for countries too small to see, and first-level regions that load in as you zoom into a country.
// Screen position of a map point (x,y) is (tx + x*s, ty + y*s).
//
// Layers (bottom to top): sphere + graticule · countries · regions (clipped to their country) · hover ·
// player outline · selection outline — all in one transformed <g>; then screen-space labels and dots.
import { COUNTRIES, MAP_W, MAP_H, OUTLINE, GRATICULE } from '../data/world.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const MAX_ZOOM = 24;
const MIN_ZOOM = 0.6;          // relative to 'fit': lets the whole world sit beside an open panel
const REGION_ZOOM = 2.2;       // regions appear from this zoom (relative to fit) …
const REGION_MIN_PX = 90;      // … on countries at least this wide on screen
const REGION_MAX = 24;         // … for at most this many countries at once
const DOT_PX = 6;              // countries smaller than this on screen get a clickable dot
const ease = (t) => 1 - Math.pow(1 - t, 3);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));

export class WorldMap {
  // opts: onSelect(id, regionId?), onHover(id|null, x, y, region?), onBackground(), loadRegions(id) -> Promise<data|null>
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = { onSelect() {}, onHover() {}, onBackground() {}, loadRegions: () => Promise.resolve(null), ...opts };
    this.s = 1; this.tx = 0; this.ty = 0; this.fit = 1; this.w = 0; this.h = 0;
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    this.paths = new Map(); this.labels = new Map(); this.dots = new Map();
    this.regionGroups = new Map(); this.regionData = new Map(); this.regionLabels = [];
    this.fills = new Map();
    this.player = null; this.selected = null; this.hovered = null; this.anim = null; this.pending = false; this.regionTimer = null;
    this.stats = { frames: 0, lastLayoutMs: 0 };
    this.build();
    this.bind();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize(true);
  }

  build() {
    const svg = this.svg = svgEl('svg', { role: 'application', 'aria-label': 'World map. Drag to pan, scroll or pinch to zoom, click a country to inspect it.' });
    const defs = this.defs = svgEl('defs');
    defs.innerHTML = `<radialGradient id="oceanGrad" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="var(--map-ocean-hi)"/><stop offset="1" stop-color="var(--map-ocean)"/></radialGradient>
      <clipPath id="sphereClip"><path d="${OUTLINE}"/></clipPath>`;
    svg.append(defs);
    const world = this.world = svgEl('g');
    world.append(svgEl('path', { class: 'sphere', d: OUTLINE }));
    world.append(svgEl('path', { class: 'grid', d: GRATICULE, 'clip-path': 'url(#sphereClip)' }));
    const countries = svgEl('g', { class: 'countries' });
    for (const c of COUNTRIES) {
      const p = svgEl('path', { id: 'c-' + c.id, class: 'c', d: c.d, 'data-id': c.id });
      p.style.fill = `var(--land-${c.tint})`;
      this.paths.set(c.id, p); countries.append(p);
    }
    this.regionLayer = svgEl('g', { class: 'regions' });
    // dedicated overlay paths (a <use> clone would inherit the country's own fill and stroke)
    this.hoverPath = svgEl('path', { class: 'hover-fill' });
    this.playerOutline = svgEl('path', { class: 'outline-player' });
    this.selectOutline = svgEl('path', { class: 'outline-select' });
    for (const p of [this.hoverPath, this.playerOutline, this.selectOutline]) p.style.display = 'none';
    world.append(countries, this.regionLayer, this.hoverPath, this.playerOutline, this.selectOutline);

    const screen = this.screen = svgEl('g', { class: 'screen' });
    const dots = svgEl('g', { class: 'dots' });
    const labels = svgEl('g', { class: 'labels', 'aria-hidden': 'true' });
    this.regionLabelLayer = svgEl('g', { class: 'region-labels', 'aria-hidden': 'true' });
    for (const c of COUNTRIES) {
      const t = svgEl('text'); t.textContent = c.name; t.style.display = 'none';
      this.labels.set(c.id, { el: t, c, shown: false }); labels.append(t);
      const d = svgEl('circle', { class: 'dot', 'data-id': c.id }); d.style.display = 'none';
      this.dots.set(c.id, { el: d, shown: false }); dots.append(d);
    }
    screen.append(this.regionLabelLayer, labels, dots);
    svg.append(world, screen);
    this.host.append(svg);
  }

  // ——— view ———
  get view() { return { w: this.w, h: this.h }; }
  get zoom() { return this.s / this.fit; }
  resize(initial = false) {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const prevW = this.w, prevH = this.h, k = this.s / this.fit;
    this.w = r.width; this.h = r.height;
    this.fit = Math.min(this.w / MAP_W, this.h / MAP_H) * 0.98;
    if (initial || !prevW) { this.home(false); return; }
    // keep the same map point in the middle of the screen
    const cx = (prevW / 2 - this.tx) / this.s, cy = (prevH / 2 - this.ty) / this.s;
    const s = this.fit * k;
    this.set(s, this.w / 2 - cx * s, this.h / 2 - cy * s);
  }
  // Whole world, framed in the part of the screen not covered by panels.
  home(animate = true) {
    const { w, h } = this, i = this.insets;
    const aw = Math.max(200, w - i.left - i.right), ah = Math.max(200, h - i.top - i.bottom);
    const s = Math.min(this.fit, Math.min(aw / MAP_W, ah / MAP_H) * 0.98);
    this.go(s, i.left + (aw - MAP_W * s) / 2, i.top + (ah - MAP_H * s) / 2, animate);
  }
  clampView(s, tx, ty) {
    const { w, h } = this;
    s = Math.max(this.fit * MIN_ZOOM, Math.min(this.fit * MAX_ZOOM, s));
    const mw = MAP_W * s, mh = MAP_H * s, m = Math.min(w, h) * 0.25;
    // smaller than the screen: keep it wholly visible (but free to sit off-centre, beside a panel)
    tx = mw <= w ? Math.min(w - mw, Math.max(0, tx)) : Math.min(m, Math.max(w - mw - m, tx));
    ty = mh <= h ? Math.min(h - mh, Math.max(0, ty)) : Math.min(m, Math.max(h - mh - m, ty));
    return [s, tx, ty];
  }
  set(s, tx, ty) {
    [this.s, this.tx, this.ty] = this.clampView(s, tx, ty);
    this.world.setAttribute('transform', `translate(${this.tx.toFixed(2)} ${this.ty.toFixed(2)}) scale(${this.s.toFixed(5)})`);
    this.stats.frames++;
    if (!this.pending) { this.pending = true; requestAnimationFrame(() => { this.pending = false; this.layoutLabels(); }); }
    clearTimeout(this.regionTimer);
    this.regionTimer = setTimeout(() => this.updateRegions(), 140);
  }
  go(s, tx, ty, animate = true) {
    cancelAnimationFrame(this.anim);
    [s, tx, ty] = this.clampView(s, tx, ty);
    if (!animate || reduceMotion()) return this.set(s, tx, ty);
    const from = [this.s, this.tx, this.ty], t0 = performance.now(), dur = 650;
    // interpolate in "screen centre" space so the camera arcs instead of sliding sideways while zooming
    const { w, h } = this;
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
  zoomBy(factor) { this.zoomAt(factor, this.w / 2, this.h / 2, true); }
  // Frame a map-space box in the part of the screen not covered by panels.
  frame([x0, y0, x1, y1], { maxZoom = 6, minZoom = 1.4, fill = 0.55 } = {}) {
    const { w, h } = this, i = this.insets;
    const aw = Math.max(120, w - i.left - i.right), ah = Math.max(120, h - i.top - i.bottom);
    const bw = Math.max(x1 - x0, 4), bh = Math.max(y1 - y0, 4);
    const s = Math.min(this.fit * maxZoom, Math.max(this.fit * minZoom, Math.min(aw / bw, ah / bh) * fill));
    this.go(s, i.left + aw / 2 - ((x0 + x1) / 2) * s, i.top + ah / 2 - ((y0 + y1) / 2) * s);
  }
  flyTo(id, { maxZoom = 6 } = {}) { const c = BY_ID.get(id); if (c) this.frame(c.box, { maxZoom: Math.max(maxZoom, c.box[2] - c.box[0] < 3 ? 16 : maxZoom) }); }
  setInsets(insets) { Object.assign(this.insets, insets); }

  // ——— colours and highlights ———
  // fills: Map or object of id -> CSS colour. Only changed values touch the DOM.
  setFills(fills) {
    const entries = fills instanceof Map ? fills : Object.entries(fills);
    for (const [id, color] of entries) {
      if (this.fills.get(id) === color) continue;
      this.fills.set(id, color);
      const p = this.paths.get(id); if (p) p.style.fill = color;
      const d = this.dots.get(id); if (d) d.el.style.fill = color;
    }
  }
  // Regional colouring for the future (occupation, separatism): id -> colour, or null to show the country's fill.
  setRegionFill(regionId, color) {
    const el = this.svg.querySelector(`.r[data-region="${CSS.escape(regionId)}"]`);
    if (el) el.style.fill = color || '';
  }
  setPlayer(id) {
    this.player = id;
    if (id) { this.playerOutline.setAttribute('d', this.paths.get(id).getAttribute('d')); this.playerOutline.style.display = ''; }
    else this.playerOutline.style.display = 'none';
    this.layoutLabels();
  }
  setSelected(id) {
    this.selected = id;
    if (id) {
      this.selectOutline.setAttribute('d', this.paths.get(id).getAttribute('d'));
      // restart the outline animation
      this.selectOutline.style.display = 'none'; this.selectOutline.getBoundingClientRect(); this.selectOutline.style.display = '';
    } else this.selectOutline.style.display = 'none';
    this.layoutLabels();
  }
  // Briefly outline a region (e.g. chosen from the country panel).
  flashRegion(regionId) {
    const el = this.svg.querySelector(`.r[data-region="${CSS.escape(regionId)}"]`);
    if (!el) return;
    el.classList.remove('flash'); el.getBoundingClientRect(); el.classList.add('flash');
  }
  setHover(id) {
    if (id === this.hovered) return;
    this.hovered = id;
    if (id && !this.host.classList.contains('dragging')) { this.hoverPath.setAttribute('d', this.paths.get(id).getAttribute('d')); this.hoverPath.style.display = ''; }
    else this.hoverPath.style.display = 'none';
  }

  // ——— labels and dots (screen space) ———
  layoutLabels() {
    const t0 = performance.now();
    const s = this.s, { w, h } = this;
    for (const [id, L] of this.labels) {
      const { c, el } = L;
      const bw = (c.box[2] - c.box[0]) * s, bh = (c.box[3] - c.box[1]) * s;
      const x = this.tx + c.cx * s, y = this.ty + c.cy * s;
      const onScreen = x > -50 && x < w + 50 && y > -20 && y < h + 20;
      const important = id === this.player || id === this.selected;
      const big = bw > 300;
      const need = c.name.length * (big ? 10 : 8.2) + 10;
      const show = onScreen && (bw > need || (important && bw > 18)) && !this.regionLabelsFor?.has(id);
      if (show !== L.shown) { el.style.display = show ? '' : 'none'; L.shown = show; }
      if (show) {
        el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1));
        el.setAttribute('class', (big ? 'big ' : '') + (id === this.player ? 'player ' : '') + (id === this.selected ? 'sel' : ''));
      }
      const D = this.dots.get(id);
      const dot = onScreen && Math.max(bw, bh) < DOT_PX;
      if (dot !== D.shown) { D.el.style.display = dot ? '' : 'none'; D.shown = dot; }
      if (dot) {
        D.el.setAttribute('cx', x.toFixed(1)); D.el.setAttribute('cy', y.toFixed(1));
        D.el.setAttribute('class', 'dot' + (id === this.player ? ' player' : '') + (id === this.selected ? ' sel' : ''));
      }
    }
    this.layoutRegionLabels();
    this.stats.lastLayoutMs = performance.now() - t0;
  }
  // Region names appear once a country is zoomed in far enough that they fit; the country's own name then steps aside.
  layoutRegionLabels() {
    const s = this.s, { w, h } = this, placed = [];
    const forCountries = new Set();
    let i = 0;
    const pool = this.regionLabels;
    if (this.zoom >= 4) {
      for (const [cid, data] of this.regionData) {
        if (!this.regionGroups.has(cid)) continue;
        for (const r of data.regions) {
          const bw = (r.box[2] - r.box[0]) * s;
          const x = this.tx + r.cx * s, y = this.ty + r.cy * s;
          const need = r.name.length * 6.4 + 8;
          if (bw < need || x < 0 || x > w || y < 0 || y > h) continue;
          const box = [x - need / 2, y - 8, x + need / 2, y + 8];
          if (placed.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3])) continue;
          placed.push(box); forCountries.add(cid);
          let el = pool[i];
          if (!el) { el = svgEl('text'); pool.push(el); this.regionLabelLayer.append(el); }
          el.textContent = r.name; el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1)); el.style.display = '';
          if (++i > 160) break;
        }
      }
    }
    for (let j = i; j < pool.length; j++) pool[j].style.display = 'none';
    // a country's own label hides while its regions are labelled, unless it is the player's or the selection
    const prev = this.regionLabelsFor;
    this.regionLabelsFor = new Set([...forCountries].filter((id) => id !== this.player && id !== this.selected));
    if (prev && (prev.size !== this.regionLabelsFor.size || [...prev].some((x) => !this.regionLabelsFor.has(x)))) requestAnimationFrame(() => this.layoutLabels());
  }

  // ——— regions ———
  updateRegions() {
    const s = this.s, { w, h } = this;
    const want = [];
    if (this.zoom >= REGION_ZOOM) {
      for (const c of COUNTRIES) {
        if (!c.regions) continue;
        const [x0, y0, x1, y1] = c.box.map((v, i) => (i % 2 ? this.ty : this.tx) + v * s);
        if (x1 < 0 || x0 > w || y1 < 0 || y0 > h) continue;
        const px = Math.max(x1 - x0, y1 - y0);
        if (px >= REGION_MIN_PX) want.push([c.id, px]);
      }
      want.sort((a, b) => b[1] - a[1]).splice(REGION_MAX);
    }
    const wanted = new Set(want.map(([id]) => id));
    for (const [id, g] of this.regionGroups) if (!wanted.has(id)) { g?.remove(); this.regionGroups.delete(id); }
    for (const id of wanted) if (!this.regionGroups.has(id)) this.showRegions(id);
    this.layoutRegionLabels();
  }
  async showRegions(id) {
    this.regionGroups.set(id, null); // reserve while loading
    let data;
    try { data = await this.opts.loadRegions(id); } catch { data = null; }
    if (!this.regionGroups.has(id) || this.regionGroups.get(id)) return;   // scrolled away meanwhile
    if (!data) { this.regionGroups.delete(id); return; }
    this.regionData.set(id, data);
    if (!this.defs.querySelector('#clip-' + id)) {
      const cp = svgEl('clipPath', { id: 'clip-' + id });
      cp.append(svgEl('use', { href: '#c-' + id }));
      this.defs.append(cp);
    }
    const g = svgEl('g', { class: 'rg', 'clip-path': `url(#clip-${id})`, 'data-country': id });
    for (const r of data.regions) g.append(svgEl('path', { class: 'r', d: r.d, 'data-id': id, 'data-region': r.id }));
    g.append(svgEl('path', { class: 'rb', d: data.borders }));
    this.regionLayer.append(g);
    this.regionGroups.set(id, g);
    this.layoutRegionLabels();
  }
  regionById(countryId, regionId) { return this.regionData.get(countryId)?.regions.find((r) => r.id === regionId) || null; }
  visibleRegionCountries() { return [...this.regionGroups].filter(([, g]) => g).map(([id]) => id); }

  // ——— input ———
  bind() {
    const host = this.host, pts = new Map();
    let downAt = null, moved = false, pinch = null;
    const target = (e) => e.target.closest?.('[data-id]');
    host.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      cancelAnimationFrame(this.anim);
      host.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty, target: target(e) }; moved = false; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: this.tx, ty: this.ty }; moved = true; }
    });
    host.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') this.hover(e); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const s = Math.max(this.fit * MIN_ZOOM, Math.min(this.fit * MAX_ZOOM, pinch.s * d / pinch.d)), k = s / pinch.s;
        const px = pinch.mx, py = pinch.my;
        this.set(s, px - (px - pinch.tx) * k + (mx - pinch.mx), py - (py - pinch.ty) * k + (my - pinch.my));
        return;
      }
      if (!downAt) return;
      const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
      if (!moved && Math.hypot(dx, dy) > 5) { moved = true; host.classList.add('dragging'); this.setHover(null); this.opts.onHover(null); }
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
          const t = downAt.target;
          t ? this.opts.onSelect(t.dataset.id, t.dataset.region || null) : this.opts.onBackground();
        }
        downAt = null;
      }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pts.size) { this.setHover(null); this.opts.onHover(null); } });
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      this.zoomAt(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY);
    }, { passive: false });
    host.addEventListener('dblclick', (e) => this.zoomAt(2, e.clientX, e.clientY, true));
  }
  hover(e) {
    const t = e.target.closest?.('[data-id]');
    const id = t ? t.dataset.id : null;
    this.setHover(id);
    const region = t?.dataset.region ? this.regionById(id, t.dataset.region) : null;
    this.opts.onHover(id, e.clientX, e.clientY, region);
  }
}
