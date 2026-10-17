import { sharedCacheDecision } from "./shared-cache";

const get = (headers: Record<string, string> = {}) => ({ method: "GET", headers });
const res = (cacheControl: string) => ({ headers: { "cache-control": cacheControl } });

describe("sharedCacheDecision", () => {
  it("serves a copy younger than max-age, and treats it as stale at max-age", () => {
    expect(sharedCacheDecision(get(), res("max-age=600"), 10)).toBe("fresh");
    expect(sharedCacheDecision(get(), res("max-age=600"), 600)).toBe("revalidate");
  });

  it("never stores no-store, or the answer to a POST", () => {
    expect(sharedCacheDecision(get(), res("no-store"), 0)).toBe("do-not-store");
    expect(
      sharedCacheDecision(get(), res("private, no-cache, no-store, max-age=0, must-revalidate"), 0),
    ).toBe("do-not-store");
    expect(sharedCacheDecision({ method: "POST", headers: {} }, res("max-age=600"), 0)).toBe(
      "do-not-store",
    );
  });

  it("stores a no-cache response but revalidates it on every reuse", () => {
    expect(sharedCacheDecision(get(), res("max-age=600, no-cache"), 0)).toBe("revalidate");
    expect(sharedCacheDecision(get(), res("max-age=600, no-cache"), 10)).toBe("revalidate");
    // no lifetime at all: still stored (no-cache is not no-store), still checked before reuse
    expect(sharedCacheDecision(get(), res("no-cache"), 0)).toBe("revalidate");
  });

  it("never stores a private response in a shared cache", () => {
    expect(sharedCacheDecision(get(), res("private, max-age=600"), 10)).toBe("do-not-store");
  });

  it("shares the answer to an authenticated request only when the response opts in", () => {
    const authed = get({ authorization: "Bearer abc123" });
    expect(sharedCacheDecision(authed, res("max-age=600"), 10)).toBe("do-not-store");
    expect(sharedCacheDecision(authed, res("public, max-age=600"), 10)).toBe("fresh");
    expect(sharedCacheDecision(authed, res("max-age=600, must-revalidate"), 10)).toBe("fresh");
    expect(sharedCacheDecision(authed, res("s-maxage=600"), 10)).toBe("fresh");
  });

  it("uses s-maxage as the lifetime when present, longer or shorter than max-age", () => {
    expect(sharedCacheDecision(get(), res("s-maxage=600"), 10)).toBe("fresh");
    expect(sharedCacheDecision(get(), res("max-age=60, s-maxage=600"), 300)).toBe("fresh");
    expect(sharedCacheDecision(get(), res("max-age=600, s-maxage=60"), 300)).toBe("revalidate");
  });

  it("serves stale inside the stale-while-revalidate window, and revalidates after it", () => {
    const cc = res("max-age=60, stale-while-revalidate=300");
    expect(sharedCacheDecision(get(), cc, 30)).toBe("fresh");
    expect(sharedCacheDecision(get(), cc, 120)).toBe("serve-stale-and-refresh");
    // the window starts when the copy goes stale (60 s), so it runs to 360 s, not 300 s
    expect(sharedCacheDecision(get(), cc, 330)).toBe("serve-stale-and-refresh");
    expect(sharedCacheDecision(get(), cc, 400)).toBe("revalidate");
  });

  it("never serves stale under must-revalidate, even inside the stale-while-revalidate window", () => {
    const cc = res("max-age=60, stale-while-revalidate=300, must-revalidate");
    expect(sharedCacheDecision(get(), cc, 30)).toBe("fresh");
    expect(sharedCacheDecision(get(), cc, 120)).toBe("revalidate");
  });
});
