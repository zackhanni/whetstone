import type { Bucket, LatencySummary } from "./histogram";

/** Nearest-rank percentile: the smallest sample that at least p% of samples are <= to. */
export function percentile(samplesMs: number[], p: number): number {
  // sort() without a comparator compares as strings ("1200" < "300") and sorts in place, so
  // copy first and compare numerically.
  const sorted = [...samplesMs].sort((a, b) => a - b);
  // Ranks are 1-based: p50 of 100 samples is the 50th value, which lives at index 49.
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.max(rank, 1) - 1];
}

export function summarize(samplesMs: number[]): LatencySummary {
  const total = samplesMs.reduce((sum, ms) => sum + ms, 0);
  return {
    count: samplesMs.length,
    meanMs: total / samplesMs.length,
    p50Ms: percentile(samplesMs, 50),
    p95Ms: percentile(samplesMs, 95),
    p99Ms: percentile(samplesMs, 99),
    maxMs: Math.max(...samplesMs),
  };
}

/** Classic histogram buckets for `boundsMs` (ascending) plus a final `le: Infinity`. */
export function toBuckets(samplesMs: number[], boundsMs: number[]): Bucket[] {
  // Cumulative: a 150 ms request is <= 300 AND <= 1000 AND <= +Inf, so it counts in all three.
  // That's what lets one bucket answer "how many finished within le?" on its own.
  return [...boundsMs, Infinity].map((le) => ({
    le,
    count: samplesMs.filter((ms) => ms <= le).length,
  }));
}

/** Share of samples that took `thresholdMs` or less, or null when the buckets can't say. */
export function fractionWithin(buckets: Bucket[], thresholdMs: number): number | null {
  const total = buckets[buckets.length - 1].count;
  // Only a bucket that ends exactly at the threshold knows the answer; any other bucket
  // mixes in requests on the wrong side of it. Prometheus's histogram guide says the same:
  // the "within 300 ms" query strictly requires a bucket boundary at 0.3 s.
  const bucket = buckets.find((b) => b.le === thresholdMs);
  if (!bucket || total === 0) return null;
  return bucket.count / total;
}
