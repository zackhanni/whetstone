import { useEffect, useRef, useState } from "react";
import { startPolling } from "./poll";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A live view of the poller against a "server" that is slower than the poll interval and
// fails on the third request. Watch "in flight" and what happens after the failure.
export default function App() {
  const [log, setLog] = useState<string[]>([]);
  const [maxInFlight, setMaxInFlight] = useState(0);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let calls = 0;
    let inFlight = 0;
    const add = (line: string) => setLog((lines) => [...lines.slice(-11), line]);

    const stop = startPolling(
      async () => {
        calls += 1;
        const n = calls;
        inFlight += 1;
        setMaxInFlight((m) => Math.max(m, inFlight));
        add(`poll ${n} started (${inFlight} in flight)`);
        try {
          await sleep(1500); // slower than the 1 s interval
          if (n === 3) throw new Error(`poll ${n}: 503 from the server`);
          add(`poll ${n} finished`);
        } finally {
          inFlight -= 1;
        }
      },
      { intervalMs: 1000, onError: (e) => add(`onError → ${(e as Error).message}`) },
    );

    stopRef.current = () => {
      stop();
      add("stop() called");
    };
    return stop;
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Status poller</h3>
      <p style={{ color: "#64748b", fontSize: 13 }}>
        Interval 1 s, each request takes 1.5 s, request 3 fails. Max in flight so far:{" "}
        <strong>{maxInFlight}</strong>
      </p>
      <button onClick={() => stopRef.current()}>Stop polling</button>
      <ol style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
