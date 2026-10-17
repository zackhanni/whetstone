import { createRateLimiter } from "./rate-limiter";

/** A clock the test moves by hand — no real waiting, so the results never depend on timing. */
function fakeClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("createRateLimiter (token bucket)", () => {
  it("lets a new key send `capacity` requests at once, then denies the next", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 5, refillPerSecond: 1, now: clock.now });
    for (let i = 0; i < 5; i++) expect(limiter.tryRemove("alice").allowed).toBe(true);
    expect(limiter.tryRemove("alice").allowed).toBe(false);
  });

  it("gives every key its own bucket, so one busy key never denies another", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 5, refillPerSecond: 1, now: clock.now });
    for (let i = 0; i < 6; i++) limiter.tryRemove("noisy-client");
    expect(limiter.tryRemove("quiet-client").allowed).toBe(true);
    expect(limiter.tryRemove("noisy-client").allowed).toBe(false);
  });

  it("never holds more than `capacity` tokens, however long a key sits idle", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 5, refillPerSecond: 1, now: clock.now });
    for (let i = 0; i < 5; i++) limiter.tryRemove("alice");

    clock.advance(60 * 60 * 1000); // an hour idle
    let allowed = 0;
    for (let i = 0; i < 20; i++) if (limiter.tryRemove("alice").allowed) allowed += 1;
    expect(allowed).toBe(5);
  });

  it("carries partial tokens over, so a client polling every 300 ms still averages one request a second", () => {
    const clock = fakeClock();
    // Capacity 2, so the cap never trims the fraction: the poller never holds more than 1.3.
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1, now: clock.now });
    expect(limiter.tryRemove("poller").allowed).toBe(true);
    expect(limiter.tryRemove("poller").allowed).toBe(true); // bucket now empty

    // 100 polls 300 ms apart: 30 s at 1 token/s is 30 tokens. 300 ms doesn't divide a second, so
    // a refill that keeps only whole tokens loses 0.2 of a token every 1.2 s and gets about 25.
    let allowed = 0;
    for (let poll = 0; poll < 100; poll++) {
      clock.advance(300);
      if (limiter.tryRemove("poller").allowed) allowed += 1;
    }
    // One less than 30 is fine: floating-point sums of 0.3 can put the last token a hair late.
    expect(allowed).toBeGreaterThanOrEqual(29);
    expect(allowed).toBeLessThanOrEqual(30);
  });

  it("reports retryAfterMs as the time until the next whole token, not until the bucket is full", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 5, refillPerSecond: 2, now: clock.now });
    for (let i = 0; i < 5; i++) expect(limiter.tryRemove("alice").retryAfterMs).toBe(0);

    const denied = limiter.tryRemove("alice");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBe(500); // one token at 2 tokens/s

    clock.advance(250); // half a token has refilled
    const sooner = limiter.tryRemove("alice");
    expect(sooner.allowed).toBe(false);
    expect(sooner.retryAfterMs).toBe(250); // only the missing half is left to wait for
  });

  it("doesn't spend a token on a denied request", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, now: clock.now });
    limiter.tryRemove("alice");
    for (let i = 0; i < 3; i++) expect(limiter.tryRemove("alice").allowed).toBe(false);

    clock.advance(1000);
    expect(limiter.tryRemove("alice").allowed).toBe(true);
    expect(limiter.tryRemove("alice").allowed).toBe(false);
  });
});
