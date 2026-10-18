# Readability audit

Findings from `/readability` runs and what was decided about each. Read before the next run: a
declined or deferred item here is a decision, not an open finding.

## Round 1 — 2026-10-17 — scope: all app code

- **Scope:** `app/`, `components/` (not `components/ui/`), `lib/`, `learning/`, `scripts/`: 44 files,
  about 4,400 lines. Out of scope: tests, `components/ui/*` (shadcn), everything under `content/`
  (lesson data and learner-facing challenge code).
- **Method:** two read-only reviewers (authoring + lib; app + components) against the readability
  checklist, every finding verified before applying. Mechanical checks first: no pass-through
  re-exports (two greps); a TypeScript-AST scan found 2 nested ternaries, both a 2-way string
  inside JSX, judged not worth changing.
- **Gates:** baseline `pnpm check` green; after each batch `pnpm check` (136 tests, 47 headless
  challenges) and `pnpm build` green; `pnpm test:challenges:browser` 47/47 in Sandpack; browser
  repros for the UI bugs pass under `pnpm dev` and `next start`.
- **A readability pass says nothing about correctness.** The bugs below were found because the
  reviewers were asked for bugs separately, not by the readability checklist.

### Applied — comments (no code change)

- `learning/validate-content.ts`: progress is keyed `track/unit`, not by unit slug (moving a unit
  orphans saved progress); `markdownProblem` also covers cards; `readmeProblems` doc lists all its
  checks; a stale nested-path reason removed; the grader message names `.test.ts` too.
- `components/progress-provider.tsx`: the Zustand migration trigger has fired; how `record` works.
- `components/tag-chips.tsx`: the real tooltip mechanism (no `title`, no Popover).
- `components/challenge-runner.tsx`: why the provider remounts on Show solution.
- `learning/schema.ts`: only quizzes shuffle; the first `accept` entry is the answer shown (also
  at the fill-blank render).
- `learning/taxonomy.ts`, `lib/tags.ts`: node count (~160), depth (5), roots, the tag-commit rule.
- Smaller ones in `sandbox.ts`, `progress.ts`, `drill-history.ts`, `interests-store.ts`,
  `feedback.ts`, `content.ts`, `inline-markdown.tsx` (JSDoc moved onto the component),
  `unit-view.tsx`, `whetstone-button.tsx`, `app/page.tsx`, `app/learn/[track]/[unit]/page.tsx`.
- Comments on persisted shapes instead of renames: `ProgressMap`'s key, `DrillAttempt.at`,
  `Stored.v`, the drill id.

### Applied — renames

`describe` → `describeError`; `ts`/`us`/`tDir`/`uDir` → `trackSlug`/`unitSlug`/`trackDir`/`unitDir`;
`readingIds` → `exampleIds`; `ReadingExample` → `MdxFile`; `matches` → `matchesInterests`;
`effTotal` → `currentTotal`; `MAX`/`key` → `MAX_ATTEMPTS`/`storageKey`; `UnitRef` → `UnitLink`;
`drillId` → `unitId`; `checked` → `hasSubmitted` (3 renderers); `q`/`p`/`s` → `item`; component
`UnitProgress` → `UnitProgressStatus`; `ExampleCard` → `ExampleView`; `fmt` → `formatClock`;
`LABELS`/`DIFFICULTY` → `BLOCK_LABEL`/`DIFFICULTY_LABEL`; `open` → `expanded` (interest filter).
No persisted or wire field was renamed.

### Applied — structure

- `unitProgressId(trackSlug, unitSlug)` builds the progress key at all 4 sites (byte-identical).
- One `TIERS`, in `learning/tiers.ts`. Not in `schema.ts`: importing it from there put zod and the
  whole schema into the lesson page's client JS (+66.5 KB, measured).
- Renderer item types derived from the schema (`Extract<Block, …>`); the hand copies had drifted.
- Named `hasAnswer`/`hasSelection` instead of each test written twice with opposite logic.
- `checkInBrowserChallenge` split into pure helpers; an options object for the two dependency maps.
- Constants (`FENCED_CODE`, `BLANK_TOKEN`, the browser check's timeouts), `satisfies` on the label
  maps, shared `isBetterAttempt`, `resetAttempt(mode)`, Sandpack's own `SandpackFile` type, the
  unreachable "No tracks yet" branch removed, unused exports dropped.

### Applied — bugs (behaviour changes, each reproduced first)

| | Bug | Fix |
| - | - | - |
| D1 | The challenge editor dropped the learner's edits on every re-render (any tab click; every second in drill mode): `files`/`customSetup` were new objects each render, and Sandpack resets its file state when they change. | `useMemo` for `files`, `customSetup`, `options` (`challenge-runner.tsx`). |
| D2 | _Run tests_ after the preview had loaded showed an empty panel (dev) or one that never updated (production): the tests panel mounted only on that press, after Sandpack had started, and got a client the provider never wired up. | Both panels stay mounted; the tab hides one. |
| D3 | Retry or a mode switch cleared the tally but left the old answers on screen, uncounted. | Graded blocks are keyed by an attempt counter (challenges keep their code). |
| D4 | Predict-output self-grades never reached the saved drill score (✓/✗ appeared only after Finish had saved it). | Owner's design: _Reveal_ and ✓/✗ are available during a drill; the prediction locks once revealed; Finish locks the grade. Drill text says so. |
| D5 | The quiz option row was a component declared inside `QuestionView`: every render remounted every option and keyboard focus fell to `<body>`. | `OptionRow` at module level. |
| D6 | The validator scanned challenge source three different ways (regex lexers): a `/*` in a regex hid later imports and duplicate test names; an apostrophe in JSX text plus a later comment failed the gate; `vi.` in a comment failed it. | One TypeScript-AST scan per file; same results on all 246 real challenge files; `.only`/`.skip`/`.each` names now checked. |
| D7 | The validator accepted an `entry` the loader rejects (`./x.tsx`, `README.md`, `solution.tsx`). | Entry must be a starter file, written without `./`. |
| D8 | A `.DS_Store` crashed `pnpm test:challenges:browser` (ENOTDIR). | Directory-only listing. |
| D9 | Links in readings and explanations opened in the same tab, losing answers in progress. | New tab, like the other links. |
| D10 | An invisible character in a challenge `meta.json` that also failed the schema was never reported. | One `readContentJson` helper checks strings before the schema, for all four JSON kinds. |

### Not applied

- **Deferred:** `accept`/`acceptable` and `prompt`/`question` name the same concepts differently
  across renderers. They are content fields, so a note, not a rename; not in this round's approval.
- **Done in `/condense` round 1 (same day):** `docs/zustand-migration.md`'s stale "drill history
  is on Context" claim and `docs/handoff.md`'s "statement-level import scan" are corrected.
- **Listed, not offered (low value, no drift yet):** a shared `ResultPanel` (quiz/fill-blank), one
  `Mode`/`OnResult` type, a `finishDrill()` extraction, moving `unitOwner`/`referencedChallenges`
  onto `Run`, `UnitSummary.difficulty` typed as the enum, the reading/card error-label prefix, and
  `loadUnit` building paths without `resolveWithin` (unreachable: both routes set
  `dynamicParams = false`).
