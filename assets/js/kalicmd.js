/* Kali tool cards: clicking a copy line puts its command on the clipboard and
   shows a brief "Copied!" confirmation next to it. Works for every
   .kali-copy-btn on the page, including the ones inside the collapsed list.

   navigator.clipboard needs a secure context and a recent browser. Where it is
   missing or refused (older Safari, Firefox on plain http), a hidden textarea
   and document.execCommand('copy') does the job instead. */

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.className = 'copy-fallback';
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      /* fall through to the textarea method */
    }
  }
  return fallbackCopy(text);
}

export function initKaliCmd() {
  const buttons = document.querySelectorAll('.kali-copy-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    const status = btn.parentElement.querySelector('.kali-copy-status');
    let resetTimer = null;

    function show(message) {
      if (!status) return;
      status.textContent = message;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }

    btn.addEventListener('click', async () => {
      const text = btn.dataset.copyText || btn.textContent.trim();
      const ok = await copyText(text);
      btn.focus({ preventScroll: true });
      show(ok ? 'Copied!' : 'Copy failed. Select and copy manually.');
    });
  });
}
