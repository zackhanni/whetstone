---
name: new-lesson
description: Scaffold a new Whetstone lesson (track/unit/blocks + a coding challenge) from the schema. Use when adding a skill to learn, e.g. "add a lesson on useRef" or "make a track for TanStack Query".
argument-hint: "<skill or topic> [--track <slug>] [--difficulty intro|core|advanced]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*), Bash(git:*)
---

# /new-lesson — author a Whetstone lesson

Read `learning/PLAYBOOK.md` first; it holds the judgment, this file holds the steps. All
output must validate against `learning/schema.ts`. Bias toward simple.

**Fastest path that works:** copy the _shape_ of the nearest existing unit and challenge
(`content/tracks/react-hooks-and-rendering/units/use-effect/`, `content/challenges/use-effect-fix-fetch/`),
then replace the substance. Don't re-derive the conventions from the schema.

## Steps

0. **Place it, and check it isn't already taught.** Pick the track (see `content/tracks/`);
   create a `track.json` only if none fits. Add the unit slug to the track's ordered `units`
   array. **Read the sibling units' `unit.json`** — skim their quiz `id`s and reading titles
   so the new unit sharpens a distinct skill instead of restating a neighbour. State the one
   sentence of "what this unit does that the others don't" before writing.
   **Tags first, in the same step.** Every `skills` value must exist in `learning/taxonomy.ts`
   or `pnpm validate` fails. Add missing tags with real `parents`; if that turns a leaf into a
   parent, expect `lib/tags.test.ts` to fail and fix the fixture (point it at a still-leaf tag)
   rather than flattening the tree.
1. **Reading.** Create `units/<unit>/reading/{simple,medium,complex}/*.mdx` — at least one
   example per tier, each with `id` + `title` frontmatter. Same concept at rising
   resolution; add more example files to a tier whenever one isn't enough. Lead with the
   mental model, not the API surface.
2. **Recognition + recall.** Add a `quiz` block (a list of questions; distractors = real
   misconceptions) and a `fill-blank` block (a list of prompts; one concept per blank).
   Every item gets a stable `id` and a teaching `explanation`.
3. **Surprise.** Add a `predict-output` block (a list of snippets) only where runtime
   behavior defies intuition (stale closures, batching, ordering). Skip it if the topic has
   no such trap — a judgment/decision unit that ends at `fill-blank` is a complete unit.
4. **Transfer — _only if the skill is codeable._** A judgment/decision unit has no honest
   challenge; stop at step 3 rather than inventing one, and skip the challenge half of the
   gate below. Otherwise author the `challenge` under `content/challenges/<slug>/` following
   the **In-browser challenge contract** in `learning/PLAYBOOK.md` (read it — the Sandpack
   conventions are specific). In short: `meta.json` (`runner: "in-browser"`,
   `entry: "<Component>.tsx"`), `README.md`, the editable buggy `<Component>.tsx`, `App.tsx`
   (preview root), `<Component>.test.tsx` (**jest-style** — no `vitest` import, plain matchers,
   DOM via `data-testid`), and `solution.tsx` (same export, fixed; that exact filename even
   when the entry is `.ts`). Four traps worth pre-empting: the sandbox provides **only React
   and Testing Library** — no other dependency resolves, so hand-roll a support module; there
   is **no spy/mock/fake-timer library** (`vi.*`, `jest.fn`, `jest.spyOn` are undefined — patch
   the global by hand and restore it, or expose a counter from a support module); **timers are
   real** (keep delays small, share them via a `config.ts` the test imports); and
   **module-level singletons need a `reset()`**. Give each planted bug its own failing test,
   and make sure every acceptance criterion in `meta.json` is actually asserted by one. For
   big multi-file projects use `runner: "external"` + `externalUrl` instead.
5. **Gate.** Run **`pnpm check`** (lint + typecheck + validate + unit tests — not just
   `pnpm validate`, since a taxonomy edit can break `lib/tags.test.ts`) and **`pnpm build`**.
   Then, **if the unit has a challenge**, verify it **in the browser**: open the unit, hit
   _Run tests_ — the starter must FAIL and _Show solution_ must PASS. Reuse the running dev server (check `lsof -ti
tcp:3002` / `:3000` first; never blanket-kill ports). The behavioural half of Rule 4 has no
   headless run — if you can't verify it yourself, say so explicitly in your summary and list
   the URLs.
   _Ignore_ the IDE's `Cannot find name 'describe'` lints in `content/challenges/**` — that
   folder is outside `tsconfig.json` by design.
6. **Land it.** Order blocks so difficulty escalates (reading → recognition → recall →
   predict → challenge). Append a line to `docs/lesson-changelog.md`
   (`YYYY-MM-DD — <track>/<unit> — what changed`) and tick the unit off in `docs/ROADMAP.md`,
   recording any follow-up you hit as an explicit ⬜ item. **Leave the work uncommitted** for
   the developer to review (see AGENTS.md).
7. **Feed the loop.** If you learned something the next author would otherwise re-learn the
   hard way — a runner limitation, a validator gap, a convention — fix it _upstream_ in the
   same pass: prefer a check in `scripts/validate.ts`, then a line in `PLAYBOOK.md`, then a
   step here. A rule that a machine can check should not live only in prose.

## Notes

- This skill produces _content_ only — no app/UI code. The runner, validator, and test
  harness are part of the app (Phase 0 scaffold).
- Don't add speculative fields (pick-N, difficulty-mix, ratings) — they're non-breaking
  later additions. If the schema genuinely can't express what a lesson needs, propose a
  schema change as its own commit + sweep, per the PLAYBOOK.
