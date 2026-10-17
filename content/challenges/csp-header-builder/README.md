`csp.ts` builds the Content-Security-Policy header for one HTML response. The app's proxy calls
`cspForRequest()` on every page request, sends `header` as the response header, and puts `nonce`
on the page's own `<script>` tags. `csp-parse.ts` splits a header into its directives the way the
CSP spec does; the preview uses it to show three requests side by side.

The policy is sent and the site works, but it would barely slow down an XSS payload:

1. **`'unsafe-inline'`** lets every inline script run, the attacker's included. The page's own
   inline scripts should be allowed by the response's nonce instead (and the nonce isn't in the
   header at all yet).
2. **The nonce is created once**, when the module loads, so every response carries the same one.
   Anyone can load a page, read it, and put it on their injected script.
3. **No `object-src` or `base-uri`.** Through the `default-src 'self'` fallback, `<object>` and
   `<embed>` may still load anything from our own origin (user uploads included). `base-uri`
   doesn't fall back to `default-src` at all, so an injected `<base href="https://evil.example">`
   could re-point the page's nonced relative script URLs.
4. **`'unsafe-eval'` in production.** React's development build needs it; production doesn't, and
   a nonce doesn't switch `'unsafe-eval'` off the way it switches `'unsafe-inline'` off.

## Hints

- `createNonce()` is fine as written. The bug is where it's called.
- A nonce source is written `'nonce-<value>'`, quotes included.
- The strict-CSP pair is `object-src 'none'` plus `base-uri 'none'` (or `'self'` if the page uses a
  `<base>` of its own).
- `options.dev` tells you which mode the request is in.
