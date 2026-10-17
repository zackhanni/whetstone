# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- **The content phase is merged.** `main` serves **16 tracks, 83 units (6 of them card units),
  47 challenges**, every challenge verified in real Sandpack (`pnpm test:challenges:browser`:
  starter fails, solution passes). It landed as the PR stack #15 → #33, merged bottom-up on
  2026-10-17 in batches (#15, #16, #18, #21, #24, #27, #30). Each batch got a CodeRabbit full
  review, through review-only PRs #35–#42 where a batch was over the 150-file limit, and the
  verified fixes went on top of the batch before it merged (one `PR #… review` changelog line each).
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

1. Production spot-check: one challenge per new track (_Run tests_ fails, _Show solution_
   passes), a card unit, a cross-track `/learn/…` link.
2. In a real browser, scroll to a challenge, wait for the preview to load, then press _Run
   tests_. In headless Chrome that order leaves the tests panel empty (reproduced under
   `pnpm dev`); pressing before Sandpack starts works, which is why the browser check does it
   that way. If a real browser shows the same, it's a `ChallengeRunner` bug users hit.
3. App follow-ups the content phase surfaced (UI, not content): render predict-output answers as
   Markdown/preformatted (backticks and multi-line output show literally today), and stop long
   `code` spans in a challenge's acceptance-criteria list wrapping into boxes.
4. A validator check for a `/learn/` link whose text is a slug in backticks. PLAYBOOK forbids it
   but nothing catches it: #33's sweep added 50, which the #42 review then rewrote.

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
