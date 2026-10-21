// Settings: opening, motion, sound, selling protection, and save data management.

import { SAVE_VERSION } from '../config.js';
import { $, esc } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { sound, setSoundEnabled } from '../ui/sound.js';

const STATUS = {
  new: 'New profile created this session.',
  loaded: 'Loaded normally.',
  repaired: 'Loaded; some damaged data was repaired.',
  corrupt: 'The previous save could not be read; it was backed up and a new profile started.',
  newer: 'Loaded a save from a newer version; a backup was kept.',
  unavailable: 'Browser storage is unavailable, so nothing is being saved.',
};

export default {
  title: 'Settings',
  render(ctx) {
    const { root, store } = ctx;
    const st = store.player.settings;
    root.innerHTML = `
<section class="settings">
  <h2>Gameplay</h2>
  <label class="setting"><span><b>Skip opening animation</b><small>Reveal the reward immediately instead of spinning the roulette.</small></span><input type="checkbox" class="switch" data-key="instantOpen" ${st.instantOpen ? 'checked' : ''}></label>
  <label class="setting"><span><b>Protect favourites from bulk selling</b><small>Favourites are left out of bulk sales unless you include them for that sale.</small></span><input type="checkbox" class="switch" data-key="protectFavorites" ${st.protectFavorites ? 'checked' : ''}></label>

  <h2>Motion &amp; sound</h2>
  <label class="setting"><span><b>Motion</b><small>Reduced motion shows the result without scrolling the roulette and turns off reveal effects.</small></span>
    <select data-key="motion"><option value="system">Follow system setting</option><option value="reduced">Reduced</option><option value="full">Full</option></select></label>
  <div class="setting"><label for="soundToggle"><b>Sound effects</b><small>Short synthesised clicks and chimes. The game works fully without them.</small></label>
    <span class="setting-ctl"><button class="btn btn-ghost btn-sm" id="testSound">Test</button><input type="checkbox" class="switch" id="soundToggle" data-key="sound" ${st.sound ? 'checked' : ''}></span></div>

  <h2>Save data</h2>
  <p class="muted small">Progress is saved in this browser after every action. Save format version ${SAVE_VERSION}. Status: ${esc(STATUS[store.loadStatus] || store.loadStatus)}${store.backupKey ? ` Backup key: <code>${esc(store.backupKey)}</code>.` : ''}</p>
  <div class="setting-actions">
    <button class="btn btn-ghost" id="exportBtn">Export save</button>
    <label class="btn btn-ghost file-btn">Import save<input type="file" id="importInput" accept="application/json,.json"></label>
    <button class="btn btn-danger" id="resetBtn">Reset progress</button>
  </div>
</section>`;
    $('[data-key="motion"]', root).value = st.motion;

    root.addEventListener('change', e => {
      const key = e.target.dataset.key;
      if (!key) return;
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      const r = store.updateSettings({ [key]: value });
      toast(r.ok ? 'Setting saved.' : r.message, { kind: r.ok ? 'success' : 'error', timeout: 1800 });
    });
    $('#testSound', root).addEventListener('click', () => {
      setSoundEnabled(true);
      sound.reveal(4);
      setSoundEnabled(store.player.settings.sound);
    });
    $('#exportBtn', root).addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store.player, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `skinspin-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#importInput', root).addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const text = await file.text();
      openModal({
        title: 'Replace your progress?',
        body: '<p>Importing replaces your current coins, inventory and statistics with the ones in the file. This cannot be undone.</p>',
        actions: [{ label: 'Cancel' }, { label: 'Import', kind: 'danger', onClick: () => {
          const r = store.importData(text);
          toast(r.ok ? (r.repaired ? 'Save imported; some invalid data was dropped.' : 'Save imported.') : r.message, { kind: r.ok ? 'success' : 'error' });
        } }],
      });
    });
    $('#resetBtn', root).addEventListener('click', () => {
      openModal({
        title: 'Reset all progress?',
        body: '<p>This deletes your coins, inventory, level and statistics and starts you again with 5,000 coins. Export your save first if you might want it back.</p>',
        actions: [{ label: 'Cancel' }, { label: 'Reset everything', kind: 'danger', onClick: () => { store.reset(); toast('Progress reset. You have 5,000 coins.', { kind: 'success' }); } }],
      });
    });
  },
};
