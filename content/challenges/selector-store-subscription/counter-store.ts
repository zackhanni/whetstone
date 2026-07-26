// A tiny store, outside React — this is what zustand's `create` builds for you:
// a value, a set of listeners, and a `set` that shallow-merges and notifies.
// (Read-only support file.)

export type CounterState = {
  count: number;
  other: number;
  inc: () => void;
  bumpOther: () => void;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: CounterState;

const set = (partial: Partial<CounterState>): void => {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
};

const initialState = (): CounterState => ({
  count: 0,
  other: 0,
  inc: () => set({ count: state.count + 1 }),
  bumpOther: () => set({ other: state.other + 1 }),
});

state = initialState();

export const store = {
  getState: (): CounterState => state,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  // Exposed so the tests can prove the component unsubscribed when it unmounted.
  listenerCount: (): number => listeners.size,
  // A module-level store is a singleton, so tests reset it between cases.
  reset: (): void => {
    state = initialState();
    listeners.forEach((listener) => listener());
  },
};
