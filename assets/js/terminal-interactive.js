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

    const GITHUB_URL = 'https://github.com/sherlocknots';
    const INSTAGRAM_URL = 'https://www.instagram.com/sh7eerx?stkn=Zjl4aHJkdjEwZzcx';

    // Commands that jump to a section further down the page, by id.
    const SECTIONS = {
        work: 'work',
        flasher: 'flasher',
        order: 'order',
        contact: 'contact',
        community: 'community',
    };

    function scrollToSection(id) {
        const el = document.getElementById(id);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
    }

    function openLink(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

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

        if (lowerCmd === '/help' || lowerCmd === 'help') {
            outputHtml = `
                <div class="nt-cmd-output">
                    <p class="nt-help-title">Available commands (click to run):</p>
                    <div>
                        <span class="nt-clickable-cmd" data-cmd="work">work</span>
                        <span class="nt-clickable-cmd" data-cmd="flasher">flasher</span>
                        <span class="nt-clickable-cmd" data-cmd="order">order</span>
                        <span class="nt-clickable-cmd" data-cmd="contact">contact</span>
                        <span class="nt-clickable-cmd" data-cmd="community">community</span>
                        <span class="nt-clickable-cmd" data-cmd="github">github</span>
                        <span class="nt-clickable-cmd" data-cmd="instagram">instagram</span>
                    </div>
                </div>
            `;
        } else if (lowerCmd === 'clear') {
            historyDiv.innerHTML = '';
            inputField.value = '';
            inputField.focus();
            return; // Stop here so we don't print empty output
        } else if (lowerCmd === 'github') {
            outputHtml = `<div class="nt-cmd-output nt-tone-ok">>> opening github.com/sherlocknots...</div>`;
            historyDiv.insertAdjacentHTML('beforeend', outputHtml);
            openLink(GITHUB_URL);
            inputField.value = '';
            terminal.scrollTop = terminal.scrollHeight;
            inputField.focus();
            return;
        } else if (lowerCmd === 'instagram') {
            outputHtml = `<div class="nt-cmd-output nt-tone-ok">>> opening instagram...</div>`;
            historyDiv.insertAdjacentHTML('beforeend', outputHtml);
            openLink(INSTAGRAM_URL);
            inputField.value = '';
            terminal.scrollTop = terminal.scrollHeight;
            inputField.focus();
            return;
        } else if (SECTIONS[lowerCmd] && scrollToSection(SECTIONS[lowerCmd])) {
            outputHtml = `<div class="nt-cmd-output nt-tone-ok">>> jumping to ${SECTIONS[lowerCmd]}...</div>`;
        } else {
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
