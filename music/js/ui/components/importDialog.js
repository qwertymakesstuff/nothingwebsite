import { h } from '../../utils/dom.js';
import { openDialog } from '../dialog.js';
import { showToast } from '../uiStore.js';
import { playlistIdFromInput } from '../../utils/playlistUrl.js';

/** "Import a YouTube playlist": paste a link, we fetch the public playlist through our own API. */
export function openImportDialog({ services, library, ui, router }) {
  const input = h('input', { class: 'field', type: 'url', inputmode: 'url', autocomplete: 'off', 'aria-label': 'YouTube playlist link', placeholder: 'https://www.youtube.com/playlist?list=…', 'data-autofocus': '' });
  const error = h('p', { class: 'field-error', role: 'alert', hidden: true });
  const status = h('p', { class: 'dlg__text', 'aria-live': 'polite', hidden: true });
  const body = h('div', { class: 'stack' },
    h('p', { class: 'dlg__text' }, 'Paste the link of a public YouTube playlist. Up to 50 playable songs are imported, in their original order.'),
    input, error, status);
  const fail = (message) => { error.textContent = message; error.hidden = false; status.hidden = true; input.focus(); return false; };

  async function run() {
    error.hidden = true;
    const id = playlistIdFromInput(input.value);
    if (!id) return fail('Paste a YouTube playlist link (it contains “list=”).');
    status.textContent = 'Loading the playlist…';
    status.hidden = false;
    const res = await services.youtube.playlist(id);
    if (!dlg.isOpen) return true;
    if (!res.ok) return fail(res.message || 'Could not import that playlist.');
    const saved = library.importPlaylist({ id: res.playlistId, title: res.title, tracks: res.tracks });
    if (!saved) return fail('That playlist could not be saved.');
    library.flush();
    showToast(ui, `Imported “${saved.name}” (${saved.tracks.length} songs)`);
    router.navigate('playlist', { id: saved.id });
    return true;
  }

  const dlg = openDialog({
    title: 'Import YouTube playlist', body,
    actions: [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: run }],
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dlg.dialog.querySelector('.btn--primary')?.click(); } });
  return dlg;
}
