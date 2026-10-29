# simple.missing.website

PUMPED in its simple view (bigger text, plain words, fewer panels, no leverage), served by the
Cloudflare Worker **simpleplay**.

- `simple.missing.website/` is the game. `/pumped` and `/simple.pumped` redirect there.
- The files are `../pumped` itself (see `wrangler.jsonc`), so every change to the game ships here too.
  The page turns on the simple view because the hostname starts with `simple.`.
- On missing.website the same view is at `missing.website/simple.pumped/`.
- Saves live in the browser per site, so a run on simple.missing.website is separate from one on
  missing.website.

## Deploying

In Cloudflare: Workers & Pages -> the **simpleplay** Worker -> Settings -> Build: connect this
repository and set **Root directory** to `simpleplay`. The custom domain `simple.missing.website` is
attached by `wrangler.jsonc` on deploy.
