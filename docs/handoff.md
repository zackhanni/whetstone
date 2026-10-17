# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- Deployed on Vercel. 3 tracks, 14 units, 10 challenges: React Hooks & Rendering (7 units),
  State & Data Flow (3), Backend with NestJS (4). `main` is at PR #11.
- **PR #12** (`feat/challenge-dependencies`) is open, with CodeRabbit round 1 addressed. It
  holds the per-challenge `dependencies` field plus an authoring-system pass: the headless
  challenge grader, schema v2 and its content sweep, new validator checks, the loader no longer
  hiding broken content, and these docs.
- Gates: `pnpm check` (about 25 s, including the headless grader) and `pnpm build`.

## Next up

1. Merge PR #12 once its review is settled.
2. After merge, a browser spot-check on production: one challenge's _Run tests_ (starter fails)
   and _Show solution_ (passes), and one predict-output reveal, which now shows "Also counts:".
3. More content: pick from `docs/ROADMAP.md` → "Content tracks". A new track starts with its unit
   outline in the ROADMAP, before the first unit.

## Open items

- `@nestjs/common` in a challenge via `dependencies` is untested (Nest needs decorator metadata
  in Sandpack's transpiler).
- Progress is keyed `track/unit`. Key it by unit slug before Phase 2 sync (ROADMAP → Phase 2).
- Progress and drill history are still on Context; the Zustand plan is `docs/zustand-migration.md`.
- The headless grader runs in happy-dom, not Sandpack, so a new or changed challenge still gets one
  browser run.

## Read before authoring

`learning/PLAYBOOK.md` (judgment and the challenge contract), then the skill you're running
(`/new-lesson` or `/improve-lesson`).
