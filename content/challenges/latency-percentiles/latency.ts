import type { Bucket, LatencySummary } from "./histogram";

/**
 * Latency helpers behind a service's status page: percentiles from raw samples, Prometheus-style
 * buckets, and "what share of requests finished within X ms?". Four bugs, in the order worth
 * fixing them:
 *   1. percentile sorts the numbers as strings — and sorts the caller's array in place.
 *   2. percentile's rank is off by one (and reads past the end for p100).
 *   3. toBuckets counts each sample in one bucket only, so the buckets aren't cumulative.
 *   4. fractionWithin answers for a threshold no bucket ends at, by borrowing the next bucket.
 */

/** Nearest-rank percentile: the smallest sample that at least p% of samples are <= to. */
export function percentile(samplesMs: number[], p: number): number {
  const sorted = samplesMs.sort();
  return sorted[Math.floor((p / 100) * sorted.length)];
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
  const buckets = [...boundsMs, Infinity].map((le) => ({ le, count: 0 }));
  for (const ms of samplesMs) {
    const bucket = buckets.find((b) => ms <= b.le);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/** Share of samples that took `thresholdMs` or less, or null when the buckets can't say. */
export function fractionWithin(buckets: Bucket[], thresholdMs: number): number | null {
  const total = buckets[buckets.length - 1].count;
  const bucket = buckets.find((b) => b.le >= thresholdMs);
  return bucket ? bucket.count / total : null;
}
