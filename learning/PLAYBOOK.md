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
  union of its units' `skills`. Tracks appear on the home page in the order of
  `content/catalog.json`, which works the same way: a track folder missing from it fails the gate.
- **Unit** — one focused concept you could learn in a sitting (e.g. `use-effect`). An ordered list
  of blocks. Its slug equals its folder name and is unique across **all** tracks, so a unit can be
  addressed by its slug alone (and moved to another track without a collision).
- **Block** — a single interaction. Six types (below).

Everything lives in `content/`. Coding challenges live once in
`content/challenges/<slug>/` and are referenced by slug, so they're reusable and the
existing archive (`~/Documents/GitHub/software-engineer-job-test-folder`) imports cleanly
as tagged challenges.

## Objectives and sources — every unit has both

- **`objectives`** — 2 to 5 lines completing "After this unit you can…", shown at the top of the
  unit. Start each with a concrete verb (Explain, Predict, Fix, Choose, Write, Spot) and name the
  specific skill. **Write them first.** Every assessment item must test one of them, and every
  objective must be tested by at least one item — an objective nothing tests is a promise the unit
  doesn't keep. Reading the neighbouring units' objectives is the overlap check.
- **`sources`** — the official documentation the unit was checked against (react.dev, MDN,
  docs.nestjs.com, a library's own docs), shown as "Further reading". No blogs, tutorials or Stack
  Overflow. Open each one and check the unit's claims against it, especially anything
  version-dependent, and **name the version in the prose** ("since React 18", "in Zustand v5").
  Unstated version drift is where shipped lessons have most often been wrong. Confirm a link by
  what the page says, not by its HTTP status: docs.nestjs.com is a single-page app that answers
  200 for any path, real or not (its raw Markdown is in the `nestjs/docs.nestjs.com` repo).
- **No official docs for the topic?** (System design, architecture.) Use primary sources: cloud
  providers' architecture centres and engineering libraries (AWS Builders' Library, Azure/Google
  Cloud architecture centres), vendor reference docs (PostgreSQL, Redis), and the original papers
  (Dynamo, PACELC). Still no blogs or interview-prep sites. MDN's browser-compat-data counts as MDN
  — its tables render client-side, so cite the compat data when a page won't show them.
- **Run it when you can.** Framework behaviour is often not what its docs say: 5 of the 12 NestJS
  findings, and several React, Zustand and TanStack ones, could only be settled by running a
  pinned install. When the code and the docs disagree, teach what the code does, say "observed on
  Nest 12.1" (or similar) in the prose, and name the doc that says otherwise. Next.js ships its
  version-exact docs in `node_modules/next/dist/docs`.
- **Version fine print goes below `<!--more-->`** when it would crowd an intro reading. The note
  still has to be there; it just shouldn't bury the main idea.

## The six block types — and when to reach for each

| Block            | Use it to…                         | Quality bar                                                                                                                        |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `reading`        | Install the mental model           | A folder of example `.mdx` files per tier (Simple/Medium/Complex), **1..n each**. Each tier is the same idea at higher resolution. |
| `cards`          | Remind, not teach from scratch     | A folder of short `.mdx` cards, each **one idea + one example**. No tiers. A unit of only cards is a reference unit.                |
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

### Writing unit.json

- **Ids are progress keys.** Keep an item's `id` when you reword it and its meaning stays; give it
  a new `id` when it now asks something different (stored progress on the old id is orphaned,
  which is what you want). Say which ids changed in the PR.
- **A predict-output `answer` (and each `acceptable`) is plain text**, unlike the question:
  backticks show literally and line breaks collapse. Keep it to one line; for multi-line output
  write the lines joined with " / " and show the real layout in the explanation.
- **Link to another unit with `[its title](/learn/<track>/<unit>)`** in readings, cards,
  explanations or a README, rather than naming its slug in backticks. `pnpm validate` fails a link
  that doesn't resolve to a real track or unit.
- **Say the mode when a predict-output answer depends on it.** Anything that logs during render or
  runs an effect differs under StrictMode in development (React 18+): write "Production build"
  (or "StrictMode, development") into the snippet or question, and give the other answer in the
  explanation.

- **Multi-line `code`** (fill-blank and predict-output) is an **array of lines**, so it reads
  naturally in the JSON and diffs line by line in review; a one-liner stays a plain string. The
  schema rejects a string containing `\n`.
- **Inline Markdown works in short fields**: quiz prompts and options, fill-blank prompts,
  predict-output questions, objectives, and challenge titles and acceptance criteria render
  `code`, **bold**, _italic_ and links. Explanations, readings and challenge READMEs render full
  Markdown.
- **Fill-blank answers are compared ignoring case, all whitespace and quote style**
  (`learning/grading.ts`): `() =>` and `()=>` are one answer, `'resize'` and `"resize"` are one
  answer. List only genuinely different answers (`useMemo` vs `React.useMemo`); the schema
  rejects variants that normalize alike.

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

### Two kinds of unit: mastery and reference

The core principle above is about **mastery** units: reading tiers, then assessments, often a
challenge. Some topics only need a **reminder** — HTTP status codes, CLI flags, "which date
library when". Author those as a **card unit**: a `cards` block, and nothing else yet. Cards make
breadth cheap; depth is added where it pays off.

- **Card or reading?** A card is one idea and one example, under about 150 words with at most
  one code block (`pnpm validate` warns past that). If it needs a Simple → Complex ladder, it's a
  reading.
- **Objectives** in a card unit name what the learner can _recall_ ("Tell 401 from 403"). They
  aren't assessed until the unit blooms.
- **Blooming:** when a card unit proves important (feedback, interview frequency, many tags
  depend on it), append assessments — it becomes a Lesson — and later a challenge — Full. No
  migration: the depth badge is derived from the blocks (`lib/depth.ts`).
- A card unit completes on its first visit and has no Drill mode (there's nothing to answer).

### Not every unit needs all six blocks

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
- `README.md` — the problem statement, then an optional `## Hints` section (the last one; the app
  shows it collapsed after the task list, so hints aren't spoilers). **Nothing else**: the app
  renders the title, "Edit `<entry>` so the tests pass" and the acceptance checklist from
  `meta.json`, so a README `#` title, `- [ ]` checklist, "Your task" or "Running" section is a
  validator error. (Before this rule, 3 of 10 READMEs had drifted from their meta.json — one told
  the learner to edit a file that didn't exist.)
- `meta.json` `title` and `acceptanceCriteria` are learner-facing (inline Markdown allowed). Write
  each criterion as an observable outcome, and make sure a test asserts it.

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
- To prove a re-render _didn't_ happen, count commits with React's `<Profiler onRender>` inside the
  read-only component and write the count into an empty element via a ref (copy
  `memoization-stop-rerender/Child.tsx`). **Don't** do `renders.current += 1` in the render body:
  react.dev forbids writing refs during render, and the preview wraps `App` in `<StrictMode>`, so
  the on-screen count doubles while the tests (no StrictMode) say 1.
- **Every `it`/`test` name is unique across the whole file**, not just within its `describe`:
  Sandpack keys its result list by test name alone, so a repeat logs a React duplicate-key error
  (`pnpm validate` rejects it).
- Events dispatched outside RTL (e.g. `window.dispatchEvent(new Event("resize"))`) need an
  explicit `act(() => …)`; `fireEvent` already wraps itself.
- Timers are **real** — no confirmed fake-timer support. Keep the challenge's delay small (a
  `config.ts` constant the test imports beats a magic number) and the suite under a couple of
  seconds. **Wait for a condition, not a fixed window:** poll until the thing you expect has
  happened, with a generous deadline (`until(() => stats.calls > 1, 3000)`), or hold an async
  step open through a seam and release it from the test. A background tab throttles timers to
  about once a second and Sandpack fails any test that runs past 5 s, so "sleep 240 ms, then
  expect a second poll" fails a correct solution there. Bound a loop by a count of calls, never
  by elapsed wall-clock time.
- Module-level singletons (a store) leak between test cases: export a `reset()` and call it at
  the top of each case. RTL's auto-cleanup unmounts components between cases, so render
  counters restart at 1.
- Each planted bug should be caught by its **own** test — that's what makes a red run read like
  a to-do list. Say the fix order in a comment in the starter without writing the code.
- **Write the obvious wrong fix and make sure the grader rejects it.** For each planted bug, try
  the shortcut a learner would reach for (`autoFocus` instead of a ref, `setCount(count + 3)`
  instead of the updater, `parseInt` instead of a strict number check, `resetQueries` instead of
  a cache write, a module-level variable instead of a ref, `structuredClone` of everything). The
  reviews of the first 30 challenges found such a pass in about one challenge in three.
- **Hints teach the idea, not the line.** A hint that contains the fix's code turns the
  challenge into copying.
- **Isolate each planted bug's test** from the other rules (a workflow with no branch filter when
  testing path rules, a store that never fails when testing paging), so fixing one bug flips
  exactly one test. Check by re-adding one bug at a time to the solution.
- **Give a fake store or server a runaway valve**: throw after an implausible number of calls, so
  a missing retry cap or paging limit fails its test with a message instead of hanging the suite.
- A `/* … */` comment in a challenge file can't contain `*/` — a glob like `src/**/*.ts` ends it.
  Use `//` comments for those.

### Grading headlessly — `pnpm test:challenges`

`pnpm check` runs every in-browser challenge's grader twice under Vitest + happy-dom
(`scripts/check-challenges.ts`, using `vitest.challenges.config.ts`). The first run is against the
starter, which must fail at least one test. The second swaps `solution.tsx` into the entry (as
_Show solution_ does), and every test must pass. A grader that throws before asserting anything,
or that skips a test, fails too. That is Rule 4, checked by machine, in about 15 seconds for the
whole corpus. Run `pnpm test:challenges` on its own while iterating on one challenge.

It stands in for Sandpack but is not Sandpack: a happy-dom document instead of a browser iframe,
and Vite's module resolution instead of Sandpack's bundler. So **run a new or changed challenge in
Sandpack once** — _Run tests_ on the starter fails, _Show solution_ passes — before calling it
done: `pnpm test:challenges:browser <slug…>` does exactly that in headless Chrome against the dev
server (`pnpm dev`; set `BASE_URL` for another), and checks every referenced challenge when given
no slug. It needs Google Chrome installed and the network (Sandpack's bundler is remote), so it is
not part of `pnpm check`. Checking by hand works too, but keep the tab in front: a background tab
throttles timers and timer-based tests then time out for no real reason. After that, the headless
run catches regressions every time.

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
  `___` count matches the blanks, 2–5 objectives and at least one https source per unit,
  multi-line code written as an array of lines, no line break in a field rendered as inline
  Markdown (prompts, options, questions, objectives, challenge titles and criteria), no two
  fill-blank answers that normalize alike, and the checkable half of Rule 3: readings and cards open the unit, challenges close it.
- **The validator** (`learning/validate-content.ts`, run by `pnpm validate` and pinned case by
  case in `learning/validate-content.test.ts`) checks Rule 2 and the reading-file rules above,
  which apply to card files too (plus a warning when a card outgrows one idea and one example).
  It checks that slugs match folders, that every track folder is in `content/catalog.json` and
  every unit folder in its track, and that unit slugs are unique across tracks. Every `skills`
  tag must be in the taxonomy, and the taxonomy must be acyclic (unused tags are warned about). It also checks the challenge
  contract for **every** challenge folder, referenced by a unit or not:
  - the entry is one of the folder's own files, written exactly as its path in the folder
    (`Thing.tsx` or `src/Thing.tsx`, not `./Thing.tsx`) and not `README.md`, `solution.tsx` or
    `meta.json`: that is the only entry the loader can serve as the editable file
  - `README.md` exists and holds only the problem and hints (no title, checklist, "Your task"
    or "Running" section)
  - `App.tsx`, `solution.tsx` and a `*.test.tsx`/`*.test.ts` grader exist
  - the solution differs from the starter
  - every bare import in every sandbox file (in `from` / `import "x"` / `import("x")` /
    `require("x")` form) resolves to a sandbox package or a declared dependency
  - the grader uses no jest-dom matcher and nothing from `vi.*` / `jest.*`
  - every test name in a grader file is unique, `it.only` / `.skip` / `.each` forms included
    (Sandpack keys its results by name)
  - these last three read each file with TypeScript's parser, so text inside a comment, string,
    template literal, JSX or regex literal never counts as code
  - (all content, including `catalog.json`, `track.json` and challenge code) no invisible
    characters (every Unicode format character, such as zero-width spaces, the word joiner, the
    BOM and bidi controls, plus U+2028/2029 and stray control characters), and every
    `](/learn/…)` link resolves to a real track or unit
  - every sandbox package is a devDependency at the same pinned version
- **The headless grader** (`pnpm test:challenges`) checks Rule 4's behaviour: the starter fails
  and the solution passes. `pnpm test:challenges:browser` checks the same in Sandpack itself
  (needs the dev server and Chrome, so it runs on demand, not in `pnpm check`).

Still judgment, not checked: the rest of Rule 3 (each assessment harder than the last), that
each planted bug has its own test, that every acceptance criterion is actually asserted, that
every objective is assessed, and that the content agrees with its sources.
Don't describe a rule as auto-enforced until something checks it. When you learn a rule the hard
way, prefer _teaching the validator_ over adding a paragraph here.

1. **Every quiz question / fill-blank / predict-output item has an `explanation`.** Wrong answers teach.
2. **Every reading tier — Simple, Medium, Complex — has at least one example.** This is what
   makes "read up on the go" work, and forces you to nail the simple version first.
3. **Difficulty escalates down a unit's `blocks` array.** Teaching blocks (readings, cards)
   first; the challenge last.
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

Feedback is a **GitHub issue labelled `lesson-feedback`**. Every reading example, question,
prompt, snippet and challenge has a "Flag" link that opens a prefilled issue carrying the exact
content ids (`lib/feedback.ts`). `/improve-lesson` reads the open ones with `gh` and edits content
**directly** — this repo's git history is the safety net — and the PR that ships the fix closes
the issue (`Fixes #N`).

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

1. a **check** in `learning/validate-content.ts` (with its case in
   `learning/validate-content.test.ts`) or a unit test (the machine enforces it forever),
2. the **schema** (`learning/schema.ts`) so the mistake can't be represented,
3. **this playbook** for judgment a machine can't check,
4. the **skills** (`.claude/skills/*/SKILL.md`) for procedure and ordering,
5. the **single lesson**, only when the problem really is one-off.

Every authoring session that teaches you something about the _system_ should end with a change
at layer 1–4, not just a lesson.

## Quality checklist (before a lesson is done)

- [ ] Objectives written first; every assessment item tests one, and every objective is tested
- [ ] Every claim checked against the listed sources; version-dependent claims name the version
- [ ] Each reading tier has ≥1 example; each example is the same idea at higher resolution
- [ ] Distractors are real misconceptions; every question/item has a teaching `explanation`
- [ ] Difficulty escalates; the challenge is genuinely harder than the quiz
- [ ] Challenge has starter + reference solution + tests, one test per planted bug, every
      acceptance criterion asserted by some test, and the obvious wrong fix rejected
- [ ] Every example/question/option has a stable `id`
- [ ] Skills tagged at the right altitude on the unit, and every tag exists in `learning/taxonomy.ts`
- [ ] It doesn't restate the neighbouring unit — you can say in one sentence what's new here
- [ ] `pnpm check` **and** `pnpm build` pass (the headless grader is part of `check`), and
      `pnpm test:challenges:browser <slug>` passes for a new or changed challenge
- [ ] One line in `docs/lesson-changelog.md`; `docs/ROADMAP.md` and `docs/handoff.md` updated;
      changes left **uncommitted** for review
