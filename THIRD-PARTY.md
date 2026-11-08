# Third-party components

The site code and flashing library are served from this repo. The Flasher publishes a single reviewed MicroPython image. The deployment workflow retrieves the exact versioned file from the official MicroPython host over HTTPS and stages it with the site, so the browser downloads it from the site's own origin.

## esptool-js

Version 0.6.1, vendored at `assets/vendor/esptool-js/bundle.js`.

Espressif's official JavaScript port of esptool. Licensed Apache 2.0, full text at
`assets/vendor/esptool-js/LICENSE`. Upstream: https://github.com/espressif/esptool-js

It is loaded with a dynamic `import()` only when someone clicks Connect, so the 218 KB never touches
a normal page view.

## MicroPython firmware

The Flasher catalogue currently contains only the classic ESP32 generic MicroPython v1.29.0 image.
It is retrieved during deployment from the exact pinned versioned URL, then served same-origin. The build generates a SHA-256 digest and the browser verifies the staged file against it before writing. This detects changes to the published asset after staging; it is not an independent upstream signature. Official board compatibility notes and instructions:
https://www.micropython.org/download/ESP32_GENERIC/

## Font Awesome Free icons

Version 6.4.0. The 21 icons the site uses were taken from the official SVG set and assembled into the
inline sprite at the top of each HTML page.

Icons are licensed CC BY 4.0. Upstream: https://fontawesome.com/license/free

The original page loaded the whole icon font from cdnjs, about 380 KB of webfonts plus a 100 KB
stylesheet, for those 21 glyphs. The sprite is roughly 11 KB and removes the third-party request.

## Geist and Geist Mono

Variable fonts by Vercel, latin subset, self-hosted at `assets/fonts/` and loaded with `@font-face`
(no Google Fonts request). Licensed under the SIL Open Font License 1.1, full text at
`assets/fonts/OFL.txt`. Upstream: https://github.com/vercel/geist-font

## Everything else

The site has no banner images; the favicon (`assets/favicon.svg`) is a simple original mark. The site's HTML, CSS and JavaScript, and the contact
worker, were written for this project.
