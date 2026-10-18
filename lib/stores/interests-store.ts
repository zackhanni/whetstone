import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The learner's selected interest tags — the first Zustand store in the app (progress stays on
 * Context, and drill history on direct localStorage reads in UnitView, for now; see
 * docs/zustand-migration.md). `selected` holds the raw tag slugs the
 * user tapped in the filter; matching against content expands each downward (see lib/tags.ts).
 *
 * Local-first: persisted to localStorage, migrates to a user_preferences row with Supabase auth.
 *
 * SSR note: with sync localStorage, `persist` rehydrates `selected` synchronously at import — so on
 * the client the store already holds the saved tags before React's first render, while the server
 * rendered from empty. Consumers therefore MUST gate reads behind `useMounted()` (read the plain,
 * unfiltered view on the first render, the persisted view after mount) to avoid a hydration
 * mismatch. We intentionally do NOT keep a `hasHydrated` flag flipped in `onRehydrateStorage`:
 * localStorage rehydrates before mount, so a post-mount flag is both simpler and correct.
 */
type InterestsState = {
  selected: string[];
  toggle: (slug: string) => void;
  clear: () => void;
};

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      selected: [],
      toggle: (slug) => {
        const cur = get().selected;
        set({ selected: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug] });
      },
      clear: () => set({ selected: [] }),
    }),
    {
      name: "whetstone:interests",
      version: 1,
    },
  ),
);
