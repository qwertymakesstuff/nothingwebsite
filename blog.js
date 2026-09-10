const list = document.getElementById('blogList');

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }).format(date);
}

function renderAttachment(att) {
  const wrap = document.createElement('div');
  wrap.className = 'blog-attachment';

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
  } else {
    const link = document.createElement('a');
    link.href = att.src;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = att.name || 'attachment';
    wrap.appendChild(link);
    return wrap;
  }

  media.src = att.src;
  wrap.appendChild(media);
  if (att.name) {
    const caption = document.createElement('small');
    caption.textContent = att.name;
    wrap.appendChild(caption);
  }
  return wrap;
}

function renderPost(post) {
  const article = document.createElement('article');
  article.className = 'panel blog-post';
  article.id = post.id || '';

  const head = document.createElement('div');
  head.className = 'blog-post-head';

  const title = document.createElement('h2');
  title.textContent = post.title || 'untitled';

  const date = document.createElement('time');
  date.dateTime = post.date || '';
  date.textContent = formatDate(post.date);

  head.append(title, date);

  const body = document.createElement('div');
  body.className = 'blog-body';
  body.textContent = post.body || '';

  article.append(head, body);

  if (Array.isArray(post.attachments) && post.attachments.length) {
    const media = document.createElement('div');
    media.className = 'blog-media-grid';
    post.attachments.forEach(att => media.appendChild(renderAttachment(att)));
    article.appendChild(media);
  }

  return article;
}

async function loadBlog() {
  try {
    const response = await fetch(`blog-posts.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load blog posts.');
    const posts = await response.json();
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = '';
    if (!posts.length) {
      const empty = document.createElement('article');
      empty.className = 'panel blog-empty';
      empty.innerHTML = '<p class="eyebrow">archive</p><h2>nothing here yet</h2><p>first post coming whenever.</p>';
      list.appendChild(empty);
      return;
    }

    posts.forEach(post => list.appendChild(renderPost(post)));
  } catch (error) {
    list.innerHTML = '';
    const box = document.createElement('article');
    box.className = 'panel blog-empty';
    box.textContent = 'could not load the blog right now.';
    list.appendChild(box);
  }
}

loadBlog();
