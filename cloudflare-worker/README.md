# missing.website Steam inventory worker

This Worker proxies the public CS2 inventory endpoint for the inventory page and adds CORS + caching.

1. Create a Cloudflare Worker.
2. Deploy `worker.js` (or deploy this folder with Wrangler).
3. Copy the resulting `https://...workers.dev` URL.
4. In `inventory.html`, replace `https://REPLACE-ME.workers.dev/inventory` with `https://YOUR-WORKER.workers.dev/inventory`.

The Worker only exposes the fixed public CS2 inventory and does not accept arbitrary Steam IDs or URLs.
