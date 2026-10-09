/* Project Showcase: a vertical list of 10 project cards.

   Each card has two buttons:
     Show Picture  opens or closes the project picture inside the card.
     Details       opens the Details view in a modal.
   Projects that are still in development (data-released="false") do neither.
   Both buttons show the "This project has not been released yet." notice.

   Routing uses the URL hash, so the browser Back button and shared links work:
     #showcase             the list (modal closed)
     #showcase/3           the Details modal of item 3
     #showcase/1/tutorial  the Tutorial modal of item 1 (only items that have one)
   Any other hash (for example #contact from "Contact me") closes the modal
   and lets the browser go there. */

import { setReveal, prefersReducedMotion, jumpTo } from './reveal.js';

const FADE_MS = 230;

export function initShowcase() {
  const section = document.getElementById('showcase');
  const list = document.getElementById('showcaseList');
  const modal = document.getElementById('showcaseModal');
  const notice = document.getElementById('releaseNotice');
  if (!section || !list || !modal) return;

  const root = document.documentElement;
  const dialog = modal.querySelector('.modal-dialog');
  const timers = new WeakMap();

  const details = new Map();
  modal.querySelectorAll('.showcase-detail').forEach((el) => {
    details.set(Number(el.id.replace('showcase-detail-', '')), el);
  });

  const tutorials = new Map();
  modal.querySelectorAll('.showcase-tutorial').forEach((el) => {
    tutorials.set(Number(el.id.replace('showcase-tutorial-', '')), el);
  });

  let detailOpener = null;
  let noticeOpener = null;

  /* ---------- modal plumbing ---------- */

  function isShown(el) {
    return !el.hidden;
  }

  function syncScrollLock() {
    const locked = isShown(modal) || (notice && isShown(notice));
    root.classList.toggle('modal-open', locked);
  }

  function showModal(el) {
    window.clearTimeout(timers.get(el));
    el.hidden = false;
    void el.offsetHeight; /* make the browser paint the hidden state first */
    el.classList.add('is-open');
    syncScrollLock();
  }

  function hideModal(el) {
    el.classList.remove('is-open');
    window.clearTimeout(timers.get(el));
    if (prefersReducedMotion()) {
      el.hidden = true;
      syncScrollLock();
      return;
    }
    timers.set(el, window.setTimeout(() => {
      el.hidden = true;
      syncScrollLock();
    }, FADE_MS));
  }

  function restoreFocus(el) {
    if (el && document.contains(el) && typeof el.focus === 'function') {
      el.focus({ preventScroll: true });
    }
  }

  /* ---------- details / tutorial modal ---------- */

  function keyFromHash() {
    const hash = window.location.hash;
    if (hash === '#showcase') return 'list';
    const item = /^#showcase\/(\d+)$/.exec(hash);
    if (item && details.has(Number(item[1]))) return Number(item[1]);
    const tutorial = /^#showcase\/(\d+)\/tutorial$/.exec(hash);
    if (tutorial && tutorials.has(Number(tutorial[1]))) return `${tutorial[1]}/tutorial`;
    return null;
  }

  function panelFor(key) {
    if (typeof key === 'string') return tutorials.get(Number(key.split('/')[0]));
    return details.get(key);
  }

  function openDetail(key, userInitiated) {
    const panel = panelFor(key);
    if (!panel) return;

    if (!isShown(modal) && userInitiated) detailOpener = document.activeElement;

    modal.querySelectorAll('.showcase-panel').forEach((el) => {
      el.hidden = el !== panel;
    });

    showModal(modal);
    modal.scrollTop = 0;

    const heading = panel.querySelector('[tabindex="-1"]');
    if (heading) heading.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!isShown(modal)) return;
    hideModal(modal);
    restoreFocus(detailOpener);
    detailOpener = null;
  }

  function route() {
    const key = keyFromHash();
    if (key === null || key === 'list') {
      closeDetail();
      return;
    }
    openDetail(key, true);
  }

  function go(hash) {
    if (window.location.hash !== hash) {
      try {
        window.history.pushState(null, '', hash);
      } catch (e) {
        window.location.hash = hash;
        return;
      }
    }
    route();
  }

  /* ---------- "not released" notice ---------- */

  function showNotice(opener) {
    if (!notice) return;
    noticeOpener = opener || null;
    showModal(notice);
    const ok = notice.querySelector('#releaseNoticeOk');
    if (ok) ok.focus({ preventScroll: true });
  }

  function closeNotice() {
    if (!notice || !isShown(notice)) return;
    hideModal(notice);
    restoreFocus(noticeOpener);
    noticeOpener = null;
  }

  if (notice) {
    notice.addEventListener('click', (event) => {
      if (event.target.closest('[data-modal-close]') || event.target.closest('#releaseNoticeOk')) {
        closeNotice();
      }
    });
  }

  /* ---------- Show Picture ---------- */

  function togglePicture(button) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    const open = button.getAttribute('aria-expanded') !== 'true';
    setReveal(panel, open);
    button.setAttribute('aria-expanded', String(open));

    const label = button.querySelector('.showcase-picture-label');
    if (label) label.textContent = open ? 'Hide Picture' : 'Show Picture';

    if (open) {
      /* once the panel has grown, make sure the bottom of the frame is on screen */
      window.setTimeout(() => {
        try {
          panel.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        } catch (e) {
          panel.scrollIntoView(false);
        }
      }, prefersReducedMotion() ? 0 : 420);
    }
  }

  /* ---------- clicks ---------- */

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.closest) return;

    const pictureButton = target.closest('.showcase-picture-btn');
    if (pictureButton) {
      const item = pictureButton.closest('.showcase-item');
      if (item && item.dataset.released === 'false') {
        showNotice(pictureButton);
      } else {
        togglePicture(pictureButton);
      }
      return;
    }

    const link = target.closest('a[href^="#"]');
    if (!link || link.closest('nav')) return;
    const href = link.getAttribute('href');

    /* Details button on a project that is not out yet */
    if (link.classList.contains('showcase-details-btn')) {
      const item = link.closest('.showcase-item');
      if (item && item.dataset.released === 'false') {
        event.preventDefault();
        showNotice(link);
        return;
      }
    }

    if (href === '#showcase' || /^#showcase\/\d+(\/tutorial)?$/.test(href)) {
      event.preventDefault();
      go(href);
      return;
    }

    /* A link inside the modal that points elsewhere ("Contact me"):
       close the modal first, then scroll to the section. */
    if (modal.contains(link) && href.length > 1) {
      const destination = document.getElementById(href.slice(1));
      if (destination) {
        event.preventDefault();
        detailOpener = null;
        closeDetail();
        try {
          window.history.pushState(null, '', href);
        } catch (e) { /* ignore */ }
        window.setTimeout(() => {
          try {
            destination.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
          } catch (e) {
            destination.scrollIntoView(true);
          }
        }, 30);
      }
    }
  });

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-modal-close]') || event.target.closest('#showcaseClose')) {
      go('#showcase');
    }
  });

  /* ---------- keyboard: Escape closes, Tab stays inside ---------- */

  document.addEventListener('keydown', (event) => {
    const noticeOpen = notice && isShown(notice);
    const detailOpen = isShown(modal);
    if (!noticeOpen && !detailOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (noticeOpen) closeNotice();
      else go('#showcase');
      return;
    }

    if (event.key !== 'Tab') return;

    const scope = noticeOpen ? notice.querySelector('.modal-dialog') : dialog;
    const focusable = Array.from(
      scope.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!scope.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (active === first || active.getAttribute('tabindex') === '-1')) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('hashchange', route);

  /* Opened straight on a Details link: show the list behind it, then the modal. */
  const initial = keyFromHash();
  if (initial !== null && initial !== 'list') {
    jumpTo(section, 'start');
    openDetail(initial, false);
  }
}
