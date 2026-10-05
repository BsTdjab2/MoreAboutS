/* Sherlock: site script. Theme toggle, scroll progress bar, copy buttons.
   Nothing here moves, tilts or follows the mouse. */

(function () {
  'use strict';

  var STORAGE_KEY = 'sherlock-theme';
  var root = document.documentElement;

  /* Runs before first paint so a saved choice never flashes the wrong theme.
     Dark is the default; only an explicit "light" choice changes it. */
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'light') {
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {
    /* blocked site data: the dark default is correct anyway */
  }

  function isLight() {
    return root.getAttribute('data-theme') === 'light';
  }

  function applyTheme(light, button) {
    if (light) {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }

    if (button) {
      button.setAttribute('aria-pressed', String(light));
      button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#ffffff' : '#0a0a0f');

    try {
      localStorage.setItem(STORAGE_KEY, light ? 'light' : 'dark');
    } catch (e) {
      /* the theme still applies for this visit */
    }
  }

  function initTheme() {
    var button = document.getElementById('themeToggle');
    if (!button) return;

    applyTheme(isLight(), button);
    button.addEventListener('click', function () {
      applyTheme(!isLight(), button);
    });
  }

  /* Thin bar fixed to the top of the page that fills as the visitor scrolls. */
  function initScrollProgress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;

    function update() {
      var max = root.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.width = ratio * 100 + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* Kali CMD: clicking a command copies it and shows "Copied!" beside it. */
  function initCopyButtons() {
    var buttons = document.querySelectorAll('.kali-copy-btn');

    Array.prototype.forEach.call(buttons, function (button) {
      var status = button.parentNode.querySelector('.kali-copy-status');
      var timer = null;

      button.addEventListener('click', function () {
        var text = button.getAttribute('data-copy-text') || button.textContent.trim();

        function show(message) {
          if (!status) return;
          status.textContent = message;
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            status.textContent = '';
          }, 2000);
        }

        if (!navigator.clipboard) {
          show('Copy failed. Select and copy manually.');
          return;
        }

        navigator.clipboard.writeText(text).then(
          function () { show('Copied!'); },
          function () { show('Copy failed. Select and copy manually.'); }
        );
      });
    });
  }

  function initYear() {
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function init() {
    initTheme();
    initScrollProgress();
    initCopyButtons();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
