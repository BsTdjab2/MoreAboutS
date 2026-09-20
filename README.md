# Sherlock

Personal site: projects, the community link, and an ESP32 web flasher that runs entirely in the browser.

Static HTML, CSS and JavaScript. No framework, no build step, no bundler. Clone it, open it, edit it.

## What is in here

```
index.html              the whole front page
privacy.html            privacy policy
terms.html              terms of service
disclaimer.html         hardware and legal notes
404.html                custom not-found page
_headers                response headers for Cloudflare Pages / Netlify
robots.txt sitemap.xml site.webmanifest

assets/css/styles.css   every style on the site
assets/js/              one module per feature
assets/data/firmware.json   drives the flasher's firmware dropdown
assets/img/             logo, favicons, social share image
assets/vendor/esptool-js/   the flashing library, self-hosted

worker/                 Cloudflare Worker that relays the contact form
tools/                  local server and the test suite
```

The JavaScript is split by job. `theme.js` handles the colour switcher, `cards.js` the tilt on the
project cards, `contact.js` the form, `flasher.js` the ESP32 flashing, `hardware.js` the chip and
offset checks that keep a flash from bricking a board, `md5.js` the post-flash verification,
`ui.js` the shared status and button helpers, and `config.js` holds the handful of values you
actually edit.

## Running it locally

```bash
npm run serve      # http://127.0.0.1:8080
```

Use this rather than opening `index.html` from disk. The flasher needs a secure context, which
`127.0.0.1` counts as and `file://` does not.

## Editing content

**Projects.** The three cards near the top of `index.html`, marked with a comment. Swap the title and
description for a real project.

**Firmware list.** `assets/data/firmware.json`. Each entry needs a direct link to a merged `.bin`.
Entries with no URL show up greyed out on purpose, so the page never offers something it cannot
deliver. The file explains the format and how to merge an image.

**Contact form.** Deploy `worker/` and put its URL in `assets/js/config.js`. Until then the form
politely points people at Discord instead of failing.

## Tests

```bash
npm test
```

Three suites, all dependency-free:

- `tools/hardware.test.mjs` covers the two flasher decisions that can destroy a board: which chip is
  connected, and which address gets written. 10 cases, pure functions, no browser.
- `tools/worker.test.mjs` runs the contact worker's logic in Node with a stubbed Discord, and asserts
  the security controls actually hold. 39 cases covering origin checks, the honeypot, rate limiting,
  markdown and mention injection, magic-byte checks on uploads, and the fail-closed path when no
  rate limiter is bound.
- `tools/check.mjs` drives headless Chrome over CDP and opens every page at phone and desktop width.
  It fails on console errors, CSP violations, failed requests, missing or duplicate H1s, images
  without alt text, inline styles or scripts, `hidden` elements that still render, tap targets under
  24 px, and horizontal scroll. It also imports esptool-js under the live CSP and checks the
  flasher's API is intact, because that library loads lazily and a CSP mistake would otherwise stay
  invisible until somebody clicked Connect.

All three run in CI before the site deploys.

## Deploying

See [DEPLOY.md](DEPLOY.md). Short version: push to `main`, turn on GitHub Pages with the Actions
source, and deploy the worker separately if you want the contact form live.

## Licences

Site code is Sherlock's. Third-party components keep their own, listed in
[THIRD-PARTY.md](THIRD-PARTY.md).
