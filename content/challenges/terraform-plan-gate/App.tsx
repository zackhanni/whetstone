import { needsApproval, summarizePlan } from "./plan-gate";
import type { Plan } from "./plan-json";
import {
  createBeforeDestroyPlan,
  driftPlan,
  envChangePlan,
  importPlan,
  importThenReplacePlan,
  movedPlan,
  renameWithoutMovedPlan,
} from "./sample-plans";

// What Terraform itself printed for each sample plan, to compare against.
const samples: [string, Plan, string][] = [
  ["env change", envChangePlan, "Plan: 2 to add, 1 to change, 2 to destroy."],
  ["create_before_destroy", createBeforeDestroyPlan, "Plan: 3 to add, 1 to change, 3 to destroy."],
  ["drift", driftPlan, "Plan: 1 to add, 0 to change, 0 to destroy."],
  ["moved", movedPlan, "Plan: 0 to add, 0 to change, 0 to destroy."],
  ["rename, no moved", renameWithoutMovedPlan, "Plan: 1 to add, 0 to change, 1 to destroy."],
  ["import block", importPlan, "Plan: 1 to import, 0 to add, 0 to change, 0 to destroy."],
  ["import block + replace", importThenReplacePlan, "Plan: 1 to import, 1 to add, 0 to change, 1 to destroy."],
];

function line(plan: Plan): string {
  const s = summarizePlan(plan);
  const imports = s.import > 0 ? `${s.import} to import, ` : "";
  return `Plan: ${imports}${s.add} to add, ${s.change} to change, ${s.destroy} to destroy.`;
}

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Plan gate — yours vs Terraform's</h3>
      {samples.map(([label, plan, terraform]) => {
        const ours = line(plan);
        return (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ color: "#666" }}>{label}</div>
            <div style={{ color: ours === terraform ? "#137333" : "#b00020" }}>yours: {ours}</div>
            <div>terraform: {terraform}</div>
            <div>{needsApproval(plan) ? "needs approval (deletes something)" : "may auto-apply"}</div>
          </div>
        );
      })}
    </div>
  );
}
