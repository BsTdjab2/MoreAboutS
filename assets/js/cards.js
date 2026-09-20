const MAX_TILT_DEG = 4;

export function initCardTilt() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cards = Array.from(document.querySelectorAll('.card'));
  if (!cards.length) return;

  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  function reset(card) {
    card.style.transform = '';
  }

  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (reduceMotion.matches || !supportsHover.matches || event.pointerType !== 'mouse') return;

      const rect = card.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((event.clientY - rect.top - centerY) / centerY) * -MAX_TILT_DEG;
      const rotateY = ((event.clientX - rect.left - centerX) / centerX) * MAX_TILT_DEG;

      card.style.transform =
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('pointerleave', () => reset(card));
    card.addEventListener('blur', () => reset(card), true);
  });

  reduceMotion.addEventListener('change', () => cards.forEach(reset));
}
