`sendWithRetry` wraps every API call in the app. It was written for `GET`s, and it "works" —
until checkout started using it. Now a flaky connection during payment sometimes charges the
card twice, a `422` for a bad card number is sent three times before the user sees it, and the
payment provider's rate limiter keeps banning us because we ignore its `Retry-After`.

The rules it should follow (RFC 9110 for which methods are idempotent, the `Idempotency-Key`
convention for the rest):

- `GET`, `HEAD`, `OPTIONS`, `PUT` and `DELETE` are idempotent: resend them as they are.
- `POST` and `PATCH` are not. Resend them only with an `idempotency-key` header — the **same**
  key on every attempt of one call, so the server can recognise the retry. If the caller already
  set one (say, one key per checkout), keep it.
- Retry when there was no response at all (`send` rejected), or the status means "later":
  `408`, `429`, `502`, `503`, `504`. Everything else is the final answer — including `500`, which
  this API uses for bugs, not for overload.
- Before a retry, wait `retry-after` seconds if the response has a numeric one; otherwise
  `baseDelayMs`, `2 × baseDelayMs`, `4 × baseDelayMs`, … (`Retry-After` may also be an HTTP date;
  this helper doesn't parse dates and treats one like a missing header.)

`http.ts` holds the types. Header names are lowercase throughout.

## Hints

- Decide the headers **before** the loop. Anything computed inside it is computed per attempt.
- Name the two rules: a `Set` of the idempotent methods and a `Set` of the retryable statuses
  read better than a chain of `===` checks.
- `retry-after` arrives as a string: `"2"` means 2000 ms. Only accept it when it's all digits.
