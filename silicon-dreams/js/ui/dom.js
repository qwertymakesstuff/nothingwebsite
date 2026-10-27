// Tiny DOM helpers: h('div.cls#id', { attrs, on: { click } }, ...children)

const SVGNS = 'http://www.w3.org/2000/svg';

export function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
  const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) { if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1); }
  apply(el, attrs);
  append(el, kids);
  return el;
}

export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  apply(el, attrs);
  append(el, kids);
  return el;
}

function apply(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'class') { const list = (Array.isArray(v) ? v : String(v).split(/\s+/)).filter(Boolean); if (list.length) el.classList.add(...list); }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && !(el instanceof SVGElement) && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false || k === true) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// an inline SVG string → element
export function svgEl(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function button(label, onClick, opts = {}) {
  return h(`button.btn${opts.cls ? '.' + opts.cls.split(' ').join('.') : ''}`, { type: 'button', on: { click: onClick }, disabled: !!opts.disabled, 'data-tip': opts.tip || null, 'aria-label': opts.aria || null }, label);
}
