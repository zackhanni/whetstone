import { createRateLimiter } from "./rate-limiter";

/** A scripted timeline on a fake clock: [time in ms, client key]. */
const SCRIPT: [number, string][] = [
  ...Array.from({ length: 7 }, (): [number, string] => [0, "alice"]),
  [0, "bob"],
  [400, "alice"],
  [2500, "alice"],
  [2500, "alice"],
  [3600000, "alice"],
  ...Array.from({ length: 6 }, (): [number, string] => [3600000, "alice"]),
];

export default function App() {
  let currentMs = 0;
  const limiter = createRateLimiter({ capacity: 5, refillPerSecond: 1, now: () => currentMs });

  const rows = SCRIPT.map(([atMs, key], i) => {
    currentMs = atMs;
    const decision = limiter.tryRemove(key);
    return (
      <div key={i} style={{ color: decision.allowed ? "#137333" : "#b00020" }}>
        t={atMs}ms {key}: {decision.allowed ? "allowed" : `429, Retry-After ${decision.retryAfterMs}ms`}
      </div>
    );
  });

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>capacity 5, refill 1 token/s</h3>
      {rows}
    </div>
  );
}
