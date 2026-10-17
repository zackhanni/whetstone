`csrf-guard.ts` holds the check every state-changing request to the app goes through, and the
`Set-Cookie` value for the session it protects. The app's pages all live on
`https://app.example.com`, and every legitimate write comes from those pages. The preview runs the
guard against a handful of requests.

It stops the textbook attack, a cross-site `POST`, but leaves five gaps:

1. **Only `POST` is checked.** A cross-site `DELETE`, `PUT` or `PATCH` passes untouched. The rule
   is the other way round: safe methods (`GET`, `HEAD`, `OPTIONS`) are skipped, everything else
   is checked.
2. **`Origin` is compared with `startsWith`.** `https://app.example.com.evil.test` starts with the
   trusted origin, and anyone can register that domain.
3. **`Sec-Fetch-Site: same-site` is trusted.** That value means "a sibling subdomain", and one of
   them serves user uploads. The app's own pages always produce `same-origin`.
4. **No headers means "allowed".** OWASP: missing headers "are not evidence of a same-origin
   request". Fail closed.
5. **The session cookie has no `HttpOnly`, `Secure` or `SameSite`.** Without `SameSite`, Chromium
   applies `Lax` by default, but Firefox and Safari don't. Say what you mean.

## Hints

- A `Set` of safe methods reads better than a chain of comparisons.
- Check `Sec-Fetch-Site` first; fall back to `Origin` only when it's absent.
- `trustedOrigins.includes(origin)` is an exact comparison.
- Cookie attributes are `; `-separated: `HttpOnly`, `Secure`, `SameSite=Lax`.
