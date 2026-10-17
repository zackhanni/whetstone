/**
 * Shapes for the latency helpers. Read-only support file — the logic lives in latency.ts.
 *
 * Real Prometheus metrics measure latency in seconds (`http_server_request_duration_seconds`);
 * this challenge uses whole milliseconds so the numbers stay readable.
 */

/**
 * One classic histogram bucket, Prometheus-style: `le` ("less than or equal") is the bucket's
 * inclusive upper bound, and `count` is how many samples were <= `le`. Buckets are cumulative,
 * and the last one has `le: Infinity` (Prometheus writes it `le="+Inf"`) and counts every sample.
 */
export type Bucket = { le: number; count: number };

export type LatencySummary = {
  count: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};
