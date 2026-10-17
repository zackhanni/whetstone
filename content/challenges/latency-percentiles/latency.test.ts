import { fractionWithin, percentile, summarize, toBuckets } from "./latency";

/** n copies of ms. */
const repeat = (n: number, ms: number) => Array.from({ length: n }, () => ms);
/** from, from + 1, … to. */
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Five requests and three bounds; cumulative counts are 1, 3, 4, then 5 for +Inf.
const samples = [50, 150, 250, 900, 4000];
const bounds = [100, 300, 1000];
const cumulative = [
  { le: 100, count: 1 },
  { le: 300, count: 3 },
  { le: 1000, count: 4 },
  { le: Infinity, count: 5 },
];

describe("summarize", () => {
  it("shows the slow tail the mean hides", () => {
    const s = summarize([...repeat(98, 10), 2000, 2000]);
    expect(`${s.count} mean=${s.meanMs} p50=${s.p50Ms} p95=${s.p95Ms} p99=${s.p99Ms} max=${s.maxMs}`).toBe(
      "100 mean=49.8 p50=10 p95=10 p99=2000 max=2000",
    );
  });
});

describe("percentile", () => {
  it("sorts numerically, on a copy that leaves the caller's array in its order", () => {
    const latencies = [300, 5, 1200, 40];
    // Sorted numerically: 5, 40, 300, 1200. p60 → rank ceil(2.4) = 3 → 300.
    expect(percentile(latencies, 60)).toBe(300);
    expect(latencies.join(",")).toBe("300,5,1200,40");
  });

  it("uses a 1-based nearest rank: p50 of 101…200 is 150, p99 is 199, p100 is 200, and p50 of 10, 20, 30, 40, 50 is 30", () => {
    const hundred = range(101, 200);
    expect(`${percentile(hundred, 50)} ${percentile(hundred, 99)} ${percentile(hundred, 100)}`).toBe(
      "150 199 200",
    );
    // A rank that isn't a whole number: ceil(0.5 × 5) = 3, so the 3rd of five values.
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
  });
});

describe("toBuckets", () => {
  it("is cumulative: each le counts every sample at or below it, and +Inf counts them all", () => {
    const buckets = toBuckets(samples, bounds);
    expect(buckets.map((b) => `${b.le}:${b.count}`).join(" ")).toBe("100:1 300:3 1000:4 Infinity:5");
    // `le` is "less than or EQUAL": a sample exactly on a bound counts in that bound's bucket.
    const onBounds = toBuckets([100, 300], [100, 300]);
    expect(onBounds.map((b) => `${b.le}:${b.count}`).join(" ")).toBe("100:1 300:2 Infinity:2");
  });
});

describe("fractionWithin", () => {
  it("reads the share within an existing bucket bound", () => {
    expect(fractionWithin(cumulative, 300)).toBe(0.6);
    expect(fractionWithin(cumulative, 1000)).toBe(0.8);
  });

  it("returns null for a threshold that no bucket ends at", () => {
    expect(fractionWithin(cumulative, 250)).toBeNull();
  });

  it("checks a 99%-within-300-ms objective end to end: toBuckets output fed to fractionWithin gives 0.995", () => {
    const day = [...repeat(985, 120), ...repeat(10, 280), ...repeat(5, 900)];
    expect(fractionWithin(toBuckets(day, bounds), 300)).toBe(0.995);
  });
});
