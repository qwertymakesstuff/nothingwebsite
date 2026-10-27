// Small DOM helpers shared by every screen.

import { CURRENCY } from '../config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// h('div.cls#id', { onclick, title, html, ... }, ...children)
export function h(spec, attrs = {}, ...kids) {
  const [, tag = 'div', rest = ''] = spec.match(/^([a-z0-9]*)(.*)$/i);
  const el = document.createElement(tag || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = {}; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += ` ${v}`;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const svg = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
export const money = n => `${n < 0 ? '−' : ''}${CURRENCY}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
export const signed = n => `${n >= 0 ? '+' : '−'}${CURRENCY}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
export const wait = ms => new Promise(r => setTimeout(r, ms));

export function toast(text, kind = '') {
  const box = $('#toasts');
  if (!box) return;
  const t = h('div.toast', { class: kind }, text);
  box.append(t);
  setTimeout(() => t.remove(), 2700);
  while (box.children.length > 4) box.firstChild.remove();
}

// One shared tooltip, filled on hover/focus of anything with a `tip` function.
let tipOwner = null;
export function bindTip(el, render) {
  const show = () => {
    const tip = $('#tooltip');
    const content = render();
    if (!content) return;
    tip.replaceChildren(content);
    tip.hidden = false;
    tipOwner = el;
    place(el, tip);
  };
  const hide = () => { if (tipOwner === el) { $('#tooltip').hidden = true; tipOwner = null; } };
  el.addEventListener('mouseenter', show);
  el.addEventListener('focus', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('blur', hide);
  return el;
}
export function hideTip() { const t = $('#tooltip'); if (t) t.hidden = true; tipOwner = null; }
function place(el, tip) {
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.right + 10, y = r.top;
  if (x + tw > innerWidth - 8) x = r.left - tw - 10;
  if (x < 8) { x = Math.max(8, Math.min(innerWidth - tw - 8, r.left)); y = r.bottom + 8; }
  if (y + th > innerHeight - 8) y = Math.max(8, innerHeight - th - 8);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}
