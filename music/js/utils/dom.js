const DIRECT = new Set(['value', 'checked', 'disabled', 'hidden', 'textContent']);

/** Tiny element builder: h('div', { class: 'x', onclick }, child, [children]) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (DIRECT.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Collects unsubscribe functions so a component can clean up in one call. */
export function disposer() {
  const fns = [];
  return { add: (fn) => { fns.push(fn); return fn; }, run: () => { while (fns.length) fns.pop()(); } };
}
