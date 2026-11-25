/* Pointer effects for mouse and trackpad users: a soft glow that trails the
   cursor, a spotlight that follows it across cards and buttons, magnetic
   buttons and a gentle 3D tilt on the featured cards. Touch devices and
   reduced-motion users get none of it (the hover styles still work). */

const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

const SPOT = '.card, .btn';
const MAGNETIC = '.hero .btn, .contact-links .btn, .terminal-panel .btn, .dl-btn, .dl-scan-btn';
const TILT = '.mc-feature, #links .card, .dl-frame';

export function initPointer() {
  if (!fine.matches || reduce.matches) return;

  /* trailing glow */
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);

  let tx = 0;
  let ty = 0;
  let gx = 0;
  let gy = 0;
  let glowRaf = 0;

  function glowLoop() {
    gx += (tx - gx) * 0.14;
    gy += (ty - gy) * 0.14;
    glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
    if (Math.abs(tx - gx) > 0.4 || Math.abs(ty - gy) > 0.4) {
      glowRaf = window.requestAnimationFrame(glowLoop);
    } else {
      glowRaf = 0;
    }
  }

  /* spotlight + tilt + magnet share one rAF-throttled handler */
  let pending = null;
  let frame = 0;

  function handle(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const spot = target.closest(SPOT);
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', `${event.clientX - r.left}px`);
      spot.style.setProperty('--my', `${event.clientY - r.top}px`);
    }

    const tilt = target.closest(TILT);
    if (tilt) {
      const r = tilt.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width - 0.5;
      const py = (event.clientY - r.top) / r.height - 0.5;
      tilt.classList.add('is-tilting');
      tilt.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
      tilt.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
    }

    const mag = target.closest(MAGNETIC);
    if (mag) {
      const r = mag.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      mag.style.setProperty('--tx', `${Math.max(-8, Math.min(8, dx * 0.2)).toFixed(1)}px`);
      mag.style.setProperty('--ty', `${Math.max(-6, Math.min(6, dy * 0.28)).toFixed(1)}px`);
    }
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

    tx = event.clientX;
    ty = event.clientY;
    if (!glow.classList.contains('is-on')) {
      gx = tx;
      gy = ty;
      glow.classList.add('is-on');
    }
    if (!glowRaf) glowRaf = window.requestAnimationFrame(glowLoop);

    pending = event;
    if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (pending) handle(pending);
        pending = null;
      });
    }
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('is-on'));

  /* settle tilt and magnet back to rest */
  document.addEventListener('pointerout', (event) => {
    const from = event.target instanceof Element ? event.target : null;
    if (!from) return;

    [[TILT, ['--rx', '--ry']], [MAGNETIC, ['--tx', '--ty']]].forEach(([selector, props]) => {
      const el = from.closest(selector);
      if (el && !el.contains(event.relatedTarget)) {
        el.classList.remove('is-tilting');
        props.forEach((p) => el.style.removeProperty(p));
      }
    });
  });
}
