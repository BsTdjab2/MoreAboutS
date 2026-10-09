/* Kali Tools: only the first tool (Sherlock) shows at first.
   "Show More Kali Tools" opens the rest. "Show Less" (top or bottom) closes
   them again and scrolls back to the top of the section. A link such as
   #kali-nuclei opens the list first so the target is actually visible. */

import { setReveal, smoothTo, prefersReducedMotion } from './reveal.js';

export function initKaliTools() {
  const section = document.getElementById('kali-tools');
  const more = document.getElementById('kaliMore');
  const toggle = document.getElementById('kaliToggle');
  const less = document.getElementById('kaliLess');
  if (!section || !more || !toggle) return;

  const label = toggle.querySelector('.kali-toggle-label');
  let open = false;

  function apply(next) {
    open = next;
    setReveal(more, open);
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Show Less' : 'Show More Kali Tools';
  }

  function expand() {
    if (!open) apply(true);
  }

  function collapse() {
    if (!open) return;
    apply(false);
    smoothTo(section, 'start');
    toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => (open ? collapse() : expand()));
  if (less) less.addEventListener('click', collapse);

  function revealHashTarget() {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target && more.contains(target)) {
      expand();
      /* wait for the panel to finish growing, so the target is where it will stay */
      window.setTimeout(() => smoothTo(target, 'start'), prefersReducedMotion() ? 30 : 450);
    }
  }

  window.addEventListener('hashchange', revealHashTarget);
  revealHashTarget();
}
