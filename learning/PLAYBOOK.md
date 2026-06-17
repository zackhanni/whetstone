# Whetstone — Lesson Authoring Playbook

> **Core principle:** a lesson earns its place only if it changes what the learner can
> *do*. Teach the mental model, then make them apply it under increasing pressure — and
> make every wrong answer teach.

This playbook holds the *judgment*; the machine-checkable rules live in
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

| Block | Use it to… | Quality bar |
|---|---|---|
| `reading` | Install the mental model | A folder of example `.mdx` files per tier (Simple/Medium/Complex), **1..n each**. Each tier is the same idea at higher resolution. |
| `quiz` | Check recognition / discrimination | A list of questions; distractors are *real* misconceptions, not filler. |
| `fill-blank` | Check recall of exact syntax/shape | A list of prompts; one concept per blank; accept reasonable equivalents. |
| `predict-output` | Expose subtle runtime behavior | A list of snippets; reserve for the genuinely surprising (stale closures, batching, ordering). |
| `challenge` | Prove transfer to real code | Real files + runnable tests + a reference solution. The tests are the grade. |

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

Deliberately *not* implemented, but the shape above supports them as non-breaking additions
(an optional field + app logic). Don't pre-build them:

- **Pick-N / difficulty-mix quizzes** — "show 3 simple + 1 medium, random order." Later: a
  `present` config + per-item difficulty.
- **Rate-to-reorder** — surface the highest-rated example/question first. Later: a ratings
  store keyed by the ids that already exist.

## Rules the system enforces (don't fight them)

Rule 1 is checked by `zod` (`learning/schema.ts`) **today**. Rules 2–4 reach into `.mdx`,
the filesystem, and test runs that zod can't see — they will be enforced by a
`scripts/validate.ts` that ships with the app (**not built yet**). Until it exists, the
`/new-lesson` checklist is the *manual* gate. Don't describe a rule as auto-enforced until
the validator actually checks it.

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
is a common habit, show the wrong way *and* the right way side by side.

## Authoring flow

Use `/new-lesson`. It scaffolds against the schema, generates the blocks, authors the
challenge, then **validates with zod and runs the challenge tests against the reference
solution** before anything counts as done. If the skill can't express what a lesson needs,
that's a signal to improve the skill or the schema — not to hand-author around it.

## The self-improvement loop (autonomous + audit log)

Feedback (a 👎, a rating, a typed note) lands in `content/feedback/`. `/improve-lesson`
reads it and edits content **directly** — this repo's git history is the safety net.

- Make changes **small and frequent**: one logical edit per commit, with a clear message,
  so any change is trivially `git revert`-able.
- Append a one-line entry to `docs/lesson-changelog.md` for every change.
- **A `schemaVersion` bump is a louder event.** Land it as its own dedicated commit with the
  cross-lesson sweep isolated, so "what did the template change do to every lesson?" is one
  clean, reviewable diff — never tangled into content edits.
- When an improvement is *general* (a better way to structure any lesson), fix the
  template/schema and sweep it across existing lessons — don't just patch the one lesson.

Feedback is often about the *interface* (how a lesson is presented), not the content.
Capture which it is, because the fix lives in a different place (the app / ordering vs. the prose).

## Quality checklist (before a lesson is done)

- [ ] Each reading tier has ≥1 example; each example is the same idea at higher resolution
- [ ] Distractors are real misconceptions; every question/item has a teaching `explanation`
- [ ] Difficulty escalates; the challenge is genuinely harder than the quiz
- [ ] Challenge has starter + reference solution + tests; **the solution passes the tests**
- [ ] `zod` validation passes; every example/question/option has a stable `id`
- [ ] Skills tagged so search/recall works across tracks
- [ ] Small commit + `docs/lesson-changelog.md` updated
