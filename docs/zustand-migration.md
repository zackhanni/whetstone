# State management: Context now, Zustand later

> **Status (2026-10-17): the trigger has fired; the port below hasn't run.** The interest filter
> (`lib/stores/interests-store.ts`) is the first Zustand store, so `zustand` is installed.
> Progress is still on React Context (`components/progress-provider.tsx` over `lib/progress.ts`).
> Drill history has no shared container: `UnitView` reads and writes it straight from
> localStorage (`loadAttempts`/`saveAttempt` in `lib/drill-history.ts`).

This doc records why progress started on Context, what Zustand buys, and the plan for the port.

## Why progress started on Context

At a single persisted store, Context plus small localStorage helpers is a wash with Zustand, not
a loss:

- The hardest part, the **SSR hydration gate**, doesn't go away with Zustand. Pages are
  prerendered (SSG) and `localStorage` doesn't exist on the server, so the server renders the
  defaults. `persist` over localStorage rehydrates synchronously when the store is created, so
  on the client the saved state is already in the store before React's first render, and reading
  it on that render produces HTML the server never sent (a hydration mismatch). Either container
  needs a "mounted yet?" gate: `ready` in the provider today, `useMounted()`
  (`lib/use-mounted.ts`) in the interests store.
- Switching early would have meant a new dependency plus that gate, to replace code that already
  worked: churn, not a fix.

## What Zustand genuinely buys us (and why it wins once there are several stores)

1. **Selector subscriptions.** `useStore(s => s.record)` re-renders a component only when _that
   slice_ changes. Context re-renders every consumer when any part of the value changes (e.g.
   `UnitView` currently re-renders on every `map` write even though it only needs `record`).
   Negligible at today's scale; real once many components read progress.
2. **`version` + `migrate` built in.** The versioned blob + `readMap()` migration in
   `lib/progress.ts` is exactly what `persist({ version, migrate })` formalizes. The moment we
   have more than one structural migration to run, Zustand's is the cleaner home.
3. **One store, many slices.** Multiple Context providers (progress, settings, streaks, drill
   history…) nest and get noisy. One Zustand store with slices stays flat.

## Trigger — switch when ANY of these is true

- We add a **2nd or 3rd persisted store** (e.g. user settings, streaks/XP, folding
  `drill-history` into shared state). This is the primary trigger. **Fired** by the interests
  store.
- Progress is read by **enough components that Context re-renders show up** in profiling.
- We need **non-trivial `migrate` logic** across several schema versions.
- We add **cross-tab sync** (Zustand `persist` + storage events is tidier than hand-rolling it).

A trigger says when to start a migration; it doesn't make the Context code wrong, so the two
containers live side by side until the port lands.

## Migration plan

The current API was built to make this a container swap, not a rewrite: `ProgressMap`,
`UnitProgress` and the `record(id, answered, total)` signature stay the same.

Two functions are in play, and the port keeps them distinct: the **provider-facing**
`record(id, answered, total)` that components call, and the **storage helper**
`recordProgress`, which merges with `nextEntry` and persists. The store's `record` action plays
the provider role: it runs the same merge (`nextEntry`) and lets `persist` own storage, so
`recordProgress` folds into the middleware.

1. **Create the store** `lib/stores/progress-store.ts` on the interests store's pattern:
   `create<…>()(persist(…, { name: "whetstone:progress", version }))`, state
   `units: ProgressMap`, and a `record` action that sets `units[id]` to
   `nextEntry(units[id], answered, total, Date.now())`. No `hasHydrated` flag in the store: with
   localStorage it is already `true` on the client's hydration render, so it can't gate SSR
   (`lib/stores/interests-store.ts` makes the same choice).
   - Keep the pure helpers (`nextEntry`, `clampCount`, `isValidProgress`, `sanitizeMap`) next to
     the store. They carry the content-change robustness (clamp `answered` to the current
     `total`, recompute `completed`, complete a question-less unit on its first visit) and must
     not be lost in the port.
   - **Convert the stored blob before the store is created.** Today's value under
     `whetstone:progress` is `{ v, units }` (`lib/progress.ts`); `persist` reads and writes
     `{ state, version }`. Pointed at the same key unconverted, `persist` finds no numeric
     `version`, skips `migrate`, loads nothing, and its first write replaces every learner's
     saved progress. So a one-time bootstrap runs first: rewrite `{ v, units }` (and a
     pre-version bare map) as `{ state: { units }, version }`, and fold in the legacy
     `whetstone:progress:<id>` keys the way `migrateLegacy()` does today. (Or give `persist` a
     custom `storage` that reads the old shape.)
   - `persist.migrate` then handles only later `version` changes of the new envelope.
2. **Gate on mount:** components read persisted slices only once `useMounted()` is true, in place
   of `ready`, and select the slice they need (`s.units[id]`, `s.record`) instead of the whole
   context.
3. **Delete** `components/progress-provider.tsx` and its `<ProgressProvider>` wrap in
   `app/layout.tsx` (Zustand needs no provider), and point its consumers at the store hook:
   `components/unit-progress.tsx`, `components/track-progress.tsx`,
   `components/continue-learning.tsx`, `components/unit-view.tsx`.
4. **Drill history** can move in the same change, as a second slice or a second `persist` store
   replacing `UnitView`'s `loadAttempts`/`saveAttempt`. Its data sits under one key per unit
   (`whetstone:drill:<track>/<unit>`), so it needs the same one-time conversion.
5. **Verify:** `pnpm check` + `pnpm build`; then, in a browser holding progress and drill history
   saved by the current build, confirm there's no hydration warning in the console and that the
   saved data is still there after the switch.

## Invariants to preserve across the switch

- The SSR gate must stay (`ready` → `useMounted()`): never read persisted state during the first
  render.
- `recordProgress` reads storage as the source of truth before writing, so it can't clobber
  other units if a write fires before hydration. Zustand's single store instance makes this less
  fragile, but keep the merge (not replace) semantics.
- Content-change robustness (clamp `answered ≤ total`, recompute `completed`) lives in
  `nextEntry` — carry it over verbatim.
