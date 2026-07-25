import { useEffect, useState } from "react";
import { store, type CounterState } from "./counter-store";

/**
 * 🐛 BUG: this hook subscribes to the WHOLE store. Every change copies the entire state
 * into local state, so every subscribed component re-renders — even one that only reads a
 * field that didn't change. That's the Context behaviour a store is supposed to avoid.
 *
 * Rewrite it with React's useSyncExternalStore so the component re-renders only when the
 * value returned by `selector` changes (compared with Object.is):
 *
 *   useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
 *
 *   - subscribe:         store.subscribe (it already returns an unsubscribe function)
 *   - getSnapshot:       () => selector(store.getState())
 *   - getServerSnapshot: the same, for SSR
 */
export function useStore<T>(selector: (state: CounterState) => T): T {
  const [state, setState] = useState<CounterState>(store.getState());

  useEffect(() => store.subscribe(() => setState({ ...store.getState() })), []);

  return selector(state);
}
