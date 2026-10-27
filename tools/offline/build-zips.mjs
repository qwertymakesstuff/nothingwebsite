// Builds the offline downloads linked from pages.html into dist/:
//   missing-website-windows.zip, missing-website-mac.zip
// Each holds the whole site in missing-website/site/ plus that system's launcher, which starts a
// small web server on localhost (the games use ES modules, which browsers refuse to run from file://).
// Usage: node tools/offline/build-zips.mjs   (needs the `zip` command)
import { cpSync, mkdirSync, rmSync, chmodSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, siteFiles } from './files.mjs';

const DIST = join(ROOT, 'dist');
const LAUNCHERS = join(ROOT, 'tools/offline/launchers');
const files = siteFiles();

const builds = {
  windows: [['Play Offline (Windows).bat'], ['server.ps1', 'launcher/server.ps1']],
  mac: [['Play Offline (Mac).command'], ['server.pl', 'launcher/server.pl']],
};

rmSync(DIST, { recursive: true, force: true });
for (const [os, extras] of Object.entries(builds)) {
  const stage = join(DIST, 'stage-' + os);
  const top = join(stage, 'missing-website');
  for (const f of files) {
    mkdirSync(dirname(join(top, 'site', f)), { recursive: true });
    cpSync(join(ROOT, f), join(top, 'site', f));
  }
  for (const [src, dest = src] of extras) {
    mkdirSync(dirname(join(top, dest)), { recursive: true });
    cpSync(join(LAUNCHERS, src), join(top, dest));
    chmodSync(join(top, dest), 0o755);
  }
  cpSync(join(LAUNCHERS, `README-${os}.txt`), join(top, 'README.txt'));
  writeFileSync(join(top, 'site', 'offline-build.txt'), `built ${new Date().toISOString()}\n`);
  execFileSync('zip', ['-qr9X', join(DIST, `missing-website-${os}.zip`), 'missing-website'], { cwd: stage });
  rmSync(stage, { recursive: true, force: true });
  console.log(`dist/missing-website-${os}.zip`);
}
