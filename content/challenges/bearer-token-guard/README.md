`authenticate()` runs in front of every orders endpoint. It gets the request's `Authorization`
header and the scope the route needs, and decides: let the request through, answer `401`, or
answer `403`. It "works" for the happy path — and a pen-test report just came back with
findings against it.

The rules (RFC 7519 for JWTs, RFC 9110 and RFC 6750 for the responses):

- This API only issues `HS256` tokens signed with `options.secret`. The token's own header is
  written by whoever sent it, so it must not decide how — or whether — the token is checked.
- `exp` is a NumericDate: **seconds** since 1970. The token is invalid from that second on.
  `options.nowSeconds` is the clock. Access tokens without an `exp` are not accepted.
- No credentials at all → `401` with exactly `Bearer realm="api"` (no `error`).
- Credentials that don't check out → `401` with `Bearer realm="api", error="invalid_token"`.
- A genuine token without the needed scope → `403` with
  `Bearer realm="api", error="insufficient_scope", scope="<the scope>"`.
- The scheme name `Bearer` is case-insensitive.

`jwt.ts` already does the byte work: `decodeSegment()` (returns `null` instead of throwing) and
`verifyHs256()`. In production, a maintained library such as `jose` does this for you when you
pass `algorithms: ["HS256"]` — except one rule: `jose` only checks `exp` when the token has one,
so refusing tokens *without* an `exp` takes `requiredClaims: ["exp"]`. This exercise is about
knowing what those options check.

## Hints

- Check in this order: scheme → shape → `alg` → signature → `exp` → scope. Nothing after the
  signature check is trustworthy until it has passed.
- `header.alg === "HS256" && !valid` is "reject *if* it claims HS256 and fails". What you need is
  "reject *unless* it is HS256 and passes".
- `/^bearer\s+(\S+)$/i` matches the scheme in any case and captures the token.
