// The achievement collection: a dialog opened from the top bar, grouped by category,
// with locked / unlocked / hidden states, unlock dates and progress bars. Also the
// little celebration (sparkles and a pulse on the top-bar button) when one unlocks.
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, ACHIEVEMENT_BONUS } from './achievements.js';
import { isUnlocked, unlockedCount, achievementProgress } from './achievementSystem.js';

const HIDDEN_ICON = '<path d="M12 3a6 6 0 0 0-6 6h3a3 3 0 1 1 4.2 2.7c-1.3.6-2.2 1.8-2.2 3.3v1h3v-1c0-.3.2-.6.5-.7A6 6 0 0 0 12 3z"/><circle cx="12" cy="20" r="1.8"/>';
const dateFormat = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

export function createAchievementsView(state) {
  const $ = id => document.getElementById(id);
  const dialog = $('achievementsDialog'), body = $('achievementList'), button = $('achievementsBtn');
  const els = { count: $('achievementCount'), summary: $('achievementSummary'), bar: $('achievementBar') };
  let filter = 'all';

  // one tile per achievement, built once and updated in place
  const tiles = new Map();
  for (const group of ACHIEVEMENT_GROUPS) {
    const section = document.createElement('section');
    section.className = 'ach-group';
    section.innerHTML = '<h3></h3><div class="ach-grid"></div>';
    section.querySelector('h3').textContent = group;
    const grid = section.querySelector('.ach-grid');
    for (const a of ACHIEVEMENTS.filter(x => x.group === group)) {
      const el = document.createElement('div');
      el.className = 'ach';
      el.innerHTML = `<span class="ach-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"></svg></span>
        <span class="ach-text"><strong></strong><span class="ach-desc"></span><span class="ach-date"></span></span>
        <span class="ach-progress" aria-hidden="true"><span></span></span>`;
      grid.appendChild(el);
      tiles.set(a.id, { a, el, section, icon: el.querySelector('svg'), name: el.querySelector('strong'), desc: el.querySelector('.ach-desc'),
        date: el.querySelector('.ach-date'), bar: el.querySelector('.ach-progress span'), last: null });
    }
    body.appendChild(section);
  }

  function renderTile(t) {
    const done = isUnlocked(state, t.a.id);
    const secret = !!t.a.hidden && !done;
    const p = done ? 1 : achievementProgress(state, t.a.id);
    const key = `${done}:${Math.floor(p * 100)}`;
    if (key === t.last) return;
    t.last = key;
    t.el.classList.toggle('unlocked', done);
    t.el.classList.toggle('secret', secret);
    t.icon.innerHTML = secret ? HIDDEN_ICON : t.a.icon;
    t.name.textContent = secret ? '???' : t.a.name;
    t.desc.textContent = secret ? 'Hidden achievement. Do something unusual.' : t.a.description;
    t.date.textContent = done ? `Unlocked ${dateFormat ? dateFormat.format(state.achievements[t.a.id]) : new Date(state.achievements[t.a.id]).toString()}` : '';
    t.bar.parentElement.hidden = done || secret || !t.a.progress;
    t.bar.style.width = `${Math.floor(p * 100)}%`;
    t.el.setAttribute('aria-label', `${t.name.textContent}: ${t.desc.textContent}${done ? ', unlocked' : ', locked'}`);
  }

  function applyFilter() {
    for (const t of tiles.values()) {
      const done = isUnlocked(state, t.a.id);
      t.el.hidden = (filter === 'unlocked' && !done) || (filter === 'locked' && done);
    }
    for (const section of body.querySelectorAll('.ach-group')) {
      section.hidden = ![...section.querySelectorAll('.ach')].some(el => !el.hidden);
    }
    $('achievementEmpty').hidden = [...tiles.values()].some(t => !t.el.hidden);
  }

  // the top-bar counter: always up to date; the tiles only while the dialog is open
  function render() {
    const n = unlockedCount(state);
    const text = `${n}/${ACHIEVEMENTS.length}`;
    if (els.count.textContent !== text) {
      els.count.textContent = text;
      els.summary.textContent = `${n} of ${ACHIEVEMENTS.length} unlocked · +${Math.round(n * ACHIEVEMENT_BONUS * 100)}% production`;
      els.bar.style.width = `${(n / ACHIEVEMENTS.length) * 100}%`;
    }
    if (dialog.open) { for (const t of tiles.values()) renderTile(t); applyFilter(); }
  }

  function open() {
    if (!dialog.open) dialog.showModal();
    render();
  }

  button.addEventListener('click', open);
  $('achievementClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); }); // click on the backdrop
  for (const b of dialog.querySelectorAll('.ach-filter')) {
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      for (const o of dialog.querySelectorAll('.ach-filter')) o.setAttribute('aria-pressed', String(o === b));
      applyFilter();
    });
  }

  // sparkles from the top-bar button and a pulse on it
  function celebrate() {
    const r = button.getBoundingClientRect();
    const layer = $('floaters');
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      const angle = (i / 14) * Math.PI * 2, dist = 40 + Math.random() * 30;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist + 20}px`);
      s.addEventListener('animationend', () => s.remove());
      layer.appendChild(s);
    }
    button.classList.remove('pulse');
    void button.offsetWidth;
    button.classList.add('pulse');
  }
  button.addEventListener('animationend', () => button.classList.remove('pulse'));

  render();
  return { render, open, celebrate };
}
