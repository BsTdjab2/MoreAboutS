/* Kali Tools directory: a live search over the .tool-card grid.

   Typing filters the cards instantly. When the query narrows the list down
   to one tool, or matches a tool's name exactly, the page scrolls straight
   to it and briefly highlights it. Pressing Enter jumps to the first
   visible match right away. */

const JUMP_DELAY_MS = 150;
const HIGHLIGHT_MS = 1500;

export function initKaliTools() {
  const input = document.getElementById('toolSearch');
  const cards = Array.from(document.querySelectorAll('.tool-card'));
  if (!input || !cards.length) return;

  const categories = Array.from(document.querySelectorAll('.tool-category'));
  const chips = Array.from(document.querySelectorAll('.tool-chip'));
  const chipFor = new Map(chips.map((chip) => [chip.getAttribute('href').slice(1), chip]));
  const empty = document.getElementById('toolSearchEmpty');
  const clearBtn = document.getElementById('toolSearchClear');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let jumpTimer = null;

  function highlight(card) {
    card.classList.add('is-highlighted');
    window.setTimeout(() => card.classList.remove('is-highlighted'), HIGHLIGHT_MS);
  }

  function jumpTo(card) {
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    highlight(card);
  }

  function filter() {
    const query = input.value.trim().toLowerCase();
    let visibleCount = 0;
    let exactMatch = null;
    let firstVisible = null;

    cards.forEach((card) => {
      const name = (card.dataset.name || '').toLowerCase();
      const match = !query || name.includes(query);
      card.hidden = !match;
      if (match) {
        visibleCount += 1;
        if (!firstVisible) firstVisible = card;
        if (name === query) exactMatch = card;
      }
    });

    categories.forEach((category) => {
      const hasVisible = category.querySelector('.tool-card:not([hidden])');
      category.hidden = !hasVisible;
      const chip = chipFor.get(category.id);
      if (chip) chip.hidden = !hasVisible;
    });

    if (empty) empty.hidden = !query || visibleCount !== 0;
    if (clearBtn) clearBtn.hidden = !query;

    window.clearTimeout(jumpTimer);
    if (query && (exactMatch || visibleCount === 1)) {
      jumpTimer = window.setTimeout(() => jumpTo(exactMatch || firstVisible), JUMP_DELAY_MS);
    }
  }

  input.addEventListener('input', filter);

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    window.clearTimeout(jumpTimer);
    const firstVisible = cards.find((card) => !card.hidden);
    jumpTo(firstVisible);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      filter();
      input.focus();
    });
  }

  filter();

  /* The category chips follow the page: the one for the section you are
     reading lights up and is kept in view inside its scrolling row. */
  if (chips.length && 'IntersectionObserver' in window) {
    const row = chips[0].parentElement;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const chip = chipFor.get(entry.target.id);
        if (!chip) return;
        chips.forEach((c) => c.classList.toggle('is-active', c === chip));
        if (row && row.scrollWidth > row.clientWidth) {
          const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
          row.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    categories.forEach((category) => spy.observe(category));
  }

  /* Each tool card is click/keyboard toggleable to reveal its Install and
     Usage detail block. The card itself carries role="button" so this
     works without nesting a real <button> inside the <h3>. */
  cards.forEach((card) => {
    const detailId = card.getAttribute('aria-controls');
    const detail = detailId ? document.getElementById(detailId) : null;
    if (!detail) return;

    function toggle() {
      const expanded = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', String(!expanded));
      detail.hidden = expanded;
    }

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  });

  initCopyButtons(cards);
}

/* One-click copy: clicking (or pressing Enter/Space on) a tool's Install
   command copies it and flashes a "Copied!" badge. The click is stopped
   here so it does not also collapse the card. */
function initCopyButtons(cards) {
  cards.forEach((card) => {
    card.querySelectorAll('.tool-detail-row').forEach((row) => {
      const label = row.querySelector('.tool-detail-label');
      const code = row.querySelector('.tool-detail-value');
      if (!label || !code || label.textContent.trim() !== 'Install') return;

      const badge = document.createElement('span');
      badge.className = 'tool-copied';
      badge.setAttribute('role', 'status');
      row.appendChild(badge);

      code.classList.add('tool-copy');
      code.setAttribute('role', 'button');
      code.setAttribute('tabindex', '0');
      code.setAttribute('title', 'Click to copy');
      code.setAttribute('aria-label', `Copy install command: ${code.textContent.trim()}`);

      let timer = null;

      async function copy() {
        const text = code.textContent.trim();
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch (e) {
          ok = fallbackCopy(text);
        }
        badge.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
        badge.classList.add('is-visible');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          badge.classList.remove('is-visible');
          badge.textContent = '';
        }, 1800);
      }

      code.addEventListener('click', (event) => {
        event.stopPropagation();
        copy();
      });

      code.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        copy();
      });
    });
  });
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'visually-hidden';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}
