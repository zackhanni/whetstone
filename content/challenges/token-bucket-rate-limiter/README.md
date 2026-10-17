`rate-limiter.ts` is a token-bucket limiter of the kind an API gateway puts in front of a
service. Each client key gets a bucket that holds up to `capacity` tokens and refills
continuously at `refillPerSecond`. A request takes one token; when there isn't a whole token,
it's denied with a `retryAfterMs` the server can send back as `429 Too Many Requests` plus a
`Retry-After` header. So `capacity` is the largest burst a client can send at once, and
`refillPerSecond` is the average rate it can keep up forever.

The clock is injected: `now()` returns milliseconds, and the tests replace it with a fake clock
they advance by hand. Nothing sleeps, so the results never depend on how fast the test machine
is — the same seam you'd use for anything time-based.

The limiter works for a single client in a quick demo and is wrong in four ways:

1. **One bucket for everyone** — the `key` is ignored, so one noisy client exhausts the bucket
   and every other client is denied too.
2. **No cap** — refill adds tokens for all the elapsed time without stopping at `capacity`, so a
   client that was idle for an hour can fire thousands of requests at once.
3. **Lost fractions** — each call floors the refill to whole tokens and then resets the refill
   clock, throwing the fraction away. A client that polls every 300 ms at 1 token/s earns 0.3
   tokens per call, floors it to 0, and never gets a token again. Keeping only whole tokens
   *some* of the time isn't enough either: drop 0.2 of a token every 1.2 s and the client gets
   five requests where it earned six.
4. **Wrong wait** — `retryAfterMs` is the time until the bucket is *full*, not until the next
   token, so well-behaved clients wait far longer than they need to.

## Hints

- Look buckets up by key, and give a key it hasn't seen before a full bucket.
- A bucket may hold 0.3 of a token. Refill by the exact elapsed time, then cap the total at
  `capacity`.
- Once fractions are kept, moving `lastRefillMs` to `now` on every call loses nothing.
- A denied client is waiting for *one* token. Work out how much of a token is missing, then how
  long the refill takes to make that much — and round up, so it doesn't come back a hair early.
