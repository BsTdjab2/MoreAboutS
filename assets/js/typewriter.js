/* Infinite type/delete loop for any element marked data-typewriter, e.g. the
   hero terminal's "I am ___" line and its "website status" line. Phrases
   come from each target's own data-phrases attribute (comma-separated),
   defaulting to a single phrase if none is given, so multiple independent
   loops can run on the page at once, each at its own pace. */

const TYPE_MS = 90;
const DELETE_MS = 45;
const HOLD_MS = 1400;
const PAUSE_MS = 500;

function runLoop(el, reduceMotion) {
  const phrases = (el.dataset.phrases || 'About me')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (reduceMotion.matches) {
    el.textContent = phrases[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const phrase = phrases[phraseIndex];

    if (!deleting) {
      charIndex += 1;
      el.textContent = phrase.slice(0, charIndex);
      if (charIndex === phrase.length) {
        deleting = true;
        setTimeout(tick, HOLD_MS);
        return;
      }
      setTimeout(tick, TYPE_MS);
      return;
    }

    charIndex -= 1;
    el.textContent = phrase.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(tick, PAUSE_MS);
      return;
    }
    setTimeout(tick, DELETE_MS);
  }

  tick();
}

export function initTypewriter() {
  const targets = document.querySelectorAll('[data-typewriter]');
  if (!targets.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  targets.forEach((el) => runLoop(el, reduceMotion));
}
