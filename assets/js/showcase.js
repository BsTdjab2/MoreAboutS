/* Showcase: a vertical list of 10 items, each with a Details view.

   Routing uses the URL hash, so the browser Back button and shared links work:
     #showcase      the list
     #showcase/3    the Details view of item 3
   Any other hash (for example #contact from "Contact me") is left alone, so the
   view you are in does not change while the page scrolls there.

   Switching views fades the old one out, swaps, and fades the new one in.
   Only opacity changes; nothing slides or moves. */

const FADE_MS = 240;

export function initShowcase() {
  const section = document.getElementById('showcase');
  const views = document.getElementById('showcaseViews');
  const list = document.getElementById('showcaseList');
  if (!section || !views || !list) return;

  const details = new Map();
  views.querySelectorAll('.showcase-detail').forEach((el) => {
    const n = Number(el.id.replace('showcase-detail-', ''));
    details.set(n, el);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let currentKey = 'list';   /* 'list' or an item number */
  let timer = null;
  let toTop = false;         /* true when a nav link asked for the Showcase heading */

  function keyFromHash() {
    const hash = window.location.hash;
    if (hash === '#showcase') return 'list';
    const match = /^#showcase\/(\d+)$/.exec(hash);
    if (match && details.has(Number(match[1]))) return Number(match[1]);
    return null; /* not ours */
  }

  function elementFor(key) {
    return key === 'list' ? list : details.get(key);
  }

  function scrollBehavior() {
    return reduceMotion.matches ? 'auto' : 'smooth';
  }

  function placeView(key, previousKey, userInitiated) {
    if (key === 'list') {
      const item = typeof previousKey === 'number' && !toTop
        ? document.getElementById(`showcase-item-${previousKey}`)
        : null;
      if (item) {
        item.scrollIntoView({ block: 'center', behavior: 'instant' });
      } else if (userInitiated) {
        section.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (userInitiated && typeof previousKey === 'number') {
        const button = document.querySelector(`#showcase-item-${previousKey} .showcase-details-btn`);
        if (button) button.focus({ preventScroll: true });
      }
    } else {
      section.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (userInitiated) {
        const heading = elementFor(key).querySelector('[tabindex="-1"]');
        if (heading) heading.focus({ preventScroll: true });
      }
    }
    toTop = false;
  }

  function show(key, { immediate = false, userInitiated = true } = {}) {
    if (key === currentKey && !immediate) return;

    window.clearTimeout(timer);

    const previousKey = currentKey;
    const outgoing = elementFor(currentKey);
    const incoming = elementFor(key);
    currentKey = key;

    /* Clear any half-finished fade from a rapid double click. */
    views.querySelectorAll('.showcase-view').forEach((el) => {
      if (el !== outgoing && el !== incoming) el.hidden = true;
      el.classList.remove('is-fading');
    });

    function swap() {
      outgoing.hidden = true;
      outgoing.classList.remove('is-fading');
      incoming.hidden = false;
      placeView(key, previousKey, userInitiated);

      if (immediate || reduceMotion.matches) return;

      /* Start transparent, force a layout pass, then fade in. */
      incoming.classList.add('is-fading');
      void incoming.offsetHeight;
      incoming.classList.remove('is-fading');
    }

    if (immediate || reduceMotion.matches || outgoing === incoming) {
      swap();
      return;
    }

    outgoing.classList.add('is-fading');
    timer = window.setTimeout(swap, FADE_MS);
  }

  function onHashChange() {
    const key = keyFromHash();
    if (key === null) return;
    show(key);
  }

  /* A nav link to #showcase should land on the heading, not on a list item. */
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href="#showcase"]');
    if (link && link.closest('nav')) toTop = true;
  });

  window.addEventListener('hashchange', onHashChange);

  /* Opened straight on a Details link: show it with no fade. */
  const initial = keyFromHash();
  if (initial !== null && initial !== 'list') {
    show(initial, { immediate: true, userInitiated: false });
  }
}
