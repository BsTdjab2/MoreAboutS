/* Navigation: every menu link scrolls smoothly to its section. CSS already
   does this in modern browsers; this keeps it working in the ones that ignore
   scroll-behavior (older Safari) and keeps the address bar in step. The brand
   on the left is a plain label, so it is not wired to anything. */

import { smoothTo } from './reveal.js';

export function initNav() {
  const links = document.querySelectorAll('nav .nav-links a[href^="#"]');
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      smoothTo(target, 'start');

      if (window.location.hash !== `#${id}`) {
        try {
          window.history.pushState(null, '', `#${id}`);
        } catch (e) {
          /* a locked-down browser: the scroll already happened */
        }
      }
    });
  });
}
