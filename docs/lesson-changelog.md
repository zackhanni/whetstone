# Lesson Changelog

Append-only audit log of content edits — especially the autonomous ones from
`/improve-lesson`. Newest first. One line per change:

`YYYY-MM-DD — <track>/<unit> — what changed — <commit sha>`

## Entries

- 2026-07-25 — taxonomy — added tags for the four new units: `async` (root area) → `timers`, `debounce`; `cleanup` (under `useEffect`), `derived-state`, `useSyncExternalStore`, `persistence`, `server-state`. `useEffect` is no longer a leaf, so `lib/tags.test.ts` moved its leaf assertion to `useMemo` and now covers the `useEffect → cleanup` edge. No `schemaVersion` change.
- 2026-07-25 — state-and-data-flow/zustand-basics — new unit: `create`, atomic vs object selectors, `set` shallow-merge, `getState`/`setState` outside React, `persist` + `partialize`/`version`/hydration gate, testing a singleton store; reading (simple ×2/medium/complex) + quiz (7) + fill-blank (4) + predict-output (3) + challenge `selector-store-subscription` (rebuild the store hook on `useSyncExternalStore` so selectors gate re-renders).
- 2026-07-25 — state-and-data-flow/context-vs-store-vs-server-state — new unit: triage of who _owns_ a value (Context = transport, client store, server cache, URL), the failure mode of each wrong choice, and how a real screen combines them; reading (simple ×2/medium/complex) + quiz (6) + fill-blank (3). No challenge — it's a decision unit.
- 2026-07-25 — react-hooks-and-rendering/untangling-effects — new unit: auditing a component with too many effects (derive → delete → fix deps/cleanup → extract), dependency arrays, StrictMode double-invoke, prop→state sync vs `key`; reading (simple ×2/medium/complex) + quiz (6) + fill-blank (3) + predict-output (3) + challenge `untangle-description-editor`.
- 2026-07-25 — react-hooks-and-rendering/debounced-input-and-autosave — new unit: debounced autosave with a `setTimeout` handle in a ref, commit-on-blur, unmount cleanup vs flush, out-of-order saves, debounce vs throttle; reading (simple ×2/medium/complex) + quiz (5) + fill-blank (3) + predict-output (3) + challenge `debounce-autosave-title`. Sourced from a real `EditableTitle` snippet.
- 2026-07-16 — taxonomy — added `learning/taxonomy.ts` (multi-parent DAG over the existing flat `skills` tags) + `pnpm validate` now checks: every content skill exists in the taxonomy, the registry is acyclic with resolvable parents, and warns on unused (orphan) tags. Seeded from the 25 skills currently in use; no content or `schemaVersion` change. Design: `docs/tags-design.md` (step 1 of 5).
- 2026-07-12 — state-and-data-flow/choosing-where-state-lives — new track + unit: choosing where state lives (local → lift → Context → client store → server state → URL); reading (simple/medium/complex) + quiz + fill-blank + predict-output + challenge `context-value-rerender` (memoize a Context value to stop needless consumer re-renders). References `docs/zustand-migration.md` as a live case study. — f050105
- 2026-06-17 — schema v1 — content model finalized: readings = example `.mdx` files per tier (1..n, folder convention); assessment blocks = lists of items with stable ids; randomization is render-time. useEffect lesson restructured to match.
- 2026-06-17 — react-hooks-and-rendering/use-effect — initial lesson authored (reading + quiz + fill-blank + predict-output + challenge `use-effect-fix-fetch`)
