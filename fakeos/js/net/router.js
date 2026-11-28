// Internal URL routing. Every address the browser can show is resolved here: websites register a
// host and a render function; the router parses paths and query strings and handles unknown hosts.

const sites = new Map();
export function registerSite(site) { sites.set(site.host, site); for (const a of site.aliases || []) sites.set(a, site); }
export const getSite = host => sites.get(host);
export const allSites = () => [...new Set(sites.values())];

// Turn whatever was typed or linked into a canonical address like "vidder.tv/watch?v=abc".
export function normalize(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (/^skylark:/i.test(s)) return 'skylark://' + s.replace(/^skylark:\/*/i, '').toLowerCase();
  s = s.replace(/^[a-z]+:\/\//i, '');
  const m = s.match(/^([^/?#]*)(.*)$/);
  let host = m[1].toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '').replace(/\.$/, '');
  let rest = m[2] || '';
  if (rest === '/') rest = '';
  if (rest.startsWith('/') && rest.length > 1 && rest.endsWith('/') && !rest.includes('?')) rest = rest.slice(0, -1);
  return host + rest;
}

// Does this look like an address rather than a search?
export function looksLikeUrl(s) {
  s = s.trim();
  if (!s || /\s/.test(s)) return false;
  if (/^[a-z]+:\/\//i.test(s) || /^skylark:/i.test(s)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(s.replace(/^www\./i, '').split(/[?#]/)[0] + '');
}

export function parse(url) {
  const n = normalize(url);
  if (n.startsWith('skylark://')) {
    const [path, q] = n.slice(10).split('?');
    return { url: n, host: 'skylark', path: '/' + path, segs: path.split('/').filter(Boolean), query: new URLSearchParams(q || ''), internal: true };
  }
  const m = n.match(/^([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/) || [];
  const path = m[2] || '/';
  return { url: n, host: m[1] || '', path, segs: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams((m[3] || '').slice(1)), hash: (m[4] || '').slice(1) };
}

// Join a link found on a page with the page it is on, so "/watch?v=x" on vidder.tv becomes vidder.tv/watch?v=x.
export function resolveHref(href, base) {
  if (!href) return null;
  href = href.trim();
  if (href.startsWith('#') || /^javascript:/i.test(href)) return null;
  if (/^[a-z]+:\/\//i.test(href) || /^skylark:/i.test(href)) return normalize(href);
  const b = parse(base);
  if (href.startsWith('//')) return normalize(href.slice(2));
  if (href.startsWith('/')) return normalize(b.host + href);
  if (href.startsWith('?')) return normalize(b.host + b.path + href);
  return normalize(href);
}

// Resolve to { site, title, render(ctx) } — or a browser error page.
export function resolve(url) {
  const route = parse(url);
  if (!route.host) return { error: 'empty', route };
  const site = sites.get(route.host);
  if (!site) return { error: 'dns', route };
  return { site, route };
}

// Build a link string (used by content and site renderers so links stay consistent).
export function link(host, path = '', params) {
  let s = host + path;
  if (params) { const q = new URLSearchParams(); for (const k in params) if (params[k] != null && params[k] !== '') q.set(k, params[k]); const qs = q.toString(); if (qs) s += '?' + qs; }
  return s;
}
