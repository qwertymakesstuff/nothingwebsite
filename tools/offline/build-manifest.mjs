// Writes /offline-files.json, the list of files pages.html saves for offline play (Chromebook).
// Run after adding or removing files: node tools/offline/build-manifest.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, offlineUrls } from './files.mjs';

const urls = offlineUrls();
writeFileSync(join(ROOT, 'offline-files.json'), JSON.stringify(urls, null, 0).replace(/","/g, '",\n"') + '\n');
console.log(`offline-files.json: ${urls.length} urls`);
