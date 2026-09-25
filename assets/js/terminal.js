/* Search terminal overlay: a small command palette styled as a terminal.
   Click the search icon (or press "/") to open it, type one of the listed
   commands (or click a quick-command pill) and it jumps to that part of the
   page. Everything is plain text through textContent — nothing here ever
   touches innerHTML with anything other than a couple of fixed elements
   built via createElement. */

const GITHUB_URL = 'https://github.com/sherlocknots';
const INSTAGRAM_URL = 'https://www.instagram.com/sh7eerx?stkn=Zjl4aHJkdjEwZzcx';

const SECTION_COMMANDS = {
  work: 'work',
  projects: 'work',
  flasher: 'flasher',
  order: 'order',
  community: 'community',
  contact: 'contact',
  about: 'about',
};

const HELP_LINES = [
  'available commands: work, flasher, order, contact, community, github, instagram',
];

export function initTerminal() {
  const toggle = document.getElementById('searchToggle');
  const overlay = document.getElementById('terminalOverlay');
  if (!toggle || !overlay) return;

  const modal = overlay.querySelector('.terminal-modal');
  const closeBtn = document.getElementById('terminalClose');
  const input = document.getElementById('terminalInput');
  const output = document.getElementById('terminalOutput');
  const quickCmds = overlay.querySelectorAll('.terminal-quickcmds button');

  let lastFocused = null;

  function focusableEls() {
    return [input, ...quickCmds, closeBtn].filter(Boolean);
  }

  function open() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    /* Next frame, so the "hidden" removal has taken effect and the CSS
       transition on .show actually runs instead of jumping straight in. */
    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });
    toggle.setAttribute('aria-expanded', 'true');
    input.value = '';
    input.focus();
  }

  function close() {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    toggle.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      overlay.hidden = true;
    }, 200);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    } else {
      toggle.focus();
    }
  }

  function isOpen() {
    return !overlay.hidden;
  }

  function printLine(kind, text) {
    const p = document.createElement('p');
    if (kind) p.className = `terminal-line-${kind}`;
    p.textContent = text;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
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
    output.scrollTop = output.scrollHeight;
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function runCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    printEcho(raw.trim());

    if (cmd === 'clear') {
      output.textContent = '';
      return;
    }

    if (cmd === 'help') {
      HELP_LINES.forEach((line) => printLine('info', line));
      return;
    }

    if (cmd === 'github') {
      printLine('ok', 'opening github.com/sherlocknots...');
      openLink(GITHUB_URL);
      window.setTimeout(close, 350);
      return;
    }

    if (cmd === 'instagram') {
      printLine('ok', 'opening instagram...');
      openLink(INSTAGRAM_URL);
      window.setTimeout(close, 350);
      return;
    }

    const sectionId = SECTION_COMMANDS[cmd];
    if (sectionId && scrollToSection(sectionId)) {
      printLine('ok', `→ jumping to ${sectionId}...`);
      window.setTimeout(close, 350);
      return;
    }

    printLine('err', `command not found: ${cmd}`);
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) {
      close();
    } else {
      open();
    }
  });

  closeBtn.addEventListener('click', close);

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

  quickCmds.forEach((btn) => {
    btn.addEventListener('click', () => {
      runCommand(btn.dataset.cmd || btn.textContent);
      input.focus();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) {
      /* "/" opens the terminal from anywhere on the page, as long as the
         person isn't already typing into some other field. */
      const target = event.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        open();
      }
      return;
    }

    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key === 'Tab') {
      const els = focusableEls();
      const first = els[0];
      const last = els[els.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (modal) {
    modal.addEventListener('click', (event) => event.stopPropagation());
  }
}
