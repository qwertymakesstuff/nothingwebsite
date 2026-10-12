import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';

const KEY = 'mm:v1:playlists';
const MAX_TRACKS = 500;

function readPlaylists() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.tracks)).map(p => ({
      id: p.id, name: p.name.slice(0, 100), tracks: p.tracks.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string').slice(0, MAX_TRACKS),
    })) : [];
  } catch { return []; }
}
function savePlaylists(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }
function playlistIdFromUrl(value) {
  const raw = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!/(^|\.)youtube\.com$/i.test(url.hostname) && !/(^|\.)youtube-nocookie\.com$/i.test(url.hostname)) return null;
    const id = url.searchParams.get('list');
    return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
  } catch { return null; }
}
const button = (label, action, cls = 'btn') => h('button', { class: cls, type: 'button', onclick: action }, label);

export function LibraryView({ player, services }) {
  const { youtube } = services;
  let playlists = readPlaylists();
  const el = h('section', { class: 'view-section library-view' });
  function render() {
    el.replaceChildren();
    const head = h('div', { class: 'library-head' },
      h('div', null, h('h1', { class: 'page-title' }, 'Library'), h('p', { class: 'library-description' }, 'Your saved playlists, all in one place.')),
      h('div', { class: 'library-actions' },
        button('Import YouTube playlist', showImport, 'btn btn--ghost'),
        button('+ New Playlist', showCreate, 'btn')));
    el.append(head);
    const list = h('div', { class: 'library-playlists' });
    if (!playlists.length) {
      list.append(h('div', { class: 'empty library-empty' },
        h('div', { class: 'empty__icon' }, icon('library', 32)),
        h('h2', null, 'Build your library'),
        h('p', null, 'Create a playlist or import one from YouTube.')));
    } else {
      for (const playlist of playlists) {
        const card = h('article', { class: 'playlist-card' },
          h('div', { class: 'playlist-card__art' }, icon('listMusic', 28)),
          h('div', { class: 'playlist-card__info' },
            h('h2', null, playlist.name),
            h('p', null, `${playlist.tracks.length} ${playlist.tracks.length === 1 ? 'track' : 'tracks'}`)),
          h('div', { class: 'playlist-card__actions' },
            button('Play', () => player.playTracks(playlist.tracks, 0), 'btn btn--small'),
            button('Delete', () => {
              if (!confirm(`Delete “${playlist.name}” from your library?`)) return;
              playlists = playlists.filter(p => p.id !== playlist.id);
              savePlaylists(playlists); render();
            }, 'btn btn--ghost btn--small')));
        list.append(card);
      }
    }
    el.append(list);
  }
  function panel(title, description) {
    const name = h('input', { class: 'playlist-input', type: 'text', maxlength: '100', placeholder: 'Playlist name', 'aria-label': 'Playlist name' });
    const url = h('input', { class: 'playlist-input', type: 'url', placeholder: 'https://www.youtube.com/playlist?list=…', 'aria-label': 'YouTube playlist link' });
    const error = h('p', { class: 'playlist-error', hidden: true, role: 'alert' });
    const status = h('p', { class: 'playlist-status', hidden: true, 'aria-live': 'polite' });
    const body = h('div', { class: 'playlist-dialog__body' }, h('p', null, description), name, url, error, status);
    const dialog = h('div', { class: 'playlist-dialog-backdrop', role: 'presentation', onclick: e => { if (e.target === dialog) render(); } },
      h('section', { class: 'playlist-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'playlist-dialog__head' }, h('h2', null, title), button('×', render, 'icon-btn')),
        body,
        h('div', { class: 'playlist-dialog__actions' }, button('Cancel', render, 'btn btn--ghost'), button(title === 'Import YouTube Playlist' ? 'Import playlist' : 'Create playlist', async () => {
          error.hidden = true;
          if (title !== 'Import YouTube Playlist') {
            const value = name.value.trim();
            if (!value) { error.textContent = 'Give your playlist a name first.'; error.hidden = false; name.focus(); return; }
            playlists.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: value, tracks: [] });
            if (!savePlaylists(playlists)) { playlists.pop(); error.textContent = 'Could not save your playlist. Check browser storage space/settings.'; error.hidden = false; return; }
            render(); return;
          }
          const id = playlistIdFromUrl(url.value);
          if (!id) { error.textContent = 'Paste a valid YouTube playlist URL containing a list= ID.'; error.hidden = false; url.focus(); return; }
          const submit = dialog.querySelector('.playlist-dialog__actions .btn:last-child');
          submit.disabled = true; submit.textContent = 'Importing…'; status.hidden = false; status.textContent = 'Loading public playlist tracks…';
          const result = await youtube.playlist(id);
          if (!result.ok) {
            submit.disabled = false; submit.textContent = 'Import playlist'; status.hidden = true;
            error.textContent = result.message || 'Could not import that playlist.'; error.hidden = false; return;
          }
          const existing = playlists.find(p => p.id === id || p.name.toLowerCase() === result.title.toLowerCase());
          if (existing) {
            existing.name = result.title; existing.tracks = result.tracks.slice(0, MAX_TRACKS); existing.id = id;
          } else playlists.push({ id, name: result.title, tracks: result.tracks.slice(0, MAX_TRACKS) });
          if (!savePlaylists(playlists)) { error.textContent = 'The playlist loaded, but your browser could not save it. Free some storage and try again.'; error.hidden = false; submit.disabled = false; submit.textContent = 'Import playlist'; return; }
          render();
        }, 'btn')));
    el.append(dialog);
    (title === 'Import YouTube Playlist' ? url : name).focus();
  }
  function showCreate() { panel('New Playlist', 'Give your playlist a name. You can add tracks to it as you use the player.'); }
  function showImport() { panel('Import YouTube Playlist', 'Import a public playlist using the site’s YouTube API. Up to 50 playable tracks are imported in their original order.'); }
  render();
  return { el, destroy() {} };
}
