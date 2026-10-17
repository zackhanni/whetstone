`cors()` runs before every route of `api.example.com`. The web app (`https://app.example.com`) and
the admin app (`https://admin.example.com`) call it with `fetch(…, { credentials: "include" })`
and an `Authorization` header. Since the last refactor, the app's requests fail in the browser
with CORS errors. A security review then found something worse waiting behind that bug: the
allow-list check also lets in `app.example.com.evil.test` — a domain anyone can register — so the
moment someone "fixes" the CORS errors by echoing the caller's origin, that site can read
logged-in users' data.

What the browser needs (Fetch standard, CORS protocol):

- `access-control-allow-origin` holds **one** origin. For a credentialed request it must be the
  caller's exact origin — `*` is refused — plus `access-control-allow-credentials: true`.
- An origin is scheme + host + port. `https://app.example.com:8443` and `http://app.example.com`
  are different origins from `https://app.example.com`.
- The response now depends on the `Origin` request header, so caches must be told: `vary: Origin`
  on every response this function shapes.
- A preflight (`OPTIONS` with `access-control-request-method`) from an allowed origin gets `204`
  and the grants: methods, header names and max age from the config. With credentials, `*` in
  `access-control-allow-headers` is just a header literally named `*`.
- A preflight from anyone else gets `403` and no grants.

`cors-types.ts` has the types. All header names are lowercase.

## Hints

- An origin is allowed only if it is *equal* to a listed one, character for character. Anything
  cleverer — a prefix, a suffix, a regex — is how the `.evil.test` domain got in.
- Start the headers object with `vary` already in it, before any early return.
- The configured `allowedHeaders` are already lowercase — join them with `", "`.
