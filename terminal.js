/* Sherlock — terminal search overlay + hero typewriter.
   Plain script, no dependencies, no bundler. Loads after main.js and does
   not touch anything main.js/theme-init.js/effects.js own. Respects
   prefers-reduced-motion, same as the rest of the site's motion. */

(function () {
  'use strict';

  var reduceMotion = !!(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /* ---- Hero typewriter: types "sherlock", holds, erases, repeats. ---- */
  function initTypewriter() {
    var el = document.getElementById('typewriterText');
    if (!el) return;

    var word = el.getAttribute('data-word') || el.textContent.trim();
    if (!word) return;

    // Reduced motion (or a user who never gets a "load" tick) just sees the
    // static word — it already sits in the markup, so there is nothing to do.
    if (reduceMotion) {
      el.textContent = word;
      return;
    }

    var TYPE_MS = 140;
    var ERASE_MS = 90;
    var HOLD_MS = 1800;
    var REST_MS = 500;

    var i = 0;
    var typing = true;
    var timerId = null;
    var running = true;

    function schedule(delay) {
      timerId = window.setTimeout(tick, delay);
    }

    function tick() {
      if (!running) return;

      if (typing) {
        i += 1;
        el.textContent = word.slice(0, i);
        if (i >= word.length) {
          typing = false;
          schedule(HOLD_MS);
        } else {
          schedule(TYPE_MS);
        }
        return;
      }

      i -= 1;
      if (i < 0) i = 0;
      el.textContent = word.slice(0, i);
      if (i === 0) {
        typing = true;
        schedule(REST_MS);
      } else {
        schedule(ERASE_MS);
      }
    }

    schedule(REST_MS);

    // Pausing on a hidden tab keeps this from silently drifting or piling up
    // timers, matching the discipline effects.js already applies to its loop.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        window.clearTimeout(timerId);
      } else if (!running) {
        running = true;
        schedule(REST_MS);
      }
    });
  }

  /* ---- Search terminal overlay: open, close, focus trap. ---- */
  function initSearchOverlay() {
    var trigger = document.getElementById('searchTrigger');
    var overlay = document.getElementById('terminalOverlay');
    if (!trigger || !overlay) return;

    var closeBtn = document.getElementById('terminalClose');
    var modal = overlay.querySelector('.terminal-modal');
    var lastFocused = null;

    function focusable() {
      return Array.prototype.slice.call(
        modal.querySelectorAll('a[href], button:not([disabled])')
      );
    }

    function open() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.documentElement.classList.add('terminal-open');
      trigger.setAttribute('aria-expanded', 'true');
      var items = focusable();
      if (items.length) items[0].focus();
      document.addEventListener('keydown', onKeydown, true);
    }

    function close() {
      overlay.hidden = true;
      document.documentElement.classList.remove('terminal-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeydown, true);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    trigger.addEventListener('click', function () {
      if (overlay.hidden) {
        open();
      } else {
        close();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Click on the dimmed backdrop (not the modal itself) closes it.
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    // Any link inside the modal — a same-page anchor or an external one —
    // should close the overlay behind it rather than leaving it open.
    Array.prototype.forEach.call(overlay.querySelectorAll('a'), function (a) {
      a.addEventListener('click', close);
    });
  }

  function init() {
    initTypewriter();
    initSearchOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
