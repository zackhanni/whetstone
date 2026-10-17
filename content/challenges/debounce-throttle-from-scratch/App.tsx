import { useMemo, useState } from "react";
import { debounce, throttle } from "./rate-limit";

// Type in the box and compare the three columns. Created once with useMemo, so every
// keystroke goes through the same debouncer and throttler.
export default function App() {
  const [raw, setRaw] = useState<string[]>([]);
  const [debounced, setDebounced] = useState<string[]>([]);
  const [throttled, setThrottled] = useState<string[]>([]);

  const onDebounced = useMemo(() => debounce((v: string) => setDebounced((xs) => [...xs, v]), 400), []);
  const onThrottled = useMemo(() => throttle((v: string) => setThrottled((xs) => [...xs, v]), 400), []);

  const column = (title: string, values: string[]) => (
    <div style={{ flex: 1 }}>
      <strong>
        {title} ({values.length})
      </strong>
      <ol style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, paddingLeft: 18 }}>
        {values.slice(-12).map((v, i) => (
          <li key={i}>{v || "(empty)"}</li>
        ))}
      </ol>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <input
        placeholder="Type quickly…"
        onChange={(e) => {
          const v = e.target.value;
          setRaw((xs) => [...xs, v]);
          onDebounced(v);
          onThrottled(v);
        }}
        style={{ width: "100%", padding: 6, marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 12 }}>
        {column("every keystroke", raw)}
        {column("debounced 400 ms", debounced)}
        {column("throttled 400 ms", throttled)}
      </div>
      <button onClick={() => onDebounced.flush()}>flush debounce</button>{" "}
      <button onClick={() => onDebounced.cancel()}>cancel debounce</button>
    </div>
  );
}
