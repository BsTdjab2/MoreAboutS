# Instructions for the AI assistant publishing this site

You have been handed a finished, working static site. It has been built and tested. Your job is to
get it onto GitHub and live, not to rebuild it.

Read this whole file before you touch anything.

## The one thing that matters most

The original version of this site had a **Discord webhook URL hardcoded in the client-side
JavaScript**. That is a credential. Anyone who viewed source could post to the owner's Discord as the
site, ping everyone, upload files, and delete the webhook.

That has been fixed by moving it into a Cloudflare Worker (`worker/`). **Do not undo this.** If you
find yourself putting a webhook URL, API key, or token into any file under `assets/`, stop. That
directory is served to the public.

The old webhook is burned. It was exposed publicly and must be deleted in Discord and replaced. Tell
the owner this if they have not already done it.

## What to do

1. Create a GitHub repo and push this folder as-is.
2. Settings, Pages, set Source to **GitHub Actions**. The workflow is already written.
3. Work through `DEPLOY.md` in order. It is accurate; follow it rather than improvising.
4. Replace the placeholder domain `https://sherlocknots.github.io` in the files listed in the
   `DEPLOY.md` table. That table is complete, nothing else hardcodes the host.
5. Run `npm test` before and after your changes. Three suites, no dependencies, needs Node 22+
   and a Chrome or Chromium binary.

## What not to do

**The design was redesigned on purpose; keep it consistent.** The look is now a dark-first, glass-and-grid
design (light mode available) set in self-hosted Geist and Geist Mono, with a mint accent. It has a floating
nav, a large hero with a decrypting title, a marquee band, bento cards, a terminal-window Kali Tools teaser and
a large footer. All of it lives in `assets/css/styles.css` (custom properties at the top) plus the motion
modules listed below. Every word, link and image from the previous version was kept; the only additions are the
two hero buttons, the Kali category chips and the footer column headings. If you are asked to change the look,
change it on purpose, not as a side effect of refactoring.

**Do not add a framework.** No React, no Vite, no Tailwind, no bundler. It is deliberately plain
files. Adding a build step makes it harder for the owner to edit, which is the opposite of the point.

**Do not loosen the Content Security Policy to make something work.** If a request is blocked, add
that specific host to `connect-src` in both `index.html` and `_headers`. Never add `'unsafe-inline'`,
and never widen to `*`. There are currently zero inline styles and zero inline scripts on the site,
and `tools/check.mjs` fails if you introduce any.

**Do not re-add a CDN.** Fonts, icons and the flashing library are all self-hosted so the site makes
no third-party requests. The icons are an inline SVG sprite at the top of each page, replacing
FontAwesome's 380 KB of webfonts with about 11 KB.

**The motion layer is decoration and must stay that way.** `hero.js` (title, canvas network, parallax),
`reveal.js` (scroll reveal), `pointer.js` (cursor glow, card spotlight, magnetic buttons, tilt) and `nav.js`
(menu, scroll-spy) follow four rules. Keep all of them. (1) Nothing gates content: the hidden reveal state only
exists once `html.reveal-on` is set by the script, so a page without JavaScript shows everything. (2) Everything
that loops pauses when off screen or when the tab is hidden. (3) `prefers-reduced-motion` gets a still frame or
no effect, and `pointer.js` does nothing on touch devices. (4) Decorative layers are `pointer-events: none`
and sit behind the content, so they can never eat a click. Also avoid large CSS `filter: blur()` on big
animated elements: it cost about 3x scroll performance and was removed from the hero.

**Inline styles.** The CSP has no `'unsafe-inline'`, so there are still zero `style=` attributes or inline
scripts in the markup, and `tools/check.mjs` fails if you add one. The motion modules set CSS custom properties
and transforms through the CSSOM (`element.style.setProperty`), which the CSP allows. That is why the check
reads the served HTML for `style=` instead of querying the live DOM.

**Do not widen the release resolver.** `assets/js/flasher.js` will only fetch release assets from
GitHub's own hosts, and only for a `repo` shaped `owner/name`. The filters in `firmware.json` are
substring matches, not regexes, because a pattern out of a data file is not something to hand to the
regex engine. Keep both properties.

**Do not put firmware URLs in that you have not verified.** An entry in
`assets/data/firmware.json` with an empty `url` renders greyed out and unflashable. That is correct
behaviour, not a bug to fix. Only fill one in when you have a real link to a real merged `.bin`,
check the host sends CORS headers, and set the `sha256` field. The browser verifies that digest
before writing anything, so a release asset that gets replaced later is refused rather than flashed
onto somebody's board.

**Do not weaken the flasher's chip check.** `assets/js/hardware.js` compares chip families
**exactly**. Do not "simplify" it to `startsWith`, which is how it was originally written and was a
real bug: `'ESP32-S3'.startsWith('ESP32')` is true, so the default selection accepted every variant
and the anti-brick guard was off on the most likely path through the page. `tools/hardware.test.mjs`
will go red if this regresses.

**Do not relax `parseOffset`.** Same file. It rejects anything that is not a plain decimal or `0x`
hex number, because `parseInt('+0x1000')` is `0`, which would write an image over the bootloader
with no error shown.

## Things that are intentional and will look like bugs

| Looks like | Actually |
| --- | --- |
| Contact form sends without the worker | It falls back to the Web3Forms relay keyed in `index.html`. Web3Forms access keys are public by design, unlike the webhook below. Deploying the worker and setting `CONTACT_ENDPOINT` takes over from it |
| Attachment field disabled | Correct while the fallback is in use. Web3Forms drops files on the free tier, so the field is off rather than silently losing them. The worker re-enables it |
| Firmware options greyed out | Correct until a build gets a real `url` or a `release` block in `assets/data/firmware.json` |
| A firmware build list fetched from GitHub | Deliberate. A `release` block pulls upstream's latest release at flash time. Such a build cannot be checksummed against this site, and the console says so before every write |
| Six project cards say "Soon" | The owner's placeholder content, kept from the original |
| Background is plain on first visit | Correct. Matrix and Blood are off until the visitor picks one from the theme panel |
| Effects do nothing on a phone with reduced motion on | Correct. One still frame is painted instead of animating |
| `_headers` does nothing on GitHub Pages | True and documented. Pages cannot set headers. Do not fake it with a meta tag |
| `wrangler.toml` has a fake KV id | Deliberate. A deploy that skips creating the namespace should fail, because the worker refuses to run unmetered |
| The worker returns 503 with no KV binding | Deliberate fail-closed. `ALLOW_UNLIMITED="true"` is the explicit opt out |
| Submitting within 3 seconds is refused | Anti-bot timing check, client and server side |
| `assets/vendor/esptool-js/bundle.js` is minified | Vendored upstream release, version 0.6.1, Apache 2.0, with its LICENSE beside it. Do not reformat it |

## Where the logic lives

- `assets/js/config.js` is the only file the owner needs to edit for configuration.
- `worker/src/index.js` is the contact relay. Every security control is in there and every one has a
  test in `tools/worker.test.mjs`.
- `assets/js/flasher.js` drives esptool-js. It is a small state machine: connect, detect, verify chip
  match, write, verify MD5, reset.
- `assets/css/styles.css` holds every style, with the dark and light themes as custom property blocks at the
  top. Fonts are in `assets/fonts/` (Geist and Geist Mono, SIL OFL, see `THIRD-PARTY.md`).
- `assets/js/{nav,reveal,hero,pointer}.js` are the motion layer, started from `main.js`.

## Verifying you have not broken anything

```bash
npm test               # all three suites
npm run test:hardware  # 10 cases on chip matching and flash offsets, pure Node
npm run test:worker    # 39 security assertions, pure Node
npm run test:pages     # every page, phone and desktop, headless Chrome
npm run serve          # then click through it yourself
```

`tools/check.mjs` fails the build on console errors, CSP violations, failed requests, wrong H1
counts, missing alt text, inline styles or scripts, and horizontal scroll at 375 px. If you change
markup and it goes red, fix the markup.

This code has been through an adversarial review. The findings are written up in
`SECURITY-NOTES.md`, including the ones that are still open, so read that before you decide
something looks wrong.

Things the test suite cannot check, which need a human:

- Flashing a real ESP32. Nobody has run this against physical hardware yet. The library is the
  standard one and the wiring is verified, but the owner should test on a board they can recover
  before telling anyone it works.
- The rate limiter under a parallel flood. Cloudflare KV has no atomic increment, so the limits
  hold against a sequential attacker and can be raced by a burst. `SECURITY-NOTES.md` says so and
  points at the fix.
- Whether a real message arrives in the right Discord channel after the worker goes live.
- How the share card looks on a real social platform.

Be straight with the owner about that last list. Do not report the flasher as hardware-verified.
