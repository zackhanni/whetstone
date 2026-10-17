import { billedMinutes, finishRunning, queueRun, shouldRun } from "./ci-planner";
import { emptyGroup, type GitEvent, type Triggers } from "./workflow";

const ci: Triggers = {
  pull_request: { branches: ["main"], pathsIgnore: ["docs/**", "**/*.md"] },
  push: { branches: ["main"] },
};

const events: [string, GitEvent, string][] = [
  ["PR feature/login → main", { kind: "pull_request", activity: "opened", base: "main", head: "feature/login", changedFiles: ["src/login.ts"] }, "runs"],
  ["stacked PR feature/login-ui → feature/login", { kind: "pull_request", activity: "opened", base: "feature/login", head: "feature/login-ui", changedFiles: ["src/ui.tsx"] }, "skipped"],
  ["that PR retargeted onto main (edited)", { kind: "pull_request", activity: "edited", base: "main", head: "feature/login-ui", changedFiles: ["src/ui.tsx"] }, "skipped"],
  ["PR changing docs/ and src/", { kind: "pull_request", activity: "synchronize", base: "main", head: "fix/typo", changedFiles: ["docs/setup.md", "src/login.ts"] }, "runs"],
  ["PR changing only Markdown", { kind: "pull_request", activity: "synchronize", base: "main", head: "fix/typo", changedFiles: ["docs/setup.md", "README.md"] }, "skipped"],
];

export default function App() {
  let group = emptyGroup();
  for (const id of ["push-1", "push-2", "push-3", "push-4"]) group = queueRun(group, id);
  const afterFirst = finishRunning(group);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>CI dry run</h3>
      {events.map(([label, event, expected]) => {
        const actual = shouldRun(ci, event) ? "runs" : "skipped";
        return (
          <div key={label} style={{ color: actual === expected ? "#137333" : "#b00020" }}>
            {label}: {actual} (expected {expected})
          </div>
        );
      })}
      <h4 style={{ fontFamily: "system-ui, sans-serif" }}>Four quick pushes, one concurrency group</h4>
      <div>running: {group.running} · waiting: {group.pending ?? "—"} · cancelled: {group.cancelled.join(", ") || "—"}</div>
      <div>after {group.running} finishes, running: {afterFirst.running ?? "—"}</div>
      <h4 style={{ fontFamily: "system-ui, sans-serif" }}>Billing</h4>
      <div>four 40 s jobs: {billedMinutes([40, 40, 40, 40])} min (expected 4)</div>
      <div>one 160 s job: {billedMinutes([160])} min (expected 3)</div>
    </div>
  );
}
