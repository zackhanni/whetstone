import type { ChangeKind, Plan, PlanSummary, ResourceChange } from "./plan-json";

/**
 * A CI step reads `terraform show -json tfplan`, prints a summary for the PR, and decides
 * whether the plan may be applied automatically. Five bugs, in the order worth fixing them:
 *   1. describeChange reads only actions[0], so both replacement orderings are misread.
 *   2. Anything that isn't create/delete is called an update — no-ops and data reads included.
 *   3. summarizePlan counts a replacement as a "change" instead of an add plus a destroy.
 *   4. summarizePlan never counts imports.
 *   5. needsApproval only notices a plain destroy, so a replacement auto-applies.
 */

export function describeChange(rc: ResourceChange): ChangeKind {
  const first = rc.change.actions[0];
  if (first === "create") return "create";
  if (first === "delete") return "destroy";
  return "update";
}

export function summarizePlan(plan: Plan): PlanSummary {
  const summary: PlanSummary = { import: 0, add: 0, change: 0, destroy: 0 };

  for (const rc of plan.resource_changes) {
    const kind = describeChange(rc);
    if (kind === "create") summary.add += 1;
    if (kind === "destroy") summary.destroy += 1;
    if (kind === "update" || kind === "replace") summary.change += 1;
  }

  return summary;
}

/** True when a human must approve the plan before it is applied. */
export function needsApproval(plan: Plan): boolean {
  return plan.resource_changes.some((rc) => describeChange(rc) === "destroy");
}
