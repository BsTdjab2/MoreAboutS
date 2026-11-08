# SHXERLOCK — Flasher update

## Included

- Moved the ESP32 Flasher out of the home page into its own `flasher.html` page. Every site navigation menu now links directly to that page.
- Kept the existing flasher layout, controls, disclaimer, progress display, serial console, and local `esptool-js` bundle.
- Changed firmware delivery so the deployment runner retrieves the exact official MicroPython v1.29.0 image from its pinned HTTPS URL and places it under `assets/firmware/`. The browser then fetches the file from the site itself, avoiding browser cross-origin restrictions.
- Added a generated SHA-256 digest to the deployed manifest; the browser checks the staged file against it before flashing. This verifies the published asset against the bytes fetched during deployment, not an independent upstream signature.
- Added a GitHub Pages Actions workflow that runs the project tests, stages the firmware, and publishes only the static site.

## Deliberate limits

- No Bluetooth/Wi-Fi jammer firmware or jammer presets are included.
- No arbitrary `.bin` upload and no floating third-party release download are enabled.
- The catalogue remains limited to the standard dual-core classic ESP32 build with the existing chip, flash-size, module-variant, confirmation, and `0x1000` offset checks.

## Local preview

Run `node tools/fetch-firmware.mjs` once, then `node tools/serve.mjs`. The first command requires internet access and generates an ignored firmware file plus its digest in the manifest.

## Verification

Run `node --test tools/*.test.mjs`. The headless browser check is `node tools/check.mjs`; it requires Chrome, Chromium, or Edge. A live test on a real supported ESP32 over HTTPS is still required before relying on the flasher.

## Flash button feedback fix

- The Flash firmware button remains clickable during setup so it can explain the next missing prerequisite in the live status panel.
- The button is disabled only while a write is actively in progress. Unsupported browsers, missing catalogue entries, missing local firmware, unconnected boards, chip/flash mismatches, and unchecked confirmations now produce a clear status message instead of a silent no-op.
- The click handler still performs all readiness and safety checks before requesting confirmation or writing any data. This changes feedback behavior, not the firmware allowlist or hardware restrictions.
- Added unit coverage for each readiness blocker. `node --test tools/*.test.mjs` passes.
- A full headless browser smoke test could not complete in this build environment because Chrome did not expose its remote debugging endpoint. Test on the live HTTPS site and a real supported ESP32 before relying on it.
