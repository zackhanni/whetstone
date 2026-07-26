import { useSyncExternalStore } from "react";
import { store, type CounterState } from "./counter-store";

/**
 * The React binding a store library gives you: subscribe to the store, but re-render only
 * when the SELECTED slice changes (compared with Object.is). Returning a fresh object from
 * the selector would defeat it — that's the "always re-renders" trap.
 */
export function useStore<T>(selector: (state: CounterState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
