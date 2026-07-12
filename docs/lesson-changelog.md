# Lesson Changelog

Append-only audit log of content edits — especially the autonomous ones from
`/improve-lesson`. Newest first. One line per change:

`YYYY-MM-DD — <track>/<unit> — what changed — <commit sha>`

## Entries

- 2026-07-12 — state-and-data-flow/choosing-where-state-lives — new track + unit: choosing where state lives (local → lift → Context → client store → server state → URL); reading (simple/medium/complex) + quiz + fill-blank + predict-output + challenge `context-value-rerender` (memoize a Context value to stop needless consumer re-renders). References `docs/zustand-migration.md` as a live case study.
- 2026-06-17 — schema v1 — content model finalized: readings = example `.mdx` files per tier (1..n, folder convention); assessment blocks = lists of items with stable ids; randomization is render-time. useEffect lesson restructured to match.
- 2026-06-17 — react-hooks-and-rendering/use-effect — initial lesson authored (reading + quiz + fill-blank + predict-output + challenge `use-effect-fix-fetch`)
