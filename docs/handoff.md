# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- Deployed on Vercel. 3 tracks, 14 units, 10 challenges: React Hooks & Rendering (7 units),
  State & Data Flow (3), Backend with NestJS (4). `main` is at PR #12 (headless challenge
  grader, schema v2, challenge `dependencies`, stricter validation).
- **PR #13** (`feat/lesson-structure`, against `main`) is open, with CodeRabbit round 1
  addressed: schema v3 — objectives + sources on every unit, challenge text moved into
  meta.json, code as arrays of lines, `content/catalog.json`, the validator as a tested module,
  "Flag" → GitHub issue feedback, inline Markdown in prompts.
- **PR #14** (`feat/cards-and-build-gate`, against `main`; #13 is merged): the `cards` block
  for reference units, derived Card / Lesson / Full depth, question-less units completing on
  visit, and `vercel.json` running `pnpm check` before every Vercel build. Its first Vercel
  build **did run the gate** and failed it — the grader under `NODE_ENV=production` — fixed
  along with CodeRabbit round 1, uncommitted.
- Gates: `pnpm check` (about 25 s, including the headless grader) and `pnpm build` — and, once
  `vercel.json` is merged, every Vercel build runs both.

## Next up

1. Commit and push the fixes, and check the next Vercel build on PR #14 goes green (its log
   should end the challenge step with "All 10 in-browser challenges … ✅").
2. Merge PR #14.
3. After it merges, a production spot-check: a challenge's _Run tests_ (fails) and _Show
   solution_ (passes) with the new title / task list / collapsed hints; a "Flag" link opening a
   prefilled issue; a predict-output reveal showing "Also counts:".
4. **Content phase, first:** the 47 accuracy findings in `docs/content-review.md`, via
   `/improve-lesson`. Then new units from `docs/ROADMAP.md` → "Content tracks" (a new track
   starts with its unit outline in the ROADMAP).

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
