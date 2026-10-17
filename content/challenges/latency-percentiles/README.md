`latency.ts` powers a status page: a latency summary from raw samples, and Prometheus-style
histogram buckets with the question every latency objective asks — "what share of requests
finished within 300 ms?". It runs, prints plausible numbers, and is wrong in four ways that
are each easy to ship:

1. **`percentile` sorts as strings.** `Array.prototype.sort()` without a comparator compares
   values as strings, so `[300, 5, 1200, 40]` sorts to `[1200, 300, 40, 5]`. It also sorts the
   caller's array in place.
2. **The rank is off by one.** Nearest rank is 1-based: with `n` samples, `pN` is the value at
   rank `ceil(N / 100 × n)`, which lives at index `rank − 1`. Indexing at
   `floor(N / 100 × n)` returns the next value up whenever `N / 100 × n` is a whole number (p50
   of 100 samples), and `undefined` for p100.
3. **The buckets aren't cumulative.** A Prometheus bucket labelled `le="300"` counts every
   request that took 300 ms **or less** — including the ones already counted under
   `le="100"` — and the `+Inf` bucket counts all of them. Counting each sample once, in the
   first bucket it fits, draws a bar chart, not a histogram.
4. **`fractionWithin` answers questions the buckets can't.** A threshold between two bounds
   can't be answered from counts: the bucket that spans it mixes requests on both sides.
   Prometheus's histogram guide says its "within 300 ms" query strictly requires a bucket
   boundary at 0.3 s. Return `null` instead of borrowing the next bucket.

## Hints

- The first bug has two halves: copy before sorting, and give `sort` a comparator that
  compares numbers.
- For the rank, check your formula by hand on two cases: p50 of 100 values is the 50th value,
  and p50 of 5 values is the 3rd. `floor` minus one gets the first right and the second wrong.
- A cumulative bucket counts every sample at or below its bound — a count over all samples per
  bucket, not one bucket per sample.
- Only a bucket whose bound *equals* the threshold can answer; no such bucket means no answer.
