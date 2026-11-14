/* Retrieve one fixed official MicroPython image during local preparation or CI.
 * This runs in Node (not in the browser), so the upstream server's CORS policy
 * does not block the download. The browser later fetches the staged file from
 * this site's own origin and verifies the generated SHA-256 digest.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceUrl = 'https://www.micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin';
const assetRelativePath = 'assets/firmware/ESP32_GENERIC-20260824-v1.29.0.bin';
const assetPath = join(root, assetRelativePath);
const manifestPath = join(root, 'assets/data/firmware.json');
const maxBytes = 4 * 1024 * 1024;

const response = await fetch(sourceUrl, { redirect: 'follow', headers: { 'User-Agent': 'SHXERLOCK-Firmware-Stager/1.0' } });
if (!response.ok) throw new Error(`Official MicroPython download failed with HTTP ${response.status}.`);
const finalUrl = new URL(response.url || sourceUrl);
if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'www.micropython.org'
  || finalUrl.pathname !== '/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin'
  || finalUrl.search || finalUrl.hash) {
  throw new Error('The official firmware URL redirected to an unapproved host.');
}

const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length === 0) throw new Error('The official firmware download was empty.');
if (bytes[0] !== 0xe9) throw new Error('The downloaded file does not have the ESP image header byte.');
if (bytes.length > maxBytes) throw new Error(`Firmware is larger than the ${maxBytes}-byte safety limit.`);

const sha256 = createHash('sha256').update(bytes).digest('hex');
await mkdir(dirname(assetPath), { recursive: true });
await writeFile(assetPath, bytes);

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entries = Array.isArray(manifest.firmware) ? manifest.firmware : [];
if (entries.length !== 1 || entries[0].id !== 'micropython-esp32-generic' || entries[0].version !== 'v1.29.0') {
  throw new Error('The firmware manifest does not contain the one reviewed MicroPython entry.');
}
entries[0].url = assetRelativePath;
entries[0].sha256 = sha256;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Staged ${assetRelativePath} (${bytes.length} bytes).`);
console.log(`SHA-256: ${sha256}`);
