# Whetstone — Agent Instructions

> A self-improving learning platform for senior-engineering skills: content is authored as
> **tracks → units → blocks**, studied in two modes (**Browse** = read untimed, **Drill** =
> timed + scored), with in-browser coding challenges. Content lives as files; user progress is
> **local-first** (localStorage), designed to migrate to Supabase later.
>
> This is the single source of truth for AI tools. `CLAUDE.md` is a symlink to this file.

## Build, Run & Validate

```bash
pnpm dev              # Next dev server — this project runs on :3002 (another app owns :3000)
pnpm build            # production build (SSG) — gate for any routing/content change
pnpm check            # lint + typecheck + validate + test + test:challenges — the primary gate
pnpm validate         # schema + catalog + reading files + slugs + taxonomy + challenge contract (learning/validate-content.ts)
pnpm test             # Vitest — pure lib/* and learning/* logic, node environment
pnpm test:challenges  # every challenge grader, headless: starter must fail, solution must pass
pnpm test:challenges:browser [slug…]  # the same, in real Sandpack (needs a running server, `pnpm dev` or `BASE_URL=…`, and Chrome)
```

**`pnpm check` and `pnpm build` are gates — a change isn't done until both pass.** Vercel
runs both on every push (`vercel.json` → `buildCommand`), so a failing gate also fails the
preview and blocks the production deploy; the Vercel check on a PR is the gate's result. The headless
challenge grader runs in happy-dom, not Sandpack, so a new or changed challenge also gets one run
**in the browser** (starter fails, "Show solution" passes): `pnpm test:challenges:browser <slug>`.

## Stack

- Next.js 16 (App Router, Turbopack, SSG) · React 19 · TypeScript (strict) · Tailwind CSS v4
- shadcn/ui on the unified `radix-ui` package · in-browser challenges via `@codesandbox/sandpack-react`
- No backend yet — client state is **local-first** in `localStorage` (see State management)

## Where things live

- `content/` — all lessons (`tracks/…/units/…/unit.json` + `reading/{simple,medium,complex}/*.mdx` + `cards/*.mdx`), `challenges/`, and `catalog.json` (track order).
- `learning/` — the authoring system: `schema.ts` (zod, the shape of content), `validate-content.ts` (the cross-file checks), `taxonomy.ts` (the tag registry), `sandbox.ts` (what a challenge can import, and the pinned versions), `grading.ts` (how fill-blank answers match), `PLAYBOOK.md` (authoring judgment).
- `scripts/validate.ts` + `scripts/check-challenges.ts` — the content gates' command-line entry points (`vitest.challenges.config.ts` is the headless grader's config).
- `lib/depth.ts` — a unit's Card / Lesson / Full depth, derived from its blocks (never declared).
- `lib/feedback.ts` + `components/flag-link.tsx` — "Flag" links that open a prefilled `lesson-feedback` GitHub issue; `/improve-lesson` reads those issues.
- `lib/content.ts` — file-based content loader (React `cache()`, path-traversal guarded).
- `lib/progress.ts` + `components/progress-provider.tsx` — the local-first progress store (Context). Drill attempts (`lib/drill-history.ts`) have no shared container: `UnitView` reads and writes them straight from localStorage. `lib/stores/interests-store.ts` — the interest filter (Zustand).
- `lib/seo.ts`: per-page metadata, canonicals, sitemap/robots and JSON-LD from one `SITE_URL`. `next.config.mjs`: security headers and a static CSP, production builds only (check a change with a production build, not `pnpm dev`).
- `docs/` — `handoff.md` (START HERE), `ROADMAP.md` (plan + backlog), `lesson-changelog.md`, `content-review.md` (accuracy findings to fix), design notes (`tags-design.md`, `cards-and-lesson-depth.md`, `zustand-migration.md`, `shadcn-local-patches.md`), and the skills' reports (`readability-audit.md`, `security-audit.md`, `pagespeed-audit.md`, `seo.md`): read the matching one before re-running a skill; its declined items are decisions.

## Authoring content

Add lessons with the **`/new-lesson`** skill (`.claude/skills/new-lesson`) and change shipped ones
with **`/improve-lesson`** — both scaffold against the schema and gate on `pnpm check` + `pnpm build`.
Don't hand-roll content around the schema; if the schema genuinely can't express something, change
it as its **own** change set (a breaking change also bumps `schemaVersion` and sweeps every file —
see PLAYBOOK). Append **one line** to `docs/lesson-changelog.md` for every content change.

## State management

Client state is local-first in `localStorage`. Progress is read **once** and shared via React
**Context** (`ProgressProvider`) — not per-component reads. Drill history has no shared container:
`UnitView` reads and writes it with `lib/drill-history.ts`. The interest filter is the first
**Zustand** store (`lib/stores/interests-store.ts`, `persist` + a `useMounted` hydration gate).
Its arrival was the trigger for moving progress and drill history to Zustand too — that migration
is planned, not done (`docs/zustand-migration.md`). (Choosing where state lives is itself a
lesson: `content/tracks/state-and-data-flow`.)

## Code style / Patterns to avoid

- **Don't layer/nest ternary operators.** A ternary inside another ternary's branches is hard to
  read — use an early return, an `if/else`, or a computed variable. Enforced loosely: ESLint
  `no-nested-ternary` is set to `warn` (it flags but does **not** fail `pnpm lint`).
- **Don't hand-edit `components/ui/*`** (generated by shadcn) — re-theme via tokens or wrap in an
  app component so shadcn updates stay safe. Record any unavoidable patch in `docs/shadcn-local-patches.md`.
- **Surface unexpected errors; don't swallow them.** Map only an *expected* condition (e.g.
  `ENOENT` → "no content") to a fallback; rethrow the rest so a broken build fails loudly.
- **Comment the _why_, not the _what_.** No `console.log` left in committed code (a structured
  `console.error`/`console.warn` at a real boundary is fine).

## Working with this repo

- **Don't commit, push, or merge automatically** — leave changes uncommitted for the developer to
  review and commit (they run CodeRabbit on the PR).
- Plan before non-trivial/multi-file work; just do small, obvious edits.
- **Start every session with `docs/handoff.md`**, and end any session that changed something by
  updating its START HERE block (status, what's next, open items). It is a briefing, not a
  history: replace stale lines rather than appending.
- Verify with `pnpm check` + `pnpm build` before claiming done; report failures with their output.
- The dev server runs on **:3002** — only ever kill that port, never a blanket port-kill.
- Be direct and objective, not sycophantic.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
