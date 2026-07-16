import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The learner's selected interest tags — the first Zustand store in the app (progress/drill-history
 * stay on Context for now; see docs/zustand-migration.md). `selected` holds the raw tag slugs the
 * user tapped in the filter; matching against content expands each downward (see lib/tags.ts).
 *
 * Local-first: persisted to localStorage, migrates to a user_preferences row with Supabase auth.
 * Like the progress store, it must not read persisted state during the first (server) render — the
 * `hasHydrated` gate exists so consumers can avoid a hydration mismatch.
 */
type InterestsState = {
  selected: string[];
  hasHydrated: boolean;
  toggle: (slug: string) => void;
  clear: () => void;
};

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      selected: [],
      hasHydrated: false,
      toggle: (slug) => {
        const cur = get().selected;
        set({ selected: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug] });
      },
      clear: () => set({ selected: [] }),
    }),
    {
      name: "whetstone:interests",
      version: 1,
      // Only `selected` is durable; `hasHydrated` is runtime-only.
      partialize: (s) => ({ selected: s.selected }),
      // Flip the gate unconditionally — it fires on error too, and leaving it false would strand
      // the UI. Use setState (not `state.hasHydrated = …`, which wouldn't notify subscribers).
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error("interests rehydrate failed", error);
        useInterestsStore.setState({ hasHydrated: true });
      },
    },
  ),
);
