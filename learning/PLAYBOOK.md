# Whetstone — Lesson Authoring Playbook

> **Core principle:** a lesson earns its place only if it changes what the learner can
> _do_. Teach the mental model, then make them apply it under increasing pressure — and
> make every wrong answer teach.

This playbook holds the _judgment_; the machine-checkable rules live in
`learning/schema.ts`. When the two disagree, fix one of them — don't work around it.
Bias toward **simple**: add a field when a real need shows up, don't reshape the data in
anticipation.

## Anatomy of a lesson

Content is organized as **tracks → units → blocks**.

- **Track** — a coherent skill area (e.g. `react-hooks-and-rendering`). An ordered list of units.
- **Unit** — one focused concept you could learn in a sitting (e.g. `use-effect`). An ordered list of blocks.
- **Block** — a single interaction. Five types (below).

Everything lives in `content/`. Coding challenges live once in
`content/challenges/<slug>/` and are referenced by slug, so they're reusable and the
existing archive (`~/Documents/GitHub/software-engineer-job-test-folder`) imports cleanly
as tagged challenges.

## The five block types — and when to reach for each

| Block            | Use it to…                         | Quality bar                                                                                                                        |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `reading`        | Install the mental model           | A folder of example `.mdx` files per tier (Simple/Medium/Complex), **1..n each**. Each tier is the same idea at higher resolution. |
| `quiz`           | Check recognition / discrimination | A list of questions; distractors are _real_ misconceptions, not filler.                                                            |
| `fill-blank`     | Check recall of exact syntax/shape | A list of prompts; one concept per blank; accept reasonable equivalents.                                                           |
| `predict-output` | Expose subtle runtime behavior     | A list of snippets; reserve for the genuinely surprising (stale closures, batching, ordering).                                     |
| `challenge`      | Prove transfer to real code        | Real files + runnable tests + a reference solution. The tests are the grade.                                                       |

## Multiple examples & questions

Two simple rules cover "sometimes one isn't enough":

- **Readings** are a folder of example files per tier:
  `units/<unit>/reading/{simple,medium,complex}/*.mdx`, ordered by filename. Add an example
  by dropping in a new `.mdx` (with `id` + `title` frontmatter) — no JSON to edit. The app
  stacks tiers vertically (Simple → Complex) and lets the learner swipe sideways through the
  examples within a tier.
- **Assessment blocks** (`quiz`, `fill-blank`, `predict-output`) each hold a **list of items**
  (1..n). One question is just a one-item list. The app shows every item by default,
  shuffles their order, and shuffles each question's options — all at render time, keyed by
  `id`, so the stored JSON stays canonical (unshuffled). Set a question's
  `shuffleOptions: false` to pin order (e.g. "all of the above").

**Every example, question, and option carries a stable `id`.** That's the one thing we add
now to keep the future cheap.

### Designed to grow — not built yet

Deliberately _not_ implemented, but the shape above supports them as non-breaking additions
(an optional field + app logic). Don't pre-build them:

- **Pick-N / difficulty-mix quizzes** — "show 3 simple + 1 medium, random order." Later: a
  `present` config + per-item difficulty.
- **Rate-to-reorder** — surface the highest-rated example/question first. Later: a ratings
  store keyed by the ids that already exist.

## In-browser challenge contract

`runner: "in-browser"` challenges run in **Sandpack** (an in-browser bundler + a jest-style
test runner). The folder holds:

- `meta.json` — `runner: "in-browser"`, `entry: "<Component>.tsx"`, `stack: ["react","ts"]`.
- `<Component>.tsx` — the **editable** file (the buggy starter).
- `App.tsx` — the preview root; default-exports a component that renders `<Component/>`.
- `<Component>.test.tsx` — the grader. **Jest-style, not Vitest:** no `import … from "vitest"`;
  use `@testing-library/react` + global `describe`/`it`; assert with plain matchers
  (`…textContent).toBe(…)`, `toBeTruthy()`, `toBeNull()`) — **no** `jest-dom` matchers like
  `toBeInTheDocument`. No module mocking (`jest.mock` is unavailable); to control an async
  dependency, add a settable seam in a helper module (see `use-effect-fix-fetch/api.ts`).
- `solution.tsx` — the reference fix; **must export the same component name** as the entry
  (the runner swaps its contents into the editor for "Show solution").
- `README.md` — problem statement + acceptance checklist.

The **starter must fail** the tests and the **solution must pass** them. Any other files in
the folder load into the sandbox as read-only support files.

## Rules the system enforces (don't fight them)

Rule 1 is checked by `zod` (`learning/schema.ts`). **Rule 2** (each reading tier has ≥1
example) is checked by **`scripts/validate.ts`** (`pnpm validate`), which also re-runs
schema validation and the challenge folder/entry contract across every track/unit.
**Rule 3** (difficulty escalates down a unit) and **Rule 4** (starter fails / solution
passes the challenge tests) are _not_ auto-checked yet — rule 3 is an authoring guideline;
rule 4 is graded in the browser (Sandpack) and must be verified there by the author, since
there's no headless challenge-test run at authoring time (a known gap). Don't describe a
rule as auto-enforced until the validator actually checks it.

1. **Every quiz question / fill-blank / predict-output item has an `explanation`.** Wrong answers teach.
2. **Every reading tier — Simple, Medium, Complex — has at least one example.** This is what
   makes "read up on the go" work, and forces you to nail the simple version first.
3. **Difficulty escalates down a unit's `blocks` array.** Reading first; the challenge last.
4. **Every challenge ships with passing tests + a reference solution.** A challenge whose
   solution doesn't pass its own tests is a bug, not a lesson.

## Difficulty & tone

- `intro` — first contact; assume nothing.
- `core` — the working knowledge a senior is expected to have cold.
- `advanced` — the edge cases that separate "uses it" from "understands it."

Be direct. Prefer the smallest example that still shows the real hazard. When the wrong way
is a common habit, show the wrong way _and_ the right way side by side.

## Authoring flow

Use `/new-lesson`. It scaffolds against the schema, generates the blocks, and authors the
challenge, then gates on **`pnpm validate`** (zod schema + reading tiers + challenge
contract) and **`pnpm build`**. The challenge's own tests are graded **in the browser**
(Sandpack) and must be verified there — starter fails, solution passes — since there's no
headless challenge-test run yet (see Rule 4). If the skill can't express what a lesson
needs, that's a signal to improve the skill or the schema — not to hand-author around it.

## The self-improvement loop (autonomous + audit log)

Feedback (a 👎, a rating, a typed note) lands in `content/feedback/`. `/improve-lesson`
reads it and edits content **directly** — this repo's git history is the safety net.

- Make changes **small and frequent**: one logical edit per commit, with a clear message,
  so any change is trivially `git revert`-able.
- Append a one-line entry to `docs/lesson-changelog.md` for every change.
- **A `schemaVersion` bump is a louder event.** Land it as its own dedicated commit with the
  cross-lesson sweep isolated, so "what did the template change do to every lesson?" is one
  clean, reviewable diff — never tangled into content edits.
- When an improvement is _general_ (a better way to structure any lesson), fix the
  template/schema and sweep it across existing lessons — don't just patch the one lesson.

Feedback is often about the _interface_ (how a lesson is presented), not the content.
Capture which it is, because the fix lives in a different place (the app / ordering vs. the prose).

## Quality checklist (before a lesson is done)

- [ ] Each reading tier has ≥1 example; each example is the same idea at higher resolution
- [ ] Distractors are real misconceptions; every question/item has a teaching `explanation`
- [ ] Difficulty escalates; the challenge is genuinely harder than the quiz
- [ ] Challenge has starter + reference solution + tests; **the solution passes the tests**
- [ ] `zod` validation passes; every example/question/option has a stable `id`
- [ ] Skills tagged so search/recall works across tracks
- [ ] Small commit + `docs/lesson-changelog.md` updated
