import { commitsToReplay } from "./replay";
import { makeHistory } from "./history";

// The stacked-branch case: feature-b sits on feature-a, and main squash-merged feature-a as S.
const history = makeHistory(
  [
    ["Base", []],
    ["A1", ["Base"], "add a.txt"],
    ["A2", ["A1"], "tweak a.txt"],
    ["B1", ["A2"]],
    ["S", ["Base"], "add a.txt + tweak a.txt"],
  ],
  { main: "S", "feature-a": "A2", "feature-b": "B1" },
);

const runs: Array<[string, string, string]> = [
  ["git rebase main feature-b", "main", "feature-b"],
  ["git rebase --onto main feature-a feature-b", "feature-a", "feature-b"],
];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Which commits get replayed?</h3>
      {runs.map(([label, upstream, branch]) => {
        let picks: string;
        try {
          picks = commitsToReplay(history, upstream, branch).map((id) => `pick ${id}`).join("  ·  ") || "(nothing)";
        } catch (error) {
          picks = `threw: ${(error as Error).message}`;
        }
        return (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ color: "#666" }}>{label}</div>
            <div>{picks}</div>
          </div>
        );
      })}
    </div>
  );
}
