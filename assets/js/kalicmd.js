/* Kali CMD tool: clicking the secondary command line copies it to the
   clipboard and shows a brief "Copied!" confirmation next to it. */

export function initKaliCmd() {
  const btn = document.getElementById('kaliCopyBtn');
  const status = document.getElementById('kaliCopyStatus');
  if (!btn) return;

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
}
