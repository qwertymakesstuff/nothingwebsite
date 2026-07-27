const audio = document.getElementById('siteAudio');
const toggle = document.getElementById('audioToggle');
const icon = document.getElementById('audioIcon');

document.getElementById('year').textContent = new Date().getFullYear();

function syncIcon() {
  icon.textContent = audio.paused ? '▶' : 'Ⅱ';
  toggle.setAttribute('aria-label', audio.paused ? 'Play Starting to Fall by Duster' : 'Pause Starting to Fall by Duster');
}

async function tryAutoplay() {
  try {
    await audio.play();
  } catch {
    // Most mobile browsers require a tap before audio with sound can begin.
  }
  syncIcon();
}

toggle.addEventListener('click', async () => {
  if (audio.paused) {
    try { await audio.play(); } catch {}
  } else {
    audio.pause();
  }
  syncIcon();
});

audio.addEventListener('play', syncIcon);
audio.addEventListener('pause', syncIcon);
tryAutoplay();
