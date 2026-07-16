# Lesson Changelog

Append-only audit log of content edits — especially the autonomous ones from
`/improve-lesson`. Newest first. One line per change:

`YYYY-MM-DD — <track>/<unit> — what changed — <commit sha>`

## Entries

- 2026-07-16 — taxonomy — added `learning/taxonomy.ts` (multi-parent DAG over the existing flat `skills` tags) + `pnpm validate` now checks: every content skill exists in the taxonomy, the registry is acyclic with resolvable parents, and warns on unused (orphan) tags. Seeded from the 25 skills currently in use; no content or `schemaVersion` change. Design: `docs/tags-design.md` (step 1 of 5).
- 2026-07-12 — state-and-data-flow/choosing-where-state-lives — new track + unit: choosing where state lives (local → lift → Context → client store → server state → URL); reading (simple/medium/complex) + quiz + fill-blank + predict-output + challenge `context-value-rerender` (memoize a Context value to stop needless consumer re-renders). References `docs/zustand-migration.md` as a live case study. — f050105
- 2026-06-17 — schema v1 — content model finalized: readings = example `.mdx` files per tier (1..n, folder convention); assessment blocks = lists of items with stable ids; randomization is render-time. useEffect lesson restructured to match.
- 2026-06-17 — react-hooks-and-rendering/use-effect — initial lesson authored (reading + quiz + fill-blank + predict-output + challenge `use-effect-fix-fetch`)
