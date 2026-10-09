/* Shared open/close for every .reveal panel (Kali Tools list, Show Picture).
   The CSS does the animation; this only flips the state and tells assistive
   technology about it. */

export function setReveal(panel, open) {
  if (!panel) return;
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', String(!open));
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Jump with no animation. Some Safari versions reject behavior: "instant", so
   fall back to the plain call (which still lands in the right place). */
export function jumpTo(element, block = 'start') {
  try {
    element.scrollIntoView({ block, behavior: 'instant' });
  } catch (e) {
    element.scrollIntoView(block === 'start');
  }
}

/* Smooth scroll that degrades to a plain jump in browsers without it. */
export function smoothTo(element, block = 'start') {
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  try {
    element.scrollIntoView({ block, behavior });
  } catch (e) {
    element.scrollIntoView(block === 'start');
  }
}
