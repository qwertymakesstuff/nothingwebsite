import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { offlineUrls } from '../../tools/offline/files.mjs';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('offline-files.json lists the current site (run node tools/offline/build-manifest.mjs)', () => {
  assert.deepEqual(JSON.parse(read('offline-files.json')), offlineUrls());
});

test('the arcade uses relative paths, so it works at missing.website/play/public/ and offline', () => {
  const pub = new URL('play/public/', root);
  for (const dir of ['', ...readdirSync(pub, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name + '/')]) {
    for (const f of readdirSync(new URL(dir, pub))) {
      if (!/\.(html|js)$/.test(f) || f === '404.html') continue; // 404.html is only served by play.missing.website
      const src = readFileSync(new URL(dir + f, pub), 'utf8');
      assert.doesNotMatch(src, /(href|src)="\/(?!\/)|from '\/|fetch\('\//, `play/public/${dir}${f} has a root-absolute path`);
    }
  }
  for (const g of JSON.parse(read('play/public/games.json'))) assert.ok(!g.url.startsWith('/') && !g.image.startsWith('/'), g.name);
});

test('every page linked from pages.html exists', () => {
  const html = read('pages.html');
  const links = [...html.matchAll(/<a href="(\/[^"#]*)"/g)].map((m) => m[1]);
  assert.ok(links.length > 40);
  for (const l of links) {
    const file = l.endsWith('/') ? l + 'index.html' : l;
    assert.ok(existsSync(new URL('.' + file, root)), `pages.html links to missing ${l}`);
  }
  for (const os of ['windows', 'mac']) assert.match(html, new RegExp(`releases/latest/download/missing-website-${os}\\.zip`));
});

test('offline launchers are present', () => {
  for (const f of ['Play Offline (Windows).bat', 'server.ps1', 'Play Offline (Mac).command', 'server.pl', 'README-windows.txt', 'README-mac.txt']) {
    assert.ok(existsSync(new URL('tools/offline/launchers/' + f, root)), f);
  }
});
