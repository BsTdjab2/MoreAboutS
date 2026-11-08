import { setStatus, setButtonBusy, formatBytes } from './ui.js';
import { md5 } from './md5.js';
import { CHIP_NAMES, chipMatches, flashReadinessReason, manifestOffset, parseFlashSizeMB, toHex, validateEsp32FirmwareFile } from './hardware.js';

const ESPTOOL_MODULE = '../vendor/esptool-js/bundle.js';
const FIRMWARE_MANIFEST = 'assets/data/firmware.json';
const APPROVED_FIRMWARE_PATH = 'assets/firmware/ESP32_GENERIC-20260824-v1.29.0.bin';
const OFFICIAL_FIRMWARE_DOWNLOAD = 'https://www.micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin';
const MAX_FIRMWARE_BYTES = 4 * 1024 * 1024;
const MAX_CONSOLE_LINES = 400;

const session = {
  transport: null,
  loader: null,
  chipName: null,
  flashSizeMB: null,
  flashSizeLabel: null,
  busy: false,
};

let catalogue = [];
let manualFirmware = null;

function el(id) {
  return document.getElementById(id);
}

function logLine(consoleEl, text, kind) {
  const line = document.createElement('p');
  if (kind) line.className = `line-${kind}`;
  line.textContent = text;
  consoleEl.appendChild(line);

  while (consoleEl.childElementCount > MAX_CONSOLE_LINES) {
    consoleEl.removeChild(consoleEl.firstElementChild);
  }
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/* esptool-js writes progress with terminal-style carriage returns and
   backspaces. Keep the browser log readable and bound its memory use. */
function makeTerminal(consoleEl) {
  let pending = '';

  function flush(kind) {
    if (!pending) return;
    logLine(consoleEl, pending.replace(/[\r\b]/g, ''), kind);
    pending = '';
  }

  return {
    clean() {
      consoleEl.textContent = '';
      pending = '';
    },
    writeLine(data) {
      pending += data;
      flush();
    },
    write(data) {
      pending += data;
      const parts = pending.split(/\r?\n/);
      pending = parts.pop();
      parts.forEach((part) => logLine(consoleEl, part.replace(/[\r\b]/g, ''), null));
      if (pending.length > 160) flush();
    },
    error(message) {
      flush();
      logLine(consoleEl, message, 'err');
    },
    ok(message) {
      flush();
      logLine(consoleEl, message, 'ok');
    },
    note(message) {
      flush();
      logLine(consoleEl, message, 'muted');
    },
  };
}

function bufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let output = '';
  for (let index = 0; index < bytes.length; index += chunk) {
    output += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return output;
}

function approvedFirmwareUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl !== APPROVED_FIRMWARE_PATH) return false;
  try {
    const parsed = new URL(rawUrl, window.location.href);
    const expected = new URL(APPROVED_FIRMWARE_PATH, window.location.href);
    return parsed.origin === window.location.origin
      && parsed.pathname === expected.pathname
      && !parsed.search
      && !parsed.hash;
  } catch (error) {
    return false;
  }
}

async function loadCatalogue(firmwareSelect, hint, sourceLink, downloadLink) {
  const response = await fetch(FIRMWARE_MANIFEST, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Firmware catalogue returned HTTP ${response.status}.`);

  const data = await response.json();
  const entries = Array.isArray(data.firmware) ? data.firmware : [];
  const candidate = entries.length === 1 ? entries[0] : null;
  catalogue = candidate
    && candidate.id === 'micropython-esp32-generic'
    && candidate.chip === 'esp32'
    && candidate.url === APPROVED_FIRMWARE_PATH
    && candidate.downloadUrl === OFFICIAL_FIRMWARE_DOWNLOAD
    && candidate.version === 'v1.29.0'
    && candidate.offset === '0x1000'
    ? [candidate]
    : [];

  firmwareSelect.textContent = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select firmware...';
  firmwareSelect.appendChild(placeholder);

  catalogue.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.name;
    firmwareSelect.appendChild(option);
  });

  sourceLink.href = 'https://www.micropython.org/download/ESP32_GENERIC/';
  sourceLink.hidden = false;
  downloadLink.href = OFFICIAL_FIRMWARE_DOWNLOAD;
  downloadLink.hidden = false;

  if (!catalogue.length) {
    hint.textContent = 'The reviewed firmware catalogue could not be validated. Flashing is disabled.';
    sourceLink.hidden = true;
    downloadLink.hidden = true;
    throw new Error('The firmware catalogue does not match the pinned official MicroPython release.');
  }

  hint.textContent = 'Official MicroPython v1.29.0 for standard dual-core ESP32 boards with at least 4 MiB flash. If the site-hosted copy is missing, download the official .bin and select it below.';
}

function findFirmware(id) {
  return catalogue.find((entry) => entry.id === id) || null;
}

export function initFlasher() {
  const consoleEl = el('flashConsole');
  const connectBtn = el('connectBtn');
  const flashBtn = el('flashBtn');
  const disconnectBtn = el('disconnectBtn');
  if (!consoleEl || !connectBtn || !flashBtn || !disconnectBtn) return;

  const firmwareSelect = el('firmware');
  const firmwareHint = el('firmwareHint');
  const firmwareSource = el('firmwareSource');
  const firmwareDownload = el('firmwareDownload');
  const firmwareFileInput = el('firmwareFile');
  const firmwareFileStatus = el('firmwareFileStatus');
  const manualSourceConfirm = el('manualSourceConfirm');
  const radioProfile = el('radioProfile');
  const eraseBox = el('eraseFlash');
  const confirmBox = el('flashConfirm');
  const boardConfirmBox = el('boardCompatibilityConfirm');
  const status = el('flashStatus');
  const progress = el('flashProgress');
  const progressBar = el('flashProgressBar');
  const progressTrack = el('flashProgressTrack');
  const progressLabel = el('flashProgressLabel');
  const unsupported = el('serialUnsupported');
  const chipDetected = el('chipDetected');
  const disclaimerDialog = el('flashDisclaimerDialog');
  const disclaimerOpen = el('flashDisclaimerOpen');
  const disclaimerClose = el('flashDisclaimerClose');

  const terminal = makeTerminal(consoleEl);
  let catalogueLoading = true;
  let catalogueFailed = false;

  if (disclaimerOpen && disclaimerDialog) {
    disclaimerOpen.addEventListener('click', () => disclaimerDialog.showModal());
  }
  if (disclaimerClose && disclaimerDialog) {
    disclaimerClose.addEventListener('click', () => disclaimerDialog.close());
  }
  if (disclaimerDialog) {
    disclaimerDialog.addEventListener('click', (event) => {
      if (event.target === disclaimerDialog) disclaimerDialog.close();
    });
  }

  function selectedFirmware() {
    return findFirmware(firmwareSelect.value);
  }

  function chipMatchesFirmware(entry) {
    return Boolean(entry && session.chipName && chipMatches(entry.chip, session.chipName)
      && session.flashSizeMB !== null && session.flashSizeMB >= 4);
  }

  function hasFirmwarePayload(entry) {
    return Boolean(manualFirmware || (entry && /^[a-f0-9]{64}$/i.test(String(entry.sha256 || ''))));
  }

  function updateFlashButton() {
    // Keep this control clickable while the installer is not ready so a click
    // can explain the next required step. The click handler repeats every
    // hardware and consent check before any bytes can be written.
    flashBtn.disabled = session.busy;
    flashBtn.setAttribute('aria-disabled', String(session.busy));
    flashBtn.setAttribute('aria-describedby', 'flashStatus');
  }

  if (!navigator.serial || !window.isSecureContext) {
    unsupported.hidden = false;
    if (!window.isSecureContext) {
      const reason = el('serialUnsupportedReason');
      if (reason) reason.textContent = 'Browser flashing requires HTTPS or localhost. Open this site using its https:// address.';
    }
    connectBtn.disabled = true;
    terminal.note('Web Serial is unavailable in this browser or page context. Use a current desktop version of Chrome or Edge over HTTPS. The Flash button remains available to explain what is missing.');
  } else {
    connectBtn.disabled = false;
    terminal.note('Ready. Choose your attached hardware profile, connect the ESP32 over USB, and select an approved firmware.');
  }

  loadCatalogue(firmwareSelect, firmwareHint, firmwareSource, firmwareDownload).then(() => {
    catalogueLoading = false;
    catalogueFailed = false;
    updateFlashButton();
  }).catch((error) => {
    catalogueLoading = false;
    catalogueFailed = true;
    firmwareSelect.textContent = '';
    const unavailable = document.createElement('option');
    unavailable.value = '';
    unavailable.textContent = 'Firmware catalogue unavailable';
    firmwareSelect.appendChild(unavailable);
    firmwareHint.textContent = 'The firmware catalogue could not be loaded. No firmware can be flashed until the approved catalogue is available.';
    firmwareSource.hidden = true;
    firmwareDownload.hidden = true;
    terminal.error(error.message);
    setStatus(status, 'error', 'The approved firmware list could not be loaded. Refresh the page and check your connection.');
    updateFlashButton();
  });

  firmwareFileInput.addEventListener('change', async () => {
    manualFirmware = null;
    manualSourceConfirm.checked = false;
    updateFlashButton();

    const file = firmwareFileInput.files && firmwareFileInput.files[0];
    if (!file) {
      firmwareFileStatus.textContent = 'Step 1: download the official .bin above. Step 2: select that same file here. Only the pinned release filename and a valid ESP image header are accepted; the file stays in your browser.';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      validateEsp32FirmwareFile(file.name, file.size, bytes.subarray(0, 2));
      const digest = toHex(await crypto.subtle.digest('SHA-256', buffer));
      manualFirmware = { file, buffer, sha256: digest };
      firmwareFileStatus.textContent = `File checks passed · ${formatBytes(file.size)} · SHA-256 ${digest}. This fingerprint does not prove publisher authenticity or scan for malware.`;
      terminal.ok(`Local firmware file passed basic ESP image checks. SHA-256: ${digest}`);
      setStatus(status, 'info', 'Firmware file loaded. Confirm that it came directly from the official MicroPython source before flashing.');
    } catch (error) {
      manualFirmware = null;
      firmwareFileStatus.textContent = error.message;
      setStatus(status, 'error', error.message);
      terminal.error(error.message);
    }
    updateFlashButton();
  });

  manualSourceConfirm.addEventListener('change', updateFlashButton);

  firmwareSelect.addEventListener('change', () => {
    const entry = selectedFirmware();
    confirmBox.checked = false;
    if (entry && session.chipName && !chipMatches(entry.chip, session.chipName)) {
      setStatus(status, 'error', `${entry.name} is for ${CHIP_NAMES[entry.chip]}, but this board reports ${session.chipName}. Flashing is blocked.`);
    } else if (entry && session.chipName && (session.flashSizeMB === null || session.flashSizeMB < 4)) {
      setStatus(status, 'error', 'The board must have at least 4 MB of identified flash. Flashing is blocked.');
    } else {
      setStatus(status, 'info', entry
        ? (session.loader ? 'Firmware selected. Review the confirmation box to enable flashing.' : 'Firmware selected. Connect a matching ESP32 to continue.')
        : 'Select an approved firmware.');
    }
    updateFlashButton();
  });

  radioProfile.addEventListener('change', () => {
    const label = radioProfile.options[radioProfile.selectedIndex]?.textContent || 'Hardware profile';
    terminal.note(`Hardware profile selected: ${label}. This does not alter the firmware or enable radio transmission.`);
  });

  confirmBox.addEventListener('change', updateFlashButton);
  boardConfirmBox.addEventListener('change', updateFlashButton);

  connectBtn.addEventListener('click', async () => {
    if (session.loader || connectBtn.disabled) return;

    setStatus(status, 'info', 'Choose the serial port for your ESP32.');
    setButtonBusy(connectBtn, true, 'Connecting...');

    let device;
    try {
      device = await navigator.serial.requestPort();
    } catch (error) {
      setButtonBusy(connectBtn, false);
      setStatus(status, 'info', 'No serial port selected.');
      return;
    }

    try {
      const { ESPLoader, Transport } = await import(ESPTOOL_MODULE);
      session.transport = new Transport(device);
      session.loader = new ESPLoader({
        transport: session.transport,
        baudrate: 115200,
        romBaudrate: 115200,
        terminal,
      });

      const description = await session.loader.main();
      session.chipName = session.loader.chip && session.loader.chip.CHIP_NAME
        ? session.loader.chip.CHIP_NAME
        : description;

      try {
        const flashId = await session.loader.readFlashId();
        const sizeCode = (flashId >>> 16) & 0xff;
        session.flashSizeLabel = session.loader.DETECTED_FLASH_SIZES?.[sizeCode] || null;
        session.flashSizeMB = parseFlashSizeMB(session.flashSizeLabel);
        if (session.flashSizeLabel) terminal.ok(`Detected flash capacity: ${session.flashSizeLabel}.`);
        else terminal.note('Flash capacity could not be identified. Firmware writing will remain disabled.');
      } catch (error) {
        session.flashSizeLabel = null;
        session.flashSizeMB = null;
        terminal.note('Flash capacity could not be identified. Firmware writing will remain disabled.');
      }

      chipDetected.textContent = `${session.chipName || description} · ${session.flashSizeLabel || 'flash size unknown'}`;
      terminal.ok(`Connected. Detected chip: ${session.chipName}.`);
      connectBtn.hidden = true;
      disconnectBtn.hidden = false;

      const entry = selectedFirmware();
      if (entry && !chipMatches(entry.chip, session.chipName)) {
        setStatus(status, 'error', `Detected ${session.chipName}; the selected firmware is only for ${CHIP_NAMES[entry.chip]}.`);
      } else if (session.flashSizeMB === null || session.flashSizeMB < 4) {
        setStatus(status, 'error', 'Connected, but a flash capacity of at least 4 MB could not be confirmed. Firmware writing is blocked for safety.');
      } else {
        setStatus(status, 'ok', `Connected: ${session.chipName}, ${session.flashSizeLabel} flash.`);
      }
    } catch (error) {
      await teardown();
      terminal.error(String(error?.message || error));
      setStatus(status, 'error', 'Could not identify the board. Try a data-capable USB cable, close other serial-monitor apps, then hold BOOT, tap EN/RST, and reconnect.');
    } finally {
      setButtonBusy(connectBtn, false);
      updateFlashButton();
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    await teardown();
    setStatus(status, 'info', 'Disconnected.');
    terminal.note('Disconnected from the ESP32.');
  });

  async function teardown() {
    if (session.transport) {
      try {
        await session.transport.disconnect();
      } catch (error) {
        /* The USB device may already have been unplugged. */
      }
    }
    session.transport = null;
    session.loader = null;
    session.chipName = null;
    session.flashSizeMB = null;
    session.flashSizeLabel = null;
    chipDetected.textContent = 'Not connected';
    connectBtn.hidden = false;
    disconnectBtn.hidden = true;
    updateFlashButton();
  }

  async function resolveImage(entry) {
    if (manualFirmware) {
      if (!manualSourceConfirm.checked) {
        throw new Error('Confirm that the selected file was downloaded directly from the official MicroPython source.');
      }
      const buffer = manualFirmware.buffer;
      const digest = toHex(await crypto.subtle.digest('SHA-256', buffer));
      if (entry.sha256 && digest.toLowerCase() !== String(entry.sha256).toLowerCase()) {
        throw new Error('The selected firmware SHA-256 does not match the deployment manifest. Nothing was written.');
      }
      terminal.note(`Using the locally selected official-named firmware. SHA-256 fingerprint: ${digest}.`);
      return {
        data: bufferToBinaryString(buffer),
        address: manifestOffset(entry.offset, entry.name),
        label: `${entry.name} (${formatBytes(buffer.byteLength)})`,
      };
    }

    if (!approvedFirmwareUrl(entry.url)) {
      throw new Error('The staged firmware URL is not on the approved same-origin allowlist. Nothing was written.');
    }
    if (!/^[a-f0-9]{64}$/i.test(String(entry.sha256 || ''))) {
      throw new Error('The hosted firmware file is not available with a verified digest. Download the official .bin above and select it in the file picker. No data was written.');
    }

    terminal.note(`Loading ${entry.name} from this site...`);
    let response;
    try {
      response = await fetch(entry.url, { cache: 'no-cache', credentials: 'omit' });
    } catch (error) {
      throw new Error('The site-hosted firmware file could not be loaded. Download the official .bin above and select it in the file picker. No data was written.');
    }
    if (!response.ok) throw new Error(`Firmware download failed (HTTP ${response.status}).`);

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('The firmware download was empty.');
    if (buffer.byteLength > MAX_FIRMWARE_BYTES) throw new Error('The firmware is larger than the 4 MiB safety limit.');
    const bytes = new Uint8Array(buffer);
    if (bytes[0] !== 0xe9 || bytes[1] < 1 || bytes[1] > 16) throw new Error('The staged file does not have a valid ESP image header. Nothing was written.');

    const digest = toHex(await crypto.subtle.digest('SHA-256', buffer));
    if (digest.toLowerCase() !== String(entry.sha256).toLowerCase()) {
      throw new Error('The firmware SHA-256 does not match the deployment manifest. Nothing was written.');
    }
    terminal.ok(`SHA-256 verified: ${digest}`);

    return {
      data: bufferToBinaryString(buffer),
      address: manifestOffset(entry.offset, entry.name),
      label: `${entry.name} (${formatBytes(buffer.byteLength)})`,
    };
  }

  eraseBox.addEventListener('change', () => {
    if (eraseBox.checked) {
      setStatus(status, 'info', 'Full erase is enabled. Existing firmware and all stored data will be deleted before writing.');
    }
  });

  flashBtn.addEventListener('click', async () => {
    const entry = selectedFirmware();
    const readinessMessage = flashReadinessReason({
      serialAvailable: Boolean(navigator.serial && window.isSecureContext),
      catalogueLoading,
      catalogueFailed,
      firmwareSelected: Boolean(entry),
      payloadAvailable: hasFirmwarePayload(entry),
      manualNeedsConfirmation: Boolean(manualFirmware && !manualSourceConfirm.checked),
      connected: Boolean(session.loader),
      chipCompatible: Boolean(entry && session.chipName && chipMatches(entry.chip, session.chipName)),
      flashSizeMB: session.flashSizeMB,
      ownerConfirmed: confirmBox.checked,
      boardConfirmed: boardConfirmBox.checked,
      busy: session.busy,
    });
    if (readinessMessage) {
      setStatus(status, 'info', readinessMessage);
      terminal.note(`Flash not started: ${readinessMessage}`);
      status.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const eraseMessage = eraseBox.checked
      ? 'This will erase all existing firmware and stored data before installing MicroPython. Continue?'
      : 'This will replace firmware at the selected address. Continue?';
    if (!window.confirm(eraseMessage)) return;

    session.busy = true;
    setButtonBusy(flashBtn, true, 'Flashing...');
    connectBtn.disabled = true;
    disconnectBtn.disabled = true;
    progress.hidden = false;
    progressBar.style.width = '0%';
    progressTrack.setAttribute('aria-valuenow', '0');
    progressLabel.textContent = 'Preparing firmware...';
    setStatus(status, 'info', manualFirmware ? 'Checking the selected firmware file. Keep the board connected.' : 'Preparing the firmware download. Keep the board connected.');

    try {
      const image = await resolveImage(entry);
      terminal.note(`Writing ${image.label} at 0x${image.address.toString(16)}${eraseBox.checked ? ' after a full erase' : ''}.`);
      setStatus(status, 'info', 'Flashing firmware. Do not unplug the ESP32.');

      await session.loader.writeFlash({
        fileArray: [{ data: image.data, address: image.address }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: eraseBox.checked,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const percent = total ? Math.min(100, Math.round((written / total) * 100)) : 0;
          progressBar.style.width = `${percent}%`;
          progressTrack.setAttribute('aria-valuenow', String(percent));
          progressLabel.textContent = `${percent}%`;
        },
        calculateMD5Hash: (image_) => md5(image_),
      });

      progressBar.style.width = '100%';
      progressTrack.setAttribute('aria-valuenow', '100');
      progressLabel.textContent = '100%';
      terminal.ok('Flash write complete and transfer verification passed. Resetting the board.');
      await session.loader.after('hard_reset');
      setStatus(status, 'ok', 'MicroPython installation finished. The ESP32 has been reset.');
    } catch (error) {
      const message = String(error?.message || error);
      terminal.error(message);
      setStatus(status, 'error', `${message} Keep the board connected. If connection fails, use a data-capable USB cable and hold BOOT while reconnecting.`);
      progress.hidden = true;
    } finally {
      session.busy = false;
      setButtonBusy(flashBtn, false);
      connectBtn.disabled = false;
      disconnectBtn.disabled = false;
      updateFlashButton();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!session.busy) return;
    event.preventDefault();
    event.returnValue = '';
  });
}
