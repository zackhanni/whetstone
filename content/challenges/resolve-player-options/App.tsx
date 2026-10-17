import { resolveOptions } from "./options";
import type { PlayerOptions } from "./types";

const users: Record<string, PlayerOptions> = {
  "muted listener": { volume: 0, retry: {} },
  "no label on purpose": { label: "", retry: {} },
  "API sent null": { label: null, retry: {} },
  "cleared the autoplay field": { autoplay: undefined, retry: {} },
  "never opened Retry": {},
};

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Resolved player options</h3>
      {Object.entries(users).map(([who, saved]) => {
        let out: string;
        try {
          out = JSON.stringify(resolveOptions(saved));
        } catch (err) {
          out = `throws: ${(err as Error).message}`;
        }
        return (
          <div key={who} style={{ marginBottom: 10 }}>
            <div style={{ color: "#666" }}>{who}</div>
            <div>{out}</div>
          </div>
        );
      })}
    </div>
  );
}
