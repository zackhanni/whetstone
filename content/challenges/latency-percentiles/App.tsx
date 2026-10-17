import { fractionWithin, percentile, summarize, toBuckets } from "./latency";

const repeat = (n: number, ms: number) => Array.from({ length: n }, () => ms);

export default function App() {
  const tail = summarize([...repeat(98, 10), 2000, 2000]);
  const latencies = [300, 5, 1200, 40];
  const p60 = percentile(latencies, 60);
  const buckets = toBuckets([50, 150, 250, 900, 4000], [100, 300, 1000]);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Latency, 98 × 10 ms + 2 × 2 s</h3>
      <div>mean {tail.meanMs} ms · p50 {tail.p50Ms} · p95 {tail.p95Ms} · p99 {tail.p99Ms} · max {tail.maxMs}</div>

      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>p60 of [300, 5, 1200, 40]</h3>
      <div>{p60} ms (expected 300) · input afterwards: [{latencies.join(", ")}]</div>

      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Buckets for 50, 150, 250, 900, 4000 ms</h3>
      {buckets.map((b) => (
        <div key={b.le}>
          le={b.le === Infinity ? "+Inf" : b.le} count={b.count}
        </div>
      ))}
      <div>within 300 ms: {String(fractionWithin(buckets, 300))} (expected 0.6)</div>
      <div>within 250 ms: {String(fractionWithin(buckets, 250))} (expected null)</div>
    </div>
  );
}
