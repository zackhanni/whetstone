import { Settings } from "./Settings";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Context re-render cost</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Click &quot;Tick&quot; and watch the label&apos;s render count — the buggy version climbs
        on every unrelated update, because the provider hands down a fresh value object.
      </p>
      <Settings />
    </div>
  );
}
