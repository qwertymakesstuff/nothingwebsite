// Which files make up the website, for the offline downloads (build-zips.mjs) and the
// "save for offline" cache list (build-manifest.mjs -> /offline-files.json).
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Folders and files that are tooling, docs or server code rather than the site itself.
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'tests', 'tools', 'worker', 'cloudflare-worker', 'simpleplay', 'dist', 'gta/tools', 'gta/voice/tools']);
const SKIP_FILES = /(^|\/)(CNAME|wrangler\.(jsonc|toml)|favicon-note\.txt|blog-admin\.(html|js)|offline-files\.json)$|\.(md|docx|mjs\.map)$/i;

export function siteFiles(root = ROOT) {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(root, full).split(sep).join('/');
      if (statSync(full).isDirectory()) { if (!SKIP_DIRS.has(rel) && !name.startsWith('.')) walk(full); }
      else if (!name.startsWith('.') && !SKIP_FILES.test(rel)) out.push(rel);
    }
  })(root);
  return out.sort();
}

// URLs to cache for offline play: every file, plus "folder/" for each folder's index.html.
export function offlineUrls(files = siteFiles()) {
  const urls = [];
  for (const f of files) {
    if (f === 'index.html') urls.push('/');
    else if (f.endsWith('/index.html')) urls.push('/' + f.slice(0, -'index.html'.length));
    urls.push('/' + f.split('/').map(encodeURIComponent).join('/'));
  }
  return urls;
}
