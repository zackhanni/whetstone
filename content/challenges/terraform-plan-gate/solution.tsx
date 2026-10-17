import type { ChangeKind, Plan, PlanSummary, ResourceChange } from "./plan-json";

export function describeChange(rc: ResourceChange): ChangeKind {
  const { actions } = rc.change;
  // A replacement is two actions; their order only says whether the new object is created
  // before or after the old one is destroyed. Either way the old object is gone afterwards.
  if (actions.includes("create") && actions.includes("delete")) return "replace";
  switch (actions[0]) {
    case "create":
      return "create";
    case "delete":
      return "destroy";
    case "update":
      return "update";
    case "read":
      return "read"; // a data source: Terraform reads it and changes nothing
    default:
      return "no-op";
  }
}

export function summarizePlan(plan: Plan): PlanSummary {
  const summary: PlanSummary = { import: 0, add: 0, change: 0, destroy: 0 };

  for (const rc of plan.resource_changes) {
    // Importing is reported alongside the action, not instead of it: an import can be a no-op,
    // an update or even a replacement of the object being adopted.
    if (rc.change.importing) summary.import += 1;

    const kind = describeChange(rc);
    if (kind === "create") summary.add += 1;
    if (kind === "update") summary.change += 1;
    if (kind === "destroy") summary.destroy += 1;
    // Terraform counts objects: a replacement destroys one and creates one.
    if (kind === "replace") {
      summary.add += 1;
      summary.destroy += 1;
    }
  }

  return summary;
}

/** True when a human must approve the plan before it is applied. */
export function needsApproval(plan: Plan): boolean {
  // The JSON format spells every replacement with a "delete" in it precisely so that a scan
  // like this one catches destroys and both kinds of replacement.
  return plan.resource_changes.some((rc) => rc.change.actions.includes("delete"));
}
