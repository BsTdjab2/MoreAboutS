import { MAX_ATTACHMENT_BYTES } from './config.js';
import { setStatus, setButtonBusy, formatBytes } from './ui.js';
import { md5 } from './md5.js';
import { CHIP_NAMES, chipMatches, parseOffset, manifestOffset, toHex } from './hardware.js';

const ESPTOOL_MODULE = '../vendor/esptool-js/bundle.js';
const FIRMWARE_MANIFEST = 'assets/data/firmware.json';
const MAX_CONSOLE_LINES = 400;

const session = {
  transport: null,
  loader: null,
  chipName: null,
  busy: false,
};

let catalogue = [];

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

/* esptool-js writes progress with bare \r and \b sequences meant for a real
   terminal. Collapsing them into one trailing line keeps the log readable. */
function makeTerminal(consoleEl) {
  let pending = '';

  function flush(kind) {
    if (!pending) return;
    logLine(consoleEl, pending, kind);
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
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

function readFileAsBinaryString(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(bufferToBinaryString(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsArrayBuffer(file);
  });
}

async function loadCatalogue(firmwareSelect, hint, chipSelect) {
  try {
    const response = await fetch(FIRMWARE_MANIFEST, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    const data = await response.json();
    catalogue = Array.isArray(data.firmware) ? data.firmware : [];
  } catch (error) {
    catalogue = [];
    hint.textContent = 'Firmware list could not be loaded. You can still flash your own .bin below.';
    return;
  }
  renderFirmwareOptions(firmwareSelect, hint, chipSelect.value);
}

function renderFirmwareOptions(firmwareSelect, hint, chip) {
  const previous = firmwareSelect.value;
  firmwareSelect.textContent = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a firmware...';
  firmwareSelect.appendChild(placeholder);

  let available = 0;
  let unconfigured = 0;

  catalogue.forEach((entry) => {
    const build = (entry.builds || []).find((b) => b.chip === chip);
    if (!build) return;

    const option = document.createElement('option');
    option.value = `${entry.id}:${chip}`;

    if (build.url) {
      option.textContent = entry.name;
      available += 1;
    } else {
      option.textContent = `${entry.name} (no build linked yet)`;
      option.disabled = true;
      unconfigured += 1;
    }
    firmwareSelect.appendChild(option);
  });

  if (Array.from(firmwareSelect.options).some((o) => o.value === previous)) {
    firmwareSelect.value = previous;
  }

  if (!available && !unconfigured) {
    hint.textContent = 'No firmware listed for this chip yet. Use your own .bin below.';
  } else if (!available) {
    hint.textContent = 'No download links are set for this chip yet. Use your own .bin below.';
  } else {
    hint.textContent = 'Pick a firmware, or use your own .bin below.';
  }
}

function findBuild(value) {
  const [id, chip] = value.split(':');
  const entry = catalogue.find((e) => e.id === id);
  if (!entry) return null;
  const build = (entry.builds || []).find((b) => b.chip === chip);
  return build ? { entry, build } : null;
}

export function initFlasher() {
  const consoleEl = el('flashConsole');
  const connectBtn = el('connectBtn');
  const flashBtn = el('flashBtn');
  const disconnectBtn = el('disconnectBtn');
  if (!consoleEl || !connectBtn || !flashBtn || !disconnectBtn) return;

  const chipSelect = el('chip');
  const firmwareSelect = el('firmware');
  const firmwareHint = el('firmwareHint');
  const binFile = el('binFile');
  const offsetField = el('flashOffset');
  const baudSelect = el('baud');
  const eraseBox = el('eraseFlash');
  const status = el('flashStatus');
  const progress = el('flashProgress');
  const progressBar = el('flashProgressBar');
  const unsupported = el('serialUnsupported');

  const terminal = makeTerminal(consoleEl);

  if (!navigator.serial || !window.isSecureContext) {
    unsupported.hidden = false;
    if (!window.isSecureContext) {
      const reason = document.getElementById('serialUnsupportedReason');
      if (reason) {
        reason.textContent =
          'The flasher only runs over HTTPS, or on localhost. Open the site on its https:// address.';
      }
    }
    connectBtn.disabled = true;
    flashBtn.disabled = true;
    terminal.note('Web Serial unavailable in this browser.');
    return;
  }

  connectBtn.disabled = false;
  consoleEl.textContent = '';
  terminal.note('Ready. Plug in your board and hit Connect device.');

  loadCatalogue(firmwareSelect, firmwareHint, chipSelect).catch(() => {
    firmwareHint.textContent = 'Firmware list could not be loaded. You can still flash your own .bin below.';
  });
  chipSelect.addEventListener('change', () => {
    renderFirmwareOptions(firmwareSelect, firmwareHint, chipSelect.value);
    if (session.chipName) verifyChipMatch({ silent: true });
    updateFlashButton();
  });

  firmwareSelect.addEventListener('change', () => {
    if (firmwareSelect.value && binFile.files.length) {
      binFile.value = '';
      terminal.note('Cleared your uploaded .bin: the firmware list takes priority.');
    }
    updateFlashButton();
  });

  binFile.addEventListener('change', () => {
    const file = binFile.files[0];
    if (file) {
      firmwareSelect.value = '';
      if (file.size > MAX_ATTACHMENT_BYTES * 4) {
        terminal.note(`${file.name} is ${formatBytes(file.size)}. Large images take a while.`);
      } else {
        terminal.note(`Using ${file.name} (${formatBytes(file.size)}).`);
      }
    }
    updateFlashButton();
  });

  function hasSource() {
    return Boolean(firmwareSelect.value || binFile.files.length);
  }

  function updateFlashButton() {
    flashBtn.disabled = session.busy || !session.loader || !hasSource();
  }

  function verifyChipMatch({ silent } = {}) {
    const expected = CHIP_NAMES[chipSelect.value];
    if (!expected || !session.chipName) return true;

    const matches = chipMatches(chipSelect.value, session.chipName);
    if (!matches && !silent) {
      setStatus(
        status,
        'error',
        `You picked ${expected} but this board is an ${session.chipName}. Change the ESP32 family selector to match, or you will brick the board.`,
      );
    }
    if (!matches && silent) {
      terminal.error(`Selected ${expected}, connected board is ${session.chipName}.`);
    }
    return matches;
  }

  connectBtn.addEventListener('click', async () => {
    if (session.loader) return;

    setStatus(status, 'info', '');
    setButtonBusy(connectBtn, true, 'Connecting...');

    let device;
    try {
      device = await navigator.serial.requestPort();
    } catch (error) {
      setButtonBusy(connectBtn, false);
      setStatus(status, 'info', 'No port picked.');
      return;
    }

    try {
      const { ESPLoader, Transport } = await import(ESPTOOL_MODULE);
      session.transport = new Transport(device);
      session.loader = new ESPLoader({
        transport: session.transport,
        baudrate: Number(baudSelect.value),
        romBaudrate: 115200,
        terminal,
      });

      const description = await session.loader.main();
      session.chipName = session.loader.chip && session.loader.chip.CHIP_NAME
        ? session.loader.chip.CHIP_NAME
        : description;

      terminal.ok(`Connected to ${description}.`);
      setStatus(status, 'ok', `Connected: ${session.chipName}.`);

      connectBtn.hidden = true;
      disconnectBtn.hidden = false;
      verifyChipMatch({ silent: true });
    } catch (error) {
      await teardown();
      terminal.error(String(error && error.message ? error.message : error));
      setStatus(
        status,
        'error',
        'Could not talk to the board. Hold BOOT (IO0/FLASH), tap EN/RST, keep holding BOOT, then hit Connect again. A data-capable USB cable and a closed serial monitor also matter.',
      );
    } finally {
      setButtonBusy(connectBtn, false);
      updateFlashButton();
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    await teardown();
    setStatus(status, 'info', 'Disconnected.');
    terminal.note('Disconnected.');
  });

  async function teardown() {
    if (session.transport) {
      try {
        await session.transport.disconnect();
      } catch (error) {
        /* the port may already be gone; nothing useful to do */
      }
    }
    session.transport = null;
    session.loader = null;
    session.chipName = null;
    connectBtn.hidden = false;
    disconnectBtn.hidden = true;
    updateFlashButton();
  }

  async function resolveImage() {
    const file = binFile.files[0];
    if (file) {
      const offset = parseOffset(offsetField.value);
      terminal.note(`Reading ${file.name}...`);
      return { data: await readFileAsBinaryString(file), address: offset, label: file.name };
    }

    const found = findBuild(firmwareSelect.value);
    if (!found) throw new Error('That firmware is not available. Pick another or upload a .bin.');
    if (!found.build.url) throw new Error(`${found.entry.name} has no download link configured yet.`);

    terminal.note(`Downloading ${found.entry.name}...`);
    const response = await fetch(found.build.url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Firmware download failed (HTTP ${response.status}).`);

    const buffer = await response.arrayBuffer();
    if (found.build.sha256) {
      const digest = toHex(await crypto.subtle.digest('SHA-256', buffer));
      if (digest.toLowerCase() !== String(found.build.sha256).toLowerCase()) {
        throw new Error(
          `${found.entry.name} failed its checksum. The download does not match what the site expects, so it was not written.`,
        );
      }
      terminal.ok('Checksum verified.');
    } else {
      terminal.note('This build has no checksum in the manifest, so the download could not be verified.');
    }

    return {
      data: bufferToBinaryString(buffer),
      address: manifestOffset(found.build.offset, found.entry.name),
      label: `${found.entry.name} (${formatBytes(buffer.byteLength)})`,
    };
  }

  flashBtn.addEventListener('click', async () => {
    if (!session.loader || session.busy) return;
    if (!verifyChipMatch()) return;

    session.busy = true;
    setButtonBusy(flashBtn, true, 'Flashing...');
    connectBtn.disabled = true;
    disconnectBtn.disabled = true;
    progress.hidden = false;
    progressBar.style.width = '0%';
    setStatus(status, 'info', 'Flashing. Leave the board plugged in.');

    try {
      const image = await resolveImage();
      if (!image.data.length) throw new Error('That firmware file is empty.');

      terminal.note(
        `Writing ${image.label} at 0x${image.address.toString(16)}${eraseBox.checked ? ' after a full erase' : ''}.`,
      );

      await session.loader.writeFlash({
        fileArray: [{ data: image.data, address: image.address }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: eraseBox.checked,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const percent = total ? Math.round((written / total) * 100) : 0;
          progressBar.style.width = `${percent}%`;
        },
        calculateMD5Hash: (image_) => md5(image_),
      });

      progressBar.style.width = '100%';
      terminal.ok('Write complete and verified. Resetting the board.');
      await session.loader.after('hard_reset');
      setStatus(status, 'ok', 'Done. The board has been reset and is running the new firmware.');
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      terminal.error(message);
      setStatus(
        status,
        'error',
        `${message} If it stopped partway, drop the baud rate to 115200 under Advanced, hold BOOT while reconnecting, and flash again.`,
      );
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
