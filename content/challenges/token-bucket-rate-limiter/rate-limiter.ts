/**
 * A token-bucket rate limiter, one bucket per key (an API key, a user id, an IP).
 *
 * Each bucket holds up to `capacity` tokens and refills continuously at `refillPerSecond`. A
 * request takes one token; with no whole token available it's denied, and told how long to wait.
 * Time comes from the injected `now()` clock (milliseconds), so tests can move time by hand.
 *
 * Four bugs, in the order worth fixing them:
 *   1. Per-key buckets — every key shares one bucket, so one busy client denies everyone.
 *   2. The cap — refill isn't capped at `capacity`, so a long-idle client can burst without limit.
 *   3. Fractional refill — each call floors the refill to whole tokens and resets the clock, so the
 *      fraction is thrown away and a client that polls faster than one token per interval never
 *      gets a token again.
 *   4. retryAfterMs — it reports the time until the bucket is FULL, not until the next token.
 */

export type LimiterOptions = {
  /** The most tokens a bucket can hold — the largest burst a client can send at once. */
  capacity: number;
  /** Tokens added per second — the long-run average rate a client is allowed. */
  refillPerSecond: number;
  /** Current time in milliseconds. */
  now: () => number;
};

export type Decision = {
  allowed: boolean;
  /** 0 when allowed; otherwise how many ms until a request from this key could succeed. */
  retryAfterMs: number;
};

type Bucket = { tokens: number; lastRefillMs: number };

export function createRateLimiter({ capacity, refillPerSecond, now }: LimiterOptions) {
  let shared: Bucket | undefined;

  function bucketFor(key: string): Bucket {
    void key;
    if (!shared) shared = { tokens: capacity, lastRefillMs: now() };
    return shared;
  }

  function refill(bucket: Bucket, nowMs: number): void {
    const elapsedSeconds = (nowMs - bucket.lastRefillMs) / 1000;
    bucket.tokens = bucket.tokens + Math.floor(elapsedSeconds * refillPerSecond);
    bucket.lastRefillMs = nowMs;
  }

  return {
    tryRemove(key: string): Decision {
      const nowMs = now();
      const bucket = bucketFor(key);
      refill(bucket, nowMs);

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterMs: 0 };
      }
      const missing = capacity - bucket.tokens;
      return { allowed: false, retryAfterMs: Math.ceil((missing / refillPerSecond) * 1000) };
    },
  };
}
