import { Counter } from "./Counter";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Counter</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Click &quot;Add 3&quot;, or &quot;Save +1&quot; twice quickly — the buggy version loses updates.
      </p>
      <Counter />
    </div>
  );
}
