// Asset library. assets/manifest.json lists every ForgeGUI-generated image with its file, use and
// whether it has been downloaded into the project. Anything not available yet (or failing to load)
// falls back to a procedural version drawn in code, so the games always render.

export class Assets {
  constructor(manifest = null) {
    this.base = 'assets/';
    this.entries = new Map();
    this.broken = new Set();
    if (manifest) this.setManifest(manifest);
  }

  setManifest(manifest) {
    this.entries.clear();
    for (const a of manifest?.assets || []) if (a && typeof a.id === 'string') this.entries.set(a.id, a);
    this.manifest = manifest;
  }

  async load(fetchImpl = globalThis.fetch) {
    try {
      const res = await fetchImpl(`${this.base}manifest.json`, { cache: 'no-cache' });
      if (res.ok) this.setManifest(await res.json());
    } catch { /* offline before first cache or file missing: every asset falls back */ }
    return this;
  }

  entry(id) { return this.entries.get(id) || null; }
  has(id) { const a = this.entries.get(id); return !!(a && a.downloaded && !this.broken.has(id)); }
  url(id) { return this.has(id) ? this.base + this.entries.get(id).file : null; }

  // Sets (manifest.sets) are used all-or-nothing so generated and procedural art never mix.
  setReady(name) {
    const ids = this.manifest?.sets?.[name];
    return Array.isArray(ids) && ids.length > 0 && ids.every(id => this.has(id));
  }
  setUrl(name, id) { return this.setReady(name) ? this.url(id) : null; }
  markBroken(id) { this.broken.add(id); }

  // Preload images and drop any that fail, so renderers never show a broken image.
  async preload(ids, ImageCtor = globalThis.Image) {
    if (!ImageCtor) return;
    await Promise.all(ids.filter(id => this.has(id)).map(id => new Promise(resolve => {
      const img = new ImageCtor();
      img.onload = () => resolve();
      img.onerror = () => { this.markBroken(id); resolve(); };
      img.src = this.url(id);
    })));
  }

  summary() {
    const all = [...this.entries.values()];
    return {
      total: all.length,
      downloaded: all.filter(a => this.has(a.id)).length,
      generated: all.filter(a => a.status === 'generated').length,
      pending: all.filter(a => a.status === 'pending').length,
      failed: all.filter(a => a.status === 'failed').length,
    };
  }
}
