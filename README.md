# Whetstone

Sharpen any skill through deliberate practice. Whetstone is a platform for building
**self-improving study templates** — readings, quizzes, and coding challenges that get
better as you use them.

The first track-pack covers **software engineering** (React, Next.js, NestJS, databases,
testing, systems design).

## How it's organized

- `content/` — the lessons themselves (tracks → units → blocks) and coding challenges.
  Plain files, git-versioned, AI-authorable.
- `learning/` — the authoring system: `schema.ts` (the single source of truth, validated
  with zod) and `PLAYBOOK.md` (how a good lesson is built).
- `.claude/skills/` — the `/new-lesson` and `/improve-lesson` commands.
- `docs/lesson-changelog.md` — audit log of (autonomous) content edits.

## Study modes (planned)

- **Browse** — mobile-first, untimed, examples visible. For reading up on the go.
- **Drill** — desktop, timed, scored. For interview prep.

## Status

**Phase 0:** content schema + first lesson authored (`react-hooks-and-rendering` → `use-effect`).
The Next.js app is not yet scaffolded. `track.json` intentionally lists only units that
exist; planned next units in this track: `use-state-and-functional-updates`, `use-ref`,
`memoization`, `controlled-vs-uncontrolled`.

To author a lesson, read `learning/PLAYBOOK.md` or run `/new-lesson <topic>`.
