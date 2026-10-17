import { debounce, throttle } from "./rate-limit";
import { WAIT_MS } from "./config";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A callback that records the first argument of every call. Anything that isn't a string (the
 * whole argument array passed as one argument, say) is recorded as such, so it can't pass.
 */
function recorder() {
  const calls: string[] = [];
  const fn = (value: string) =>
    void calls.push(typeof value === "string" ? value : `not a string: ${JSON.stringify(value)}`);
  return { calls, fn };
}

describe("debounce", () => {
  it("runs once, after the calls stop, with the last call's arguments", async () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, WAIT_MS);
    debounced("a");
    debounced("b");
    debounced("c");
    expect(calls.length).toBe(0);
    await sleep(WAIT_MS * 2);
    expect(calls.join(",")).toBe("c");
  });

  it("restarts the wait on every call", async () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, WAIT_MS);
    debounced("a");
    await sleep(WAIT_MS * 0.4);
    debounced("b"); // the wait starts again from here
    await sleep(WAIT_MS * 0.4);
    expect(calls.length).toBe(0);
    await sleep(WAIT_MS * 2);
    expect(calls.join(",")).toBe("b");
  });

  it("passes fn the `this` it was called with", async () => {
    const seen: unknown[] = [];
    const editor = {
      save: debounce(function (this: unknown) {
        seen.push(this);
      }, WAIT_MS),
    };
    editor.save();
    await sleep(WAIT_MS * 2);
    expect(seen.length).toBe(1);
    expect(seen[0] === editor).toBe(true);
  });

  it("cancel() stops a pending run, and leaves nothing for flush() to run", async () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, WAIT_MS);
    debounced("draft");
    debounced.cancel();
    await sleep(WAIT_MS * 2);
    expect(calls.length).toBe(0);
    debounced.flush(); // a cancelled call is gone, not merely postponed
    expect(calls.length).toBe(0);
  });

  it("flush() runs a pending call immediately, and exactly once", async () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, WAIT_MS);
    debounced("draft");
    debounced.flush();
    expect(calls.join(",")).toBe("draft");
    debounced.flush(); // nothing is pending any more
    expect(calls.join(",")).toBe("draft");
    await sleep(WAIT_MS * 2); // the pending timer must not run it a second time
    expect(calls.join(",")).toBe("draft");
  });

  it("flush() does nothing when nothing is pending", async () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, WAIT_MS);
    debounced.flush(); // never called
    expect(calls.length).toBe(0);
    debounced("draft");
    await sleep(WAIT_MS * 2); // the run has already happened
    debounced.flush();
    expect(calls.join(",")).toBe("draft");
  });
});

describe("throttle", () => {
  it("runs the first call immediately", () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, WAIT_MS);
    throttled("a");
    expect(calls.join(",")).toBe("a");
  });

  it("collapses a burst into one trailing run with the latest arguments", async () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, WAIT_MS);
    throttled("a");
    throttled("b");
    throttled("c");
    expect(calls.join(",")).toBe("a");
    await sleep(WAIT_MS * 2);
    expect(calls.join(",")).toBe("a,c");
  });

  it("runs a single call only once", async () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, WAIT_MS);
    throttled("only");
    await sleep(WAIT_MS * 2);
    expect(calls.join(",")).toBe("only");
  });

  it("never runs twice within wait, even during a long burst", async () => {
    const runs: number[] = [];
    const throttled = throttle(() => void runs.push(Date.now()), WAIT_MS);
    // A fixed number of calls, not a fixed wall-clock window: a background tab stretches every
    // sleep, and a time-boxed loop would then make only one or two calls.
    for (let i = 0; i < 12; i++) {
      throttled();
      await sleep(WAIT_MS / 4);
    }
    await sleep(WAIT_MS * 2);
    expect(runs.length).toBeGreaterThan(2); // it keeps running during the burst
    for (let i = 1; i < runs.length; i++) {
      // A few ms of slack for clock rounding between Date.now() and the timer's own clock.
      expect(runs[i] - runs[i - 1]).toBeGreaterThanOrEqual(WAIT_MS - 5);
    }
  });

  it("cancel() drops the pending trailing run", async () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, WAIT_MS);
    throttled("a");
    throttled("b");
    throttled.cancel();
    await sleep(WAIT_MS * 2);
    expect(calls.join(",")).toBe("a");
  });
});
