# Whetstone

Sharpen any skill through deliberate practice. Whetstone is a platform for building
**self-improving study templates** — readings, quizzes, and coding challenges that get
better as you use them.

The first track-pack covers **software engineering**: React hooks and rendering, state and
data flow, and backend NestJS so far, with more tracks planned in `docs/ROADMAP.md`.

## How it's organized

- `content/` — the lessons themselves (tracks → units → blocks) and coding challenges.
  Plain files, git-versioned, AI-authorable.
- `learning/` — the authoring system: `schema.ts` (the shape of content, validated with zod),
  `taxonomy.ts` (the tag registry), `sandbox.ts` (what a challenge can import), and
  `PLAYBOOK.md` (how a good lesson is built).
- `scripts/` — the content gates: `validate.ts` and `check-challenges.ts`.
- `.claude/skills/` — the `/new-lesson` and `/improve-lesson` commands.
- `docs/` — start at `handoff.md`; `lesson-changelog.md` is the audit log of content edits.

## Study modes

- **Browse** — mobile-friendly, untimed, examples visible. For reading up on the go.
- **Drill** — timed and scored, readings hidden. For interview prep.

Progress is stored locally in the browser (no accounts yet).

## Working on it

```bash
pnpm install
pnpm dev     # http://localhost:3002
pnpm check   # the gate: lint, types, content validation, unit tests, challenge grading
pnpm build
```

`AGENTS.md` (also `CLAUDE.md`) has the full working rules. To author a lesson, read
`learning/PLAYBOOK.md` or run `/new-lesson <topic>`.
