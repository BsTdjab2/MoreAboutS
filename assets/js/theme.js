/* Dark / light toggle. Dark is the default; light is data-theme="light".
   Where the browser supports View Transitions, the new theme is painted as a
   circle that grows out of the toggle button. */

const STORAGE_KEY = 'sherlock-theme';
const META_DARK = '#06070a';
const META_LIGHT = '#f4f5f7';

function isLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

function applyTheme(light, button) {
  if (light) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  button.setAttribute('aria-pressed', String(light));
  button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? META_LIGHT : META_DARK);

  try {
    localStorage.setItem(STORAGE_KEY, light ? 'light' : 'dark');
  } catch (e) {
    /* the theme still applies for this visit */
  }
}

function switchTheme(light, button) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof document.startViewTransition !== 'function') {
    applyTheme(light, button);
    return;
  }

  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const root = document.documentElement;
  root.classList.add('theme-vt');

  const transition = document.startViewTransition(() => applyTheme(light, button));
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => { /* the theme has already been applied */ });
  transition.finished.finally(() => root.classList.remove('theme-vt'));
}

export function initTheme() {
  const button = document.getElementById('themeToggle');
  if (!button) return;

  applyTheme(isLight(), button);
  button.addEventListener('click', () => switchTheme(!isLight(), button));
}
