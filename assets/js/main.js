import { initTheme } from './theme.js';
import { initScrollProgress } from './scroll-progress.js';
import { initCardTilt } from './cards.js';
import { initContactForm } from './contact.js';
import { initFlasher } from './flasher.js';
import { initKaliCmd } from './kalicmd.js';

/* Every init no-ops when its section is absent, so the same entry point
   serves the home page and the smaller legal pages. */
initTheme();
initScrollProgress();
initCardTilt();
initContactForm();
initFlasher();
initKaliCmd();

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
