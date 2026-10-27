// Tiny DOM helpers: h('div.class#id', { attrs, on: { click } }, children...).

export function h(sel, attrs = {}, ...kids) {
  if (typeof attrs !== 'object' || attrs === null || Array.isArray(attrs) || attrs instanceof Node) { kids.unshift(attrs); attrs = {}; }
  const [tag, ...rest] = sel.split(/(?=[.#])/);
  const el = document.createElement(tag || 'div');
  for (const r of rest) { if (r[0] === '.') el.classList.add(r.slice(1)); else el.id = r.slice(1); }
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}

export const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const icon = (src, cls = 'icon') => h('img.' + cls, { src, alt: '', draggable: 'false' });
export const gold = n => `${Math.floor(n).toLocaleString('en-US')}g`;
