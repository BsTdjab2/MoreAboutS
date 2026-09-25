/* Background effects: a Matrix-style glyph rain and a blood-drip scene, both
   drawn on one full-screen canvas that sits behind every bit of page content.

   Three things this module is careful about, because a decorative background
   is exactly the sort of feature that quietly ruins a site:

   1. It never touches readability. The canvas is held at low opacity by CSS
      and the rain fades against whatever the current theme's background is,
      so switching to the white theme does not leave black smears behind the
      text.
   2. It stops when nobody is looking. The loop is torn down on tab hide, on
      pause, and when the mode goes off, so an idle tab is not burning a core.
   3. It obeys prefers-reduced-motion by painting a single still frame instead
      of animating. The look survives; the motion does not. */

const STORAGE_MODE = 'sherlock-fx';
const STORAGE_PAUSED = 'sherlock-fx-paused';
const MODES = ['off', 'matrix', 'blood'];

/* Glyph soup for the rain: half-width katakana is the look everyone expects,
   with digits mixed in so it still reads as "data" in a fallback font. */
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'.split('');

const FONT_SIZE = 16;
const MAX_DROPLETS = 140;
const MAX_SPLATS = 28;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* private mode or blocked site data: the effect still runs this visit */
  }
}

/* The trail is painted by covering the last frame in near-transparent page
   background. Doing it with the live theme colour is what keeps the rain
   looking right on the white theme instead of leaving a grey fog. */
function hexToRgb(hex) {
  const clean = String(hex).trim().replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

export function initEffects() {
  const canvas = document.getElementById('fxCanvas');
  const matrixBtn = document.getElementById('fxMatrix');
  const bloodBtn = document.getElementById('fxBlood');
  const controls = document.getElementById('fxControls');
  const pauseBtn = document.getElementById('fxPause');
  const offBtn = document.getElementById('fxOff');
  const label = document.getElementById('fxLabel');
  const drips = document.getElementById('fxDrips');

  /* Every element is required: a half-present effects bar would be worse than
     none, and the legal pages do not carry this markup at all. */
  if (!canvas || !matrixBtn || !bloodBtn || !controls || !pauseBtn || !offBtn || !label || !drips) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let mode = 'off';
  let paused = readStored(STORAGE_PAUSED, 'false') === 'true';
  let frame = 0;
  let width = 0;
  let height = 0;

  let drops = [];
  let hotColumn = -1;
  let droplets = [];
  let splats = [];
  let pointer = { x: -1, y: -1, active: false };
  let lastSpawn = 0;

  function themeRgb() {
    const styles = getComputedStyle(document.documentElement);
    return hexToRgb(styles.getPropertyValue('--bg-color')) || { r: 0, g: 0, b: 0 };
  }

  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#00ffcc';
  }

  function resize() {
    /* Capped at 2x: past that the pixel count costs far more than it shows,
       especially on phones that report 3x or 4x. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const columns = Math.ceil(width / FONT_SIZE);
    const next = new Array(columns);
    for (let i = 0; i < columns; i += 1) {
      /* Keep any column that already existed so a resize does not restart the
         whole rain, and seed new ones above the fold so they fall in. */
      next[i] = drops[i] === undefined ? Math.random() * -50 : drops[i];
    }
    drops = next;
  }

  function clear() {
    ctx.clearRect(0, 0, width, height);
  }

  /* ------------------------------------------------------------- matrix */

  function drawMatrix(step) {
    const bg = themeRgb();
    ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${step ? 0.09 : 1})`;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${FONT_SIZE}px "Courier New", ui-monospace, monospace`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < drops.length; i += 1) {
      const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;

      /* The leading glyph of each column is drawn bright, the rest in the
         mid green, which is what gives the rain its head-and-tail look. */
      if (i === hotColumn) {
        ctx.fillStyle = accent();
      } else if (Math.random() > 0.975) {
        ctx.fillStyle = '#d7ffe6';
      } else {
        ctx.fillStyle = '#19d453';
      }
      ctx.fillText(glyph, x, y);

      if (!step) continue;

      if (y > height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }

    if (step && hotColumn >= 0 && frame % 6 === 0) hotColumn = -1;
  }

  /* -------------------------------------------------------------- blood */

  function spawnDroplet(x, y, burst) {
    if (droplets.length >= MAX_DROPLETS) return;
    const depth = 0.35 + Math.random() * 0.65;
    droplets.push({
      x,
      y,
      depth,
      radius: (1.6 + Math.random() * 3.4) * depth,
      vy: (0.6 + Math.random() * 1.5) * depth,
      vx: burst ? (Math.random() - 0.5) * 2.4 : (Math.random() - 0.5) * 0.25,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function spawnSplat(x, y, depth) {
    if (splats.length >= MAX_SPLATS) splats.shift();
    const blobs = [];
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i += 1) {
      blobs.push({
        dx: (Math.random() - 0.5) * 26 * depth,
        dy: (Math.random() - 0.5) * 14 * depth,
        r: (1 + Math.random() * 4) * depth,
      });
    }
    splats.push({ x, y, depth, blobs, age: 0, life: 90 + Math.random() * 60 });
  }

  function drawBlood(step) {
    clear();

    /* Splats first so falling droplets read as being in front of them.
       Depth drives radius, alpha and blur together, which is what sells the
       3D read without a WebGL dependency. */
    splats.forEach((splat) => {
      const fade = 1 - splat.age / splat.life;
      ctx.globalAlpha = Math.max(0, fade * 0.55 * splat.depth);
      ctx.fillStyle = '#6d0a0a';
      splat.blobs.forEach((blob) => {
        ctx.beginPath();
        ctx.arc(splat.x + blob.dx, splat.y + blob.dy, blob.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (step) splat.age += 1;
    });

    droplets.forEach((drop) => {
      const grad = ctx.createRadialGradient(
        drop.x - drop.radius * 0.3,
        drop.y - drop.radius * 0.4,
        drop.radius * 0.1,
        drop.x,
        drop.y,
        drop.radius,
      );
      grad.addColorStop(0, 'rgba(214, 48, 48, 0.95)');
      grad.addColorStop(0.6, 'rgba(150, 12, 12, 0.9)');
      grad.addColorStop(1, 'rgba(74, 2, 2, 0.75)');

      ctx.globalAlpha = 0.35 + drop.depth * 0.5;
      ctx.fillStyle = grad;
      ctx.beginPath();
      /* Teardrop: a circle with a tail stretched along travel direction. */
      ctx.moveTo(drop.x, drop.y - drop.radius * 2.1);
      ctx.quadraticCurveTo(drop.x + drop.radius, drop.y, drop.x, drop.y + drop.radius);
      ctx.quadraticCurveTo(drop.x - drop.radius, drop.y, drop.x, drop.y - drop.radius * 2.1);
      ctx.fill();

      if (!step) return;
      drop.wobble += 0.05;
      drop.y += drop.vy;
      drop.x += drop.vx + Math.sin(drop.wobble) * 0.15 * drop.depth;
      drop.vy += 0.045 * drop.depth;
    });

    ctx.globalAlpha = 1;

    if (!step) return;

    splats = splats.filter((splat) => splat.age < splat.life);
    droplets = droplets.filter((drop) => {
      if (drop.y - drop.radius > height) {
        spawnSplat(drop.x, height - 4, drop.depth);
        return false;
      }
      return true;
    });

    /* A slow, steady ceiling drip so the scene lives without the pointer. */
    if (frame % 14 === 0) spawnDroplet(Math.random() * width, -10, false);
  }

  /* ---------------------------------------------------------- the loop */

  let rafId = 0;

  function render(step) {
    if (mode === 'matrix') drawMatrix(step);
    else if (mode === 'blood') drawBlood(step);
  }

  function loop() {
    frame += 1;
    render(true);
    rafId = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function shouldAnimate() {
    return mode !== 'off' && !paused && !document.hidden && !reduceMotion.matches;
  }

  function startLoop() {
    stopLoop();
    if (mode === 'off') return;
    if (!shouldAnimate()) {
      /* Paused, hidden, or reduced motion: paint one still frame so the mode
         is visibly on rather than an empty screen. */
      render(false);
      return;
    }
    rafId = window.requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------- state */

  function syncControls() {
    matrixBtn.setAttribute('aria-pressed', String(mode === 'matrix'));
    bloodBtn.setAttribute('aria-pressed', String(mode === 'blood'));
    controls.hidden = mode === 'off';
    pauseBtn.setAttribute('aria-pressed', String(paused));

    const pauseLabel = pauseBtn.querySelector('span');
    if (pauseLabel) pauseLabel.textContent = paused ? 'Resume' : 'Pause';

    if (mode === 'off') {
      label.textContent = '';
    } else if (reduceMotion.matches) {
      label.textContent = mode === 'matrix'
        ? 'Matrix rain, held still (reduced motion)'
        : 'Blood drip, held still (reduced motion)';
    } else {
      label.textContent = `${mode === 'matrix' ? 'Matrix rain' : 'Blood drip'}${paused ? ' (paused)' : ''}`;
    }
  }

  function setMode(next, persist) {
    mode = MODES.includes(next) ? next : 'off';

    document.body.classList.toggle('fx-matrix', mode === 'matrix');
    document.body.classList.toggle('fx-blood', mode === 'blood');
    canvas.hidden = mode === 'off';
    drips.hidden = mode !== 'blood';

    droplets = [];
    splats = [];
    hotColumn = -1;

    if (mode === 'off') {
      stopLoop();
      clear();
    } else {
      resize();
      clear();
      if (mode === 'blood') {
        /* Seed a few mid-flight droplets so switching on is not an empty sky. */
        for (let i = 0; i < 18; i += 1) spawnDroplet(Math.random() * width, Math.random() * height, false);
      }
      startLoop();
    }

    if (persist) store(STORAGE_MODE, mode);
    syncControls();
  }

  function toggleMode(next) {
    setMode(mode === next ? 'off' : next, true);
  }

  /* ------------------------------------------------------------ events */

  matrixBtn.addEventListener('click', () => toggleMode('matrix'));
  bloodBtn.addEventListener('click', () => toggleMode('blood'));
  offBtn.addEventListener('click', () => setMode('off', true));

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    store(STORAGE_PAUSED, String(paused));
    startLoop();
    syncControls();
  });

  window.addEventListener('resize', () => {
    if (mode === 'off') return;
    resize();
    if (!shouldAnimate()) render(false);
  });

  document.addEventListener('visibilitychange', () => {
    if (mode !== 'off') startLoop();
  });

  /* The canvas is pointer-events:none, so the move is tracked on the window
     and the effects simply read it. Nothing here can eat a click meant for
     the page underneath. */
  window.addEventListener('pointermove', (event) => {
    if (mode === 'off' || paused || reduceMotion.matches) return;
    pointer = { x: event.clientX, y: event.clientY, active: true };

    if (mode === 'matrix') {
      hotColumn = Math.floor(event.clientX / FONT_SIZE);
      return;
    }

    const now = event.timeStamp || Date.now();
    if (now - lastSpawn < 70) return;
    lastSpawn = now;
    spawnDroplet(pointer.x + (Math.random() - 0.5) * 30, pointer.y, false);
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (mode !== 'blood' || paused || reduceMotion.matches) return;
    spawnSplat(event.clientX, event.clientY, 0.9);
    for (let i = 0; i < 7; i += 1) spawnDroplet(event.clientX, event.clientY, true);
  }, { passive: true });

  /* A theme change repaints the trail colour, otherwise the rain keeps
     fading toward the colour of the theme it started in. */
  new MutationObserver(() => {
    if (mode !== 'off' && !shouldAnimate()) render(false);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const onMotionChange = () => {
    startLoop();
    syncControls();
  };
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', onMotionChange);
  }

  resize();
  setMode(readStored(STORAGE_MODE, 'off'), false);
}
