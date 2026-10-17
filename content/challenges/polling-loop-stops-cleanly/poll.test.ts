import { startPolling } from "./poll";
import { INTERVAL_MS } from "./config";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Waits until `done()` is true, or gives up after `timeoutMs`. Used instead of one fixed sleep
 * where the test needs "it eventually polled again": a browser throttles timers in a background
 * tab, so a fixed 240 ms window can close before a correct poller's second timer fires.
 */
async function until(done: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!done() && Date.now() < deadline) await sleep(INTERVAL_MS);
}

/** A fake async task that records every call: how many, how many at once, and when. */
function fakeTask({ durationMs = 0, failOnCall }: { durationMs?: number; failOnCall?: number } = {}) {
  const stats = { calls: 0, inFlight: 0, maxInFlight: 0, starts: [] as number[], ends: [] as number[] };
  const task = async (): Promise<void> => {
    stats.calls += 1;
    const call = stats.calls;
    stats.inFlight += 1;
    stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
    stats.starts.push(Date.now());
    try {
      await sleep(durationMs);
      if (call === failOnCall) throw new Error(`poll ${call} failed`);
    } finally {
      stats.inFlight -= 1;
      stats.ends.push(Date.now());
    }
  };
  return { task, stats };
}

const ignoreErrors = () => {};

describe("startPolling", () => {
  it("runs the first poll immediately, not after an interval", async () => {
    const { task, stats } = fakeTask();
    const stop = startPolling(task, { intervalMs: INTERVAL_MS, onError: ignoreErrors });
    try {
      await sleep(INTERVAL_MS / 3);
      expect(stats.calls).toBe(1);
    } finally {
      stop();
    }
  });

  it("starts the next poll intervalMs after the previous one finishes, never overlapping", async () => {
    // Each poll takes twice the interval, like a slow server.
    const { task, stats } = fakeTask({ durationMs: INTERVAL_MS * 2 });
    const stop = startPolling(task, { intervalMs: INTERVAL_MS, onError: ignoreErrors });
    try {
      await until(() => stats.ends.length >= 2);
      expect(stats.calls).toBeGreaterThan(1); // it does keep polling
      expect(stats.maxInFlight).toBe(1);
      for (let i = 1; i < stats.starts.length; i++) {
        // A few ms of slack for clock rounding between Date.now() and the timer's own clock.
        expect(stats.starts[i] - stats.ends[i - 1]).toBeGreaterThanOrEqual(INTERVAL_MS - 5);
      }
    } finally {
      stop();
    }
  });

  it("reports a failed poll to onError and keeps polling", async () => {
    const { task, stats } = fakeTask({ failOnCall: 1 });
    const errors: unknown[] = [];
    const stop = startPolling(task, { intervalMs: INTERVAL_MS, onError: (e) => errors.push(e) });
    try {
      await until(() => stats.calls > 1);
      expect(errors.length).toBe(1);
      expect((errors[0] as Error).message).toBe("poll 1 failed");
      expect(stats.calls).toBeGreaterThan(1);
    } finally {
      stop();
    }
  });

  it("never starts another poll after stop() is called mid-poll", async () => {
    const { task, stats } = fakeTask({ durationMs: INTERVAL_MS * 2 });
    const stop = startPolling(task, { intervalMs: INTERVAL_MS, onError: ignoreErrors });
    await sleep(INTERVAL_MS / 2); // a poll is in flight now (if one has started at all)
    stop();
    const callsAtStop = stats.calls;
    await sleep(INTERVAL_MS * 5); // long enough for the in-flight poll to finish and reschedule
    expect(stats.calls).toBe(callsAtStop);
  });

  it("cancels the scheduled poll when stop() is called between polls", async () => {
    const { task, stats } = fakeTask();
    const stop = startPolling(task, { intervalMs: INTERVAL_MS, onError: ignoreErrors });
    await sleep(INTERVAL_MS / 2); // any first poll has finished; the next would be waiting
    stop();
    const callsAtStop = stats.calls;
    await sleep(INTERVAL_MS * 3);
    expect(stats.calls).toBe(callsAtStop);
  });
});
