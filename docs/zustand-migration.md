# State management: Context now, Zustand later

Whetstone's client-side, local-first state (unit progress; drill history) is currently held in
a small React Context (`components/progress-provider.tsx`) backed by hand-rolled localStorage
helpers (`lib/progress.ts`, `lib/drill-history.ts`). This doc records **why**, and the concrete
**plan + trigger** for moving to [Zustand](https://github.com/pmndrs/zustand) when it earns its
keep.

## Why we're on Context today

At a single persisted store, Context + `persist`-style helpers is a wash with Zustand, not a
loss:

- The hardest part — the **SSR hydration gate** — doesn't go away with Zustand. These are
  server-rendered (SSG) pages; `localStorage` doesn't exist on the server, so any store starts
  from defaults on the server and rehydrates on the client. Zustand's `persist` has the same
  problem and solves it with `persist.hasHydrated()` / `onRehydrateStorage` — i.e. you
  reimplement our `ready` flag. Same concept, same code.
- Switching now means **adding a dependency + a rehydration gate to replace ~40 lines that are
  already written and passing `pnpm check` + `pnpm build`.** That's lateral churn.

## What Zustand genuinely buys us (and why it wins later)

1. **Selector subscriptions.** `useStore(s => s.record)` re-renders a component only when *that
   slice* changes. Context re-renders every consumer when any part of the value changes (e.g.
   `UnitView` currently re-renders on every `map` write even though it only needs `record`).
   Negligible at today's scale; real once many components read progress.
2. **`version` + `migrate` built in.** The versioned blob + `readMap()` migration in
   `lib/progress.ts` is exactly what `persist({ version, migrate })` formalizes. The moment we
   have more than one structural migration to run, Zustand's is the cleaner home.
3. **One store, many slices.** Multiple Context providers (progress, settings, streaks, drill
   history…) nest and get noisy. One Zustand store with slices stays flat.

## Trigger — switch when ANY of these is true

- We add a **2nd or 3rd persisted store** (e.g. user settings, streaks/XP, folding
  `drill-history` into shared state). This is the primary trigger.
- Progress is read by **enough components that Context re-renders show up** in profiling.
- We need **non-trivial `migrate` logic** across several schema versions.
- We add **cross-tab sync** (Zustand `persist` + storage events is tidier than hand-rolling it).

Until then: stay on Context. Don't switch purely for aesthetics.

## Migration plan (when the trigger fires)

The current API was built to make this a swap, not a rewrite. `ProgressMap`, `UnitProgress`,
and the `record(id, answered, total)` signature stay identical; only the *container* changes.

Two functions are in play, and the port keeps them distinct: the **provider-facing**
`record(id, answered, total)` that components call, and the **storage helpers** (`recordProgress`
/ `nextEntry`) that do the merge + persist. The store's `record` action below plays the provider
role — it runs the same merge (`nextEntry`) and lets `persist` own storage, so the standalone
`recordProgress` collapses into the middleware.

1. **Add dep:** `pnpm add zustand`.
2. **Create the store** `lib/stores/progress-store.ts` (illustrative — `migrateProgress` is the
   extracted `readMap()` logic):

   ```ts
   import { create } from "zustand";
   import { persist } from "zustand/middleware";

   type ProgressState = {
     units: ProgressMap;
     hasHydrated: boolean;
     setHasHydrated: (v: boolean) => void;
     record: (id: string, answered: number, total: number) => void;
   };

   export const useProgressStore = create<ProgressState>()(
     persist(
       (set, get) => ({
         units: {},
         hasHydrated: false,
         setHasHydrated: (v) => set({ hasHydrated: v }),
         record: (id, answered, total) =>
           set({
             units: { ...get().units, [id]: nextEntry(get().units[id], answered, total, Date.now()) },
           }),
       }),
       {
         name: "whetstone:progress",
         version: 1, // keep in sync with the current VERSION
         migrate: migrateProgress, // extract readMap()'s legacy/bare-map handling into this fn
         // Use the setter, not `state.hasHydrated = true`: a direct mutation won't notify
         // subscribers, so the gate would never flip.
         onRehydrateStorage: () => (state) => {
           state?.setHasHydrated(true);
         },
       },
     ),
   );
   ```

   - Keep the pure helpers (`nextEntry`, `clampCount`, `isValidProgress`, `sanitizeMap`) — move
     them next to the store; they carry the content-change robustness (clamp `answered` to
     current `total`, recompute `completed`) and must not be lost in the port.
   - Port `readMap()`'s legacy per-key + pre-version handling into `migrateProgress` (referenced
     by `persist`'s `migrate`).
3. **Replace the gate:** components read `const hasHydrated = useProgressStore(s => s.hasHydrated)`
   in place of `ready`, and select the slice they need (`s.units[id]`, `s.record`) rather than
   consuming the whole context.
4. **Delete** `components/progress-provider.tsx` and its `<ProgressProvider>` wrap in
   `app/layout.tsx` (Zustand needs no provider). Point consumers at the store hook.
5. **Consumers to update:** `components/unit-progress.tsx`, `components/track-progress.tsx`,
   `components/continue-learning.tsx`, `components/unit-view.tsx`.
6. **Fold in `drill-history`** at the same time if that's the triggering store: mirror the shape
   above as a second slice or a second `persist` store.
7. **Verify:** `pnpm check` + `pnpm build`; manually confirm no hydration warning in the console
   and that existing localStorage data survives (the `migrate` step).

## Invariants to preserve across the switch

- The SSR gate (`ready` → `hasHydrated`) must stay — never read persisted state during the first
  render.
- `recordProgress` reads storage as the source of truth before writing, so it can't clobber
  other units if a write fires before hydration. Zustand's single store instance makes this less
  fragile, but keep the merge (not replace) semantics.
- Content-change robustness (clamp `answered ≤ total`, recompute `completed`) lives in
  `nextEntry` — carry it over verbatim.
