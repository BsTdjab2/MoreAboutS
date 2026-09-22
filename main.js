import { initTheme } from './theme.js';
import { initEffects } from './effects.js';
import { initCardTilt } from './cards.js';
import { initContactForm } from './contact.js';
import { initFlasher } from './flasher.js';
import { initTerminal } from './terminal.js';

/* Every init no-ops when its section is absent, so the same entry point
   serves the home page and the smaller legal pages. */
initTheme();
initEffects();
initCardTilt();
initContactForm();
initFlasher();
initTerminal();

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
