# Tags & Interest Filtering — Design

> Built (PR #9). The design record for the tag taxonomy over the `skills` field
> (`learning/taxonomy.ts`, `lib/tags.ts`) and the interest filter that reorders the catalog.
> "Planned dimensions" (near the end) is the living section: the roots, and where a new one goes.

## The core idea

Tags are the `skills: string[]` field on units and challenges (`learning/schema.ts`; tracks lost
theirs in schema v2). Before this design it was flat and free-text: `use-effect` is tagged
`["react","hooks","useEffect","data-fetching"]`, mixing a broad tag, a mid tag and a leaf, with
the hierarchy only implied. The design **formalizes** that field (a closed vocabulary plus a
hierarchy); it does not add a parallel `tags` field.

The one decision that makes everything else easy: **separate association from hierarchy.**

- **Association** — which lessons carry which tags — stays flat, on each unit (`skills`), as today.
- **Hierarchy** — `useEffect → hooks → react → frontend` — lives once in a central registry.

Authors keep tagging flat, leaf-ish skills. "Selecting `react` matches all React content" is
_computed_ by walking the tree, never by re-tagging lessons with every ancestor.

## Decisions (locked)

- **Filter behavior: soft.** Matching tracks float to the top; the rest drop below a
  "More tracks" divider, dimmed but visible. Empty selection = show everything. Revisit
  hard-hide once the catalog is large.
- **Hierarchy shape: multi-parent DAG.** A tag (`http`, `auth`, `caching`) may sit under
  more than one dimension. The validator must reject cycles.
- **Tag source of truth: unit-level.** Only units (and challenges) carry `skills`. A track's
  displayed tags are the deduped union of its units' skills, so track and unit tags can never
  drift. Schema v2 removed `track.skills` outright: nothing read it, and it had already drifted
  (the React track listed 4 tags while its units used 21).
- **No `schemaVersion` bump for this feature.** It left unit/track shapes unchanged, adding only
  a sibling registry and a validator rule. (Removing `track.skills` later was a breaking change,
  so it shipped as part of schema v2.)

## Data model

The registry is `learning/taxonomy.ts`: an array of `TagNode` (`slug`, the value content uses in
`skills`; `label`, free to change; `parents`, `[]` for a root), parsed through `Taxonomy`, which
rejects duplicate slugs, unknown parents and cycles. Roots are the "dimensions". Example rows:

```
{ slug: "frontend",  label: "Frontend",  parents: [] }
{ slug: "react",     label: "React",     parents: ["frontend"] }
{ slug: "hooks",     label: "Hooks",     parents: ["react"] }
{ slug: "useEffect", label: "useEffect", parents: ["hooks"] }
{ slug: "http",      label: "HTTP",      parents: ["backend", "web"] }
```

**Closed vocabulary.** `pnpm validate` (`learning/validate-content.ts`) fails on any skill that
isn't in the taxonomy. This kills tag sprawl and typos (`useeffect` vs `useEffect`), the classic
tag-system failure, and matches the repo's fail-loud ethos. It also **warns** on orphan tags
(defined, but used by nothing, directly or through a descendant).

Keep the tree shallow; deeper makes the picker a chore. The design aimed at 3–4 levels; the
deepest chains are 5 today (`cleanup`, `query-keys`, `optimistic-updates`).

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

Placement: a right-side drawer (a Radix `Dialog` styled as a sheet, `components/interest-filter.tsx`)
opened from a "Filter interests" button on the home page. Graduate to a profile section later — same
persisted store, no rework.

## Card display

- **Track card:** the deduped union of its units' skills, condensed by `rollupForCard`
  (`lib/tags.ts`): roots dropped, broadest first (by depth, then authoring order), at most 4
  chips, then `+N more`. It shows tags the units carry; it doesn't add ancestors they lack.
- **Unit card:** the unit's own skills, through the same rollup.
- **`+N more`:** a hover tooltip (`HintTooltip`, not focusable because the chip sits inside the
  card's link) plus a screen-reader-only list. No Popover.

## Persistence

Selected tags are a new persisted client store — **localStorage first**, mirroring progress,
moving to a `user_preferences` row when Supabase auth lands (Phase 2). Design the store's
interface so the backend swap is invisible to components.

It became the first Zustand store (`lib/stores/interests-store.ts`), which fired the trigger for
moving progress off Context (`docs/zustand-migration.md`).

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

The rules live in `learning/PLAYBOOK.md` → "Tags are a checked registry" (and its checklist) and
in `/new-lesson`'s "Tags first" step: every tag must be in the taxonomy, new tags go in first with
real `parents`, tag at the right altitude, and taxonomy edits get a `docs/lesson-changelog.md`
line.

## Planned dimensions

Roots (dimensions) are the top row of the interest filter, so they stay few and stable. There
are ten, and every planned one has landed:

| Root | Serves |
| --- | --- |
| `frontend`, `backend` | the first two |
| `languages` (→ `javascript`, `typescript`) | JS & TS Fundamentals, Async JavaScript (`async` also sits under `javascript`), Dates & Time |
| `web` (with the shared `caching` node under `web` + `backend`) | Data Fetching, HTTP & APIs (`http` also under `web`), Next.js & the Network |
| `security` | Web Security; `auth` sits under it too |
| `databases` | Databases |
| `testing` | Testing & Quality |
| `tooling` | `curl`; Terminal, Git & GitHub |
| `system-design` | Systems Design; `architecture` and `rate-limiting` sit under it too |
| `infrastructure` | Infrastructure |

**Add a root only when a lesson needs it** (an unused root is an orphan warning), and list it
here so each authoring session doesn't invent its own. Re-parenting is free: a tag gaining a
parent changes no content file, because units store only the leaf tag.

## Build order

Shipped in five steps in PR #9: the registry and its validator check, pure `lib/tags.ts`
(`descendantsOf`, `matchesInterests`, `rollupForCard`), display-only chips, the interests store
and filter drawer, then the catalog's soft filter.
