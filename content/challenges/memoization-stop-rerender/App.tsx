import { Parent } from "./Parent";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Memoization</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Click &quot;Tick&quot; a few times and watch the child&apos;s render count —
        the buggy version climbs on every unrelated tick.
      </p>
      <Parent />
    </div>
  );
}
