/* Guard the public firmware catalogue: only the reviewed, non-disruptive
 * MicroPython build for classic ESP32 may be offered by this page. */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { manifestOffset } from '../assets/js/hardware.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'assets/data/firmware.json'), 'utf8'));
const source = await readFile(join(root, 'assets/js/flasher.js'), 'utf8');
const fetcher = await readFile(join(root, 'tools/fetch-firmware.mjs'), 'utf8');
const homepage = await readFile(join(root, 'index.html'), 'utf8');
const flasherPage = await readFile(join(root, 'flasher.html'), 'utf8');

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

check(Array.isArray(manifest.firmware), 'firmware catalogue must be an array');
check(manifest.firmware.length === 1, 'only one reviewed firmware entry should be public');

const entry = manifest.firmware[0];
if (entry) {
  check(entry.id === 'micropython-esp32-generic', 'only the approved MicroPython entry may be listed');
  check(entry.chip === 'esp32', 'the approved image must target classic ESP32 only');
  check(entry.version === 'v1.29.0', 'the firmware version must stay pinned');
  check(entry.url === 'assets/firmware/ESP32_GENERIC-20260824-v1.29.0.bin', 'browser firmware URL must be the exact same-origin staged asset');
  check(entry.downloadUrl === 'https://www.micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin', 'manual download must point to the exact official versioned binary');
  check(manifestOffset(entry.offset, entry.name) === 0x1000, 'MicroPython image must use its documented 0x1000 address');
  check(!entry.release, 'floating latest-release downloads must not be enabled');
}

const lowerManifest = JSON.stringify(manifest).toLowerCase();
for (const term of ['jammer', 'deauther', 'marauder', 'wardriver', 'bruce']) {
  check(!lowerManifest.includes(term), `firmware catalogue must not include ${term}`);
}

check(source.includes("const APPROVED_FIRMWARE_PATH = 'assets/firmware/ESP32_GENERIC-20260824-v1.29.0.bin'"), 'browser must allow only the exact staged firmware path');
check(source.includes('parsed.origin === window.location.origin'), 'browser firmware download must remain same-origin');
check(source.includes('approvedFirmwareUrl(entry.url)'), 'the exact firmware URL must be validated before downloading');
check(source.includes("crypto.subtle.digest('SHA-256'"), 'browser must compute and verify firmware SHA-256');
check(source.includes('validateEsp32FirmwareFile'), 'manual firmware must pass the exact-file and ESP-image validation helper');
check((await readFile(join(root, 'assets/js/hardware.js'), 'utf8')).includes('bytes[0] !== 0xe9'), 'manual firmware validation must check the ESP image magic byte');
check(source.includes('manualSourceConfirm.checked'), 'manual firmware requires official-source confirmation');
check(source.includes('flashReadinessReason'), 'Flash click must explain readiness blockers instead of silently returning');
check(source.includes('flashBtn.disabled = session.busy'), 'Flash button is disabled only while a write is in progress');
check(!/id=\"flashBtn\" disabled/.test(flasherPage), 'Flash button must be clickable before readiness so it can explain next steps');

check(flasherPage.includes('id="firmwareFile"'), 'flasher page must include a local firmware file picker');
check(flasherPage.includes('id="firmwareDownload"'), 'flasher page must include a direct official binary download link');
check(source.includes("candidate.downloadUrl === OFFICIAL_FIRMWARE_DOWNLOAD"), 'catalogue must require the pinned official manual-download URL');
check(source.includes("candidate.offset === '0x1000'"), 'write offset must be pinned in the browser code as well as the manifest');
check(source.includes('boardConfirmBox.checked'), 'board variant confirmation must be required before flashing');
check(!source.includes('requestPort().then'), 'serial chooser should be triggered through a direct click handler');
check(!source.includes('fetchLatestRelease'), 'latest-release firmware fetching must remain disabled');
check(fetcher.includes('https://www.micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin'), 'build fetcher must use the exact pinned official MicroPython image');
check(fetcher.includes("finalUrl.hostname !== 'www.micropython.org'"), 'build fetcher must reject redirects to other hosts');
check(fetcher.includes("createHash('sha256')"), 'build fetcher must generate the staged image digest');
check(!homepage.includes('id="flasher"'), 'the home page must not embed the flasher section');
check(flasherPage.includes('id="flasher"'), 'the dedicated flasher page must contain the flasher section');

for (const message of failures) console.log(`FAIL  ${message}`);
if (failures.length) {
  console.log(`\n${failures.length} flasher manifest check(s) failed.`);
  process.exit(1);
}

console.log('PASS  only the pinned official MicroPython ESP32 image is offered');
console.log('PASS  staging uses same-origin SHA-256 verification, with a pinned official manual-download fallback');
console.log('PASS  chip family, write offset, and firmware path are constrained');
console.log('PASS  local fallback restricts the filename and validates the ESP image header');
