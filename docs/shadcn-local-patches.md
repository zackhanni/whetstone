# shadcn local patches

Changes made directly to generated `components/ui/*` files — which the wrapper convention
normally says to leave alone. Logged here because re-running the shadcn CLI **overwrites
these files**. After any `shadcn add` / update, re-check each entry below and re-apply if
the regenerated code still has the issue.

## Patches

### `data-checked` → `data-[state=checked]` — 2026-06-22
- **Files:** `components/ui/checkbox.tsx`, `components/ui/radio-group.tsx`
- **What:** the generated classNames used `data-checked:*` selectors for the checked state.
- **Why:** the installed `radix-ui` package emits `data-state="checked|unchecked"`, so
  `data-checked:*` never matched — the checked fill/border on radios and checkboxes didn't
  render. Switched all four occurrences in each file to `data-[state=checked]:*`.
- **On shadcn update:** check whether the registry now generates `data-[state=checked]`
  (then this patch is redundant — drop it) or still `data-checked` (re-apply). Verify
  visually: a selected quiz radio/checkbox should show the sky fill.
