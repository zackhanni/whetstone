import { feedLine, parseEvent } from "./events";
import type { AppEvent } from "./types";

describe("parseEvent", () => {
  it("accepts a valid signup, payment and cancel", () => {
    expect(parseEvent({ kind: "signup", userId: "u1", email: "ada@example.com" }).ok).toBe(true);
    expect(parseEvent({ kind: "payment", userId: "u1", amountCents: 1200 }).ok).toBe(true);
    expect(parseEvent({ kind: "cancel", userId: "u1" }).ok).toBe(true);
    expect(parseEvent({ kind: "cancel", userId: "u1", reason: "too expensive" }).ok).toBe(true);
  });

  it("rejects a null body instead of throwing", () => {
    let result;
    try {
      result = parseEvent(null);
    } catch (err) {
      throw new Error(`parseEvent(null) threw instead of returning ok: false — ${String(err)}`);
    }
    expect(result.ok).toBe(false);
  });

  it("rejects a payment whose amountCents is not a number", () => {
    const result = parseEvent({ kind: "payment", userId: "u1", amountCents: "1200" });
    expect(result.ok).toBe(false);
  });

  it("rejects an event kind it doesn't know", () => {
    const result = parseEvent({ kind: "refund", userId: "u1", amountCents: 500 });
    expect(result.ok).toBe(false);
  });
});

describe("feedLine", () => {
  it("describes a cancel event, with the reason when there is one", () => {
    expect(feedLine({ kind: "cancel", userId: "u1", reason: "too expensive" })).toBe(
      "u1 cancelled: too expensive",
    );
    expect(feedLine({ kind: "cancel", userId: "u2" })).toBe("u2 cancelled");
  });

  it("throws for a kind that slipped past the types, instead of returning a fallback line", () => {
    // Types are erased: a stale cache or a cast can still hand feedLine a kind AppEvent doesn't have.
    const stale = { kind: "refund", userId: "u4" } as unknown as AppEvent;
    let line: string | undefined;
    let threw = false;
    try {
      line = feedLine(stale);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error(`feedLine returned ${JSON.stringify(line)} for an unknown kind`);
    expect(threw).toBe(true);
  });
});
