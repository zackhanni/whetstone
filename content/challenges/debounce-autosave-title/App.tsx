import { useState } from "react";
import { EditableTitle } from "./EditableTitle";

export default function App() {
  const [saves, setSaves] = useState<string[]>([]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Rename collection</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Every save is logged below. The buggy version logs one per keystroke; a debounced
        one logs once after you stop typing (and once on blur).
      </p>
      <EditableTitle title="Untitled" onCommit={(t) => setSaves((s) => [...s, t])} />
      <ol style={{ color: "#334155", fontSize: 13 }}>
        {saves.map((s, i) => (
          <li key={i}>saved “{s}”</li>
        ))}
      </ol>
    </div>
  );
}
