/* Nav search terminal: a small modal opened from the search icon in the
   top nav. Lets the visitor type (or click a quick command) to jump to a
   section or open an external link. Plain DOM, no dependencies, and no
   inline event handlers -- everything is wired here to satisfy the site's
   script-src 'self' Content Security Policy. */

const GITHUB_URL = 'https://github.com/shxerlock';
const INSTAGRAM_URL = 'https://www.instagram.com/linuxsocials?stkn=Zjl4aHJkdjEwZzcx';

// Commands that just jump to a section further down the page, keyed by the
// lowercase command a visitor would type. Values are the element's actual
// id (case-sensitive -- "Other" really is capitalised in the markup).
const SECTION_COMMANDS = {
  work: 'work',
  other: 'Other',
  about: 'about',
  contact: 'contact',
};

const HELP_COMMANDS = ['work', 'Other', 'github', 'instagram', 'about', 'contact'];

export function initTerminal() {
  const trigger = document.getElementById('searchToggle');
  const overlay = document.getElementById('terminalOverlay');
  const closeBtn = document.getElementById('terminalClose');
  const output = document.getElementById('terminalOutput');
  const input = document.getElementById('terminalInput');
  const quickcmds = document.querySelector('.terminal-quickcmds');

  if (!trigger || !overlay || !output || !input) return;

  const modal = overlay.querySelector('.terminal-modal') || overlay;
  let lastFocused = null;

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function printEcho(cmd) {
    const p = document.createElement('p');
    p.className = 'terminal-line-echo';

    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = 'sherlock';

    const path = document.createElement('span');
    path.className = 'path';
    path.textContent = '@field :~$';

    const typed = document.createElement('span');
    typed.className = 'typed';
    typed.textContent = ` ${cmd}`;

    p.append(who, path, typed);
    output.appendChild(p);
  }

  function printLine(kind, text) {
    const p = document.createElement('p');
    if (kind) p.className = `terminal-line-${kind}`;
    p.textContent = text;
    output.appendChild(p);
  }

  function printHelp() {
    const p = document.createElement('p');
    p.className = 'terminal-line-info';
    p.textContent = `Available: ${HELP_COMMANDS.join(', ')} (or "clear")`;
    output.appendChild(p);
  }

  function scrollOutput() {
    output.scrollTop = output.scrollHeight;
  }

  function runCommand(raw) {
    const cmd = String(raw || '').trim();
    if (!cmd) return;
    const lower = cmd.toLowerCase();

    printEcho(cmd);

    if (lower === 'clear') {
      output.textContent = '';
      return;
    }

    if (lower === '/help' || lower === 'help') {
      printHelp();
      scrollOutput();
      return;
    }

    if (lower === 'github') {
      printLine('ok', '→ opening github.com/shxerlock...');
      openLink(GITHUB_URL);
      scrollOutput();
      return;
    }

    if (lower === 'instagram') {
      printLine('ok', '→ opening instagram...');
      openLink(INSTAGRAM_URL);
      scrollOutput();
      return;
    }

    const sectionId = SECTION_COMMANDS[lower];
    if (sectionId && scrollToSection(sectionId)) {
      printLine('ok', `→ jumping to ${sectionId}...`);
      window.setTimeout(close, 350);
      scrollOutput();
      return;
    }

    printLine('err', `command not found: ${cmd}`);
    scrollOutput();
  }

  function focusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')
    );
  }

  function open() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add('terminal-open');
    trigger.setAttribute('aria-expanded', 'true');
    input.focus();
    document.addEventListener('keydown', onKeydown, true);
  }

  function close() {
    overlay.hidden = true;
    document.documentElement.classList.remove('terminal-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown, true);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  trigger.addEventListener('click', () => {
    if (overlay.hidden) open();
    else close();
  });

  if (closeBtn) closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(input.value);
      input.value = '';
    }
  });

  if (quickcmds) {
    quickcmds.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-cmd]');
      if (!btn) return;
      runCommand(btn.getAttribute('data-cmd'));
      input.focus();
    });
  }
}
