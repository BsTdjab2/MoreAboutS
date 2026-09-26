/* 3D Mode: an optional, playful alternative to the flat default layout.
   When on, a few key elements (hero terminal, profile photo, project cards)
   tilt gently toward the cursor. Off ("Normal Mode") is the original, static
   layout. Persisted the same way the theme/accent choices are. */

const STORAGE_KEY = 'sherlock-mode3d';
const MAX_TILT_DEG = 10;

function tiltTargets() {
  return [
    document.getElementById('nt-terminal'),
    document.querySelector('.logo-img'),
    ...document.querySelectorAll('.card'),
  ].filter(Boolean);
}

export function initMode3D() {
  const toggle = document.getElementById('mode3DToggle');
  if (!toggle) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  let active = document.documentElement.getAttribute('data-mode') === '3d';
  let onMove = null;

  function resetTargets() {
    tiltTargets().forEach((el) => {
      el.style.transform = '';
    });
  }

  function attachTilt() {
    onMove = (event) => {
      if (reduceMotion.matches || !supportsHover.matches) return;
      tiltTargets().forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rotateX = ((event.clientY - cy) / (rect.height / 2)) * -MAX_TILT_DEG;
        const rotateY = ((event.clientX - cx) / (rect.width / 2)) * MAX_TILT_DEG;
        el.style.transform =
          `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      });
    };
    window.addEventListener('pointermove', onMove);
  }

  function detachTilt() {
    if (onMove) window.removeEventListener('pointermove', onMove);
    onMove = null;
    resetTargets();
  }

  function setActive(next) {
    active = next;
    document.documentElement.setAttribute('data-mode', active ? '3d' : 'normal');
    toggle.setAttribute('aria-pressed', String(active));

    if (active) {
      attachTilt();
    } else {
      detachTilt();
    }

    try {
      localStorage.setItem(STORAGE_KEY, active ? 'on' : 'off');
    } catch (e) {
      /* nothing to do: the mode still applies for this visit */
    }
  }

  toggle.addEventListener('click', () => setActive(!active));

  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) resetTargets();
  });

  // Sync initial aria-pressed / behaviour with whatever theme-init.js
  // already applied before first paint.
  setActive(active);
}
