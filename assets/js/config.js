/* Site configuration. This is the only file you need to edit to go live. */

/* Where the contact form posts. Deploy worker/ and paste its URL here.
   Left empty, the form stays visible but tells people to use Discord
   instead of failing silently. Whatever you put here must also appear in
   connect-src in index.html's CSP meta tag and in _headers. */
export const CONTACT_ENDPOINT = '';

/* Shown as the fallback whenever the form can't be used. */
export const DISCORD_INVITE = 'https://discord.gg/xExgKRD6sB';

/* Keep these in step with the same limits in worker/src/index.js.
   The browser copy is a courtesy; the worker copy is the one that counts. */
export const MAX_MESSAGE_CHARS = 1000;
export const MAX_NAME_CHARS = 80;
export const MAX_EMAIL_CHARS = 120;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
