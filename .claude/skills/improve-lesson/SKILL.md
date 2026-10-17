---
name: improve-lesson
description: Read learner feedback and improve existing lessons — or the system that produces them (validator, schema, playbook, skills) when the problem is general. Use when acting on lesson-feedback GitHub issues, when asked to refresh or fix a lesson, and when asked to fold fresh learnings back into the authoring workflow.
argument-hint: "[--unit <slug>] [--all] [--system]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*), Bash(npx:*), Bash(vitest:*), Bash(git:*), Bash(gh issue list:*), Bash(gh issue view:*)
---

# /improve-lesson — refine lessons from feedback

Read `docs/handoff.md` and `learning/PLAYBOOK.md` first. This skill also owns the repo's **learning loop**: it may be
invoked with no feedback at all ("take what you just learned and make the system better").

## Steps

1. **Gather.** With feedback: list the open feedback issues —
   `gh issue list --label lesson-feedback --state open --limit 1000 --json number,title,body,url`
   (gh returns only 30 without `--limit`) — or the ones for the named unit. Each body ends with a
   `<!-- whetstone-feedback {...} -->` marker
   holding the exact `track`/`unit`/`block`/`item` ids (`lib/feedback.ts`); go straight there.
   Also check `docs/content-review.md` for accuracy findings not yet handled. With `--system` (or
   "make the system better" with nothing to read): the inputs are the run you just finished and
   the repo itself — every rule you had to learn from a runtime failure rather than a check,
   `pnpm check`/`pnpm build` output and anything it _didn't_ catch, the last few entries in
   `docs/lesson-changelog.md` and open ⬜ items in `docs/ROADMAP.md`, and unreviewed PR
   comments. Either way, group items by what they're really about: content accuracy,
   difficulty, or _interface/structure_ (how the lesson is presented). The fix lives in a
   different place depending on which.
2. **Triage — and pick the highest-leverage layer.** For each item ask "where does this stop
   happening forever?" and fix it at the _highest_ layer that applies:
   1. **A check** in `learning/validate-content.ts`, with its case in
      `learning/validate-content.test.ts` (or another unit test) — the machine now enforces it.
   2. **The schema** `learning/schema.ts` — the shape makes the mistake unrepresentable.
   3. **`learning/PLAYBOOK.md`** — judgment a machine can't check.
   4. **The skills** (`.claude/skills/*/SKILL.md`) — the _procedure_ and its ordering.
   5. **The lesson itself** — last resort for a genuinely one-off problem.
      Prose that restates a rule a script could check is a smell: write the check instead, then
      point the PLAYBOOK at it.
3. **Edit.**
   - _Local fix:_ edit the unit/challenge directly.
   - _Bloom a card unit_ when feedback asks to practise it ("I want to drill this"): append a quiz
     or fill-blank after the `cards` block, then a challenge if the skill is codeable. The depth
     badge updates itself; nothing else changes.
   - _General fix:_ change the validator / `learning/schema.ts` / `PLAYBOOK.md`. A **breaking**
     schema change (a field removed or renamed, or its meaning changed) **bumps `schemaVersion`**
     and sweeps every content file as ONE self-contained change set — nothing unrelated in it.
     An added optional field is not breaking and needs no bump.
   - Apart from that schema bump (whose content sweep must stay with it), keep content edits
     and system edits in separate change sets, so the developer can stage them as separate
     commits (you don't commit — see step 5).
4. **Gate.** `pnpm check` (which includes `pnpm test:challenges`, the headless proof that each
   starter fails and each solution passes) + `pnpm build`. If a challenge changed, also run
   `pnpm test:challenges:browser <slug>` (Sandpack in headless Chrome: starter FAILS, _Show
   solution_ PASSES), since the headless grader is happy-dom, not Sandpack; reuse the dev server
   already on :3002 instead of starting another.
5. **Log.** Append **one line** to `docs/lesson-changelog.md`
   (`YYYY-MM-DD — <track>/<unit> — what changed`); a PR-review round gets one line too, with the
   triage detail (applied / pushed back, and why) in the PR, not the changelog. Update
   `docs/ROADMAP.md` if the change closes or opens a follow-up, and the START HERE block in
   `docs/handoff.md`. Leave everything uncommitted for the developer to review, and end your
   summary with one `Fixes #N` line per handled feedback issue for the PR description, so merging
   closes them. Don't close or comment on the issues yourself. Remove handled entries from
   `docs/content-review.md`.

## Where the recurring problems have actually been

Check these before inventing new ones — each has bitten at least once:

- **A grader that a shortcut passes.** The October 2026 reviews found one in about every three
  challenges: `autoFocus` instead of a ref, `setCount(count + 3)`, a module-level timer handle,
  `resetQueries` instead of a cache write, `parseInt`. Write the shortcut, run the grader, and add
  the test that rejects it.
- **Timing a grader can't keep.** A fixed short sleep followed by "it happened twice" fails a
  correct solution once timers are throttled (a background tab) — wait for the condition with a
  deadline, or hold the async step open through a seam.

- **Adjacent units overlapping** (two units teaching the same quiz question from different
  angles). Fix: sharpen the later unit's angle, don't delete the earlier one.
- **The challenge contract**, because it's graded in an iframe: missing `App.tsx`, a `vitest`
  import, a jest-dom matcher, `jest.mock`, a solution that no longer differs from the starter,
  or a solution that doesn't pass its own grader. These are now validator / `pnpm
  test:challenges` errors — if you find a _new_ one, add it there too.
- **Sandpack limits leaking into lesson design:** real timers, singleton stores leaking across
  test cases, and third-party packages (declare them in `meta.json` `dependencies` with an exact
  version that matches a devDependency, or hand-roll the mechanism).
- **Taxonomy drift:** a lesson's `skills` tag that isn't in `learning/taxonomy.ts`, or a
  taxonomy edit that silently breaks `lib/tags.test.ts` fixtures.
- **Content the renderer silently ignores.** Readings are Markdown, not MDX (a JSX tag shows as
  literal text); frontmatter is not YAML (quotes are kept); zod used to drop unknown keys. The
  validator and `.strict()` schema now reject each of these — keep it that way when adding a
  field: if the app doesn't read it, the schema shouldn't accept it.
- **An acceptance criterion no test asserts.** `meta.json`/README promise something (cleanup on
  unmount is the classic) that the grader never checks, so a leaky solution passes. Fix the
  grader, not the promise.
- **Version drift.** A claim that was true for an older major — React 17/18 warnings, Zustand
  v4 selector behaviour, Nest 10 / Express 4 route syntax — stated without a version. Check it
  against the unit's `sources`, and name the version in the fix. The 2026-10-17 sources backfill
  found a batch of these; they're listed in `docs/content-review.md`.
- **A teaching snippet that's subtly wrong.** The reference solution is content too: it gets
  read more carefully than the prose, and the same shortcut then propagates into the readings
  and the fill-blanks. When you fix one, grep for the pattern across the unit and fix all of
  them in the same pass.
- **A quiz whose _correct_ option states a wrong reason.** Right answer, wrong mechanism, is
  worse than a wrong answer. Demote the plausible-but-false reason to a distractor and explain
  why it's false.

## Guardrails

- Autonomous edits are fine — git history is the safety net — but keep commits small and
  messages clear so any change is trivially `git revert`-able.
- Never bundle a `schemaVersion` bump with unrelated content edits.
- Prefer fixing the _template_ over patching one lesson when the lesson is general.
- Don't weaken a check to make content pass — fix the content, or fix the check's _fixture_
  (as with `lib/tags.test.ts` when a leaf tag gains a child).
- Report what you could **not** verify (challenge behaviour, anything browser-only) instead of
  implying a green gate covered it.
