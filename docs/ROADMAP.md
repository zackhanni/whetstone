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
- ⬜ Finish the React Hooks track (useState/`prev`, useRef, memoization, controlled-vs-uncontrolled)
- ✅ Track / unit index + navigation (home → track → unit)
- ⬜ Import the `software-engineer-job-test-folder` archive as tagged challenges
- ⬜ Deploy to Vercel + PWA (mobile "read on the go")
- ⬜ Drill polish — per-unit time config, results history

### Phase 2 — Multi-user
- ⬜ Supabase auth
- ⬜ Progress tracking (per user, per block)
- ⬜ Ratings on examples/questions → rate-to-reorder
- ⬜ Issue reports + comments on lessons
- ⬜ Self-improvement loop wired to real feedback (`/improve-lesson`)

## Content tracks (the learning backlog)
- 🔨 **React Hooks & Rendering** — useEffect ✅, useState/`prev` ✅; useRef, memoization, controlled-vs-uncontrolled ⬜
- ⬜ **Data Fetching** — TanStack Query (invalidations, query keys), TanStack Router
- ⬜ **Next.js & the Network** — server components vs actions vs API, cache-control/response headers, gzip, caching
- ⬜ **Backend / NestJS** — contracts, controllers, modules, providers; Redis; microservices
- ⬜ **Databases** — relational fundamentals; relational vs document vs graph
- ⬜ **Testing & Quality** — unit vs e2e, Playwright, Vitest
- ⬜ **Reference cards** — HTTP 4xx/5xx codes (quiz-heavy)
- ⬜ **Systems Design** (capstone)
- ⬜ **Infra** — Terraform

## Deferred / cross-cutting
- ⬜ zod 3 → 4 migration (`schema.ts`, `validate.ts`)
- ⬜ TypeScript 5 → 6
- ⬜ Pick-N / difficulty-mix quizzes (schema already supports the shape)
- ⬜ More "Go deeper" reading tiers across units
- ⬜ CI — run `pnpm check` + build on PRs

## Conventions (quick reference)
- Content in `content/`; schema `learning/schema.ts`; pedagogy `learning/PLAYBOOK.md`.
- shadcn: never edit `components/ui/*` — wrap or re-theme (see `docs/shadcn-local-patches.md`).
- Gates: `pnpm check` (lint + typecheck + validate) and `pnpm build`.
