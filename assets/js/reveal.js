/* Scroll reveal. Elements rise and fade in as they enter the viewport, and
   siblings that arrive together are staggered. The hidden state only exists
   once this script has armed it (html.reveal-on), so nothing is ever hidden
   without JavaScript. Reduced motion skips all of it. */

const TARGETS = [
  '.section-title',
  '.section-intro',
  '.grid > .card',
  '.cybersec-field',
  '.cybersec-fields-title',
  '.contact-links > .btn',
  '.showcase-item',
  '.showcase-detail',
  '.showcase-toggle-btn',
  '.terminal-panel .btn',
  '.dl-panel',
  '.dl-notice',
  '.prose > h2',
  '.prose > p',
  '.prose > ul',
  '.tool-search-title',
  '.tool-search-wrap',
  '.tool-chips-wrap',
  '.footer-col',
  '.kalitools-notice',
].join(',');

const STAGGER_MS = 70;
const MAX_STAGGER = 6;

export function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const seen = new WeakSet();

  const io = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const delay = Math.min(n, MAX_STAGGER) * STAGGER_MS;
      n += 1;
      el.style.setProperty('--rd', `${delay}ms`);
      /* next frame, so the hidden state is painted before the transition */
      window.requestAnimationFrame(() => el.classList.add('is-in'));
      /* hand the element's own transitions back once it has settled */
      window.setTimeout(() => {
        el.classList.remove('reveal', 'is-in');
        el.style.removeProperty('--rd');
      }, delay + 1500);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  function arm(scope) {
    scope.querySelectorAll(TARGETS).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  root.classList.add('reveal-on');
  arm(document);
}
