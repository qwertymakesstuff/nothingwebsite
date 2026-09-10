const OWNER = 'qwertymakesstuff';
const REPO = 'nothingwebsite';
const BRANCH = 'main';
const POSTS_PATH = 'blog-posts.json';
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const tokenInput = document.getElementById('githubToken');
const verifyButton = document.getElementById('verifyToken');
const authStatus = document.getElementById('authStatus');
const authPanel = document.getElementById('authPanel');
const composer = document.getElementById('composer');
const logoutButton = document.getElementById('logoutButton');
const titleInput = document.getElementById('postTitle');
const bodyInput = document.getElementById('postBody');
const attachmentsInput = document.getElementById('postAttachments');
const attachmentList = document.getElementById('attachmentList');
const previewButton = document.getElementById('previewButton');
const publishButton = document.getElementById('publishButton');
const publishStatus = document.getElementById('publishStatus');
const previewPanel = document.getElementById('previewPanel');
const previewMount = document.getElementById('previewMount');

let token = sessionStorage.getItem('blogGithubToken') || '';

function setStatus(el, text, kind = '') {
  el.textContent = text;
  el.className = `editor-status ${kind}`.trim();
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function verifyCurrentToken() {
  if (!token) throw new Error('Enter your GitHub token first.');

  const userResponse = await fetch('https://api.github.com/user', { headers: headers() });
  if (!userResponse.ok) throw new Error('GitHub rejected that token.');
  const user = await userResponse.json();
  if (user.login !== OWNER) throw new Error(`This editor only accepts the ${OWNER} GitHub account.`);

  const repoResponse = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${POSTS_PATH}?ref=${BRANCH}`, { headers: headers() });
  if (!repoResponse.ok) throw new Error('The token cannot read the blog data in this repository.');
  return true;
}

async function login() {
  token = tokenInput.value.trim() || token;
  setStatus(authStatus, 'checking GitHub access...');
  verifyButton.disabled = true;
  try {
    await verifyCurrentToken();
    sessionStorage.setItem('blogGithubToken', token);
    tokenInput.value = '';
    authPanel.hidden = true;
    composer.hidden = false;
    setStatus(authStatus, '');
  } catch (error) {
    token = '';
    sessionStorage.removeItem('blogGithubToken');
    setStatus(authStatus, error.message, 'error');
  } finally {
    verifyButton.disabled = false;
  }
}

verifyButton.addEventListener('click', login);
tokenInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

logoutButton.addEventListener('click', () => {
  token = '';
  sessionStorage.removeItem('blogGithubToken');
  composer.hidden = true;
  previewPanel.hidden = true;
  authPanel.hidden = false;
  setStatus(authStatus, 'token forgotten from this tab.');
});

function fileKind(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function updateAttachmentList() {
  attachmentList.innerHTML = '';
  [...attachmentsInput.files].forEach(file => {
    const item = document.createElement('div');
    item.className = 'attachment-chip';
    const size = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    item.textContent = `${fileKind(file)} · ${file.name} · ${size}`;
    if (file.size > MAX_FILE_BYTES) item.classList.add('too-large');
    attachmentList.appendChild(item);
  });
}
attachmentsInput.addEventListener('change', updateAttachmentList);

function createPreviewMedia(file) {
  const wrap = document.createElement('div');
  wrap.className = 'blog-attachment';
  const kind = fileKind(file);
  const url = URL.createObjectURL(file);
  let media;
  if (kind === 'image') {
    media = document.createElement('img');
    media.alt = file.name;
  } else if (kind === 'video') {
    media = document.createElement('video');
    media.controls = true;
    media.playsInline = true;
  } else if (kind === 'audio') {
    media = document.createElement('audio');
    media.controls = true;
  }
  if (media) {
    media.src = url;
    wrap.appendChild(media);
  }
  const caption = document.createElement('small');
  caption.textContent = file.name;
  wrap.appendChild(caption);
  return wrap;
}

function renderPreview() {
  previewMount.innerHTML = '';
  const article = document.createElement('article');
  article.className = 'blog-post preview-post';

  const head = document.createElement('div');
  head.className = 'blog-post-head';
  const title = document.createElement('h2');
  title.textContent = titleInput.value.trim() || 'untitled';
  const date = document.createElement('time');
  date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  head.append(title, date);

  const body = document.createElement('div');
  body.className = 'blog-body';
  body.textContent = bodyInput.value;
  article.append(head, body);

  const files = [...attachmentsInput.files];
  if (files.length) {
    const grid = document.createElement('div');
    grid.className = 'blog-media-grid';
    files.forEach(file => grid.appendChild(createPreviewMedia(file)));
    article.appendChild(grid);
  }

  previewMount.appendChild(article);
  previewPanel.hidden = false;
  previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
previewButton.addEventListener('click', renderPreview);

function slugify(value) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'post';
}

function sanitizeFilename(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const stem = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'attachment';
  return `${stem}${ext}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers(), 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).message || ''; } catch {}
    throw new Error(detail || `GitHub request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

async function uploadAttachment(file, postId, index) {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over the 20 MB attachment limit.`);
  const filename = `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(file.name)}`;
  const path = `assets/blog/${postId}/${filename}`;
  const content = await fileToBase64(file);

  await githubJson(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Add blog attachment: ${file.name}`,
      content,
      branch: BRANCH
    })
  });

  return { type: fileKind(file), src: path, name: file.name };
}

async function getPostsFile() {
  const data = await githubJson(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${POSTS_PATH}?ref=${BRANCH}`);
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  let posts = [];
  try { posts = JSON.parse(decoded); } catch { throw new Error('blog-posts.json is not valid JSON.'); }
  return { posts: Array.isArray(posts) ? posts : [], sha: data.sha };
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function savePosts(posts, sha, title) {
  const content = utf8ToBase64(`${JSON.stringify(posts, null, 2)}\n`);
  await githubJson(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${POSTS_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Publish blog post: ${title}`,
      content,
      sha,
      branch: BRANCH
    })
  });
}

publishButton.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const files = [...attachmentsInput.files];

  if (!title) return setStatus(publishStatus, 'give the post a title first.', 'error');
  if (!body && !files.length) return setStatus(publishStatus, 'write something or attach something first.', 'error');
  if (files.some(file => file.size > MAX_FILE_BYTES)) return setStatus(publishStatus, 'one of the attachments is over 20 MB.', 'error');

  publishButton.disabled = true;
  previewButton.disabled = true;

  try {
    setStatus(publishStatus, 'checking access...');
    await verifyCurrentToken();

    const now = new Date();
    const postId = `${now.toISOString().slice(0, 10)}-${slugify(title)}-${Date.now().toString().slice(-5)}`;
    const attachments = [];

    for (let i = 0; i < files.length; i++) {
      setStatus(publishStatus, `uploading attachment ${i + 1} of ${files.length}...`);
      attachments.push(await uploadAttachment(files[i], postId, i));
    }

    setStatus(publishStatus, 'publishing post...');
    const current = await getPostsFile();
    current.posts.unshift({
      id: postId,
      title,
      date: now.toISOString(),
      body: bodyInput.value,
      attachments
    });
    await savePosts(current.posts, current.sha, title);

    setStatus(publishStatus, 'published. it should appear on the site in a minute or two.', 'success');
    titleInput.value = '';
    bodyInput.value = '';
    attachmentsInput.value = '';
    updateAttachmentList();
    previewPanel.hidden = true;
  } catch (error) {
    setStatus(publishStatus, error.message, 'error');
  } finally {
    publishButton.disabled = false;
    previewButton.disabled = false;
  }
});

if (token) {
  verifyCurrentToken().then(() => {
    authPanel.hidden = true;
    composer.hidden = false;
  }).catch(() => {
    token = '';
    sessionStorage.removeItem('blogGithubToken');
  });
}
