import { useSyncExternalStore } from "react";
import { store, type CounterState } from "./counter-store";

/**
 * The React binding a store library gives you: subscribe to the store, but re-render only
 * when the SELECTED slice changes (compared with Object.is). This is essentially what
 * Zustand v5's `create` hook does. A selector that returns a fresh object would break it:
 * every snapshot read looks like a change, so React re-renders until it throws "Maximum
 * update depth exceeded" (the v5 reason for `useShallow`).
 */
export function useStore<T>(selector: (state: CounterState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
