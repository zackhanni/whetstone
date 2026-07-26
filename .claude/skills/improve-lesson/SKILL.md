---
name: improve-lesson
description: Read learner feedback and improve existing lessons — or the system that produces them (validator, schema, playbook, skills) when the problem is general. Use when acting on feedback in content/feedback/, when asked to refresh or fix a lesson, and when asked to fold fresh learnings back into the authoring workflow.
argument-hint: "[--unit <slug>] [--all] [--system]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*), Bash(npx:*), Bash(vitest:*), Bash(git:*)
---

# /improve-lesson — refine lessons from feedback

Read `learning/PLAYBOOK.md` first. This skill also owns the repo's **learning loop**: it may be
invoked with no feedback at all ("take what you just learned and make the system better").

## Steps

1. **Gather.** Read `content/feedback/` (or the named unit). Group items by what they're
   really about: content accuracy, difficulty, or _interface/structure_ (how the lesson is
   presented). The fix lives in a different place depending on which.
2. **Triage — and pick the highest-leverage layer.** For each item ask "where does this stop
   happening forever?" and fix it at the _highest_ layer that applies:
   1. **A check** in `scripts/validate.ts` (or a unit test) — the machine now enforces it.
   2. **The schema** `learning/schema.ts` — the shape makes the mistake unrepresentable.
   3. **`learning/PLAYBOOK.md`** — judgment a machine can't check.
   4. **The skills** (`.claude/skills/*/SKILL.md`) — the _procedure_ and its ordering.
   5. **The lesson itself** — last resort for a genuinely one-off problem.
      Prose that restates a rule a script could check is a smell: write the check instead, then
      point the PLAYBOOK at it.
3. **Edit.**
   - _Local fix:_ edit the unit/challenge directly.
   - _General fix:_ change the validator / `learning/schema.ts` / `PLAYBOOK.md`. A **schema**
     change (not a validator or prose change) **bumps `schemaVersion`** and sweeps every
     affected lesson as ONE dedicated, isolated commit.
   - Keep content edits and system edits in separate commits either way.
4. **Gate.** `pnpm check` + `pnpm build`. If a challenge changed, re-verify it **in the
   browser** (starter FAILS, _Show solution_ PASSES) — there's no headless run; reuse the
   dev server already on :3002/:3000 instead of starting another.
5. **Log.** Append to `docs/lesson-changelog.md` (`YYYY-MM-DD — <track>/<unit> — what changed`)
   and update `docs/ROADMAP.md` if the change closes or opens a follow-up. Clear the handled
   feedback files. Leave everything uncommitted for the developer to review.

## Where the recurring problems have actually been

Check these before inventing new ones — each has bitten at least once:

- **Adjacent units overlapping** (two units teaching the same quiz question from different
  angles). Fix: sharpen the later unit's angle, don't delete the earlier one.
- **The challenge contract**, because it's graded in an iframe: missing `App.tsx`, a `vitest`
  import, a jest-dom matcher, `jest.mock`, or a solution that no longer differs from the
  starter. These are now validator errors — if you find a _new_ one, add it there too.
- **Sandpack limits leaking into lesson design:** no third-party deps, real timers, singleton
  stores leaking across test cases.
- **Taxonomy drift:** a lesson's `skills` tag that isn't in `learning/taxonomy.ts`, or a
  taxonomy edit that silently breaks `lib/tags.test.ts` fixtures.
- **An acceptance criterion no test asserts.** `meta.json`/README promise something (cleanup on
  unmount is the classic) that the grader never checks, so a leaky solution passes. Fix the
  grader, not the promise.
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
