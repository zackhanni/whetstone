/**
 * A hand-rolled version of the two things every test-double library gives you: `fn()` (a new
 * function that records its calls — Vitest's `vi.fn`) and `spyOn()` (wrap an existing method
 * and be able to put it back — Vitest's `vi.spyOn`).
 */

type AnyFunction = (...args: any[]) => any;

export type Spy = {
  (...args: any[]): any;
  /** The arguments of every call, oldest first: `[[2, 3], [10, 1]]`. */
  calls: unknown[][];
  /** Undo `spyOn`. A no-op on a spy made with `fn()`. */
  restore: () => void;
};

/** A new function that records its calls, optionally running `impl` to produce a result. */
export function fn(impl: AnyFunction = () => undefined): Spy {
  // A regular `function`, not an arrow: it has to receive the `this` its caller provides
  // (`counter.increment()` calls it with `this === counter`) and pass it on.
  const spy = function (this: unknown, ...args: unknown[]) {
    spy.calls.push(args); // append: the log is every call, in order
    return impl.apply(this, args); // transparent: same `this`, same result
  } as Spy;
  spy.calls = [];
  spy.restore = () => {};
  return spy;
}

/** Replace `obj[method]` with a spy that still calls the original. */
export function spyOn<T extends object>(obj: T, method: keyof T): Spy {
  const target = obj as Record<keyof T, unknown>;
  const original = target[method] as AnyFunction; // keep the original BEFORE replacing it
  const spy = fn(original);
  target[method] = spy;
  // Put back exactly what was there. `delete` would remove an own method outright (and only
  // "work" by accident when the method lives on a prototype).
  spy.restore = () => {
    target[method] = original;
  };
  return spy;
}
