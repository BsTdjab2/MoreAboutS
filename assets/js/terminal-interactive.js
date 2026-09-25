// Interactive Terminal widget.
// Moved out of an inline <script> into its own file so it complies with the
// site's `script-src 'self'` Content-Security-Policy (no inline scripts).
// Note: inline `onclick="..."` attributes are also blocked by that CSP, so
// clickable commands use a `data-cmd` attribute + event delegation instead.
(function () {
    const inputField = document.getElementById('nt-cmd-input');
    const historyDiv = document.getElementById('nt-history');
    const terminal = document.getElementById('nt-terminal');

    if (!inputField || !historyDiv || !terminal) return;

    function executeCommand(cmd) {
        cmd = cmd.trim();
        if (!cmd) return;

        // 1. Echo the command to the screen
        const echoHtml = `
            <div class="nt-prompt nt-cmd-echo">
                <span class="nt-prompt-user">Sherlock@Search</span>
                <span class="nt-prompt-symbol">:~$</span>
                <span>${cmd}</span>
            </div>
        `;
        historyDiv.insertAdjacentHTML('beforeend', echoHtml);

        // 2. Process the command
        let outputHtml = '';
        const lowerCmd = cmd.toLowerCase();

        switch (lowerCmd) {
            case '/help':
                outputHtml = `
                    <div class="nt-cmd-output">
                        <p class="nt-help-title">Available commands (Click to run):</p>
                        <div>
                            <span class="nt-clickable-cmd" data-cmd="work">work</span>
                            - View professional projects and experience
                        </div>
                        <div>
                            <span class="nt-clickable-cmd" data-cmd="flasher">flasher</span>
                            - Go to the universal firmware flasher tool
                        </div>
                        <div>
                            <span class="nt-clickable-cmd" data-cmd="community">community</span>
                            - Join our Discord / Community space
                        </div>
                        <div>
                            <span class="nt-clickable-cmd" data-cmd="clear">clear</span>
                            - Clear the terminal screen
                        </div>
                    </div>
                `;
                break;
            case 'work':
                outputHtml = `<div class="nt-cmd-output nt-tone-ok">>> Redirecting to Work section... (Loading portfolio data)</div>`;
                break;
            case 'flasher':
                outputHtml = `<div class="nt-cmd-output nt-tone-dev">>> Initializing Universal Flasher interface...</div>`;
                break;
            case 'community':
                outputHtml = `<div class="nt-cmd-output nt-tone-user">>> Opening Community links... (Discord / GitHub)</div>`;
                break;
            case 'clear':
                historyDiv.innerHTML = '';
                inputField.value = '';
                inputField.focus();
                return; // Stop here so we don't print empty output
            default:
                outputHtml = `<div class="nt-cmd-output nt-error-text">bash: ${cmd}: command not found. Type <span class="nt-clickable-cmd" data-cmd="/help">/help</span> for available commands.</div>`;
        }

        // 3. Print Output & Reset Input
        historyDiv.insertAdjacentHTML('beforeend', outputHtml);
        inputField.value = '';

        // 4. Scroll to bottom
        terminal.scrollTop = terminal.scrollHeight;
        inputField.focus();
    }

    // Clicking anywhere in the terminal focuses the input, unless a
    // clickable command span (data-cmd) was clicked — then run it.
    terminal.addEventListener('click', (e) => {
        const cmdEl = e.target.closest('[data-cmd]');
        if (cmdEl) {
            executeCommand(cmdEl.getAttribute('data-cmd'));
            return;
        }
        inputField.focus();
    });

    // Listen for "Enter" key on the input field
    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            executeCommand(this.value);
        }
    });
})();
