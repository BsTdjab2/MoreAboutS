import { initTheme } from './theme.js';
import { initEffects } from './effects.js';
import { initCardTilt } from './cards.js';
import { initTerminal } from './terminal.js';
import { initTypewriter } from './typewriter.js';
import { initKaliCmd } from './kalicmd.js';

/* Every init no-ops when its section is absent, so the same entry point
   serves the home page and the smaller legal pages. */
initTheme();
initEffects();
initCardTilt();
initTerminal();
initTypewriter();
initKaliCmd();

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
