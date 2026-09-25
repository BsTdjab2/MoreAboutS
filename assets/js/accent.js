/* Accent colour picker: a set of preset swatches independent of the
   black/purple/white background theme. Selecting one sets data-accent on
   <html>, which styles.css uses to override --accent-color — the same
   variable the terminal's prompt/link colours are already wired to, so the
   terminal updates automatically with everything else that uses the accent. */

const STORAGE_KEY = 'sherlock-accent';
const ACCENTS = ['green', 'cyan', 'blue', 'purple', 'orange', 'pink'];

function applyAccent(accent, buttons) {
  if (!ACCENTS.includes(accent)) return;

  document.documentElement.setAttribute('data-accent', accent);

  buttons.forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.accentValue === accent));
  });

  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch (e) {
    /* nothing to do: the accent still applies for this visit */
  }
}

function savedAccent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return ACCENTS.includes(saved) ? saved : 'green';
  } catch (e) {
    return 'green';
  }
}

export function initAccent() {
  const panel = document.getElementById('accentOptions');
  if (!panel) return;

  const buttons = Array.from(panel.querySelectorAll('[data-accent-value]'));
  if (!buttons.length) return;

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => applyAccent(btn.dataset.accentValue, buttons));

    btn.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = buttons[(index + step + buttons.length) % buttons.length];
      next.focus();
      applyAccent(next.dataset.accentValue, buttons);
    });
  });

  applyAccent(savedAccent(), buttons);
}
