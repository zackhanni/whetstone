---
name: new-lesson
description: Scaffold a new Whetstone lesson (track/unit/blocks + a coding challenge) from the schema. Use when adding a skill to learn, e.g. "add a lesson on useRef" or "make a track for TanStack Query".
argument-hint: "<skill or topic> [--track <slug>] [--difficulty intro|core|advanced]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*), Bash(git:*)
---

# /new-lesson — author a Whetstone lesson

Read `learning/PLAYBOOK.md` first; it holds the judgment, this file holds the steps. All
output must validate against `learning/schema.ts`. Bias toward simple.

## Steps

0. **Place it.** Decide which track the skill belongs to (see `content/tracks/`). If none
   fits, create a new `track.json`. Pick a unit slug and add it to the track's ordered
   `units` array.
1. **Reading.** Create `units/<unit>/reading/{simple,medium,complex}/*.mdx` — at least one
   example per tier, each with `id` + `title` frontmatter. Same concept at rising
   resolution; add more example files to a tier whenever one isn't enough. Lead with the
   mental model, not the API surface.
2. **Recognition + recall.** Add a `quiz` block (a list of questions; distractors = real
   misconceptions) and a `fill-blank` block (a list of prompts; one concept per blank).
   Every item gets a stable `id` and a teaching `explanation`.
3. **Surprise.** Add a `predict-output` block (a list of snippets) only where runtime
   behavior defies intuition (stale closures, batching, ordering). Skip it if the topic has
   no such trap.
4. **Transfer.** Author the `challenge` under `content/challenges/<slug>/` following the
   **In-browser challenge contract** in `learning/PLAYBOOK.md` (read it — the Sandpack
   conventions are specific). In short: `meta.json` (`runner: "in-browser"`,
   `entry: "<Component>.tsx"`), `README.md`, the editable buggy `<Component>.tsx`, `App.tsx`
   (preview root), `<Component>.test.tsx` (**jest-style** — no `vitest` import, RTL, plain
   matchers, DOM via `data-testid`), and `solution.tsx` (same export, fixed). For big
   multi-file projects use `runner: "external"` + `externalUrl` instead.
5. **Validate (gate).** `pnpm validate` (schema + reading tiers + challenge contract) and
   `pnpm build` must pass. Then verify the challenge **in the browser** — open the unit, hit
   *Run tests*: the starter must FAIL and *Show solution* must PASS. (No headless
   challenge-test run yet — see PLAYBOOK "Rule 4".)
6. **Land it.** Order blocks so difficulty escalates (reading → recognition → recall →
   predict → challenge). Commit small with a clear message; append a line to
   `docs/lesson-changelog.md`.

## Notes

- This skill produces *content* only — no app/UI code. The runner, validator, and test
  harness are part of the app (Phase 0 scaffold).
- Don't add speculative fields (pick-N, difficulty-mix, ratings) — they're non-breaking
  later additions. If the schema genuinely can't express what a lesson needs, propose a
  schema change as its own commit + sweep, per the PLAYBOOK.
