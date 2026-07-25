// Card builder: card-type tabs, live preview, paste-ready <picture> markdown.
// North star: time-to-embed under 10 seconds.

const usernameInput = document.getElementById('username');
const themeSelect = document.getElementById('theme');
const gistRow = document.getElementById('gistRow');
const gistHint = document.getElementById('gistHint');
const gistInput = document.getElementById('gist');
const providersInput = document.getElementById('providers');
const tabs = document.getElementById('tabs');
const preview = document.getElementById('preview');
const snippetEl = document.getElementById('snippet');
const copyBtn = document.getElementById('copy');

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GIST_RE = /^[0-9a-f]{5,64}$/i;

let cardType = 'card';
const needsGist = () => cardType !== 'card';

function cardUrl(theme) {
  const params = new URLSearchParams({ username: usernameInput.value.trim(), theme });
  if (cardType === 'card') {
    params.set('modules', 'funnel,repos');
  } else {
    params.set('gist', gistInput.value.trim());
    const providers = providersInput.value.trim();
    if (providers) params.set('providers', providers);
  }
  return `${location.origin}/api/${cardType}?${params}`;
}

function buildSnippet() {
  const theme = themeSelect.value;
  const darkish = theme === 'dark' || theme === 'neon' ? theme : 'dark';
  const lightish = theme === 'light' || theme === 'dim' ? theme : 'light';
  const alt = `${usernameInput.value.trim()}'s AI stats`;
  return [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${cardUrl(darkish)}">`,
    `  <img src="${cardUrl(lightish)}" alt="${alt}">`,
    '</picture>',
  ].join('\n');
}

function ready() {
  if (!USERNAME_RE.test(usernameInput.value.trim())) return false;
  if (needsGist() && !GIST_RE.test(gistInput.value.trim())) return false;
  return true;
}

function update() {
  gistRow.hidden = !needsGist();
  gistHint.hidden = !needsGist();

  if (!ready()) {
    preview.classList.remove('live');
    preview.innerHTML = `<span class="placeholder">${
      needsGist() && USERNAME_RE.test(usernameInput.value.trim())
        ? 'Add your usage gist id to preview this card'
        : 'Type your username to preview your card'
    }</span>`;
    snippetEl.hidden = true;
    copyBtn.hidden = true;
    return;
  }

  const img = new Image();
  img.src = cardUrl(themeSelect.value);
  img.alt = 'card preview';
  img.onload = () => preview.classList.add('live');
  preview.replaceChildren(img);

  snippetEl.textContent = buildSnippet();
  snippetEl.hidden = false;
  copyBtn.hidden = false;
}

let timer;
const debounced = () => {
  clearTimeout(timer);
  timer = setTimeout(update, 450);
};
usernameInput.addEventListener('input', debounced);
gistInput.addEventListener('input', debounced);
providersInput.addEventListener('input', debounced);
themeSelect.addEventListener('change', update);
tabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  cardType = tab.dataset.card;
  for (const t of tabs.children) t.classList.toggle('active', t === tab);
  update();
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(snippetEl.textContent);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy markdown'), 1500);
});

// Particles — a vanilla take on the Magic UI "particles" background.
(() => {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let dots = [];
  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    dots = Array.from({ length: Math.min(90, Math.floor(innerWidth / 14)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      p: Math.random() * Math.PI * 2,
    }));
  }
  resize();
  addEventListener('resize', resize);

  (function frame(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const d of dots) {
      d.x = (d.x + d.vx + canvas.width) % canvas.width;
      d.y = (d.y + d.vy + canvas.height) % canvas.height;
      const tw = 0.35 + 0.3 * Math.sin(t / 900 + d.p);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167, 139, 250, ${tw})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  })(0);
})();
