# apps.missing.website

The programs page (moved here from missing.website/programs). Static files in `public/`, served by a Cloudflare
Worker named **missing-apps** (Root directory `apps`; domain attached by `wrangler.jsonc`).

To add a program: put its 1260 x 320 banner in `public/`, then add an entry to `public/programs.json`
(`name`, `image`, `url`; the name shows when the banner is hovered). `missing.website/programs` redirects here.
