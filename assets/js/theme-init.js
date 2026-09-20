/* Runs before first paint so a saved theme never flashes the default one.
   Kept as a classic script on purpose: a module would be deferred. */
(function () {
  try {
    var saved = localStorage.getItem('sherlock-theme');
    if (saved === 'purple' || saved === 'white') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {
    /* private mode or blocked site data: the default theme is correct anyway */
  }
})();
