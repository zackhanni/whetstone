# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- `main` is at PR #14 (schema v3, `cards` block, derived depth, `vercel.json` gate) and serves
  3 tracks / 14 units / 10 challenges.
- **The content phase is complete as a PR stack, #15 → #33.** Merged, it gives **16 tracks,
  83 units (6 of them card units), 47 challenges**, every one verified in real Sandpack
  (`pnpm test:challenges:browser`: starter fails, solution passes). Each PR targets the one below
  it; merge bottom-up with merge commits (repo auto-delete retargets the next PR — don't use
  `gh pr merge --delete-branch`, which can close the child instead).
  - #15–#17: accuracy passes on the three shipped tracks; all 47 `docs/content-review.md`
    findings handled, NestJS moved to Nest 12.
  - #18–#24: JS & TS Fundamentals, Dates & Time, Async JavaScript, Data Fetching with TanStack
    (first real-package challenges), HTTP & APIs, Next.js & the Network, three new NestJS units.
  - #25: authoring-system hardening (duplicate test names, inline line breaks, `<Profiler>`
    counters, the Sandpack browser check).
  - #26–#32: Reference Cards, Web Security, Databases, Testing & Quality, Terminal/Git/GitHub,
    Systems Design, Infrastructure.
  - #33: content checks (invisible characters, `/learn/` links resolve, statement-level import
    scan), PLAYBOOK notes, and unit-slug mentions in readings turned into links.
- Every unit was written by an author agent and then fact-checked by a separate reviewer agent
  that re-ran its snippets against pinned versions; each PR description lists what the review
  changed.
- Gates: `pnpm check` (about 30 s, including the headless grader) and `pnpm build`; every Vercel
  build runs both. A new or changed challenge also gets `pnpm test:challenges:browser <slug>`
  (real Sandpack, headless Chrome, needs `pnpm dev`).

## Next up

1. Review and merge the stack bottom-up (#15 first). Trigger CodeRabbit per PR after the one below
   it merges, so each review covers its own diff.
2. After merging, a production spot-check: one challenge per new track (_Run tests_ fails, _Show
   solution_ passes), a card unit, a cross-track `/learn/…` link.
3. App follow-ups the content phase surfaced (UI, not content): render predict-output answers as
   Markdown/preformatted (backticks and multi-line output show literally today), and stop long
   `code` spans in a challenge's acceptance-criteria list wrapping into boxes.

## Open items

- `@nestjs/common` in a challenge via `dependencies` is untested (Nest needs decorator metadata
  in Sandpack's transpiler).
- Progress is keyed `track/unit`. Key it by unit slug before Phase 2 sync (ROADMAP → Phase 2).
- Progress and drill history are still on Context; the Zustand plan is `docs/zustand-migration.md`.
- The headless grader runs in happy-dom, not Sandpack, so a new or changed challenge still gets one
  Sandpack run — `pnpm test:challenges:browser <slug>` (not in `pnpm check`: it needs the dev
  server, Chrome and the network).
- A running `pnpm dev` keeps serving the catalog it started with: after adding a track or unit,
  restart it, or the new pages 404.
- Dated facts to re-check are ⬜ items in `docs/ROADMAP.md` under each track (e.g. Vitest 5 sweep,
  Temporal in Safari, GitHub native stacks GA, a `queue: max` YAML example once actionlint accepts
  it, Nest throttler-storage peer deps).

## Read before authoring

`learning/PLAYBOOK.md` (judgment and the challenge contract), then the skill you're running
(`/new-lesson` or `/improve-lesson`).
