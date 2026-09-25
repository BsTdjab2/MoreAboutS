/* Runs before first paint so a saved theme never flashes the default one.
   Kept as a classic script on purpose: a module would be deferred. */
(function () {
  try {
    var saved = localStorage.getItem('sherlock-theme');
    var THEMES = ['purple', 'white', 'blue', 'red'];
    if (THEMES.indexOf(saved) !== -1) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {
    /* private mode or blocked site data: the default theme is correct anyway */
  }

  try {
    var mode3d = localStorage.getItem('sherlock-mode3d');
    if (mode3d === 'on') {
      document.documentElement.setAttribute('data-mode', '3d');
    }
  } catch (e) {
    /* private mode or blocked site data: Normal Mode is correct anyway */
  }
})();
