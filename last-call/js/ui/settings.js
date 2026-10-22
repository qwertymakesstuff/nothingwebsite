// Settings: audio levels, shift timer speed, text size, contrast, motion, hints, and resetting
// the campaign.

import { esc, modal, confirmBox, toast } from './dom.js';

export function openSettings(app) {
  const s = app.settings;
  const m = modal(`<h2>Settings</h2>
    <div class="settings">
      ${['master', 'music', 'sfx'].map(k => `<label class="field range">${({ master: 'Master volume', music: 'Music', sfx: 'Sound effects' })[k]}<input type="range" min="0" max="1" step="0.05" data-k="${k}" value="${s[k]}"></label>`).join('')}
      <label class="field">Shift timer<select data-k="timer">${[['relaxed', 'Relaxed — 60% speed'], ['standard', 'Standard'], ['brisk', 'Brisk — 125% speed']].map(([v, l]) => `<option value="${v}" ${s.timer === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Text size<select data-k="textSize"><option value="normal" ${s.textSize === 'normal' ? 'selected' : ''}>Normal</option><option value="large" ${s.textSize === 'large' ? 'selected' : ''}>Large</option></select></label>
      ${[['contrast', 'High contrast'], ['reduceMotion', 'Reduce motion'], ['hints', 'Show rule hints during shifts']].map(([k, l]) => `<label class="check"><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}> ${esc(l)}</label>`).join('')}
    </div>
    <div class="row between"><button class="btn danger ghost" id="resetBtn">Reset campaign</button><button class="btn" data-close autofocus>Done</button></div>`, { label: 'Settings' });
  m.el.querySelectorAll('[data-k]').forEach(input => {
    input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
      const k = input.dataset.k;
      s[k] = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      app.applySettings();
    });
  });
  m.el.querySelector('#resetBtn').onclick = async () => {
    if (!(await confirmBox('Delete your campaign save? Settings are kept.', 'Delete save'))) return;
    app.resetCampaign();
    m.close();
    toast('Campaign deleted.', 'info');
  };
}
