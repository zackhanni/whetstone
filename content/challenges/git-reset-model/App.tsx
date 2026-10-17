import { reset } from "./reset";
import { demoRepo, status, type ResetMode } from "./repo";

const modes: ResetMode[] = ["soft", "mixed", "hard"];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>git reset --&lt;mode&gt; HEAD~1</h3>
      <div style={{ color: "#666", marginBottom: 12 }}>before: {status(demoRepo()).join("  ·  ") || "(clean)"}</div>
      {modes.map((mode) => {
        let lines: string;
        try {
          const after = reset(demoRepo(), mode, "HEAD~1");
          lines = status(after).join("  ·  ") || "(clean)";
        } catch (error) {
          lines = `threw: ${(error as Error).message}`;
        }
        return (
          <div key={mode} style={{ marginBottom: 8 }}>
            <strong>--{mode}</strong>: {lines}
          </div>
        );
      })}
    </div>
  );
}
