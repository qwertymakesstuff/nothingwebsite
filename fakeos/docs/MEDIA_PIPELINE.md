# Media pipeline: real images and AI videos

Every picture and video in FAKEOS is drawn by code until a real file replaces it. Real files live in `fakeos/media/` and are listed in `fakeos/media/manifest.json`. Anything missing keeps its drawn version, so you can add media a few files at a time.

Tools are in `tools/fakeos-media/` and run on your own computer. You need **Node 18+** and **ffmpeg**:
- Mac: `brew install ffmpeg`
- Windows: `winget install ffmpeg`

Run every command from the repository root.

## Images (Midjourney, by hand)
1. Open `fakeos/docs/ASSET_PROMPTS.md`: 129 prompts with a file name for each. Make the profile pictures and character references first, then use them as Midjourney character/omni references for the photos and thumbnails that show those people.
2. Download your pick into `tools/fakeos-media/inbox/`. Name it as the sheet says (`avatar-maxplaysstuff.png`), or leave Midjourney's name and the importer matches it from the prompt words.
3. `node tools/fakeos-media/import-images.mjs`. It crops and shrinks each image to a small WebP (avatars about 10 KB, wallpapers about 150 KB), keeps your original in `originals/`, and updates the game's media list. Add `--dry-run` to preview.
4. `node tools/fakeos-media/build-prompts.mjs` ticks finished images off the sheet.

## Videos (automatic)
`make-videos.mjs` reads the 36 video jobs in `assets.mjs`, plans the shots from each video's captions, calls a video API for every shot, stitches the shots together, degrades them to 2012 camcorder quality and installs the result.

| Mode | What you get |
|---|---|
| `full` | The clip *is* the video: its own sound and length, with captions timed to each shot. Used for short videos such as "it's for later", Doug and the news reports. |
| `loop` | A silent loop of 3 shots plays under the original runtime and captions, so timestamps mentioned in comments ("at 3:00 there is a tone") still line up. Music videos keep their music. |

### One-time setup
1. Choose a provider and get an API key:
   - **Replicate**: one account covers many video models (Veo, Kling and others).
   - **Google Gemini API**: Veo and its successors.
2. Put the key in an environment variable; never put it in a file in the repo.
   - Mac/Linux: `export REPLICATE_API_TOKEN=...` (or `GEMINI_API_KEY`)
   - Windows PowerShell: `$env:REPLICATE_API_TOKEN="..."`
3. Copy `tools/fakeos-media/config.example.json` to `config.json`. The copy is git-ignored. Set:
   - `provider`: `replicate` or `gemini`
   - `model`: the model's exact id from the provider's site. Model names change often (Google retired its Veo 3.1 *preview* ids in October 2026), so check the current list. For Replicate, also check the model's input names and adjust `replicateInput` to match (e.g. `duration` vs `seconds`, `start_image` vs `image`).
   - `pricePerSecond`: your model's real price per second of video.
   - `maxSpendPerRun`: the most one run may spend. It stops before passing this.
   - `maxShotSeconds`: the longest clip the model makes. Many models cap at 5–10 seconds.

### Running it
```bash
node tools/fakeos-media/make-videos.mjs --tier 1                   # plan + cost estimate, spends nothing
node tools/fakeos-media/make-videos.mjs --tier 1 --provider test --go   # free dry run with test footage
node tools/fakeos-media/make-videos.mjs --tier 1 --go              # the real thing
```
- Then `--tier 2 --go`, `--tier 3 --go`, or `--only id1,id2 --go`.
- Leave it running unattended. Every shot is cached in `.work/`, so after an error, a budget stop or a closed laptop, running the same command again carries on without paying twice.
- `--redo` remakes finished videos. Changing a prompt in `assets.mjs` automatically regenerates only the shots whose prompt changed.
- After a free `test` run, delete `fakeos/media/videos/` and run `node tools/fakeos-media/index-media.mjs` so test footage never ships.

Estimated footage at the default $0.15/s (your real price will differ):

| Scope | Footage | Estimated cost |
|---|---|---|
| Tier 1 (6 videos) | 192 s | ~$29 |
| Tiers 1–2 (16 videos) | 517 s | ~$78 |
| Everything (36 videos) | 997 s | ~$150 |

### Keeping people consistent
Text-to-video invents a new face every shot. For anyone who appears on camera:
1. Make a Midjourney still of the opening frame, using their avatar (or `ref-` portrait) as the character reference.
2. Save it as `still-<videoId>-<shot>.png`, e.g. `still-gBforlater0-1.png`, and import it. It goes to `originals/`.
3. The next run starts that shot from your still (image-to-video).

### Publishing
```bash
git add fakeos/media offline-files.json
git commit -m "FAKEOS media"
```
Clips come out around 1 MB per 20 seconds, so all 36 videos are roughly 40–60 MB in total. Cloudflare's 25 MB per-file limit is no problem. The site's offline download grows by the same amount.

### Checking quality
Watch each video in the game before committing. Reject anything with:
- visible text, logos or watermarks
- modern phones or cars
- plastic, glossy "AI" faces

To fix one: tweak its `setting` in `assets.mjs`, then run `--only <id> --redo --go`. Only changed shots are regenerated.
