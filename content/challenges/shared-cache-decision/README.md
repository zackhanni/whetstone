`shared-cache.ts` is the brain of a small CDN. Given the request, the stored response's
`Cache-Control`, and the copy's age in seconds, it returns one of four decisions:

| Decision | Meaning |
| --- | --- |
| `do-not-store` | A shared cache must not keep this response |
| `fresh` | Serve the stored copy; don't contact the origin |
| `serve-stale-and-refresh` | Serve the stale copy now and refresh it in the background |
| `revalidate` | Ask the origin (a conditional request) before reusing the copy |

The rules come from RFC 9111 (HTTP Caching) and RFC 5861 (`stale-while-revalidate`), with a few
simplifications: the cache reads only `Cache-Control` (no `Expires`); it never guesses a
lifetime, so a stored response without `s-maxage` or `max-age` is stale straight away; it stores
only `GET`/`HEAD` responses, as CDNs do (RFC 9110 allows caching a `POST` response in a narrow
case); and it treats the field-name forms `private="…"` and `no-cache="…"` like the plain ones.

It handles plain `max-age` correctly, and everything else the way people *think* caching works.
Five directives are misread: `no-cache`, `private`, the `Authorization` rule, `s-maxage` and
`stale-while-revalidate`. `cache-control.ts` already parses the header for you (directive names
lowercased, `seconds()` for numeric arguments).

## Hints

- Order matters. Work out **whether** the response may be stored at all (`no-store`, `private`,
  `Authorization`, something that marks it cacheable) before asking **how fresh** it is.
- `no-cache` is a storage *yes* and a reuse *not without asking*: its answer doesn't depend on age.
- RFC 9111 §4.2.1: in a shared cache, `s-maxage` replaces `max-age` whether it is longer or
  shorter. Use `??`, not `Math.max`.
- A copy is fresh while `age < lifetime`. `stale-while-revalidate=N` stretches *serving* (not
  freshness) to `age < lifetime + N`. `must-revalidate` takes that away: once the copy is stale, it
  can't be reused until the origin validates it (RFC 9111 §5.2.2.2).
