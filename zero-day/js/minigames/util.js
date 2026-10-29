// Shared helpers for the minigames: a tiny DOM builder and a common panel scaffold.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

// A standard minigame frame: title, "how to play" line, a body mount, and a footer for actions.
export function frame(host, { title, tag, how }) {
  clear(host);
  const body = h('div', { class: 'mg-body' });
  const footer = h('div', { class: 'mg-footer' });
  const wrap = h('div', { class: 'mg' },
    h('div', { class: 'mg-head' },
      h('div', {},
        h('span', { class: 'mg-tag' }, tag || 'STAGE'),
        h('h2', { class: 'mg-title' }, title)),
    ),
    how ? h('p', { class: 'mg-how' }, how) : null,
    body, footer,
  );
  host.append(wrap);
  return { body, footer, wrap };
}

export function button(label, cls, onClick) {
  return h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: onClick }, label);
}

export function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
