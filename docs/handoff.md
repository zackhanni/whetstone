# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- Deployed on Vercel. 3 tracks, 14 units, 10 challenges: React Hooks & Rendering (7 units),
  State & Data Flow (3), Backend with NestJS (4). `main` is at PR #14 (schema v3, `cards`
  block, derived depth, `vercel.json` gate).
- **Content phase in progress, as a PR stack.** Each PR targets the one below it; merge
  bottom-up with merge commits (repo auto-delete retargets the next PR). Accuracy fixes come
  first, one PR per existing track, then one PR per new track from `docs/ROADMAP.md`.
  - State & Data Flow accuracy pass — all 14 `docs/content-review.md` findings fixed and
    independently reviewed (PR #15).
  - React Hooks & Rendering accuracy pass — all 21 findings fixed and reviewed; 6 challenges
    tightened so the obvious shortcut fails (PR #16).
  - Backend with NestJS accuracy pass — 12 findings handled against Nest 12 (current major);
    `docs/content-review.md` now has no open findings (PR #17).
  - New track **JavaScript & TypeScript Fundamentals** (5 units, 4 challenges), first in the
    catalog (PR #18).
  - New track **Dates & Time** (4 mastery units + 1 card unit, 1 challenge) (PR #19).
  - New track **Async JavaScript & Timing** (5 units, 4 challenges), second in the catalog (PR #20).
  - New track **Data Fetching with TanStack** (6 units, 6 challenges): the first challenges to
    use `dependencies` (real `@tanstack/react-query` / `@tanstack/react-router`), proven in Sandpack
    (PR #21).
  - New track **HTTP & APIs in Practice** (6 units, 4 challenges).
- Gates: `pnpm check` (about 25 s, including the headless grader) and `pnpm build`; every
  Vercel build runs both.

## Next up

1. Review and merge the content stack bottom-up.
2. New tracks from `docs/ROADMAP.md` → "Content tracks" land in the PRs above this one.
3. A production spot-check after merging: a changed challenge's _Run tests_ (fails) and _Show
   solution_ (passes); a "Flag" link opening a prefilled issue.

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
