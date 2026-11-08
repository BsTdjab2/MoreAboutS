/* Pure helpers for the flasher. Kept separate from flasher.js so they can be
   unit tested without a browser or a board, because both of these decide
   whether a write lands somewhere that bricks the device. */

/* Chip family selector value -> the family esptool reports. */
export const CHIP_NAMES = {
  esp32: 'ESP32',
  esp32s3: 'ESP32-S3',
  esp32s2: 'ESP32-S2',
  esp32c3: 'ESP32-C3',
  esp32c6: 'ESP32-C6',
  esp8266: 'ESP8266',
};

/* The ESP8266 is the one part that answers to more than one name: esptool's
   CHIP_NAME is "ESP8266" but its description reads "ESP8266EX" or "ESP8285"
   depending on an efuse. All three are the same selection, so all three are
   accepted. Every ESP32 entry stays a single exact name on purpose. */
const FAMILY_ALIASES = {
  esp8266: ['ESP8266', 'ESP8266EX', 'ESP8285'],
};

/* The largest flash any ESP32 variant takes, used as an upper bound so a
   fat-fingered offset is refused rather than passed to the bootloader. */
export const MAX_FLASH_OFFSET = 0x4000000;

/* esptool reports names like "ESP32-S3", and descriptions like
   "ESP32-D0WD-V3 (revision v3.1)". Both have to collapse to a family so that
   an ESP32-S3 never counts as a plain ESP32. */
export function chipFamily(reported) {
  const token = String(reported || '')
    .toUpperCase()
    .trim()
    .split(/[\s(]/)[0];

  if (!token) return '';

  const variant = /^ESP32-([SCHP]\d+)\b/.exec(token);
  if (variant) return `ESP32-${variant[1]}`;
  if (/^ESP32\b/.test(token) || /^ESP32-/.test(token)) return 'ESP32';
  return token;
}

/* Exact family comparison. A prefix test would let every ESP32-xx variant
   satisfy a plain "ESP32" selection, which is the default, and flashing an
   ESP32 image to an S3 needs manual recovery. */
export function chipMatches(selectedKey, reported) {
  const expected = CHIP_NAMES[selectedKey];
  if (!expected || !reported) return true;

  const accepted = FAMILY_ALIASES[selectedKey] || [expected];
  return accepted.includes(chipFamily(reported));
}

/* Strict. parseInt would read "+0x1000" as 0 and flash the image over the
   bootloader without saying anything. */
export function parseOffset(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return 0;

  if (!/^(?:0x[0-9a-f]+|\d+)$/i.test(text)) {
    throw new Error(`"${raw}" is not a valid flash offset. Use 0x0, 0x10000 or a plain number.`);
  }

  const value = /^0x/i.test(text) ? parseInt(text.slice(2), 16) : parseInt(text, 10);

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`"${raw}" is not a valid flash offset.`);
  }
  if (value > MAX_FLASH_OFFSET) {
    throw new Error(`Offset ${text} is past the end of any ESP32 flash.`);
  }
  return value;
}

/* Offsets from firmware.json get the same treatment. Coercing a typo to 0
   would write a bare app image over the bootloader. */
export function manifestOffset(value, label) {
  if (value === undefined || value === null || value === '') return 0;
  try {
    return parseOffset(value);
  } catch (error) {
    throw new Error(`${label} has an invalid offset in firmware.json: ${error.message}`);
  }
}

export function toHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Parse esptool-js flash-size labels such as "4MB". Unknown or unrecognised
   labels return null so firmware with a minimum flash requirement is blocked. */
export function parseFlashSizeMB(label) {
  const match = /^(\d+)\s*MB$/i.exec(String(label || '').trim());
  if (!match) return null;
  const size = Number(match[1]);
  return Number.isSafeInteger(size) && size > 0 ? size : null;
}

/* Basic sanity checks for the one manually selected, exact-name MicroPython
   release supported by the flasher. This is not a malware scanner or a
   cryptographic publisher-authenticity check. */
export function validateEsp32FirmwareFile(fileName, size, header) {
  const expectedName = 'ESP32_GENERIC-20260824-v1.29.0.bin';
  if (fileName !== expectedName) {
    throw new Error(`Choose the exact official filename: ${expectedName}`);
  }
  if (!Number.isSafeInteger(size) || size < 256 * 1024 || size > 4 * 1024 * 1024) {
    throw new Error('The firmware file size is outside the expected range (256 KiB to 4 MiB).');
  }
  const bytes = header instanceof Uint8Array ? header : new Uint8Array(header || []);
  if (bytes.length < 2 || bytes[0] !== 0xe9 || bytes[1] < 1 || bytes[1] > 16) {
    throw new Error('This file does not have a valid ESP image header. Do not flash it.');
  }
  return true;
}

/* Return the next clear action needed before a write can begin. This is a
   user-facing readiness check only; the flash handler repeats the safety
   checks before touching the device. */
export function flashReadinessReason({
  serialAvailable,
  catalogueLoading,
  catalogueFailed,
  firmwareSelected,
  payloadAvailable,
  manualNeedsConfirmation,
  connected,
  chipCompatible,
  flashSizeMB,
  ownerConfirmed,
  boardConfirmed,
  busy,
}) {
  if (busy) return 'A firmware write is already in progress. Keep the ESP32 connected.';
  if (!serialAvailable) return 'USB flashing is unavailable here. Open this page in current Chrome or Edge over HTTPS or localhost.';
  if (catalogueLoading) return 'The approved firmware list is still loading. Wait a moment, then click Flash firmware again.';
  if (catalogueFailed) return 'The approved firmware list could not be loaded. Refresh the page and check your connection.';
  if (!firmwareSelected) return 'Choose MicroPython v1.29.0 — ESP32 Generic from the Firmware list first.';
  if (!payloadAvailable) return 'The firmware file is not loaded. Download the official .bin above, then select it in the firmware file picker.';
  if (manualNeedsConfirmation) return 'Confirm that you downloaded the selected firmware directly from the official MicroPython source.';
  if (!connected) return 'Connect your ESP32 first. Click Connect and choose the USB serial port for your board.';
  if (!chipCompatible) return 'The connected chip does not match this firmware. This image is only for the classic ESP32, not ESP32-S2/S3/C3/C6.';
  if (flashSizeMB === null || flashSizeMB < 4) return 'The board must report at least 4 MB of flash. The flasher will not write when flash size is unknown or too small.';
  if (!ownerConfirmed) return 'Check the first confirmation box to confirm you own this board or have permission to modify it.';
  if (!boardConfirmed) return 'Check the board compatibility confirmation only after verifying that this is a standard dual-core ESP32 with at least 4 MB flash.';
  return '';
}
