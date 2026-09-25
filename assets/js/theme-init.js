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

  try {
    var accent = localStorage.getItem('sherlock-accent');
    var ACCENTS = ['green', 'cyan', 'blue', 'purple', 'orange', 'pink'];
    if (ACCENTS.indexOf(accent) !== -1) {
      document.documentElement.setAttribute('data-accent', accent);
    }
  } catch (e) {
    /* private mode or blocked site data: the default accent is correct anyway */
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
