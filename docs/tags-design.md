# Tags & Interest Filtering — Design

> Status: **built** — all five build steps shipped (PR #9). Kept as the design record: a
> hierarchical, validated tag taxonomy layered on the `skills` field, plus an "interest filter"
> that reorders the catalog to what a learner wants to study. "Planned dimensions" (near the end)
> is the one living section: update it as tracks land.

## The core idea

We already have a tag system: `skills: string[]` on units and challenges (and, until schema v2,
on tracks) in `learning/schema.ts`. It is flat and free-text — `use-effect` is tagged
`["react","hooks","useEffect","data-fetching"]`, mixing a broad tag, a mid tag, and a leaf,
with the hierarchy only implied. This design **formalizes** that field; it does not add a
parallel `tags` field.

The one decision that makes everything else easy: **separate association from hierarchy.**

- **Association** — which lessons carry which tags — stays flat, on each unit (`skills`), as today.
- **Hierarchy** — `useEffect → hooks → react → frontend` — lives once in a central registry.

Authors keep tagging flat, leaf-ish skills. "Selecting `react` matches all React content" is
_computed_ by walking the tree, never by re-tagging lessons with every ancestor.

## Decisions (locked)

- **Filter behavior: soft.** Matching tracks float to the top; the rest drop below a
  "More tracks" divider, dimmed but visible. Empty selection = show everything. Revisit
  hard-hide once the catalog is large.
- **Hierarchy shape: multi-parent DAG.** A tag (`testing`, `typescript`, `data-fetching`) may
  sit under more than one dimension. The validator must reject cycles.
- **Tag source of truth: unit-level.** Only units (and challenges) carry `skills`. A track's
  displayed tags are the deduped union of its units' skills, so track and unit tags can never
  drift. Schema v2 removed `track.skills` outright: nothing read it, and it had already drifted
  (the React track listed 4 tags while its units used 21).
- **No `schemaVersion` bump for this feature.** It left unit/track shapes unchanged, adding only
  a sibling registry and a validator rule. (Removing `track.skills` later was a breaking change,
  so it shipped as part of schema v2.)

## Data model

New registry — `learning/taxonomy.ts`, zod-validated like `schema.ts`:

```ts
export const TagNode = z.object({
  slug: z.string().min(1),                    // "useEffect" — matches what content uses in `skills`
  label: z.string().min(1),                   // human label, may change freely
  parents: z.array(z.string()).default([]),   // [] = a top-level dimension (frontend/backend/…)
});
// registry = TagNode[]; roots (no parents) are the "dimensions".
```

Example rows:

```
{ slug: "frontend",  label: "Frontend" }
{ slug: "backend",   label: "Backend" }
{ slug: "react",     label: "React",     parents: ["frontend"] }
{ slug: "hooks",     label: "Hooks",     parents: ["react"] }
{ slug: "useEffect", label: "useEffect", parents: ["hooks"] }
{ slug: "testing",   label: "Testing",   parents: ["frontend", "backend"] }
```

**Closed vocabulary.** `scripts/validate.ts` gains one check: every skill used anywhere in
content must exist in the taxonomy. This kills tag sprawl and typos (`useeffect` vs
`useEffect`) — the classic tag-system failure — and matches the repo's fail-loud ethos. The
validator also **rejects cycles** in the DAG and **warns** on orphan tags (defined but used by
nothing).

Cap depth at ~3–4 levels (dimension → area → topic → API). Deeper makes the picker a chore.

## Matching semantics — downward closure

> A lesson matches a selected tag if it is tagged with that tag **or any descendant of it.**

| Select | Matches lessons tagged… | `useRef`-only lesson |
| --- | --- | --- |
| `react` | react, hooks, useEffect, useRef, useMemo… (whole subtree) | shown |
| `hooks` | hooks, useEffect, useRef, useMemo… | shown |
| `useEffect` (leaf) | useEffect only | hidden |

"Select the parent = everything under it" and "select one leaf = just that leaf" fall out of
the _same_ rule. We never auto-select children in the data — descendants are matched at query
time.

Subtlety that helps us: selecting `react` is **broader** than selecting all of react's leaves
individually, because it also matches a lesson tagged with the bare `react` tag and no leaf.
That is exactly the "some lessons just get a generic `react` tag" case — a broad overview
lesson shows up under `react` but not under `useEffect` alone. Tag at the right altitude.

**Union (OR) across selected tags.** "What I want to learn" means _React stuff and testing
stuff_. Intersection ("both React and testing") is a later power-user filter — not v1.

## Picker UX — expand ≠ select

The overlap worry ("to reveal react's children I must select react, but then I get all of
React") is a UI problem with a clean fix: **separate expand from select.**

- Each category chip has a **chevron**. Tapping the chevron _expands_ to reveal children — no
  selection.
- Tapping the chip _body_ toggles _selection_ (highlight = active).

```
┌ Filter what I want to learn ─────────────── [Clear all · 3] ┐
│  [✓ Frontend ▾]   [ Backend ▸ ]   [ Testing ▸ ]            │
│    └ [✓ React ▾]   [ CSS ▸ ]   [ Accessibility ]           │
│        └ [ Hooks ▾ ]  [ Rendering ]  [ Forms ]             │
│            └ [✓ useEffect]  [ useRef ]  [ useMemo ]         │
└─────────────────────────────────────────────────────────────┘
```

A user can expand to `useEffect`, select only `useEffect`, and never have `react` selected.

Later: **tri-state parent chip** (indeterminate when some-but-not-all descendants are chosen) —
a visual hint only; the stored selection is the exact set of tapped tags.

Placement v1: a shadcn `Sheet`/drawer opened from a "Filter" button on the landing page.
Graduate to a profile section later — same persisted store, no rework.

## Card display

- **Track card:** deduped union of its units' skills, **rolled up** — prefer mid-level
  ancestors ("React · Hooks") plus one or two specifics, capped at ~3–4 chips, then `+N more`.
- **Unit card:** the unit's own leaf skills.
- **`+N more`:** shadcn `Tooltip` (hover) / `Popover` (tap) listing the remainder.

## Persistence

Selected tags are a new persisted client store — **localStorage first**, mirroring progress,
moving to a `user_preferences` row when Supabase auth lands (Phase 2). Design the store's
interface so the backend swap is invisible to components.

This is a second persisted store beyond progress — the documented **trigger for the
Context → Zustand switch** (`docs/zustand-migration.md`). Prefer pulling that trigger here over
adding a second Context.

### SSR hydration gate (`useMounted`) — and whether Supabase removes it

The home page is static (SSG); `localStorage` doesn't exist at build time, so the server renders
the **unfiltered** catalog. But `persist` rehydrates `selected` from `localStorage` *before* the
client's first render — so if a component read `selected` on that first render it would produce a
**filtered** view that disagrees with the server's HTML → a hydration mismatch. `lib/use-mounted.ts`
(via `useSyncExternalStore`, server snapshot `false` / client `true`) gates this: render the neutral
view on the first render (matching the server), read the persisted selection only after mount. Cost
is one frame of "unfiltered → filtered" snap on reload; the alternative is a hydration error.

**Does Supabase change the need for this gate?** It depends on *where the interests are known at
render time* — not on Supabase itself:

- **Local-first + Supabase sync (likely path):** keep `localStorage` as the instant cache, sync to
  Supabase after mount. The page stays static/cacheable, but a client-only source is still read at
  first render → **the gate stays.**
- **Per-user server render (cookie session → server-side fetch):** the server reads the auth cookie,
  fetches the user's interests, and renders the filtered page. Client hydrates from the same data →
  **no gate needed** — but the page stops being static SSG (renders per request). If we *also* keep
  `localStorage` as a cache, a gate-shaped reconciliation returns anyway.

The gate isn't `localStorage`-specific; it's "don't read client-only state on the render that must
match the server." Cross-device **discrepancy** (picked tags on phone, open laptop) is a separate
data-sync/conflict problem Supabase enables (shared row + timestamps / last-write-wins) — the gate
governs render *timing*, not which value *wins*. The progress store will face the identical choice
when it migrates.

## Authoring impact

- **`/new-lesson`:** require tags from the taxonomy; adding a missing taxonomy node is its own
  commit (mirrors the `schemaVersion`-bump discipline).
- **PLAYBOOK checklist:** upgrade "Skills tagged…" to "tags exist in the taxonomy and sit at the
  right altitude (leaf where specific, broad where the lesson is broad)."
- **`docs/lesson-changelog.md`:** taxonomy edits get a line.

## Planned dimensions

Roots (dimensions) are the top row of the interest filter, so they should be few and stable.
Today there are two: `frontend` and `backend`. The backlog in `docs/ROADMAP.md` needs more. The
list below is where new roots should go, so that each authoring session doesn't invent its own.
**Add a root only when a lesson needs it** (an unused root is an orphan warning):

| Root (slug) | For tracks like | Re-parent when it lands |
| --- | --- | --- |
| `languages` → `javascript`, `typescript` — **landed** with `javascript-typescript-fundamentals` | JS & TS fundamentals, Async JS & Timing, Dates & Time | `async` gains `javascript` as a parent — **done** with `async-javascript` (and `AbortController` gains `async`) |
| `web` — **landed** with `data-fetching-tanstack` (with the shared `caching` node under `web` + `backend`) | HTTP & APIs, Next.js & the Network, CORS/caching | `http` gains `web` — **done** with `http-and-apis` |
| `security` — **landed** with `http-and-apis` | Web Security (XSS, CSP, CSRF, OWASP) | `auth` gains `security` — **done** |
| `testing` | Testing & Quality (Vitest, Playwright) | — |
| `databases` — **landed** with `databases` | Databases | — |
| `tooling` — **landed** with `http-and-apis` (`curl`) | Terminal, Git & GitHub | — |
| `system-design`, `infrastructure` | Capstone tracks | `architecture` may gain `system-design` |

Re-parenting is free: a tag gaining a parent changes no content file, because units store only
the leaf tag.

## Build order

1. `learning/taxonomy.ts` + seed current tags into the DAG; add the validator check
   (integrity, cycles, orphan warning). No UI.
2. Pure `lib/tags.ts`: `descendantsOf(slug)`, `matches(unitSkills, selected)`,
   `rollupForCard(skills)`. Unit-testable, no React.
3. Display-only: tag chips + `+N more` on unit and track cards. (Value, zero interactivity.)
4. Interests store (localStorage; decide Zustand here) + filter drawer with expand≠select.
5. Wire the store to soft-filter/reorder the landing catalog + empty state + "Clear all".

Steps 1–3 are independently shippable and reversible.
