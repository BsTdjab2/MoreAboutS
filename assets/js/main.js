import { initTheme } from './theme.js';
import { initMode3D } from './mode3d.js';
import { initEffects } from './effects.js';
import { initCardTilt } from './cards.js';
import { initContactForm } from './contact.js';
import { initFlasher } from './flasher.js';
import { initTerminal } from './terminal.js';
import { initTypewriter } from './typewriter.js';
import { initKaliCmd } from './kalicmd.js';

/* Every init no-ops when its section is absent, so the same entry point
   serves the home page and the smaller legal pages. */
initTheme();
initMode3D();
initEffects();
initCardTilt();
initContactForm();
initFlasher();
initTerminal();
initTypewriter();
initKaliCmd();

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
