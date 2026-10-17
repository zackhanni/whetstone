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

- **Track** — a coherent skill area (e.g. `react-hooks-and-rendering`). An ordered list of units
  (`track.json` → `units`). That list is the only thing that makes a unit visible, so a unit
  folder missing from it fails `pnpm validate`. A track carries no tags of its own: it shows the
  union of its units' `skills`.
- **Unit** — one focused concept you could learn in a sitting (e.g. `use-effect`). An ordered list
  of blocks. Its slug equals its folder name and is unique across **all** tracks, so a unit can be
  addressed by its slug alone (and moved to another track without a collision).
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

### Reading files are Markdown, with a two-key header

Despite the `.mdx` extension, readings are rendered by `react-markdown` + GFM
(`components/markdown.tsx`), **not** compiled as MDX. A JSX/HTML tag or an `import`/`export` line
outside code appears on the page as literal text, so keep all code in backticks or fenced blocks.

- **Go deeper.** Everything after a `<!--more-->` line folds into an optional "Go deeper"
  accordion under the example. Use it for the aside only some learners need (the edge case, the
  spec detail) so the main body stays short.
- **Frontmatter** is parsed by `lib/frontmatter.ts`, a deliberately naive `key: value` parser
  (split on the _first_ colon). So `title: Derived state: delete the effect` works, but **don't
  quote values** — `title: "Foo"` would keep the quotes in the rendered title. Only `id` and
  `title` are read: one line each, no nesting, no lists.
- **Filenames** start with a two-digit number (`01-…mdx`, `02-…mdx`): examples are ordered by
  filename.

`pnpm validate` enforces all of the above: MDX syntax outside code, extra or quoted frontmatter
values, unnumbered files, a non-`.mdx` file in a tier folder (it would never be shown), and
duplicate reading ids within a unit.

### Not every unit needs all five blocks

A _decision_ unit ("which tool owns this?") legitimately ends at `fill-blank`: there's no
surprising runtime output to predict and nothing to code. Reading + quiz + fill-blank is a
complete unit when the skill is judgment. Don't pad with a contrived challenge — but do check
that the neighbouring unit isn't already teaching the same thing (read the sibling `unit.json`
quiz ids before writing new ones; overlap is the most common review comment).

### Tags are a checked registry

Every `skills` entry on a unit/challenge must exist in `learning/taxonomy.ts` or
`pnpm validate` fails. Add the new tags **first**, with real `parents` (that's what powers
filtering/rollup). Slugs are kebab-case (`derived-state`), except a real API name, which keeps
its exact spelling (`useEffect`, `AbortController`). Tag units, not tracks: a track's tags are the
union of its units'. The planned top-level areas for upcoming tracks are listed in
`docs/tags-design.md` → "Planned dimensions"; add a root only when a lesson needs it. Adding a
child to an existing leaf can break `lib/tags.test.ts` fixtures — if it does, fix the fixture to
use a still-leaf tag rather than flattening the taxonomy.

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

- `meta.json` — `runner: "in-browser"`, `entry: "<Component>.tsx"`, plus `dependencies` only if
  the challenge needs a package beyond the sandbox's (see "Sandbox packages" below).
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

**Sandbox packages.** Every challenge gets **React** and **`@testing-library/react` /
`@testing-library/dom`**. The list and the pinned versions live in `learning/sandbox.ts`, which the
runner, the validator and the headless grader all read. A challenge that needs another library
declares it in `meta.json`, pinned to an exact version (the schema rejects ranges):

```json
"dependencies": { "@tanstack/react-query": "5.62.0" }
```

Also add that same version as a devDependency (`pnpm add -D -E @tanstack/react-query@5.62.0`), so
the headless grader tests against what the browser loads. `pnpm validate` checks both, and rejects
any bare import that is neither provided nor declared. Reach for the real package when the lesson
is about using its API. When the lesson is about the _mechanism_, a small hand-rolled support
module is still the better teacher (e.g. `counter-store.ts` in `selector-store-subscription`), and
a settable seam (`use-effect-fix-fetch/api.ts`) is still how to control an async dependency.
Untested so far: a package that needs build-time setup, such as `@nestjs/common` (decorator metadata
plus `reflect-metadata`). Prove one in the browser before you design a unit around it.

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

### Grading headlessly — `pnpm test:challenges`

`pnpm check` runs every in-browser challenge's grader twice under Vitest + happy-dom
(`scripts/check-challenges.ts`, using `vitest.challenges.config.ts`). The first run is against the
starter, which must fail at least one test. The second swaps `solution.tsx` into the entry (as
_Show solution_ does), and every test must pass. A grader that throws before asserting anything,
or that skips a test, fails too. That is Rule 4, checked by machine, in about 15 seconds for the
whole corpus. Run `pnpm test:challenges` on its own while iterating on one challenge.

It stands in for Sandpack but is not Sandpack: a happy-dom document instead of a browser iframe,
and Vite's module resolution instead of Sandpack's bundler. So **open a new or changed challenge in
the browser once** — _Run tests_ on the starter fails, _Show solution_ passes — before calling it
done. After that, the headless run catches regressions every time.

**IDE lint noise is expected here.** `content/challenges/**` is outside `tsconfig.json`, so the
editor flags `describe`/`it`/`expect` as undefined in every challenge test. That's not a
breakage — don't "fix" it by importing `vitest` (which breaks the Sandpack runner) or by pulling
the folder into the app's type-check.

## Rules the system enforces (don't fight them)

`pnpm check` enforces these by machine. Each one used to fail only on the page or inside the
Sandpack iframe:

- **The schema** (`learning/schema.ts`, zod; every object is `.strict()`, so an unknown or
  misspelled key is an error) checks Rule 1, unique ids at every level (blocks, questions,
  options, prompts, blanks, snippets), that a quiz `answer` names real option ids, that the
  `___` count matches the blanks, and the checkable half of Rule 3: readings open the unit and
  challenges close it.
- **The validator** (`scripts/validate.ts`, `pnpm validate`) checks Rule 2 and the reading-file
  rules above. It checks that slugs match folders, that every unit folder is listed in its track,
  and that unit slugs are unique across tracks. Every `skills` tag must be in the taxonomy, and
  the taxonomy must be acyclic (unused tags are warned about). It also checks the challenge
  contract for **every** challenge folder, referenced by a unit or not:
  - the entry resolves inside the folder
  - `App.tsx`, `solution.tsx`, `README.md` and a `*.test.tsx`/`*.test.ts` grader exist
  - the solution differs from the starter
  - every bare import in every sandbox file (in `from` / `import "x"` / `import("x")` /
    `require("x")` form) resolves to a sandbox package or a declared dependency
  - the grader uses no jest-dom matcher and nothing from `vi.*` / `jest.*`
  - every sandbox package is a devDependency at the same pinned version
- **The headless grader** (`pnpm test:challenges`) checks Rule 4's behaviour: the starter fails
  and the solution passes.

Still judgment, not checked: the rest of Rule 3 (each assessment harder than the last), that
each planted bug has its own test, and that every acceptance criterion is actually asserted.
Don't describe a rule as auto-enforced until something checks it. When you learn a rule the hard
way, prefer _teaching the validator_ over adding a paragraph here.

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
challenge, then gates on **`pnpm check`** (lint, types, schema + validator, unit tests, and the
headless challenge grader) and **`pnpm build`**, plus one browser run of a new or changed
challenge. For a **new track**, outline every planned unit first — one line each saying what it
teaches that the others don't — in `docs/ROADMAP.md`, before the first unit is written: overlap
between neighbouring units is the most common review finding. If the skill can't express what a
lesson needs, that's a signal to improve the skill or the schema — not to hand-author around it.

## The self-improvement loop (autonomous + audit log)

Feedback (a 👎, a rating, a typed note) lands in `content/feedback/`. `/improve-lesson`
reads it and edits content **directly** — this repo's git history is the safety net.

- Make changes **small and frequent**: one logical edit per commit, with a clear message,
  so any change is trivially `git revert`-able.
- Append a one-line entry to `docs/lesson-changelog.md` for every change.
- **A `schemaVersion` bump is a louder event, and only for a breaking change**: a field removed
  or renamed, or its meaning changed. An added _optional_ field is not breaking (every existing
  file still parses and means the same thing), so it needs no bump. Land a bump as its own change
  set with the cross-lesson sweep isolated, so "what did the template change do to every lesson?"
  is one clean, reviewable diff — never tangled into content edits.
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
- [ ] Challenge has starter + reference solution + tests, one test per planted bug, and every
      acceptance criterion asserted by some test
- [ ] Every example/question/option has a stable `id`
- [ ] Skills tagged at the right altitude on the unit, and every tag exists in `learning/taxonomy.ts`
- [ ] It doesn't restate the neighbouring unit — you can say in one sentence what's new here
- [ ] `pnpm check` **and** `pnpm build` pass (the headless grader is part of `check`); the
      challenge opened once in the browser
- [ ] One line in `docs/lesson-changelog.md`; `docs/ROADMAP.md` and `docs/handoff.md` updated;
      changes left **uncommitted** for review
