document.addEventListener("DOMContentLoaded", function() {
    const termInput = document.getElementById("term-input");
    const terminalBody = id("terminal-body");
    const dynamicOutput = id("dynamic-output");

    function id(elementId) {
        return document.getElementById(elementId);
    }

    // Auto-focus terminal input on clicking anywhere in terminal
    if (terminalBody) {
        terminalBody.addEventListener("click", function() {
            termInput.focus();
        });
    }

    // Terminal Command Logic
    termInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            const rawCommand = termInput.value;
            const command = rawCommand.trim().toLowerCase();

            if (command === "") return;

            // Log command to dynamic terminal history
            appendCommandLog(rawCommand);

            // Command switch
            switch (command) {
                case "help":
                    appendOutput(`
                        <div style="color: #c084fc; margin: 6px 0;">Available Commands:</div>
                        <div> - <b style="color: #fff;">home</b> : Scroll to top / home section</div>
                        <div> - <b style="color: #fff;">projects</b> : Scroll to projects</div>
                        <div> - <b style="color: #fff;">contact</b> : Scroll to contact section</div>
                        <div> - <b style="color: #fff;">whoami</b> : Show author active status</div>
                        <div> - <b style="color: #fff;">clear</b> : Clear dynamic terminal logs</div>
                    `);
                    break;

                case "home":
                    window.location.hash = "#home";
                    appendOutput("<span style='color: #4ade80;'>Navigating to Home...</span>");
                    break;

                case "projects":
                    window.location.hash = "#projects";
                    appendOutput("<span style='color: #4ade80;'>Navigating to Projects...</span>");
                    break;

                case "contact":
                    window.location.hash = "#contact";
                    appendOutput("<span style='color: #4ade80;'>Navigating to Contact...</span>");
                    break;

                case "whoami":
                    appendOutput("<span style='color: #c084fc;'>lxveace</span> - Developer, Cyberdeck Enthusiast & Hardware Builder.");
                    break;

                case "clear":
                    dynamicOutput.innerHTML = "";
                    break;

                default:
                    appendOutput(`<span style="color: #ef4444;">Command not found: "${command}". Type <b style="color: #fff;">help</b> for commands.</span>`);
                    break;
            }

            termInput.value = "";
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
    });

    function appendCommandLog(cmd) {
        const line = document.createElement("div");
        line.className = "terminal-line";
        line.style.marginTop = "8px";
        line.innerHTML = `<span class="term-user">lxveace</span><span class="term-host">@field</span><span class="term-path"> :~$ </span><span style="color: #fff;">${escapeHtml(cmd)}</span>`;
        dynamicOutput.appendChild(line);
    }

    function appendOutput(htmlContent) {
        const outContainer = document.createElement("div");
        outContainer.style.margin = "6px 0 12px 0";
        outContainer.innerHTML = htmlContent;
        dynamicOutput.appendChild(outContainer);
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
});
