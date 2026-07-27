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

### Reading frontmatter is not real YAML

`lib/frontmatter.ts` is a deliberately naive `key: value` parser (split on the _first_ colon).
So: `title: Derived state: delete the effect` works fine, but **don't quote values** —
`title: "Foo"` keeps the quotes in the rendered title. One line per key, no nesting, no lists.
Files are ordered by filename, so number them (`01-…mdx`, `02-…mdx`).

### Not every unit needs all five blocks

A _decision_ unit ("which tool owns this?") legitimately ends at `fill-blank`: there's no
surprising runtime output to predict and nothing to code. Reading + quiz + fill-blank is a
complete unit when the skill is judgment. Don't pad with a contrived challenge — but do check
that the neighbouring unit isn't already teaching the same thing (read the sibling `unit.json`
quiz ids before writing new ones; overlap is the most common review comment).

### Tags are a checked registry

Every `skills` entry on a track/unit/challenge must exist in `learning/taxonomy.ts` or
`pnpm validate` fails. Add the new tags **first**, with real `parents` (that's what powers
filtering/rollup). Adding a child to an existing leaf can break `lib/tags.test.ts` fixtures —
if it does, fix the fixture to use a still-leaf tag rather than flattening the taxonomy.

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
- `<Component>.tsx` — the **editable** file (the buggy starter). It's the _only_ editable file:
  everything else loads read-only, and `App.tsx` is hidden from the file list.
- `App.tsx` — the preview root; default-exports a component that renders `<Component/>`.
- `<Component>.test.tsx` (or `.test.ts` for a non-JSX grader — both are accepted) — the
  grader. **Jest-style, not Vitest:** no `import … from "vitest"` and no bare
  `import "vitest"`; use `@testing-library/react` + global `describe`/`it`; assert with plain
  matchers (`…textContent).toBe(…)`, `toBeTruthy()`, `toBeNull()`) — **no** `jest-dom` matchers
  like `toBeInTheDocument`. There is **no spy or mock library**: `vi.*`, `jest.fn`,
  `jest.spyOn`, `jest.mock` and fake timers are all undefined at runtime. To observe a call,
  swap the global by hand in the test and restore it in a `finally`; to control an async
  dependency, add a settable seam in a helper module (see `use-effect-fix-fetch/api.ts`); to
  observe subscriptions, expose a count from the support module (see
  `selector-store-subscription/counter-store.ts`).
- `solution.tsx` — the reference fix; **must export the same component name** as the entry
  (the runner swaps its contents into the editor for "Show solution"). The filename is
  hard-coded in `lib/content.ts` — it stays `solution.tsx` even when the entry is a `.ts` file.
- `README.md` — problem statement + acceptance checklist.

The **starter must fail** the tests and the **solution must pass** them. Any other files in
the folder load into the sandbox as read-only support files.

**No _additional_ sandbox dependencies.** `components/challenge-runner.tsx` hard-codes the
Sandpack dependency list, so exactly two families of import resolve: **React**, and
**`@testing-library/react` / `@testing-library/dom`** — which is why the grader may import React Testing Library
and nothing else. A challenge cannot `import "zustand"` /
`"@tanstack/react-query"` today — teach the _mechanism_ with a small hand-rolled support module
(e.g. `counter-store.ts` in `selector-store-subscription`) or a settable seam
(`use-effect-fix-fetch/api.ts`). Lifting that limit means adding an optional `dependencies`
field to the challenge schema **and** the runner.

Writing the grader — conventions that survive contact with Sandpack:

- Query by `data-testid`; assert on `.textContent` (strings, so `"2"` not `2`).
- To prove a re-render _didn't_ happen, render-count with a `useRef` counter shown in the DOM.
- Events dispatched outside RTL (e.g. `window.dispatchEvent(new Event("resize"))`) need an
  explicit `act(() => …)`; `fireEvent` already wraps itself.
- Timers are **real** — no confirmed fake-timer support. Keep the challenge's delay small
  (a `config.ts` constant the test imports beats a magic number) and `await` a slightly longer
  sleep. Keep the total suite under a couple of seconds.
- Module-level singletons (a store) leak between test cases: export a `reset()` and call it at
  the top of each case. RTL's auto-cleanup unmounts components between cases, so render
  counters restart at 1.
- Each planted bug should be caught by its **own** test — that's what makes a red run read like
  a to-do list. Say the fix order in a comment in the starter without writing the code.

### Smoke-running a grader headlessly (when it needs no DOM)

Rule 4 is graded in the browser, but a grader with **no RTL/DOM usage** (a pure-TS entry, e.g.
`nest-validation-pipe`) can be checked in seconds first, which catches a broken assertion or a
solution that doesn't actually pass before you open Sandpack. `pnpm test`'s `include` is scoped
to `lib/**` + `learning/**`, and there's no `--include` CLI flag, so point Vitest at a
throwaway config:

```bash
cat > /tmp/challenge.vitest.config.ts <<'EOF'
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { globals: true, environment: "node", include: ["content/challenges/<slug>/**/*.test.ts"] },
});
EOF
npx vitest run --root . --config /tmp/challenge.vitest.config.ts        # starter: MUST fail
# then temporarily copy solution.tsx over the entry, re-run (all pass), and restore the starter
```

`globals: true` supplies the jest-style `describe`/`it`/`expect` the sandbox provides. This is
a _smoke test_, not a substitute for the browser run: the module resolution, timers and
`@testing-library` behaviour inside Sandpack are still their own environment.

**IDE lint noise is expected here.** `content/challenges/**` is outside `tsconfig.json`, so the
editor flags `describe`/`it`/`expect` as undefined in every challenge test. That's not a
breakage — don't "fix" it by importing `vitest` (which breaks the Sandpack runner) or by pulling
the folder into the app's type-check.

## Rules the system enforces (don't fight them)

Rule 1 is checked by `zod` (`learning/schema.ts`). **Rule 2** (each reading tier has ≥1
example) is checked by **`scripts/validate.ts`** (`pnpm validate`), which also re-runs schema
validation, the taxonomy registry + every `skills` tag, and the challenge contract across every
track/unit: entry resolves inside the folder, and for `in-browser` challenges that `App.tsx`,
`solution.tsx`, `README.md` and a `*.test.tsx`/`*.test.ts` grader all exist, that the solution
isn't byte-identical to the starter, that **every bare import in every sandbox file resolves**
to a runner-provided package (`react`, `react-dom`, `@testing-library/react`,
`@testing-library/dom` — so `vitest`, `lodash`, `zustand` are all rejected, in `from` /
`import "x"` / `import("x")` / `require("x")` form), and that the grader uses no jest-dom
matcher and no absent spy/mock/fake-timer helper (`vi.*`, `jest.fn`, `jest.spyOn`,
`jest.mock`, `jest.useFakeTimers`, `jest.runAllTimers`, …). Every one of those fails only at
runtime inside the iframe otherwise. Widening the runner's dependency list means widening
`SANDBOX_PACKAGES` in the validator to match.

**Rule 3** (difficulty escalates down a unit) and the _behavioural_ half of **Rule 4** (starter
fails / solution passes) are still not auto-checked — rule 3 is an authoring guideline; rule 4 is
graded in the browser (Sandpack) and must be verified there by the author, since there's no
headless challenge-test run at authoring time (a known gap). Don't describe a rule as
auto-enforced until the validator actually checks it — and when you learn a rule the hard way,
prefer _teaching the validator_ over adding a paragraph here.

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

**Fix things at the highest layer that applies** — the same ladder `/improve-lesson` follows:

1. a **check** in `scripts/validate.ts` or a unit test (the machine enforces it forever),
2. the **schema** (`learning/schema.ts`) so the mistake can't be represented,
3. **this playbook** for judgment a machine can't check,
4. the **skills** (`.claude/skills/*/SKILL.md`) for procedure and ordering,
5. the **single lesson**, only when the problem really is one-off.

Every authoring session that teaches you something about the _system_ should end with a change
at layer 1–4, not just a lesson.

## Quality checklist (before a lesson is done)

- [ ] Each reading tier has ≥1 example; each example is the same idea at higher resolution
- [ ] Distractors are real misconceptions; every question/item has a teaching `explanation`
- [ ] Difficulty escalates; the challenge is genuinely harder than the quiz
- [ ] Challenge has starter + reference solution + tests; **the solution passes the tests**
- [ ] `zod` validation passes; every example/question/option has a stable `id`
- [ ] Skills tagged so search/recall works across tracks, and every tag exists in `learning/taxonomy.ts`
- [ ] It doesn't restate the neighbouring unit — you can say in one sentence what's new here
- [ ] `pnpm check` **and** `pnpm build` pass; the challenge verified in the browser
- [ ] `docs/lesson-changelog.md` + `docs/ROADMAP.md` updated; changes left **uncommitted** for review
