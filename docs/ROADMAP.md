# Whetstone Roadmap

Status key: ✅ done · 🔨 in progress · ⬜ not started.

## Phases

### Phase 0 — Foundation (nearly complete)
- ✅ Content schema (`learning/schema.ts`) + authoring `PLAYBOOK.md`
- ✅ First vertical slice: `react-hooks-and-rendering` → `use-effect` (all 5 block types)
- ✅ Next.js app — **Browse** + **Drill** modes, file-based content loader, block renderers
- ✅ shadcn/ui (Radix) + accessibility pass
- ✅ Static generation, content path guards, content validator (`pnpm validate`)
- ✅ Next 16 + React 19 + ESLint flat config + `pnpm check` gate
- ✅ **In-browser challenge runner** — Sandpack editor + live preview + in-browser test
  grading (jest-style via `SandpackTests`, with a test seam in `api.ts`)
- ✅ Run `/new-lesson` end-to-end to author a 2nd unit (`use-state-and-functional-updates`) — loop proven; friction fed back into SKILL/PLAYBOOK

### Phase 1 — Solo, deployed
- ✅ Finish the React Hooks track (useState, useEffect, useRef, memoization, controlled-vs-uncontrolled)
- ✅ Track / unit index + navigation (home → track → unit)
- ⬜ Import the `software-engineer-job-test-folder` archive as tagged challenges
- ✅ Deploy to Vercel (PWA deferred — works in mobile browser as-is)
- 🔨 Drill polish — results history ✅ (best/recent attempts); per-unit time config ⬜
- ✅ Local-first progress tracking — dashboard, per-track/unit bars, "continue where you left off"
- ⬜ **Swipe feed** — a third study mode (alongside Browse + Drill) for micro-learning. Design note in "Planned features" below; build later.
- ⬜ **Tags & interest filtering** — formalize the flat `skills` field into a validated, multi-parent tag taxonomy (`learning/taxonomy.ts`), show rolled-up tags on cards, and add an "interest filter" that soft-reorders the catalog. Downward-closure matching (select `react` → all React; select `useEffect` → just that). Full design + build order in `docs/tags-design.md`. Steps 1–3 (taxonomy + validator, `lib/tags.ts`, card chips) ship independently of the filter UI.

### Phase 2 — Multi-user
- ⬜ Supabase auth
- ⬜ Progress tracking (per user, per block)
- ⬜ Ratings on examples/questions → rate-to-reorder
- ⬜ Issue reports + comments on lessons
- ⬜ Self-improvement loop wired to real feedback (`/improve-lesson`)

## Content tracks (the learning backlog)
- ✅ **React Hooks & Rendering** — 5 units: useState, useEffect, useRef, memoization, controlled-vs-uncontrolled
- ✅ **State & Data Flow** — 1 unit: choosing where state lives (local → lift → Context → client store → server state → URL)
- ⬜ **Data Fetching** — TanStack Query (invalidations, query keys), TanStack Router
- ⬜ **Next.js & the Network** — server components vs actions vs API, cache-control/response headers, gzip, caching
- ⬜ **Backend / NestJS** — contracts, controllers, modules, providers; Redis; microservices
- ⬜ **Databases** — relational fundamentals; relational vs document vs graph
- ⬜ **Testing & Quality** — unit vs e2e, Playwright, Vitest
- ⬜ **Reference cards** — HTTP 4xx/5xx codes (quiz-heavy)
- ⬜ **Systems Design** (capstone)
- ⬜ **Infra** — Terraform

## Deferred / cross-cutting
- ⬜ **Cards & variable lesson depth** — a lightweight `card` block (info + example, flash-card style) so a "lesson" can range from a reminder to a full mastery unit, and cards can *bloom* by appending blocks. Inline first; graduate to referenced/shared cards (challenge pattern) only when reuse is real. Proposal: `docs/cards-and-lesson-depth.md`.
- ⬜ zod 3 → 4 migration (`schema.ts`, `validate.ts`)
- ⬜ TypeScript 5 → 6
- ⬜ **Context → Zustand** for client state — switch when a 2nd/3rd persisted store lands (settings, streaks, drill history). Plan + triggers: `docs/zustand-migration.md`.
- ⬜ Pick-N / difficulty-mix quizzes (schema already supports the shape)
- ⬜ More "Go deeper" reading tiers across units
- ⬜ CI — run `pnpm check` + build on PRs

## Planned features (design later)

### Swipe feed — "Reels/TikTok"-style quick practice

**Idea:** a vertical, one-question-at-a-time feed for when you have a few minutes and want quick
reps. Swipe up → a random question; answer it inline → immediate result + explanation; swipe up
again → the next one. Low-commitment micro-learning that complements the two existing modes
(Browse = read untimed, Drill = timed test). Not building now — capturing the plan.

**What it reuses:** the existing assessment renderers (`quiz`, `fill-blank`, `predict-output`)
in a single-item, "reveal after answer" mode. Readings and challenges are excluded from the feed
(too long for a card).

**Design questions to resolve before building:**
- **Sampling.** Start with uniform random across all assessment items; evolve toward weighted /
  spaced-repetition (favor unseen, previously-wrong, or low-rated items). Depends on the Phase-2
  ratings + richer progress data.
- **Item index.** Needs a flat, cross-track index of every assessment item (a new content query
  over tracks → units → blocks), tagged by skill so the feed can be filtered by track/skill.
- **Progress semantics.** Feed answers probably shouldn't count toward *unit completion* (it's
  cross-unit) — track them as their own thing: a "practiced N today" count / streak. Pairs with a
  future streaks/XP store (and is a likely trigger for the Context → Zustand switch).
- **Session shape.** Endless scroll vs a capped "10-card session" with a little summary at the end.
- **Interaction.** Mobile-first vertical snap-scroll; arrow-key (↑/↓) navigation on desktop; no
  timer (each card self-grades on answer).
- **Persistence.** Per-item "seen/answered/last-result" state — localStorage first, Supabase later
  (same local-first → cloud path as progress).

## Conventions (quick reference)
- Content in `content/`; schema `learning/schema.ts`; pedagogy `learning/PLAYBOOK.md`.
- shadcn: never edit `components/ui/*` — wrap or re-theme (see `docs/shadcn-local-patches.md`).
- Gates: `pnpm check` (lint + typecheck + validate + test) and `pnpm build`.
