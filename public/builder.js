// Card builder: live preview + paste-ready <picture> markdown.
// North star: time-to-embed under 10 seconds.

const usernameInput = document.getElementById('username');
const themeSelect = document.getElementById('theme');
const reposCheck = document.getElementById('repos');
const preview = document.getElementById('preview');
const snippetEl = document.getElementById('snippet');
const copyBtn = document.getElementById('copy');

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

function cardUrl(username, theme) {
  const params = new URLSearchParams({ username, theme });
  const modules = ['funnel'];
  if (reposCheck.checked) modules.push('repos');
  params.set('modules', modules.join(','));
  return `${location.origin}/api/card?${params}`;
}

function buildSnippet(username) {
  // The <picture> + prefers-color-scheme pattern: GitHub serves the matching
  // theme automatically. The dark source uses the dark theme; the fallback
  // img uses whatever the builder currently shows (light/dim).
  const lightish = themeSelect.value === 'dark' ? 'light' : themeSelect.value;
  return [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${cardUrl(username, 'dark')}">`,
    `  <img src="${cardUrl(username, lightish)}" alt="${username}'s AI-assisted shipping stats">`,
    '</picture>',
  ].join('\n');
}

function update() {
  const username = usernameInput.value.trim();
  if (!USERNAME_RE.test(username)) {
    preview.innerHTML = '<span class="placeholder">Type your username to preview your card</span>';
    snippetEl.hidden = true;
    copyBtn.hidden = true;
    return;
  }
  const img = new Image();
  img.src = cardUrl(username, themeSelect.value);
  img.alt = `${username}'s AI-assisted shipping stats`;
  preview.replaceChildren(img);

  snippetEl.textContent = buildSnippet(username);
  snippetEl.hidden = false;
  copyBtn.hidden = false;
}

let timer;
usernameInput.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(update, 500);
});
themeSelect.addEventListener('change', update);
reposCheck.addEventListener('change', update);

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(snippetEl.textContent);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy markdown'), 1500);
});
