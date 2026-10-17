---
name: new-lesson
description: Scaffold a new Whetstone lesson (track/unit/blocks + a coding challenge) from the schema. Use when adding a skill to learn, e.g. "add a lesson on useRef" or "make a track for TanStack Query".
argument-hint: "<skill or topic> [--track <slug>] [--difficulty intro|core|advanced]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*), Bash(git:*), Bash(lsof:*)
---

# /new-lesson — author a Whetstone lesson

Read `docs/handoff.md` and `learning/PLAYBOOK.md` first; the PLAYBOOK holds the judgment, this
file holds the steps. All output must validate against `learning/schema.ts`. Bias toward simple.

**Fastest path that works:** copy the _shape_ of the nearest existing unit and challenge
(`content/tracks/react-hooks-and-rendering/units/use-effect/`, `content/challenges/use-effect-fix-fetch/`),
then replace the substance. Don't re-derive the conventions from the schema.

## Steps

0. **Place it, and check it isn't already taught.** Pick the track (see `content/tracks/`).
   **New track:** before writing any unit, outline every planned unit in `docs/ROADMAP.md`, one
   line each saying what it teaches that its neighbours don't, then create `track.json` (it has no
   `skills` — a track's tags are its units') and add the track to `content/catalog.json` where it
   belongs in the learning order. Add the unit slug to the track's ordered `units` array; unit
   slugs must be unique across all tracks.
   **Objectives first.** Read the sibling units' `objectives`, then write this unit's 2–5
   ("After this unit you can…", each starting with a concrete verb). They must not restate a
   neighbour's, and everything you write next exists to teach or test one of them.
   **Sources next.** Find the official docs pages the unit will be checked against (react.dev,
   MDN, docs.nestjs.com, the library's own docs; no blogs) and confirm each URL loads. Keep them
   open while writing: check every claim against them, and name the version wherever behaviour
   depends on it.
   **Tags first, in the same step.** Every `skills` value must exist in `learning/taxonomy.ts`
   or `pnpm validate` fails. Add missing tags with real `parents` (kebab-case, except an API name
   such as `useEffect`; place new roots per `docs/tags-design.md` → "Planned dimensions"). If that
   turns a leaf into a parent, expect `lib/tags.test.ts` to fail and fix the fixture (point it at a
   still-leaf tag) rather than flattening the tree.
1. **Reading.** Create `units/<unit>/reading/{simple,medium,complex}/NN-<name>.mdx` — at least
   one example per tier, each with `id` + `title` frontmatter (unquoted). Same concept at rising
   resolution; add more example files to a tier whenever one isn't enough. Lead with the mental
   model, not the API surface. The files are **Markdown, not MDX**: no JSX or `import` outside
   code. Put an optional aside after a `<!--more-->` line ("Go deeper").
2. **Recognition + recall.** Add a `quiz` block (a list of questions; distractors = real
   misconceptions) and a `fill-blank` block (a list of prompts; one concept per blank).
   Every item gets a stable `id` and a teaching `explanation`, and tests one of the objectives.
   Multi-line `code` is an array of lines. Fill-blank answers are matched ignoring case,
   whitespace and quote style, so list only genuinely different answers.
3. **Surprise.** Add a `predict-output` block (a list of snippets) only where runtime
   behavior defies intuition (stale closures, batching, ordering). Skip it if the topic has
   no such trap — a judgment/decision unit that ends at `fill-blank` is a complete unit. It is
   self-graded: put other correct phrasings in `acceptable` (shown next to the answer).
4. **Transfer — _only if the skill is codeable._** A judgment/decision unit has no honest
   challenge; stop at step 3 rather than inventing one, and skip the challenge half of the
   gate below. Otherwise author the `challenge` under `content/challenges/<slug>/` following
   the **In-browser challenge contract** in `learning/PLAYBOOK.md` (read it — the Sandpack
   conventions are specific). In short: `meta.json` (`runner: "in-browser"`,
   `entry: "<Component>.tsx"`, the learner-facing `title` and `acceptanceCriteria`),
   `README.md` (the problem, then an optional `## Hints` section — no title, checklist, "Your
   task" or "Running" section; the app renders those from meta.json), the editable buggy
   `<Component>.tsx`, `App.tsx`
   (preview root), `<Component>.test.tsx` (**jest-style** — no `vitest` import, plain matchers,
   DOM via `data-testid`), and `solution.tsx` (same export, fixed; that exact filename even
   when the entry is `.ts`). Four traps worth pre-empting: the sandbox provides **only React
   and Testing Library** unless `meta.json` declares `dependencies` (exact versions, each also a
   devDependency at that version); there is **no spy/mock/fake-timer library** (`vi.*`,
   `jest.fn`, `jest.spyOn` are undefined — patch the global by hand and restore it, or expose a
   counter from a support module); **timers are real** (keep delays small, share them via a
   `config.ts` the test imports); and **module-level singletons need a `reset()`**. Give each
   planted bug its own failing test, and make sure every acceptance criterion in `meta.json` is
   actually asserted by one. For big multi-file projects use `runner: "external"` +
   `externalUrl` instead.
5. **Gate.** Run **`pnpm check`** (lint + typecheck + validate + unit tests + the headless
   challenge grader `pnpm test:challenges`, which proves the starter fails and the solution
   passes) and **`pnpm build`**. Iterate on a challenge with `pnpm test:challenges` alone. Then
   open the challenge in the browser **once**, because the headless grader is happy-dom, not
   Sandpack. **`runner: "in-browser"`:** hit _Run tests_ — the starter must FAIL and _Show
   solution_ must PASS. **`runner: "external"`:** there's no _Run tests_ button, so instead
   confirm the `externalUrl` loads and that its README/acceptance criteria match the unit's.
   Reuse the running dev server (check `lsof -ti tcp:3002` first; never blanket-kill ports). If
   you can't do the browser run yourself, say so explicitly in your summary and list the URLs.
   _Ignore_ the IDE's `Cannot find name 'describe'` lints in `content/challenges/**` — that
   folder is outside `tsconfig.json` by design.
6. **Land it.** Order blocks so difficulty escalates (reading → recognition → recall →
   predict → challenge; the schema rejects a reading after an assessment or anything after the
   challenge). Append **one line** to `docs/lesson-changelog.md`
   (`YYYY-MM-DD — <track>/<unit> — what changed`) — the detail belongs in the PR. Tick the unit
   off in `docs/ROADMAP.md`, recording any follow-up you hit as an explicit ⬜ item, and refresh
   the START HERE block in `docs/handoff.md`. **Leave the work uncommitted** for the developer to
   review (see AGENTS.md).
7. **Feed the loop.** If you learned something the next author would otherwise re-learn the
   hard way — a runner limitation, a validator gap, a convention — fix it _upstream_ in the
   same pass: prefer a check in `learning/validate-content.ts` (plus its test case) or
   `learning/schema.ts`, then a line in `PLAYBOOK.md`, then a step here. A rule that a machine
   can check should not live only in prose.

## Notes

- This skill produces _content_, not app/UI code. The one deliberate exception is step 7: a
  **reusable** fix may land in `learning/validate-content.ts`, `learning/schema.ts` or
  `learning/PLAYBOOK.md`, because encoding a lesson learned is cheaper than re-learning it.
- Don't add speculative fields (pick-N, difficulty-mix, ratings) — they're non-breaking
  later additions. If the schema genuinely can't express what a lesson needs, propose a schema
  change as its own change set; only a breaking change bumps `schemaVersion` and sweeps every
  file (PLAYBOOK → "The self-improvement loop").
