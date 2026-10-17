/**
 * A hand-rolled version of the two things every test-double library gives you: `fn()` (a new
 * function that records its calls — Vitest's `vi.fn`) and `spyOn()` (wrap an existing method
 * and be able to put it back — Vitest's `vi.spyOn`).
 *
 * Four bugs, in the order worth fixing them:
 *   1. the spy swallows its implementation's return value
 *   2. `calls` keeps only the most recent call
 *   3. a spied method loses `this`
 *   4. `restore()` deletes the method instead of putting the original back
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
  const spy = function (this: unknown, ...args: unknown[]) {
    spy.calls = [args];
    impl(...args);
  } as Spy;
  spy.calls = [];
  spy.restore = () => {};
  return spy;
}

/** Replace `obj[method]` with a spy that still calls the original. */
export function spyOn<T extends object>(obj: T, method: keyof T): Spy {
  const target = obj as Record<keyof T, unknown>;
  const original = target[method] as AnyFunction;
  const spy = fn(original);
  target[method] = spy;
  spy.restore = () => {
    delete target[method];
  };
  return spy;
}
