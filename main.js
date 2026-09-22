document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById('sys-progress');
  const sysConsole = document.getElementById('sys-console');

  // Animation sghira dyal loading
  setTimeout(() => {
    progressBar.style.width = '30%';
    sysConsole.innerHTML += '<p class="line-muted">Loading network modules...</p>';
    sysConsole.scrollTop = sysConsole.scrollHeight;
  }, 500);

  setTimeout(() => {
    progressBar.style.width = '70%';
    sysConsole.innerHTML += '<p class="line-muted">Mounting ESP32 storage interfaces...</p>';
    sysConsole.scrollTop = sysConsole.scrollHeight;
  }, 1200);

  setTimeout(() => {
    progressBar.style.width = '100%';
    sysConsole.innerHTML += '<p class="line-ok">[OK] All systems operational. Welcome.</p>';
    sysConsole.scrollTop = sysConsole.scrollHeight;
  }, 2000);
});
