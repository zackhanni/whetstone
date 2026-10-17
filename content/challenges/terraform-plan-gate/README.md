A CI job runs `terraform plan -out=tfplan`, then `terraform show -json tfplan`, and hands the
JSON to `plan-gate.ts`. The gate does two things: it prints the same summary Terraform would
(`Plan: 1 to import, 2 to add, 1 to change, 2 to destroy.`) in the pull request, and it
decides whether the plan may be applied without a human looking at it.

`sample-plans.ts` holds seven real plans from Terraform 1.16.6, each with the summary line
Terraform printed for it. The preview shows your summary next to Terraform's.

Each entry in `resource_changes` carries `change.actions`, and the documented values are:

```text
["no-op"]   ["create"]   ["read"]   ["update"]   ["delete"]
["delete", "create"]    replace (destroy first — the default)
["create", "delete"]    replace with create_before_destroy
```

The gate works on the easy plans and is wrong on the dangerous ones:

1. **Replacements are misread.** Reading only `actions[0]` turns `["delete", "create"]` into
   a destroy and `["create", "delete"]` into a create.
2. **No-ops and reads look like updates.** Most entries in a real plan are `["no-op"]`, and a
   data source shows up as `["read"]`; neither changes anything.
3. **A replace is counted as a change.** Terraform counts objects: a replacement destroys one
   and creates one. "1 to change" means in-place updates only — a reviewer who skims for
   "destroy" must see the replaced database there.
4. **Imports are never counted.** An adopted object carries `change.importing`, whatever its
   `actions` are — usually `["no-op"]`, sometimes a replacement.
5. **The approval gate only catches a plain destroy.** A replacement also deletes an object,
   and with `create_before_destroy` its first action is `create`.

## Hints

- Decide "is this a replacement?" before looking at `actions[0]`: both orderings contain
  `"create"` and `"delete"`.
- Treat importing as its own counter, checked for every change, not as one more kind of action.
- The JSON format spells every deletion with a `"delete"` somewhere in `actions` so that a
  caller can scan for it. That is the whole approval rule.
