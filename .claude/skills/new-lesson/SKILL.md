---
name: new-lesson
description: Scaffold a new Whetstone lesson (track/unit/blocks + a coding challenge) from the schema. Use when adding a skill to learn, e.g. "add a lesson on useRef" or "make a track for TanStack Query".
argument-hint: "<skill or topic> [--track <slug>] [--difficulty intro|core|advanced]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx:*), Bash(vitest:*), Bash(git:*)
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
4. **Transfer.** Author the `challenge` under `content/challenges/<slug>/`: `meta.json`,
   `README.md` (problem + acceptance checklist), shared files, `starter.tsx`,
   `solution.tsx`, `test.tsx`. Reuse patterns from the user's archive where relevant. Set
   `mode`/`runner`: `in-browser` for single-file React/TS drills, `external` for full
   multi-file projects (provide `externalUrl`).
5. **Validate (gate).** Run schema validation and **run the challenge tests against the
   reference solution** (`vitest run`). Either failing → not done.
6. **Land it.** Order blocks so difficulty escalates (reading → recognition → recall →
   predict → challenge). Commit small with a clear message; append a line to
   `docs/lesson-changelog.md`.

## Notes

- This skill produces *content* only — no app/UI code. The runner, validator, and test
  harness are part of the app (Phase 0 scaffold).
- Don't add speculative fields (pick-N, difficulty-mix, ratings) — they're non-breaking
  later additions. If the schema genuinely can't express what a lesson needs, propose a
  schema change as its own commit + sweep, per the PLAYBOOK.
