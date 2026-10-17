import type { Plan, ResourceChange } from "./plan-json";

/**
 * Real plans, trimmed to the fields plan-json.ts keeps (a few also drop extra `["no-op"]`
 * entries, which change no count). Each was produced by Terraform 1.16.6 with the `random` and
 * `local` providers, and the comment above it is the summary line Terraform itself printed for
 * that plan.
 *
 * Read-only support file.
 */

const managed = (
  address: string,
  actions: ResourceChange["change"]["actions"],
  extra: Partial<ResourceChange> = {},
): ResourceChange => {
  const [type, name] = address.split(".").slice(-2);
  return { address, mode: "managed", type, name, change: { actions }, ...extra };
};

const plan = (resource_changes: ResourceChange[]): Plan => ({
  format_version: "1.2",
  terraform_version: "1.16.6",
  resource_changes,
});

/** `env` changed from staging to production. "Plan: 2 to add, 1 to change, 2 to destroy." */
export const envChangePlan = plan([
  managed("local_file.motd", ["delete", "create"], { action_reason: "replace_because_cannot_update" }),
  managed("random_pet.server", ["delete", "create"], { action_reason: "replace_because_cannot_update" }),
  managed("terraform_data.config", ["update"]),
]);

/**
 * The same change once `random_pet.worker` sets `create_before_destroy` and a data source
 * reads the file. "Plan: 3 to add, 1 to change, 3 to destroy."
 */
export const createBeforeDestroyPlan = plan([
  {
    address: "data.local_file.motd_back",
    mode: "data",
    type: "local_file",
    name: "motd_back",
    change: { actions: ["read"] },
    action_reason: "read_because_dependency_pending",
  },
  managed("local_file.motd", ["delete", "create"]),
  managed("random_pet.server", ["delete", "create"]),
  managed("random_pet.worker", ["create", "delete"]),
  managed("terraform_data.config", ["update"]),
]);

/** Someone edited the file by hand; the provider reports it gone. "Plan: 1 to add, 0 to change, 0 to destroy." */
export const driftPlan = plan([
  {
    address: "data.local_file.motd_back",
    mode: "data",
    type: "local_file",
    name: "motd_back",
    change: { actions: ["read"] },
    action_reason: "read_because_dependency_pending",
  },
  managed("local_file.motd", ["create"]),
  managed("random_pet.server", ["no-op"]),
  managed("terraform_data.config", ["no-op"]),
]);

/** A rename with a `moved` block. "Plan: 0 to add, 0 to change, 0 to destroy." */
export const movedPlan = plan([
  managed("local_file.motd", ["no-op"]),
  managed("random_pet.api", ["no-op"], { previous_address: "random_pet.worker" }),
  managed("random_pet.server", ["no-op"]),
]);

/** The same rename WITHOUT a `moved` block. "Plan: 1 to add, 0 to change, 1 to destroy." */
export const renameWithoutMovedPlan = plan([
  managed("random_pet.api", ["create"]),
  managed("random_pet.worker", ["delete"], { action_reason: "delete_because_no_resource_config" }),
]);

/** An `import` block whose configuration matches. "Plan: 1 to import, 0 to add, 0 to change, 0 to destroy." */
export const importPlan = plan([
  managed("local_file.motd", ["no-op"]),
  {
    ...managed("random_integer.port", ["no-op"]),
    change: { actions: ["no-op"], importing: { id: "8443,8000,8999" } },
  },
  managed("random_pet.server", ["no-op"]),
]);

/**
 * An `import` block whose configuration does NOT match (max = 9999 vs the real 8999), so the
 * imported object must be replaced. "Plan: 1 to import, 1 to add, 0 to change, 1 to destroy."
 */
export const importThenReplacePlan = plan([
  {
    ...managed("random_integer.port", ["delete", "create"]),
    change: { actions: ["delete", "create"], importing: { id: "8443,8000,8999" } },
    action_reason: "replace_because_cannot_update",
  },
]);
