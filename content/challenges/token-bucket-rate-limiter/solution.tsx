/**
 * A token-bucket rate limiter, one bucket per key (an API key, a user id, an IP).
 *
 * Each bucket holds up to `capacity` tokens and refills continuously at `refillPerSecond`. A
 * request takes one token; with no whole token available it's denied, and told how long to wait.
 * Time comes from the injected `now()` clock (milliseconds), so tests can move time by hand.
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
  // One bucket per key. (A real service also evicts idle buckets — a full bucket is the same as
  // no bucket — or keeps them in Redis with a TTL.)
  const buckets = new Map<string, Bucket>();

  function bucketFor(key: string): Bucket {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefillMs: now() }; // a new client starts with a full bucket
      buckets.set(key, bucket);
    }
    return bucket;
  }

  function refill(bucket: Bucket, nowMs: number): void {
    const elapsedSeconds = (nowMs - bucket.lastRefillMs) / 1000;
    // Keep the fraction: 0.3 of a token now plus 0.7 later is a whole token. Flooring here and
    // resetting lastRefillMs would throw the fraction away on every call.
    // Cap at capacity: idle time saves up a burst of at most `capacity`, never more.
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
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
      // A denied request spends nothing. The caller needs ONE more whole token, not a full bucket.
      const missing = 1 - bucket.tokens;
      return { allowed: false, retryAfterMs: Math.ceil((missing / refillPerSecond) * 1000) };
    },
  };
}
