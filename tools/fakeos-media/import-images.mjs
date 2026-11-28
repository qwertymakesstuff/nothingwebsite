// Imports Midjourney downloads from tools/fakeos-media/inbox/ into the game.
//   node tools/fakeos-media/import-images.mjs           convert everything in the inbox
//   node tools/fakeos-media/import-images.mjs --dry-run show what each file would become
// Files named like the prompt sheet (avatar-maxplaysstuff.png) are used directly. Other names
// are matched against the opening words of each prompt (Midjourney names files after the prompt).
import { readdirSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { imageJobs, KINDS, INBOX, ORIGINALS, MEDIA, words, run } from './lib.mjs';
import { indexMedia } from './index-media.mjs';

const dry = process.argv.includes('--dry-run');
mkdirSync(INBOX, { recursive: true }); mkdirSync(ORIGINALS, { recursive: true });
const jobs = imageJobs();
const byFile = new Map(jobs.map(j => [j.file.replace(/\.png$/, ''), j]));

function match(name) {
  const base = name.replace(/\.(png|jpe?g|webp)$/i, '');
  if (byFile.has(base)) return { job: byFile.get(base) };
  const still = base.match(/^still-([A-Za-z0-9]+)-(\d+)$/);
  if (still) return { still: true };
  // Midjourney: "<user>_<first words of prompt>_<uuid>" — compare those words with each prompt's opening.
  const w = words(base.replace(/_[0-9a-f]{8}-[0-9a-f-]{20,}.*$/i, '')).slice(1);
  let best = null, score = 0, tie = false;
  for (const j of jobs) {
    const p = words(j.prompt).slice(0, w.length + 2);
    let s = 0; for (let i = 0; i < w.length; i++) if (p[i] === w[i]) s++; else if (p.includes(w[i])) s += .5;
    if (s > score) { best = j; score = s; tie = false; } else if (s === score) tie = true;
  }
  return best && score >= 4 && !tie ? { job: best, guessed: true } : {};
}

const files = readdirSync(INBOX).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) { console.log('inbox is empty: put Midjourney downloads in tools/fakeos-media/inbox/'); process.exit(0); }
let ok = 0, skipped = [];
for (const f of files) {
  const m = match(f);
  if (m.still) { console.log(`${f} → kept as a video still`); if (!dry) renameSync(INBOX + f, ORIGINALS + f); continue; }
  if (!m.job) { skipped.push(f); continue; }
  if (m.job.kind === 'ref') { console.log(`${f} → kept as ${m.job.file} (character reference)`); if (!dry) renameSync(INBOX + f, ORIGINALS + m.job.file); continue; }
  const k = KINDS[m.job.kind], out = `${MEDIA}${k.dir}/${m.job.id}.webp`;
  console.log(`${f} → fakeos/media/${k.dir}/${m.job.id}.webp${m.guessed ? '  (matched by prompt words)' : ''}`);
  if (dry) continue;
  mkdirSync(MEDIA + k.dir, { recursive: true });
  // cover-crop to the target size, then encode a small WebP
  run('ffmpeg', ['-y', '-v', 'error', '-i', INBOX + f, '-vf', `scale=${k.w}:${k.h}:force_original_aspect_ratio=increase,crop=${k.w}:${k.h}`, '-c:v', 'libwebp', '-quality', k.w > 1000 ? '82' : '78', out]);
  renameSync(INBOX + f, ORIGINALS + `${m.job.kind}-${m.job.id}${f.slice(f.lastIndexOf('.'))}`);
  ok++;
}
if (skipped.length) console.log(`\nnot recognised (rename to the file name from ASSET_PROMPTS.md and run again):\n  ${skipped.join('\n  ')}`);
if (!dry && ok) { indexMedia(); console.log(`imported ${ok} image${ok > 1 ? 's' : ''}. run build-prompts.mjs to tick them off the sheet.`); }
