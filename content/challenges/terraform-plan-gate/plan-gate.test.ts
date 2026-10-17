import { describeChange, needsApproval, summarizePlan } from "./plan-gate";
import type { PlanSummary, ResourceChange } from "./plan-json";
import {
  createBeforeDestroyPlan,
  driftPlan,
  envChangePlan,
  importPlan,
  importThenReplacePlan,
  movedPlan,
  renameWithoutMovedPlan,
} from "./sample-plans";

const change = (actions: ResourceChange["change"]["actions"]): ResourceChange => ({
  address: "random_pet.example",
  mode: "managed",
  type: "random_pet",
  name: "example",
  change: { actions },
});

/** Compare as one string so a failure shows every number at once. */
const asLine = (s: PlanSummary) =>
  `${s.import} to import, ${s.add} to add, ${s.change} to change, ${s.destroy} to destroy`;

describe("describeChange", () => {
  it("describes a create, an in-place update and a destroy", () => {
    expect(describeChange(change(["create"]))).toBe("create");
    expect(describeChange(change(["update"]))).toBe("update");
    expect(describeChange(change(["delete"]))).toBe("destroy");
  });

  it("describes both replacement orderings as replace", () => {
    expect(describeChange(change(["delete", "create"]))).toBe("replace");
    expect(describeChange(change(["create", "delete"]))).toBe("replace");
  });
});

describe("summarizePlan", () => {
  it("counts nothing for no-op changes and data-source reads", () => {
    const quiet = {
      ...movedPlan,
      resource_changes: [...movedPlan.resource_changes, createBeforeDestroyPlan.resource_changes[0]],
    };
    expect(asLine(summarizePlan(quiet))).toBe("0 to import, 0 to add, 0 to change, 0 to destroy");
  });

  it("counts a replacement as one add and one destroy, not as a change", () => {
    const onlyReplace = { ...envChangePlan, resource_changes: [change(["delete", "create"])] };
    expect(asLine(summarizePlan(onlyReplace))).toBe("0 to import, 1 to add, 0 to change, 1 to destroy");
  });

  it("counts an import once, whether its action is a no-op or a replacement", () => {
    expect(summarizePlan(importPlan).import).toBe(1);
    expect(summarizePlan(importThenReplacePlan).import).toBe(1);
  });
});

// Whole plans, checked against the line Terraform printed. Each one exercises several of the
// rules above, so these go green only once bugs 1–4 are all fixed.
describe("summarizePlan — real Terraform plans", () => {
  it("matches Terraform's line for the import plan: 1 to import, 0 to add, 0 to change, 0 to destroy", () => {
    expect(asLine(summarizePlan(importPlan))).toBe("1 to import, 0 to add, 0 to change, 0 to destroy");
  });

  it("matches Terraform's line for the env-change plan: 2 to add, 1 to change, 2 to destroy", () => {
    expect(asLine(summarizePlan(envChangePlan))).toBe("0 to import, 2 to add, 1 to change, 2 to destroy");
  });

  it("matches Terraform's line for create_before_destroy plus a data read: 3 to add, 1 to change, 3 to destroy", () => {
    expect(asLine(summarizePlan(createBeforeDestroyPlan))).toBe(
      "0 to import, 3 to add, 1 to change, 3 to destroy",
    );
  });

  it("matches Terraform's line for an import that forces a replacement", () => {
    expect(asLine(summarizePlan(importThenReplacePlan))).toBe(
      "1 to import, 1 to add, 0 to change, 1 to destroy",
    );
  });

  it("matches Terraform's line for drift, for a moved block and for a rename without one", () => {
    expect(asLine(summarizePlan(driftPlan))).toBe("0 to import, 1 to add, 0 to change, 0 to destroy");
    expect(asLine(summarizePlan(movedPlan))).toBe("0 to import, 0 to add, 0 to change, 0 to destroy");
    expect(asLine(summarizePlan(renameWithoutMovedPlan))).toBe(
      "0 to import, 1 to add, 0 to change, 1 to destroy",
    );
  });
});

describe("needsApproval", () => {
  it("requires approval for a replacement in either order", () => {
    expect(needsApproval({ ...envChangePlan, resource_changes: [change(["delete", "create"])] })).toBe(true);
    expect(needsApproval({ ...envChangePlan, resource_changes: [change(["create", "delete"])] })).toBe(true);
  });

  it("requires approval for a plain destroy but not for creates, updates, moves or matching imports", () => {
    expect(needsApproval(renameWithoutMovedPlan)).toBe(true);
    expect(needsApproval(driftPlan)).toBe(false);
    expect(needsApproval(movedPlan)).toBe(false);
    expect(needsApproval(importPlan)).toBe(false);
    expect(needsApproval({ ...envChangePlan, resource_changes: [change(["update"])] })).toBe(false);
  });
});
