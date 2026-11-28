// Writes fakeos/docs/ASSET_PROMPTS.md: one Midjourney prompt per image the game can use.
// Run: node tools/fakeos-media/build-prompts.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { imageJobs, KINDS, ROOT, MEDIA, ORIGINALS, refFile } from './lib.mjs';
import { VIDEO_JOBS } from './assets.mjs';

const jobs = imageJobs();
const done = j => j.kind === 'ref' ? existsSync(ORIGINALS + j.file) : existsSync(`${MEDIA}${KINDS[j.kind].dir}/${j.id}.webp`);
const TITLES = { avatar: 'Profile pictures', ref: 'Character references (not shown in the game)', photo: 'Blink photos', thumb: 'Vidder thumbnails', banner: 'Vidder channel banners', wallpaper: 'Desktop wallpapers' };
const NOTES = {
  avatar: 'Make these first. Each one becomes that person\'s **character reference**: when the same person appears in a photo or thumbnail, add their avatar with Midjourney\'s character/omni reference so they look the same everywhere.',
  ref: 'These people\'s profile pictures are objects or logos, so make a plain portrait of them to use as the character reference instead.',
  photo: 'Lines marked *ref* include a person: use that person\'s avatar as the character reference. The game adds meme captions on top itself, so don\'t put text in the image.',
  thumb: 'No text in the image: the game draws big thumbnail text (like "24 HOURS!!") on top. Lines marked *ref* include a person.',
  banner: 'Very wide; keep the middle uncluttered.',
  wallpaper: 'Upscale these to the largest size Midjourney offers.',
};
let md = `# FAKEOS asset prompts\n\nGenerated from \`tools/fakeos-media/assets.mjs\` by \`node tools/fakeos-media/build-prompts.mjs\`. **${jobs.length} images**, ${jobs.filter(done).length} done.\n\n`;
md += `## How to use\n1. Paste a prompt into Midjourney. Pick the best of the four, upscale, download.\n2. Drop the download into \`tools/fakeos-media/inbox/\`. Renaming it to the **file name** shown is safest; the importer also recognises Midjourney's own file names.\n3. Run \`node tools/fakeos-media/import-images.mjs\`. It shrinks each image to a small WebP in \`fakeos/media/\`, keeps the original in \`tools/fakeos-media/originals/\`, and updates the game's media list.\n4. Reload FAKEOS. Anything you haven't made yet keeps its drawn version.\n\nOptional for videos: a Midjourney still saved as \`still-<videoId>-<shot>.png\` (e.g. \`still-gBforlater0-1.png\`) in the inbox becomes the first frame of that shot, which keeps people consistent.\n\nSkipped on purpose: hollowfrequency, q_mardell (anomaly accounts keep the default blank avatar), Vidder (brand mark), passers-by (drawn avatars), the player's own Blink picture.\n\n`;
for (const kind of Object.keys(TITLES)) {
  const list = jobs.filter(j => j.kind === kind);
  md += `## ${TITLES[kind]} (${list.length})\n${NOTES[kind]}\n\n`;
  for (const j of list) md += `- [${done(j) ? 'x' : ' '}] **${j.file}**${j.ref ? ` — *ref: ${refFile(j.ref)}*` : ''}\n  \`\`\`\n  ${j.prompt}\n  \`\`\`\n`;
  md += '\n';
}
md += `## Videos\nVideos are made by \`tools/fakeos-media/make-videos.mjs\`, not Midjourney. ${Object.keys(VIDEO_JOBS).length} are planned; see MEDIA_PIPELINE.md.\n`;
writeFileSync(ROOT + 'fakeos/docs/ASSET_PROMPTS.md', md);
console.log(`wrote fakeos/docs/ASSET_PROMPTS.md (${jobs.length} images, ${jobs.filter(done).length} done)`);
