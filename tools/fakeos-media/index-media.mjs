// Scans fakeos/media/ and writes fakeos/media/manifest.json, the list the game reads at startup,
// then refreshes the site's offline file list. Run after adding or removing media by hand.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MEDIA, KINDS, ROOT, run } from './lib.mjs';

export function indexMedia({ quiet } = {}) {
  mkdirSync(MEDIA, { recursive: true });
  const manifest = { version: 1 };
  for (const { dir } of Object.values(KINDS)) {
    manifest[dir] = {};
    if (!existsSync(MEDIA + dir)) continue;
    for (const f of readdirSync(MEDIA + dir).sort()) { const m = f.match(/^(.+)\.(webp|png|jpe?g)$/i); if (m) manifest[dir][m[1]] = `${dir}/${f}`; }
  }
  manifest.videos = {};
  if (existsSync(MEDIA + 'videos')) for (const f of readdirSync(MEDIA + 'videos').sort()) {
    const m = f.match(/^(.+)\.(mp4|webm)$/i); if (!m) continue;
    const side = MEDIA + `videos/${m[1]}.json`;
    const meta = existsSync(side) ? JSON.parse(readFileSync(side, 'utf8')) : { mode: 'loop' };
    manifest.videos[m[1]] = { file: `videos/${f}`, ...meta };
  }
  writeFileSync(MEDIA + 'manifest.json', JSON.stringify(manifest, null, 1) + '\n');
  run(process.execPath, [ROOT + 'tools/offline/build-manifest.mjs'], { cwd: ROOT });
  const count = Object.values(manifest).reduce((n, v) => n + (typeof v === 'object' ? Object.keys(v).length : 0), 0);
  if (!quiet) console.log(`media manifest: ${count} files`);
  return manifest;
}
if (import.meta.url === `file://${process.argv[1]}`) indexMedia();
