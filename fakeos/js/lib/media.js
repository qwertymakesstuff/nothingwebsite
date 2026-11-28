// Real images and video clips made for the game (see tools/fakeos-media). fakeos/media/manifest.json
// lists what exists; anything missing keeps its drawn version, so media can be added gradually.
let manifest = {};
export async function loadMedia() {
  try {
    const r = await fetch('media/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch { manifest = {}; }
  return manifest;
}
// kind: avatars | photos | thumbs | banners | wallpapers
export const media = (kind, id) => (manifest[kind]?.[id] ? 'media/' + manifest[kind][id] : null);
export const mediaVideo = id => (manifest.videos?.[id] ? { ...manifest.videos[id], url: 'media/' + manifest.videos[id].file } : null);
export const videoIds = () => Object.keys(manifest.videos || {});
