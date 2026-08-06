const audio = document.getElementById('siteAudio');
const toggle = document.getElementById('audioToggle');
const icon = document.getElementById('audioIcon');

document.getElementById('year').textContent = new Date().getFullYear();
audio.volume = 1;

function syncIcon() {
  icon.textContent = audio.paused ? '▶' : 'Ⅱ';
  toggle.setAttribute('aria-label', audio.paused ? 'Play Starting to Fall by Duster' : 'Pause Starting to Fall by Duster');
}

async function startAudio() {
  try { await audio.play(); } catch {}
  syncIcon();
}

startAudio();
window.addEventListener('load', startAudio, { once: true });

const unlockEvents = ['touchstart', 'pointerdown', 'keydown', 'click'];
function unlockAudio() {
  startAudio();
  unlockEvents.forEach(name => document.removeEventListener(name, unlockAudio));
}
unlockEvents.forEach(name => document.addEventListener(name, unlockAudio, { once: true, passive: true }));

toggle.addEventListener('click', async (event) => {
  event.stopPropagation();
  if (audio.paused) {
    try { await audio.play(); } catch {}
  } else {
    audio.pause();
  }
  syncIcon();
});

audio.addEventListener('play', syncIcon);
audio.addEventListener('pause', syncIcon);
syncIcon();

const mapTabs = document.querySelectorAll('[data-map-tab]');
const mapPanels = document.querySelectorAll('[data-map-panel]');

mapTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.mapTab;
    mapTabs.forEach(otherTab => {
      const active = otherTab === tab;
      otherTab.classList.toggle('active', active);
      otherTab.setAttribute('aria-selected', String(active));
    });
    mapPanels.forEach(panel => {
      const active = panel.dataset.mapPanel === target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  });
});
