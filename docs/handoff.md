# Handoff — START HERE

A briefing for the next session, not a history: replace stale lines, don't append. The routine is
in `AGENTS.md` → "Working with this repo".

## Status (2026-10-17)

- **`main` serves 16 tracks, 83 units (6 built on a cards deck, 4 of them cards only) and 47
  challenges**, every challenge verified in real Sandpack (starter fails, solution passes). The
  content phase landed as PRs #15–#33, merged bottom-up on 2026-10-17; what each PR shipped is in
  `docs/lesson-changelog.md`, and each PR description lists what its review changed.
- Every unit was written by an author agent and fact-checked by a separate reviewer agent that
  re-ran its snippets against pinned versions. CodeRabbit reviews at most 150 files per PR, so
  the larger batches were reviewed through review-only PRs (#35–#42).
- **Skills pass, 2026-10-17, branch `skills/pass-2026-10-17` (uncommitted):**
  - `/readability` round 1 over all app code plus 10 bugs fixed test-first, among them the
    challenge editor dropping edits on re-render and _Run tests_ showing nothing after the
    preview had loaded (`docs/readability-audit.md`).
  - `/security-audit` round 1: Next.js 16.2.9 → 16.3.8, the shadcn CLI moved to dev
    dependencies, security headers and a static CSP in `next.config.mjs` (production builds
    only) (`docs/security-audit.md`).
  - Production (`https://whetstone-tawny.vercel.app`) is **public**, and stays public and
    indexable by the owner's choice; Vercel's Standard Protection covers only deployment URLs.
  - `/pagespeed` round 1: home layout shift fixed, contrast and headings (accessibility 100 and
    best practices 100 on all four measured pages), and the challenge runner now loads only near
    the viewport (`docs/pagespeed-audit.md`; tooling in `scripts/pagespeed/`).
  - `/seo` round 1: per-page titles, descriptions and canonicals, sitemap, robots.txt, a
    generated preview card and breadcrumb JSON-LD, all from `lib/seo.ts` (`docs/seo.md`).
  - `/condense` round 1: six docs condensed in place (941 → 836 lines) and 40 stale facts
    corrected, among them a Zustand migration plan that would have overwritten saved progress
    (`docs/zustand-migration.md`); one lesson sentence about drill history fixed with it.
- **Live since 2026-10-18 (main 3330f0b), checked on production:** security headers and CSP
  served, 0 CSP violations and 0 console errors on the four measured pages, all 47 challenges pass
  in real Sandpack against the live site, the UI bug repros pass, robots.txt, the 100-URL sitemap,
  the preview image and per-page metadata serve. PSI lab: accessibility, best practices and SEO
  100 on all four pages, performance 92-99 (one run each).
- Gates: `pnpm check` (about 30 s, including the headless grader) and `pnpm build`; every Vercel
  build runs both. A new or changed challenge also gets `pnpm test:challenges:browser <slug>`:
  real Sandpack in headless Chrome. It isn't in `pnpm check` because it needs a running server
  (`pnpm dev`, or `BASE_URL` for a `next start` build) and the network.

## Next up

1. Make every reading example part of the server HTML (`docs/seo.md` → "Found after deploy"):
   today only each tier's first example renders server-side, so the rest, and the cross-track
   links in them, are invisible to crawlers that don't run JavaScript. Then the owner actions in
   `docs/ROADMAP.md` → "Deferred / cross-cutting".
2. App follow-ups the content phase surfaced (UI, not content): render predict-output answers as
   Markdown/preformatted (backticks and multi-line output show literally today), and stop long
   `code` spans in a challenge's acceptance-criteria list wrapping into boxes.
3. A validator check for a `/learn/` link whose text is a slug in backticks. PLAYBOOK forbids it
   but nothing catches it, and one sweep added 50 of them.

## Open items

- Progress is keyed `track/unit`. Key it by unit slug before Phase 2 sync (ROADMAP → Phase 2).
- Progress is still on Context, and drill history on direct localStorage reads in `UnitView`; the
  Zustand plan is `docs/zustand-migration.md`.
- A running `pnpm dev` keeps serving the catalog it started with: after adding a track or unit,
  restart it, or the new pages 404.
- Other open and dated items are ⬜ in `docs/ROADMAP.md` (e.g. `@nestjs/common` in a challenge,
  the Vitest 5 sweep, Temporal in Safari, GitHub native stacks GA, a `queue: max` YAML example
  once actionlint accepts it, Nest throttler-storage peer deps).

## Read before authoring

`learning/PLAYBOOK.md` (judgment and the challenge contract), then the skill you're running
(`/new-lesson` or `/improve-lesson`).
