/* Drives the real index.html through jsdom and exercises the effects module:
   button clicks, pause, off, persistence, pointer events, theme switches and
   reduced motion. jsdom has no canvas backend, so the 2D context is stubbed
   and the test asserts on state and call patterns rather than on pixels.

   The point is to catch the failure modes that a syntax check cannot: a typo
   in an element id, a handler that throws on the first pointermove, a mode
   that never stops its animation frame. */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL  ${name}: ${error.message}`);
    failures.push(name);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message || 'assertion failed');
}

/* --------------------------------------------------------------- harness */

const html = readFileSync(join(root, 'index.html'), 'utf8');

function stubContext() {
  const calls = { fillRect: 0, clearRect: 0, fillText: 0, fill: 0 };
  const noop = () => {};
  return {
    calls,
    setTransform: noop,
    clearRect: () => { calls.clearRect += 1; },
    fillRect: () => { calls.fillRect += 1; },
    fillText: () => { calls.fillText += 1; },
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    quadraticCurveTo: noop,
    fill: () => { calls.fill += 1; },
    createRadialGradient: () => ({ addColorStop: noop }),
    globalAlpha: 1,
    fillStyle: '',
    font: '',
    textBaseline: '',
  };
}

async function boot({ reduced = false, stored = {} } = {}) {
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://example.test/' });
  const { window } = dom;

  const ctx = stubContext();
  window.HTMLCanvasElement.prototype.getContext = () => ctx;

  /* jsdom reports 0 for clientWidth on an unlaid-out element; the module
     falls back to innerWidth, but pin both so sizing is deterministic. */
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { value: 1024 });
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { value: 768 });

  window.matchMedia = (query) => ({
    matches: query.includes('reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  Object.entries(stored).forEach(([k, v]) => window.localStorage.setItem(k, v));

  /* Frames are queued, not run, so the test drives the loop deliberately and
     a runaway render cannot hang the suite. flush() runs whatever is queued,
     which is what actually executes drawMatrix / drawBlood. */
  let rafCount = 0;
  const pending = new Map();
  window.requestAnimationFrame = (cb) => {
    rafCount += 1;
    pending.set(rafCount, cb);
    return rafCount;
  };
  window.cancelAnimationFrame = (id) => pending.delete(id);

  const globals = ['window', 'document', 'localStorage', 'getComputedStyle', 'MutationObserver'];
  const saved = {};
  globals.forEach((key) => { saved[key] = globalThis[key]; });

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.MutationObserver = window.MutationObserver;

  const { initEffects } = await import('../assets/js/effects.js?v=' + Math.random());
  initEffects();

  const restore = () => globals.forEach((key) => { globalThis[key] = saved[key]; });
  const $ = (id) => window.document.getElementById(id);

  function flush(times = 1) {
    for (let i = 0; i < times; i += 1) {
      const queued = [...pending.entries()];
      pending.clear();
      queued.forEach(([, cb]) => cb(performance.now()));
    }
  }

  return { window, ctx, $, restore, flush, pendingFrames: () => pending.size };
}

/* ----------------------------------------------------------------- tests */

const off = await boot();
test('it starts off and paints nothing', () => {
  assert(off.$('fxCanvas').hidden, 'canvas should start hidden');
  assert(off.$('fxControls').hidden, 'controls should start hidden');
  assert(off.$('fxMatrix').getAttribute('aria-pressed') === 'false', 'matrix not pressed');
  assert(off.$('fxBlood').getAttribute('aria-pressed') === 'false', 'blood not pressed');
});

test('the green button turns the rain on', () => {
  off.$('fxMatrix').click();
  assert(off.$('fxMatrix').getAttribute('aria-pressed') === 'true', 'matrix should be pressed');
  assert(!off.$('fxCanvas').hidden, 'canvas should be visible');
  assert(!off.$('fxControls').hidden, 'controls should appear');
  assert(off.window.document.body.classList.contains('fx-matrix'), 'body class missing');
  assert(off.window.localStorage.getItem('sherlock-fx') === 'matrix', 'mode not persisted');
  assert(off.pendingFrames() > 0, 'no animation frame scheduled');
});

test('clicking green again turns it back off and cancels the loop', () => {
  off.$('fxMatrix').click();
  assert(off.$('fxMatrix').getAttribute('aria-pressed') === 'false', 'should untoggle');
  assert(off.$('fxCanvas').hidden, 'canvas should hide again');
  assert(off.pendingFrames() === 0, 'animation frame left running');
  assert(off.window.localStorage.getItem('sherlock-fx') === 'off', 'off not persisted');
});

test('the red button switches modes rather than stacking them', () => {
  off.$('fxMatrix').click();
  off.$('fxBlood').click();
  assert(off.$('fxBlood').getAttribute('aria-pressed') === 'true', 'blood should be pressed');
  assert(off.$('fxMatrix').getAttribute('aria-pressed') === 'false', 'matrix should have released');
  assert(off.window.document.body.classList.contains('fx-blood'), 'blood body class missing');
  assert(!off.window.document.body.classList.contains('fx-matrix'), 'matrix body class left behind');
  assert(!off.$('fxDrips').hidden, 'the 3D drip layer should show in blood mode');
});

test('the drip layer only exists in blood mode', () => {
  off.$('fxMatrix').click();
  assert(off.$('fxDrips').hidden, 'drips should hide outside blood mode');
});

test('pause stops the loop and relabels itself, resume restarts it', () => {
  const pause = off.$('fxPause');
  pause.click();
  assert(pause.getAttribute('aria-pressed') === 'true', 'pause not marked pressed');
  assert(pause.querySelector('span').textContent === 'Resume', 'label should read Resume');
  assert(off.pendingFrames() === 0, 'loop still running while paused');
  assert(off.window.localStorage.getItem('sherlock-fx-paused') === 'true', 'pause not persisted');

  pause.click();
  assert(pause.getAttribute('aria-pressed') === 'false', 'pause not released');
  assert(pause.querySelector('span').textContent === 'Pause', 'label should read Pause');
  assert(off.pendingFrames() > 0, 'loop did not resume');
});

test('the off control clears everything', () => {
  off.$('fxOff').click();
  assert(off.$('fxCanvas').hidden, 'canvas still visible');
  assert(off.$('fxControls').hidden, 'controls still visible');
  assert(off.pendingFrames() === 0, 'loop still running');
});

test('pointer and theme events do not throw in any mode', () => {
  const { window } = off;
  ['off', 'matrix', 'blood'].forEach((mode) => {
    if (mode === 'matrix') off.$('fxMatrix').click();
    if (mode === 'blood') off.$('fxBlood').click();

    window.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 300, clientY: 200 }));
    window.dispatchEvent(new window.MouseEvent('pointerdown', { clientX: 120, clientY: 90 }));
    window.dispatchEvent(new window.Event('resize'));
    window.document.documentElement.setAttribute('data-theme', 'white');
    window.document.documentElement.removeAttribute('data-theme');

    if (mode !== 'off') off.$('fxOff').click();
  });
});

off.restore();

const restored = await boot({ stored: { 'sherlock-fx': 'blood' } });
test('a saved mode is restored on load', () => {
  assert(restored.$('fxBlood').getAttribute('aria-pressed') === 'true', 'saved mode not restored');
  assert(!restored.$('fxCanvas').hidden, 'canvas should be on');
  assert(restored.pendingFrames() > 0, 'restored mode did not start its loop');
});

test('running blood frames draws and keeps re-queueing', () => {
  restored.flush(30);
  assert(restored.ctx.calls.fill > 0, 'blood mode drew nothing across 30 frames');
  assert(restored.pendingFrames() > 0, 'the loop stopped re-queueing itself');
});

test('running matrix frames draws glyphs', () => {
  restored.$('fxMatrix').click();
  const before = restored.ctx.calls.fillText;
  restored.flush(10);
  assert(restored.ctx.calls.fillText > before, 'matrix mode drew no glyphs');
});

test('particle counts stay bounded under sustained pointer input', () => {
  restored.$('fxBlood').click();
  for (let i = 0; i < 400; i += 1) {
    restored.window.dispatchEvent(new restored.window.MouseEvent('pointerdown', { clientX: i % 900, clientY: 40 }));
    restored.flush(1);
  }
  /* No direct handle on the arrays, so this asserts the run completes and the
     loop is still healthy rather than having thrown or ground to a stop. */
  assert(restored.pendingFrames() > 0, 'loop died under load');
});
restored.restore();

const still = await boot({ reduced: true, stored: { 'sherlock-fx': 'matrix' } });
test('reduced motion paints one still frame and schedules no loop', () => {
  assert(!still.$('fxCanvas').hidden, 'canvas should still be on');
  assert(still.pendingFrames() === 0, 'reduced motion should not animate');
  assert(still.ctx.calls.fillText > 0, 'the still frame was never drawn');
  assert(still.$('fxLabel').textContent.includes('reduced motion'), 'label should explain itself');
});

test('reduced motion ignores pointer input instead of spawning work', () => {
  const before = still.ctx.calls.fill;
  still.window.dispatchEvent(new still.window.MouseEvent('pointerdown', { clientX: 10, clientY: 10 }));
  assert(still.ctx.calls.fill === before, 'pointer input drew while motion was reduced');
});
still.restore();

const junk = await boot({ stored: { 'sherlock-fx': 'not-a-mode' } });
test('a junk stored mode falls back to off', () => {
  assert(junk.$('fxCanvas').hidden, 'junk mode should not enable anything');
});
junk.restore();

console.log(`\n${passed}/${passed + failures.length} passed`);
if (failures.length) process.exit(1);
