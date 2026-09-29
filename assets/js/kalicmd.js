/* Kali CMD tool: clicking any command line's copy button copies that line's
   own command to the clipboard and shows a brief "Copied!" confirmation
   next to it. Wired generically by class so any number of command lines
   work the same way. */

export function initKaliCmd() {
  const buttons = document.querySelectorAll('.kali-copy-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    const status = btn.parentElement ? btn.parentElement.querySelector('.kali-copy-status') : null;
    let resetTimer = null;

    btn.addEventListener('click', async () => {
      const text = btn.dataset.copyText || btn.textContent.trim();

      try {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = 'Copied!';
      } catch (e) {
        if (status) status.textContent = 'Copy failed — select and copy manually.';
      }

      if (status) {
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          status.textContent = '';
        }, 2000);
      }
    });
  });
}
