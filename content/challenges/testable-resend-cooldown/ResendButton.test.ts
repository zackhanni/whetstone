import * as ResendButtonModule from "./ResendButton";

// Any fixed instant. These tests never read the real clock — that's the point.
const T = 1_000_000_000_000;

type SendResult = { ok: true; sentAt: number } | { ok: false; retryInSeconds: number };
type Exports = {
  resendLabel: (now: number, lastSentAt: number) => string;
  createCodeSender: (deps: {
    now: () => number;
    send: (email: string) => Promise<void>;
  }) => (email: string) => Promise<SendResult>;
};

/**
 * The starter doesn't have these exports yet: extracting them is the first step. Fetch each one
 * through this helper so a missing export fails with a message that says which step to do,
 * instead of a bare "is not a function".
 */
function exported<K extends keyof Exports>(name: K): Exports[K] {
  const value = (ResendButtonModule as Record<string, unknown>)[name];
  if (typeof value !== "function") {
    const step = name === "resendLabel" ? 1 : 4;
    throw new Error(
      `ResendButton.tsx doesn't export \`${name}\` yet — that's step ${step} in the comment at the top of the file.`,
    );
  }
  return value as Exports[K];
}

describe("resendLabel(now, lastSentAt)", () => {
  it("counts down from the time it is given, not the real clock", () => {
    const resendLabel = exported("resendLabel");
    expect(resendLabel(T + 5_000, T)).toBe("Resend in 55s");
  });

  it("offers a resend once exactly 60 seconds have passed", () => {
    const resendLabel = exported("resendLabel");
    expect(resendLabel(T + 59_000, T)).toBe("Resend in 1s");
    expect(resendLabel(T + 60_000, T)).toBe("Resend code");
  });

  it("rounds the seconds left up, so it never says 0s", () => {
    const resendLabel = exported("resendLabel");
    expect(resendLabel(T + 59_500, T)).toBe("Resend in 1s");
    expect(resendLabel(T + 59_900, T)).toBe("Resend in 1s"); // 0.1 s left is still a wait
    expect(resendLabel(T + 500, T)).toBe("Resend in 60s");
  });
});

/** A clock the test moves by hand, and a `send` that records instead of calling the network. */
function fakes() {
  let time = T;
  const sent: string[] = [];
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
    send: async (email: string) => {
      sent.push(email);
    },
    sent,
  };
}

describe("createCodeSender({ now, send })", () => {
  it("sends the first code straight away", async () => {
    const f = fakes();
    const requestCode = exported("createCodeSender")({ now: f.now, send: f.send });
    const result = await requestCode("ada@example.com");
    expect(result.ok).toBe(true);
    expect(f.sent.length).toBe(1);
    expect(f.sent[0]).toBe("ada@example.com");
  });

  it("refuses a second code inside the cooldown, without sending, and says how long to wait", async () => {
    const f = fakes();
    const requestCode = exported("createCodeSender")({ now: f.now, send: f.send });
    await requestCode("ada@example.com");
    f.advance(30_000);
    const halfway = await requestCode("ada@example.com");
    expect(halfway.ok).toBe(false);
    expect(halfway.ok === false && halfway.retryInSeconds).toBe(30);
    f.advance(29_900); // 0.1 s left: the wait rounds up, like the label
    const almost = await requestCode("ada@example.com");
    expect(almost.ok === false && almost.retryInSeconds).toBe(1);
    expect(f.sent.length).toBe(1);
  });

  it("sends again once 60 seconds have passed on the injected clock", async () => {
    const f = fakes();
    const requestCode = exported("createCodeSender")({ now: f.now, send: f.send });
    await requestCode("ada@example.com");
    f.advance(60_000);
    const result = await requestCode("ada@example.com");
    expect(result.ok).toBe(true);
    expect(f.sent.length).toBe(2);
  });

  it("sends only one code for a double click, even while the first send is still in flight", async () => {
    const f = fakes();
    const requestCode = exported("createCodeSender")({ now: f.now, send: f.send });
    // Both requests start before either finishes, like two clicks in quick succession.
    const [first, second] = await Promise.all([
      requestCode("ada@example.com"),
      requestCode("ada@example.com"),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(f.sent.length).toBe(1);
  });

  it("keeps a separate cooldown for each sender", async () => {
    const a = fakes();
    const b = fakes();
    const createCodeSender = exported("createCodeSender");
    const requestA = createCodeSender({ now: a.now, send: a.send });
    const requestB = createCodeSender({ now: b.now, send: b.send });
    await requestA("ada@example.com");
    const result = await requestB("bo@example.com");
    expect(result.ok).toBe(true);
    expect(b.sent.length).toBe(1);
  });
});
