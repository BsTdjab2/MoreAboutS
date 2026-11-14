# Sherlock

Personal site: about, projects, links, a Kali Tools directory (a searchable, categorized reference of Kali Linux tools on its own page), a 10-item Showcase with Details views, a photo carousel and a wiring tutorial for Project 1, and contact buttons.

Static HTML, CSS and JavaScript. No framework, no build step, no bundler. Clone it, open it, edit it.

## What is in here

```
index.html              the whole front page
flasher.html            standalone ESP32 firmware flasher page
privacy.html            privacy policy
terms.html              terms of service
disclaimer.html         hardware and legal notes
404.html                custom not-found page
_headers                response headers for Cloudflare Pages / Netlify
robots.txt sitemap.xml site.webmanifest

assets/css/styles.css   every style on the site
assets/fonts/           self-hosted Geist and Geist Mono (woff2)
assets/favicon.svg      site icon
assets/js/              one module per feature
assets/data/firmware.json   drives the flasher's firmware dropdown
tools/fetch-firmware.mjs   stages the exact official MicroPython image for local use / CI
.github/workflows/pages.yml deploys the site and its staged firmware to GitHub Pages
assets/vendor/esptool-js/   the flashing library, self-hosted

worker/                 Cloudflare Worker that relays the contact form
tools/                  local server and the test suite
```

When the local firmware staging step is skipped, the Flasher page provides the official pinned `.bin` download and a local file picker fallback.

The JavaScript is split by job. `nav.js` runs the floating navigation (mobile menu, scroll-spy), `hero.js` the hero
title, background network and parallax, `reveal.js` the scroll reveal and `pointer.js` the cursor effects
(all four are decoration only and stand down for reduced motion). `theme.js` handles the light/dark switcher, `kalicmd.js` the copy
buttons, `typing.js` the hero typing effect, `showcase.js` the Showcase list, Details and Tutorial views, `carousel.js` the Project 1 photo slider,
`scroll-progress.js` the top progress bar, `contact.js` the form, `flasher.js` the ESP32 flashing, `hardware.js` the chip and
offset checks that keep a flash from bricking a board, `md5.js` the post-flash verification,
`ui.js` the shared status and button helpers, and `config.js` holds the handful of values you
actually edit.

## Running it locally

```bash
node tools/serve.mjs           # http://127.0.0.1:8080
# Optional: node tools/fetch-firmware.mjs to stage a same-origin copy locally
```

Use this rather than opening `index.html` from disk. The flasher needs a secure context, which
`127.0.0.1` counts as and `file://` does not.

## Editing content

**Projects.** The six cards near the top of `index.html`. Swap the title and description for a real
project.

**Links.** The four cards in the `#links` section of `index.html`.

**Hero buttons.** The two `.hero-cta` buttons at the top of `index.html` (they point at Projects and Contact).

**Hero sentences.** The three `.hero-typing-sizer` spans in the header of `index.html`. `typing.js` reads
them, so edit the text there and nowhere else. Timings are the constants at the top of `typing.js`.

**Images.** Everything lives in `Images/`. File names are case-sensitive on most hosts, so keep the
capitals exactly: `Board.jpeg`, `Cables.jpeg`, `Nrf.jpeg`, `Antenna.jpeg` (Project 1 cover and carousel),
`Nrftuto.jpg` and `ESP32D.jpeg` (Project 1 tutorial). `Nuclei.svg` and `ForexBooster.svg` are simple
stand-in icons for the Kali tool cards. To use the official logos, save them over those two names, or
change the `src` of the `.kali-tool-icon` image in `index.html` if your file has another extension.

**Kali category chips.** The sticky pill row on `kali-tools.html` is one `.tool-chip` link per category section. Add a
chip with the same `#cat-...` id when you add a category.

**Kali tools.** Each tool is one `<section class="section section-tight">` in `index.html` with a name,
an icon, a description and a list of `.kali-step` blocks. A step is a title plus a copy button whose
`data-copy-text` is the exact command that gets copied. Forex Booster still has placeholder text.

**Project 1 carousel and tutorial.** The carousel is the `.carousel` block inside `showcase-detail-1`;
add or remove `.carousel-slide` figures there and the buttons, counter and swipe follow. The tutorial is
`showcase-tutorial-1`, opened by `#showcase/1/tutorial`. To give another project a tutorial, copy that
block, rename its ids to the project number and add an Open Tutorial button to that project's details.

**Showcase.** Ten `.showcase-item` cards in `#showcaseList` and ten matching `.showcase-detail` blocks
(`showcase-detail-1` to `showcase-detail-10`) in `index.html`. Item N's Details button links to
`#showcase/N`, which opens detail block N. Replace the "Picture coming soon" box with an `<img>` (with
alt text) and fill in each block's How it's working, Source and Tutorial text.

**Firmware list.** `assets/data/firmware.json` is a deliberately small allowlist. `flasher.html` offers the official MicroPython v1.29.0 image for supported classic ESP32 boards only. `tools/fetch-firmware.mjs` retrieves that exact official file during deployment (or for local use), stages it under `assets/firmware/`, and generates a SHA-256 digest; the browser fetches the same-origin asset and verifies that digest before writing. The script and browser both constrain the exact version, source, path, chip family, 4 MiB minimum flash requirement, and module confirmation. The flasher also supports a manual fallback: the user downloads the exact versioned `.bin` from the official MicroPython host and selects it locally. The browser checks the exact filename, ESP image header, size, board family, and computes SHA-256. The manual-source confirmation is required; the computed fingerprint detects changes but is not a malware scan or independent publisher signature. Floating third-party release downloads remain disabled. The selected single/dual NRF24L01 profile is informational only and does not enable radio-transmission firmware.

**Contact form.** Not on the page at the moment; the Contact section is four plain buttons (Discord, GitHub, email, Instagram). If you add the form back, it posts to the Web3Forms relay whose access key is in the form markup, so it
works out of the box. Deploying `worker/` and setting `CONTACT_ENDPOINT` in `assets/js/config.js`
takes over from it, and is the better path: rate limiting, attachment handling, nothing public.

## Tests

Run the Node test suites with:

```bash
node --test tools/*.test.mjs
```

The included suites cover chip-family matching and flash-offset validation, the contact worker's
security controls, and the flasher firmware allowlist. `tools/check.mjs` is a separate headless
Chrome smoke check for page layout, browser errors, CSP, accessibility basics and the locally hosted
esptool-js bundle. It requires Chrome, Chromium or Edge; set `CHROME_PATH` if the browser is not on
the default search path.

## Deploying

See [DEPLOY.md](DEPLOY.md). Short version: push to `main`, turn on GitHub Pages with the Actions
source, and deploy the worker separately if you want the contact form live.

## Licences

Site code is Sherlock's. Third-party components keep their own, listed in
[THIRD-PARTY.md](THIRD-PARTY.md).
