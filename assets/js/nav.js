/* Navigation: glass bar that firms up on scroll, a mobile menu, and a
   scroll-spy that marks the section you are reading. */

export function initNav() {
  const nav = document.getElementById('siteNav');
  if (!nav) return;

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  /* Scrolled state */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (toggle && links) {
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (nav.classList.contains('is-open') && !nav.contains(event.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 881px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* Scroll-spy: only links that point at a section of this same page */
  if (!links || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.querySelectorAll('a[href*="#"]').forEach((a) => {
    let url;
    try { url = new URL(a.href, window.location.href); } catch (e) { return; }
    const samePage = url.pathname === window.location.pathname
      || (url.pathname.endsWith('/index.html') && window.location.pathname.endsWith('/'))
      || (url.pathname.endsWith('/') && window.location.pathname.endsWith('/index.html'));
    if (!samePage || !url.hash) return;
    const target = document.getElementById(url.hash.slice(1));
    if (target) map.set(target, a);
  });
  if (!map.size) return;

  const visible = new Set();
  function paint() {
    let current = null;
    map.forEach((a, el) => { if (visible.has(el)) current = a; });
    map.forEach((a) => a.classList.toggle('is-active', a === current));
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    paint();
  }, { rootMargin: '-40% 0px -55% 0px' });

  map.forEach((a, el) => io.observe(el));
}
