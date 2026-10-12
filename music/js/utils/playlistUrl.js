// Pull a YouTube playlist id out of whatever the user pasted: a full link, a link with extra
// parameters, or the bare id. Returns null for anything else (other sites, empty, garbage).

const ID = /^[A-Za-z0-9_-]{10,64}$/;
const BARE = /^(PL|OL|UU|FL|LL|RD)[A-Za-z0-9_-]{8,62}$/;
const HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

export function playlistIdFromInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (BARE.test(raw)) return raw;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!HOST.test(url.hostname)) return null;
    const id = url.searchParams.get('list');
    return id && ID.test(id) ? id : null;
  } catch { return null; }
}
