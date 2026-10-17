"Why didn't CI run on my PR?" and "why did we burn 2,000 minutes this month?" are both
questions about rules GitHub applies before a single step executes. `ci-planner.ts` is a dry
run of those rules for the workflow below; it gets the common cases right and the ones that
cost you an afternoon wrong.

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore: ["docs/**", "**/*.md"]
  push:
    branches: [main]
```

`workflow.ts` holds the types and `glob.ts` matches GitHub's `*` / `**` patterns, both
read-only. The rules, from GitHub's workflow syntax and billing docs:

1. **`branches` on `pull_request` means the branch the PR targets** — its base. A PR from
   `feature/login-ui` into `feature/login` (a stacked PR) does not match `branches: [main]`.
2. **`pull_request` without `types` listens for `opened`, `synchronize` and `reopened` only.**
   Retargeting a PR onto `main` is an `edited` event, so it doesn't start the workflow by itself.
3. **`paths-ignore` skips a run only when every changed file matches.** One file outside the
   ignored patterns is enough to run. (`paths` is the opposite: one matching file is enough.)
4. **A concurrency group runs one run and keeps at most one waiting.** When a newer run
   arrives, the waiting one is cancelled and the newcomer waits in its place, so the latest
   commit is what runs next. (This is the default; `queue: max` changes it.)
5. **Billing rounds each job up to a whole minute.** Four 40-second jobs bill 4 minutes; the
   same 160 seconds in one job bill 3.

## Hints

- The event already carries both branches; only one of them is the PR's target.
- `files.some(isIgnored)` asks "is anything ignored?" — the question here is "is everything
  ignored?".
- In `queueRun`, decide who gets cancelled when the group is full: the run that has been
  waiting, not the one that just arrived.
- Round inside the sum, not after it.
