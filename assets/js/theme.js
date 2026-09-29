const STORAGE_KEY = 'sherlock-theme';
const THEMES = ['black', 'purple', 'white', 'blue', 'red'];

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'black';
}

function applyTheme(theme, buttons) {
  if (!THEMES.includes(theme)) return;

  if (theme === 'black') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  }

  buttons.forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.themeValue === theme));
  });

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    /* nothing to do: the theme still applies for this visit */
  }
}

export function initTheme() {
  const toggle = document.getElementById('themeToggle');
  const panel = document.getElementById('themeOptions');
  if (!toggle || !panel) return;

  const buttons = Array.from(panel.querySelectorAll('[data-theme-value]'));

  function close() {
    panel.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function open() {
    panel.classList.add('show');
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('show')) {
      close();
    } else {
      open();
      const active = buttons.find((b) => b.getAttribute('aria-checked') === 'true');
      (active || buttons[0]).focus();
    }
  });

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.themeValue, buttons);
      close();
      toggle.focus();
    });

    btn.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      next.focus();
      applyTheme(next.dataset.themeValue, buttons);
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.theme-dropdown')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('show')) {
      close();
      toggle.focus();
    }
  });

  applyTheme(currentTheme(), buttons);
}
