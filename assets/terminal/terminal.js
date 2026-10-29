import { pages, aliases, fileToPage } from './content.js';

const output = document.querySelector('#terminal-output');
const form = document.querySelector('#terminal-form');
const input = document.querySelector('#terminal-input');
const terminalBody = document.querySelector('#terminal-body');
const themeMeta = document.querySelector('meta[name="theme-color"]');

const builtinCommands = ['help', 'ls', 'tree', 'cat', 'clear', 'history', 'pwd', 'date', 'echo', 'theme', 'classic'];
const commands = [...new Set([...builtinCommands, ...Object.keys(pages), ...Object.keys(aliases)])].sort();
const history = [];
let historyIndex = 0;
let historyDraft = '';

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]));

const commandLink = (name, label = name) =>
  `<a class="terminal-link" href="#${encodeURIComponent(name)}" data-command="${name}">${label}</a>`;

function appendEcho(command) {
  const echo = document.createElement('div');
  echo.className = 'command-echo';
  echo.innerHTML = '<span class="prompt"><span class="prompt-user">coconut</span><span class="prompt-dim">@</span><span class="prompt-host">homepage</span><span class="prompt-dim">:~$</span></span><span class="command-text"></span>';
  echo.querySelector('.command-text').textContent = command;
  output.append(echo);
}

function appendResult(html, className = '') {
  const result = document.createElement('section');
  result.className = `terminal-page ${className}`.trim();
  result.innerHTML = html;
  output.append(result);
}

function helpPage() {
  return `
    <h1 class="terminal-title"># Available Commands</h1>
    <div class="terminal-rule" aria-hidden="true">────────────────────────────────────────</div>
    <div class="terminal-command-grid">
      <span>${commandLink('about')}</span><span>profile and research interests</span>
      <span>${commandLink('publications')}</span><span>selected publications · alias: pubs</span>
      <span>${commandLink('recent')}</span><span>recently added notes and reading · alias: updates</span>
      <span>${commandLink('projects')}</span><span>open-source projects and agent skills</span>
      <span>${commandLink('talks')}</span><span>presentations and mini courses</span>
      <span>${commandLink('notes')}</span><span>notes and tutorials · alias: blog</span>
      <span>${commandLink('contact')}</span><span>email and GitHub</span>
      <span>cat &lt;file&gt;</span><span>print a page, e.g. cat about.txt</span>
      <span>ls / tree</span><span>list the virtual filesystem</span>
      <span>clear</span><span>clear the terminal · Ctrl+L</span>
      <span>history</span><span>show command history · ↑/↓</span>
      <span>theme [light|dark]</span><span>set or toggle the color theme</span>
      <span>echo / date / pwd</span><span>a few familiar shell conveniences</span>
      <span>classic</span><span>return to the original homepage</span>
    </div>
    <p class="terminal-tip">Keyboard: ↑/↓ history · Tab completion · Ctrl+L clear · Ctrl+C cancel input</p>`;
}

function listPage() {
  return `
    <h1 class="terminal-title"># /home/coconut</h1>
    <div class="terminal-rule" aria-hidden="true">────────────────────────────────────────</div>
    <ul class="terminal-list links">
      <li>${commandLink('about', 'about.txt')}</li>
      <li>${commandLink('publications', 'publications.txt')}</li>
      <li>${commandLink('recent', 'recent.txt')}</li>
      <li>${commandLink('projects', 'projects.txt')}</li>
      <li>${commandLink('talks', 'talks.txt')}</li>
      <li>${commandLink('notes', 'notes/')}</li>
      <li>${commandLink('contact', 'contact.txt')}</li>
    </ul>
    <p class="terminal-dim">Use cat &lt;file&gt; or click a filename.</p>`;
}

function treePage() {
  return `<pre class="terminal-pre">/home/coconut
├── about.txt
├── publications.txt
├── recent.txt
├── projects.txt
├── talks.txt
├── contact.txt
└── notes/
    ├── systems/
    ├── paper-notes/
    └── tutorials/</pre>
    <p class="terminal-dim">A virtual view of this homepage, not your actual filesystem.</p>`;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeMeta?.setAttribute('content', theme === 'dark' ? '#111713' : '#eef1ed');
  try { localStorage.setItem('coconut-terminal-theme', theme); } catch (_) { /* Storage is optional. */ }
}

function resolvePage(name) {
  const normalized = aliases[name] || name;
  return pages[normalized];
}

function run(rawCommand, { updateUrl = false } = {}) {
  const raw = rawCommand.trim();
  if (!raw) return;

  if (updateUrl) {
    window.history.pushState({ command: raw }, '', `#${encodeURIComponent(raw)}`);
  }

  history.push(raw);
  historyIndex = history.length;
  historyDraft = '';
  input.value = '';
  output.replaceChildren();

  const tokens = raw.split(/\s+/);
  const name = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  if (name === 'clear') return;

  appendEcho(raw);

  if (name === 'classic' || name === 'exit') {
    window.location.assign('./classic.html');
    return;
  }

  if (name === 'help') {
    appendResult(helpPage());
  } else if (name === 'ls') {
    appendResult(listPage());
  } else if (name === 'tree') {
    appendResult(treePage());
  } else if (name === 'cat') {
    const file = args[0]?.toLowerCase();
    const pageName = fileToPage[file];
    if (!args.length) {
      appendResult('<p class="terminal-error">usage: cat &lt;file&gt;</p><p>Try <span class="terminal-accent">cat about.txt</span> or <span class="terminal-accent">ls</span>.</p>');
    } else if (pageName) {
      appendResult(pages[pageName]);
    } else {
      appendResult(`<p class="terminal-error">cat: ${escapeHtml(args[0])}: no such file</p><p>Type ${commandLink('ls')} to list available files.</p>`);
    }
  } else if (name === 'history') {
    const items = history.map((entry, index) => `<li><span class="terminal-dim">${String(index + 1).padStart(3, ' ')}</span>  ${escapeHtml(entry)}</li>`).join('');
    appendResult(`<ul class="terminal-list">${items}</ul>`);
  } else if (name === 'pwd') {
    appendResult('<p>/home/coconut</p>');
  } else if (name === 'date') {
    appendResult(`<p>${escapeHtml(new Date().toString())}</p>`);
  } else if (name === 'echo') {
    appendResult(`<p>${escapeHtml(args.join(' '))}</p>`);
  } else if (name === 'theme') {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const requested = args[0]?.toLowerCase();
    const next = requested === 'light' || requested === 'dark' ? requested : (current === 'dark' ? 'light' : 'dark');
    applyTheme(next);
    appendResult(`<p>theme set to <span class="terminal-accent">${next}</span></p>`);
  } else {
    const page = resolvePage(name);
    if (page) {
      appendResult(page);
    } else {
      appendResult(`<p class="terminal-error">command not found: ${escapeHtml(name)}</p><p>Type ${commandLink('help')} to see what this shell understands.</p>`);
    }
  }

  output.scrollTop = 0;
  input.focus({ preventScroll: true });
}

function longestCommonPrefix(values) {
  if (!values.length) return '';
  return values.slice(1).reduce((prefix, value) => {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    return prefix;
  }, values[0]);
}

function completeInput() {
  const value = input.value;
  const match = value.match(/^(.*\s)?([^\s]*)$/);
  const before = match[1] || '';
  const prefix = match[2] || '';
  const isCat = /^\s*cat\s+/i.test(value);
  const candidates = (isCat ? Object.keys(fileToPage) : commands)
    .filter((candidate) => candidate.startsWith(prefix.toLowerCase()))
    .sort();
  if (!candidates.length) return;

  const completed = candidates.length === 1 ? `${candidates[0]} ` : longestCommonPrefix(candidates);
  input.value = `${before}${completed}`;
  input.setSelectionRange(input.value.length, input.value.length);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run(input.value, { updateUrl: true });
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    completeInput();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (!history.length) return;
    if (historyIndex === history.length) historyDraft = input.value;
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = history[historyIndex];
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex >= history.length) return;
    historyIndex += 1;
    input.value = historyIndex === history.length ? historyDraft : history[historyIndex];
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
  } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    output.replaceChildren();
  } else if (event.ctrlKey && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    input.value = '';
    historyIndex = history.length;
  }
});

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-command]');
  if (!trigger) return;
  event.preventDefault();
  run(trigger.dataset.command || 'help', { updateUrl: true });
});

terminalBody.addEventListener('click', (event) => {
  if (event.target.closest('a, button, input') || window.getSelection()?.toString()) return;
  input.focus({ preventScroll: true });
});

window.addEventListener('popstate', () => {
  let command = 'about';
  try { command = decodeURIComponent(window.location.hash.slice(1)) || 'about'; } catch (_) { /* Use home. */ }
  run(command);
});

let initialCommand = 'about';
try { initialCommand = decodeURIComponent(window.location.hash.slice(1)) || 'about'; } catch (_) { /* Use home. */ }
run(initialCommand);
