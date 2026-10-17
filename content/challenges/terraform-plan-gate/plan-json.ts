/**
 * The slice of `terraform show -json <planfile>` this challenge reads. The full format is
 * documented in Terraform's "JSON output format" reference (format_version "1.x"); everything
 * here is copied from that shape, minus the fields a summary doesn't need.
 *
 * Read-only support file — the logic lives in plan-gate.ts.
 */

/**
 * The documented values of `change.actions` are exactly these arrays:
 *   ["no-op"]  ["create"]  ["read"]  ["update"]  ["delete"]
 *   ["delete", "create"]   — replace: destroy the old object, then create the new one (the default)
 *   ["create", "delete"]   — replace with `create_before_destroy`: create first, then destroy
 * A replacement is spelled as two actions so that a caller can scan for "delete" and catch every
 * plan that deletes something.
 */
export type Action = "no-op" | "create" | "read" | "update" | "delete";

export type ResourceChange = {
  address: string; // e.g. "random_pet.server", "module.api.aws_db_instance.this"
  previous_address?: string; // present when a `moved` block changed the address
  mode: "managed" | "data"; // "data" = a data source, which is only ever read
  type: string;
  name: string;
  change: {
    actions: Action[];
    importing?: { id: string }; // present when an `import` block adopts this object in this plan
  };
  action_reason?: string; // display hint, e.g. "replace_because_cannot_update"
};

export type Plan = {
  format_version: string;
  terraform_version: string;
  resource_changes: ResourceChange[];
};

/** How a reviewer reads one change. */
export type ChangeKind = "no-op" | "read" | "create" | "update" | "replace" | "destroy";

/** The numbers in Terraform's own line: "Plan: 1 to import, 2 to add, 1 to change, 2 to destroy." */
export type PlanSummary = { import: number; add: number; change: number; destroy: number };
