import { useEffect, useState } from "react";
import { store, type CounterState } from "./counter-store";

/**
 * 🐛 BUG: this hook subscribes to the WHOLE store. Every change copies the entire state
 * into local state, so every subscribed component re-renders — even one that only reads a
 * field that didn't change. That's the Context behaviour a store is supposed to avoid.
 * And because it subscribes in an effect, after the first render, a store change that lands
 * in between is never seen.
 *
 * Fix: rewrite it on React's useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
 * with a snapshot that is the SELECTED value, so the component re-renders only when that
 * value changes (compared with Object.is). The README's hints cover each argument.
 */
export function useStore<T>(selector: (state: CounterState) => T): T {
  const [state, setState] = useState<CounterState>(store.getState());

  useEffect(() => store.subscribe(() => setState({ ...store.getState() })), []);

  return selector(state);
}
