---
name: improve-lesson
description: Read learner feedback and improve existing lessons (and the schema/template when the lesson is general). Use when acting on feedback in content/feedback/ or when asked to refresh or fix a lesson.
argument-hint: "[--unit <slug>] [--all]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx:*), Bash(vitest:*), Bash(git:*)
---

# /improve-lesson — refine lessons from feedback

Read `learning/PLAYBOOK.md` first.

## Steps

1. **Gather.** Read `content/feedback/` (or the named unit). Group items by what they're
   really about: content accuracy, difficulty, or *interface/structure* (how the lesson is
   presented). The fix lives in a different place depending on which.
2. **Triage general vs. local.** If a fix would help *every* lesson (better block
   ordering, a clearer reading structure), it's a **template/schema** change, not a
   one-off patch.
3. **Edit.**
   - *Local fix:* edit the unit/challenge directly. Small commit.
   - *General fix:* change `learning/schema.ts` and/or `PLAYBOOK.md`, **bump
     `schemaVersion`**, then sweep across all affected lessons. Land the sweep as ONE
     dedicated commit, isolated from content edits.
4. **Validate (gate).** Re-run schema validation and any affected challenge tests.
5. **Log.** Append to `docs/lesson-changelog.md`. Clear the handled feedback files.

## Guardrails

- Autonomous edits are fine — git history is the safety net — but keep commits small and
  messages clear so any change is trivially `git revert`-able.
- Never bundle a `schemaVersion` bump with unrelated content edits.
- Prefer fixing the *template* over patching one lesson when the lesson is general.
