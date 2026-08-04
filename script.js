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
  try {
    await audio.play();
  } catch {
    // iOS/Safari can block audible autoplay until the first user interaction.
  }
  syncIcon();
}

startAudio();
window.addEventListener('load', startAudio, { once: true });

const unlockEvents = ['touchstart', 'pointerdown', 'keydown', 'click'];
function unlockAudio() {
  startAudio();
  unlockEvents.forEach(eventName => document.removeEventListener(eventName, unlockAudio));
}
unlockEvents.forEach(eventName => document.addEventListener(eventName, unlockAudio, { once: true, passive: true }));

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
      const isActive = otherTab === tab;
      otherTab.classList.toggle('active', isActive);
      otherTab.setAttribute('aria-selected', String(isActive));
    });

    mapPanels.forEach(panel => {
      const isActive = panel.dataset.mapPanel === target;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
  });
});
