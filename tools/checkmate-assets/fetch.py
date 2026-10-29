#!/usr/bin/env python3
"""Download the Checkmate Club ForgeGUI assets listed in checkmate-club/assets/manifest.json,
trim transparent margins, resize, convert to WebP and record the final size in the manifest.

    python3 tools/checkmate-assets/fetch.py            # fetch everything not yet downloaded
    python3 tools/checkmate-assets/fetch.py --force    # re-download and re-process all

Needs network access to the ForgeGUI storage host and Pillow (pip install pillow).
Assets whose job failed are skipped; outcome_unknown ones are probed; the game keeps its fallback for them.
"""
import io, json, sys, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / 'checkmate-club' / 'assets'
MANIFEST = ROOT / 'manifest.json'


def process(img, spec):
    img = img.convert('RGBA')
    if spec.get('trim'):
        box = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if box:
            pad = max(2, round(max(box[2] - box[0], box[3] - box[1]) * 0.02))
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad))
            img = img.crop(box)
    fit = spec.get('fit')
    if fit and max(img.size) > fit:
        img.thumbnail((fit, fit), Image.LANCZOS)
    has_alpha = img.getchannel('A').getextrema()[0] < 255
    return (img if has_alpha else img.convert('RGB')), has_alpha


def main(force=False):
    data = json.loads(MANIFEST.read_text())
    ok = skipped = failed = 0
    for a in data['assets']:
        # outcome_unknown jobs may still have produced an image: try the probe URL, never regenerate.
        url = a['source'].get('url') or a['source'].get('probe_url')
        if not url:
            skipped += 1
            continue
        out = ROOT / a['file']
        if a.get('downloaded') and out.exists() and not force:
            continue
        try:
            raw = urllib.request.urlopen(url, timeout=60).read()
            if a['status'] == 'outcome_unknown':
                a['source']['url'] = url  # it did exist after all
            img, has_alpha = process(Image.open(io.BytesIO(raw)), a.get('process', {}))
            out.parent.mkdir(parents=True, exist_ok=True)
            img.save(out, 'WEBP', quality=86, method=6)
            a.update(status='generated', downloaded=True, width=img.width, height=img.height,
                     bytes=out.stat().st_size, alpha=has_alpha, source_bytes=len(raw))
            ok += 1
            print(f"ok   {a['file']}  {img.width}x{img.height}  {out.stat().st_size // 1024} KB")
        except Exception as e:  # keep going; the game falls back for anything missing
            if a['status'] == 'outcome_unknown':
                skipped += 1
                print(f"none {a['file']}: no image was produced ({e})")
                continue
            failed += 1
            print(f"FAIL {a['file']}: {e}", file=sys.stderr)
    MANIFEST.write_text(json.dumps(data, indent=1) + '\n')
    print(f'{ok} downloaded, {failed} failed, {skipped} skipped (no generated file)')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main('--force' in sys.argv))
