// Turns plain content text into DOM: paragraphs, [label](address) links, and bare internal
// addresses such as vidder.tv/watch?v=abc become clickable links the browser understands.
import { h } from './dom.js';
const HOSTS = 'findr\\.net|vidder\\.tv|threadit\\.com|blink\\.social';
const RE = new RegExp(`\\[([^\\]]+)\\]\\(([^)\\s]+)\\)|((?:https?://)?(?:www\\.)?(?:${HOSTS})(?:/[^\\s)]*)?)`, 'g');

export function inline(text) {
  const out = []; let last = 0; text = String(text ?? '');
  for (const m of text.matchAll(RE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    let url = m[2] || m[3], label = m[1] || m[3];
    let trail = '';
    if (!m[1]) { const t = url.match(/[.,!?;:'"]+$/); if (t) { trail = t[0]; url = url.slice(0, -trail.length); label = url; } }
    out.push(h('a', { href: url }, label));
    if (trail) out.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export function paragraphs(text, cls) {
  return String(text ?? '').split(/\n{2,}/).filter(Boolean).map(p => h('p', { class: cls }, ...p.split('\n').flatMap((line, i) => i ? [h('br'), ...inline(line)] : inline(line))));
}
