import { resolveOptions, signalReady } from "./options";
import type { PlayerOptions } from "./types";

// Every test except the retry one passes a retry object, so each test fails for one bug only.
const withRetry = (options: PlayerOptions): PlayerOptions => ({
  retry: { attempts: 1, delayMs: 100 },
  ...options,
});

describe("resolveOptions", () => {
  it("falls back to 3 attempts / 500 ms when retry settings are missing or null", () => {
    const missing = resolveOptions({});
    expect(missing.attempts).toBe(3);
    expect(missing.delayMs).toBe(500);

    const isNull = resolveOptions({ retry: null });
    expect(isNull.attempts).toBe(3);
    expect(isNull.delayMs).toBe(500);
  });

  it("keeps volume 0 (muted) instead of turning it back up", () => {
    expect(resolveOptions(withRetry({ volume: 0 })).volume).toBe(0);
    expect(resolveOptions(withRetry({})).volume).toBe(0.8);
  });

  it("keeps an empty label, and gives a null label the default", () => {
    expect(resolveOptions(withRetry({ label: "" })).label).toBe("");
    expect(resolveOptions(withRetry({ label: null })).label).toBe("Untitled");
  });

  it("gives a field that is present but undefined its default, and keeps autoplay false", () => {
    const cleared = resolveOptions(withRetry({ autoplay: undefined, startAt: undefined }));
    expect(cleared.autoplay).toBe(true);
    expect(cleared.startAt).toBe(0);

    expect(resolveOptions(withRetry({ autoplay: false })).autoplay).toBe(false);
  });
});

describe("signalReady", () => {
  it("calls onReady when there is one, and does nothing when there isn't", () => {
    let calls = 0;
    signalReady({ onReady: () => calls++ });
    expect(calls).toBe(1);

    let threw = false;
    try {
      signalReady({});
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
