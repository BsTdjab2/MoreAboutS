const termOverlay = document.getElementById('term-overlay');
const openTermBtn = document.getElementById('open-terminal');
const closeTermBtn = document.getElementById('close-terminal');
const termInput = document.getElementById('term-input');
const termOutput = document.getElementById('term-output');

// Bach t7el w tsd l'terminal
openTermBtn.addEventListener('click', () => {
  termOverlay.classList.add('show');
  termInput.focus();
});

closeTermBtn.addEventListener('click', () => {
  termOverlay.classList.remove('show');
});

// Bach ykhdmo les commandes mni twrek 3la "Enter"
termInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const cmd = this.value.trim();
    if (cmd) {
      runCmd(cmd);
    }
    this.value = '';
  }
});

// L'fonction li katjawb 3la les commandes
window.runCmd = function(cmd) {
  // Katkteb l'commande li dkhlti
  termOutput.innerHTML += `<div class="terminal-line-echo"><span class="terminal-prompt">$</span> <span class="typed">${cmd}</span></div>`;

  let response = '';
  switch(cmd.toLowerCase()) {
    case 'whoami':
      response = '<div class="terminal-line-ok">Badreddine Rguioui - Cybersecurity & Hardware Enthusiast</div>';
      break;
    case 'skills':
      response = '<div class="terminal-line-info">Kali Linux, Nmap, VMware, ESP32 (C++), Unity (C# Modding)</div>';
      break;
    case 'clear':
      termOutput.innerHTML = '';
      return;
    case 'help':
      response = '<div class="terminal-line-info">Available commands: whoami, skills, clear, help</div>';
      break;
    default:
      response = `<div class="terminal-line-err">bash: ${cmd}: command not found</div>`;
  }

  termOutput.innerHTML += response;
  // Bach tscroller lta7t automatiquement
  termOutput.scrollTop = termOutput.scrollHeight;
};
