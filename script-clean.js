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

toggle.addEventListener('click', async event => {
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

function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function renderLatestAttachment(att) {
  if (!att || !att.src) return null;
  const wrap = document.createElement('div');
  wrap.className = 'latest-blog-media';
  let media;
  if (att.type === 'image') {
    media = document.createElement('img');
    media.loading = 'lazy';
    media.alt = att.name || 'blog image';
  } else if (att.type === 'video') {
    media = document.createElement('video');
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
  } else if (att.type === 'audio') {
    media = document.createElement('audio');
    media.controls = true;
    media.preload = 'metadata';
  }
  if (!media) return null;
  media.src = att.src;
  wrap.appendChild(media);
  return wrap;
}

async function loadLatestBlog() {
  const mount = document.getElementById('latestBlogMount');
  if (!mount) return;
  try {
    const response = await fetch(`blog-posts.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const posts = await response.json();
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    mount.innerHTML = '';

    if (!posts.length) {
      const p = document.createElement('p');
      p.textContent = 'nothing posted yet.';
      mount.appendChild(p);
      return;
    }

    const post = posts[0];
    const title = document.createElement('h3');
    title.textContent = post.title || 'untitled';
    const date = document.createElement('time');
    date.dateTime = post.date || '';
    date.textContent = formatBlogDate(post.date);
    const excerpt = document.createElement('p');
    const text = (post.body || '').trim();
    excerpt.textContent = text.length > 280 ? `${text.slice(0, 280).trim()}…` : text;
    const link = document.createElement('a');
    link.className = 'blog-link-button';
    link.href = `/blog.html#${encodeURIComponent(post.id || '')}`;
    link.textContent = 'read post →';

    mount.append(title, date);
    if (excerpt.textContent) mount.appendChild(excerpt);
    if (Array.isArray(post.attachments) && post.attachments.length) {
      const media = renderLatestAttachment(post.attachments[0]);
      if (media) mount.appendChild(media);
    }
    const action = document.createElement('div');
    action.style.marginTop = '16px';
    action.appendChild(link);
    mount.appendChild(action);
  } catch {
    mount.innerHTML = '<p>could not load the latest post right now.</p>';
  }
}

loadLatestBlog();
