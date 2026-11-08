/* Hero: the title assembles letter by letter and decrypts, a quiet network of
   nodes reacts to the pointer behind it, and the whole block drifts away as
   you scroll. Everything pauses when the hero is off screen or the tab is
   hidden, and reduced motion gets a still frame instead. */

const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------------------------------------------------------- title */

function splitTitle(h1) {
  const text = h1.textContent.trim();
  if (!text) return null;

  h1.setAttribute('aria-label', text);
  h1.textContent = '';
  h1.classList.add('is-split');

  const letters = [];
  let index = 0;
  text.split(/(\s+)/).forEach((chunk) => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) {
      h1.appendChild(document.createTextNode(' '));
      return;
    }
    const word = document.createElement('span');
    word.className = 'hero-word';
    word.setAttribute('aria-hidden', 'true');
    Array.from(chunk).forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'hero-letter';
      span.textContent = ch;
      span.dataset.final = ch;
      span.style.setProperty('--i', String(index));
      index += 1;
      word.appendChild(span);
      letters.push(span);
    });
    h1.appendChild(word);
  });

  return letters;
}

async function decrypt(letters) {
  if (reduceMotion.matches) return;

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* carry on */ }
  }

  /* Lock each letter to its final width so scrambled glyphs never reflow the title. */
  letters.forEach((span) => {
    span.style.width = `${span.getBoundingClientRect().width}px`;
  });

  const start = performance.now();
  const STEP = 55;       /* ms between each letter settling */
  const BASE = 420;      /* ms before the first one settles */
  let last = 0;

  function frame(now) {
    const t = now - start;
    if (now - last > 45) {
      last = now;
      letters.forEach((span, i) => {
        span.textContent = t >= BASE + i * STEP
          ? span.dataset.final
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
    }
    if (t < BASE + letters.length * STEP + 60) {
      window.requestAnimationFrame(frame);
      return;
    }
    letters.forEach((span) => {
      span.textContent = span.dataset.final;
      span.style.removeProperty('width');
    });
  }
  window.requestAnimationFrame(frame);
}

/* --------------------------------------------------------------- canvas */

function hexToRgb(value) {
  const v = value.trim();
  if (v.startsWith('#')) {
    const h = v.length === 4 ? v.slice(1).replace(/./g, '$&$&') : v.slice(1);
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = v.match(/\d+/g);
  return m ? m.slice(0, 3).map(Number) : [43, 217, 168];
}

function initCanvas(hero) {
  const bg = hero.querySelector('.hero-bg');
  if (!bg) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  bg.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const LINK = 130;
  const POINTER_R = 190;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let nodes = [];
  let raf = 0;
  let onScreen = true;
  let rgb = [43, 217, 168];
  const pointer = { x: -9999, y: -9999 };

  function readColor() {
    rgb = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#2bd9a8');
  }

  function seed() {
    const area = w * h;
    const count = Math.max(22, Math.min(78, Math.round(area / (w < 700 ? 20000 : 15000))));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: 0.8 + Math.random() * 1.4,
    }));
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(false);
  }

  function draw(step) {
    ctx.clearRect(0, 0, w, h);
    const [r, g, b] = rgb;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];

      if (step) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;

        const dx = a.x - pointer.x;
        const dy = a.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_R * POINTER_R && d2 > 1) {
          const d = Math.sqrt(d2);
          const pull = (1 - d / POINTER_R) * 0.5;
          a.x -= (dx / d) * pull;   /* nodes ease away from the pointer */
          a.y -= (dy / d) * pull;
        }
      }

      for (let j = i + 1; j < nodes.length; j += 1) {
        const c = nodes[j];
        const dx = a.x - c.x;
        const dy = a.y - c.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const alpha = (1 - Math.sqrt(d2) / LINK) * 0.34;
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }

      const pdx = a.x - pointer.x;
      const pdy = a.y - pointer.y;
      const pd = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pd < POINTER_R) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${((1 - pd / POINTER_R) * 0.6).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }

      ctx.fillStyle = `rgba(${r},${g},${b},${pd < POINTER_R ? 0.95 : 0.55})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    draw(true);
    raf = window.requestAnimationFrame(loop);
  }

  function play() {
    if (raf || reduceMotion.matches || !onScreen || document.hidden) return;
    raf = window.requestAnimationFrame(loop);
  }

  function pause() {
    window.cancelAnimationFrame(raf);
    raf = 0;
  }

  readColor();
  resize();

  if (reduceMotion.matches) return; /* one still frame, no loop, no listeners */

  new ResizeObserver(() => resize()).observe(hero);

  hero.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) play(); else pause();
  }).observe(hero);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(); else play();
  });

  /* repaint with the new accent when the theme flips */
  new MutationObserver(() => { readColor(); if (!raf) draw(false); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  play();
}

/* ------------------------------------------------------------- parallax */

function initParallax(hero) {
  if (reduceMotion.matches) return;
  const inner = hero.querySelector('.hero-inner');
  const bg = hero.querySelector('.hero-bg');
  if (!inner) return;

  let ticking = false;
  let visible = true;

  function update() {
    ticking = false;
    const h = hero.offsetHeight || 1;
    const p = Math.min(Math.max(window.scrollY / h, 0), 1);
    inner.style.transform = `translate3d(0, ${(p * 90).toFixed(1)}px, 0)`;
    inner.style.opacity = String((1 - p * 1.15).toFixed(3));
    if (bg) bg.style.transform = `translate3d(0, ${(p * 40).toFixed(1)}px, 0)`;
  }

  window.addEventListener('scroll', () => {
    if (!visible || ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(hero);
  update();
}

export function initHero() {
  const hero = document.querySelector('header.hero');
  if (!hero) return;

  const h1 = hero.querySelector('h1');
  if (h1) {
    const letters = splitTitle(h1);
    if (letters) decrypt(letters);
  }

  if (hero.classList.contains('hero-home')) {
    initCanvas(hero);
    initParallax(hero);
  }
}
